import { system, world } from "@minecraft/server";
import { SOLDIERS, SOLDIER_CONFIG } from "./config.js";
import { getPlayerTeam, getSoldierTeam } from "../teams/index.js";
import { getTeamRelation, TEAM_RELATION } from "../teams/relations.js";

const ARROW_ID = "minecraft:arrow";
const ARCHER_MIN_RANGE = 5.5;
const ARCHER_MAX_RANGE = 24;
const ARROW_SPEED = 2.8;
const AIM_HEIGHT = 0.95;
const ARROW_GRAVITY = 0.05;
const DEFAULT_SHOT_COOLDOWN = 1200;
const VISIBILITY_MARGIN = 0.05;
const ARROW_TRACK_INTERVAL = 1;
const trackedArrows = new Map();

let started = false;

export function startRangedAI() {
    if (started) return;
    started = true;
    system.runInterval(updateArchers, 2);
    system.runInterval(updateTrackedArrows, ARROW_TRACK_INTERVAL);
    console.info("[Soldier Ranged] Archer projectile AI started");
}

function updateArchers() {
    const now = Date.now();
    for (const soldier of SOLDIERS.values()) {
        if (soldier.type !== "archer" || !isValid(soldier.entity)) continue;
        try { updateArcher(soldier, now); }
        catch (error) { if (SOLDIER_CONFIG.debug) console.warn(`[Soldier Ranged] ${error}`); }
    }
}

function updateArcher(soldier, now) {
    const entity = soldier.entity;
    let target = soldier.targetId ? findEntity(entity, soldier.targetId, ARCHER_MAX_RANGE + 2) : null;

    if (!target || !isEnemy(soldier, target)) {
        target = findTarget(soldier);
        soldier.targetId = target?.id ?? null;
    }

    if (!target) {
        cancelMovement(soldier);
        return;
    }

    const dx = target.location.x - entity.location.x;
    const dz = target.location.z - entity.location.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= 0.01) return;

    const nx = dx / distance;
    const nz = dz / distance;
    const targetAim = { x: target.location.x, y: target.location.y + AIM_HEIGHT, z: target.location.z };

    entity.setRotation?.({
        x: -Math.atan2(targetAim.y - entity.location.y, distance) * 180 / Math.PI,
        y: Math.atan2(-dx, dz) * 180 / Math.PI
    });

    // Do not fire at a target that is hidden behind a solid block.
    if (!hasLineOfSight(entity, target)) {
        soldier.attack = null;
        soldier.phase = SOLDIER_CONFIG.STATES.MOVE;
        soldier.desiredDirection.x = nx;
        soldier.desiredDirection.z = nz;
        return;
    }

    if (distance < ARCHER_MIN_RANGE) {
        soldier.phase = SOLDIER_CONFIG.STATES.MOVE;
        soldier.desiredDirection.x = -nx;
        soldier.desiredDirection.z = -nz;
        soldier.velocity.x = -nx * 0.08;
        soldier.velocity.z = -nz * 0.08;
        soldier.attack = null;
        return;
    }

    cancelMovement(soldier);
    soldier.phase = SOLDIER_CONFIG.STATES.ATTACK;
    soldier.attack = null;

    const cooldown = getShotCooldown(soldier);
    if (!Number.isFinite(soldier.rangedNextShot)) soldier.rangedNextShot = 0;
    if (now < soldier.rangedNextShot) return;

    if (shootArrow(soldier, target)) soldier.rangedNextShot = now + cooldown;
    else soldier.rangedNextShot = now + 250;
}

function shootArrow(soldier, target) {
    const shooter = soldier.entity;
    const targetAim = { x: target.location.x, y: target.location.y + AIM_HEIGHT, z: target.location.z };
    const dx = targetAim.x - shooter.location.x;
    const dz = targetAim.z - shooter.location.z;
    const horizontalDistance = Math.hypot(dx, dz);
    const launch = { x: shooter.location.x, y: shooter.location.y + 1.45, z: shooter.location.z };

    if (horizontalDistance <= 0.01 || !hasLineOfSight(shooter, target)) return false;

    // The actual launch point must also be clear. This prevents spawning an arrow
    // inside/behind a wall when the soldier is standing directly beside cover.
    const spawn = {
        x: launch.x + dx / horizontalDistance * 0.65,
        y: launch.y,
        z: launch.z + dz / horizontalDistance * 0.65
    };
    if (hasBlockingRay(shooter.dimension, launch, spawn)) return false;

    try {
        const arrow = shooter.dimension.spawnEntity(ARROW_ID, spawn);
        const projectile = arrow.getComponent("minecraft:projectile");
        if (!projectile?.shoot) {
            arrow.remove();
            return false;
        }

        const travelTime = horizontalDistance / ARROW_SPEED;
        const dyTarget = targetAim.y - launch.y;
        const dy = dyTarget + 0.5 * ARROW_GRAVITY * travelTime * travelTime;
        const length = Math.hypot(dx, dy, dz);

        projectile.owner = shooter;
        projectile.shoot({
            x: dx / length * ARROW_SPEED,
            y: dy / length * ARROW_SPEED,
            z: dz / length * ARROW_SPEED
        });

        try {
            arrow.setDynamicProperty("siedler:archerArrow", true);
            arrow.setDynamicProperty("siedler:ownerId", shooter.id);
            arrow.setDynamicProperty("siedler:level", Number(soldier.level) || 1);
        } catch {}

        trackedArrows.set(arrow.id, { arrow, previous: { ...spawn } });

        try { shooter.dimension.playSound("bow", shooter.location); } catch {}
        if (SOLDIER_CONFIG.debug) console.info(`[Soldier Ranged] ${shooter.id} fired arrow at ${target.id}`);
        return true;
    } catch (error) {
        if (SOLDIER_CONFIG.debug) console.warn(`[Soldier Ranged] Arrow spawn failed: ${error}`);
        return false;
    }
}

function updateTrackedArrows() {
    for (const [id, entry] of trackedArrows) {
        const arrow = entry.arrow;
        if (!isValid(arrow)) {
            trackedArrows.delete(id);
            continue;
        }

        try {
            const current = { x: arrow.location.x, y: arrow.location.y, z: arrow.location.z };
            const moved = Math.hypot(
                current.x - entry.previous.x,
                current.y - entry.previous.y,
                current.z - entry.previous.z
            );

            if (moved > 0.001 && hasBlockingRay(arrow.dimension, entry.previous, current)) {
                // Vanilla projectile collision should stop normal arrows too.
                // This explicit segment collision additionally prevents tunnelling
                // through thin walls between Script API ticks.
                arrow.remove();
                trackedArrows.delete(id);
                continue;
            }

            entry.previous = current;
        } catch {
            trackedArrows.delete(id);
        }
    }
}

function hasLineOfSight(entity, target) {
    if (!isValid(entity) || !isValid(target)) return false;

    const from = {
        x: entity.location.x,
        y: entity.location.y + 1.45,
        z: entity.location.z
    };

    // All three rays must be clear. A target is considered hidden if every
    // sampled body point is behind a solid block.
    const heights = [0.25, 0.95, 1.55];
    for (const height of heights) {
        const to = {
            x: target.location.x,
            y: target.location.y + height,
            z: target.location.z
        };
        if (!hasBlockingRay(entity.dimension, from, to)) return true;
    }
    return false;
}

function hasBlockingRay(dimension, from, to) {
    try {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dz = to.z - from.z;
        const distance = Math.hypot(dx, dy, dz);
        if (distance <= 0.05) return false;

        const direction = { x: dx / distance, y: dy / distance, z: dz / distance };
        const hit = dimension.getBlockFromRay(from, direction, {
            maxDistance: Math.max(0.05, distance - VISIBILITY_MARGIN),
            includeLiquidBlocks: true,
            includePassableBlocks: false
        });
        return !!hit;
    } catch (error) {
        // Fail closed: an unavailable raycast must never allow a wall-piercing arrow.
        if (SOLDIER_CONFIG.debug) console.warn(`[Soldier Ranged] Visibility ray failed: ${error}`);
        return true;
    }
}

function findTarget(soldier) {
    const entity = soldier.entity;
    const ownTeam = getSoldierTeam(soldier);
    if (!ownTeam) return null;
    let best = null;
    let bestDistance = Infinity;
    try {
        for (const candidate of entity.dimension.getEntities({ location: entity.location, maxDistance: ARCHER_MAX_RANGE })) {
            if (!isValid(candidate) || candidate.id === entity.id || isDead(candidate) || !isEnemy(soldier, candidate)) continue;
            const distance = distanceSquared(entity.location, candidate.location);
            if (distance < bestDistance) { best = candidate; bestDistance = distance; }
        }
    } catch {}
    return best;
}

function findEntity(reference, id, radius) {
    if (!id || !isValid(reference)) return null;
    try { return reference.dimension.getEntities({ location: reference.location, maxDistance: radius }).find(entity => entity.id === id) ?? null; }
    catch { return null; }
}

function isEnemy(soldier, target) {
    if (!isValid(target)) return false;
    const ownTeam = getSoldierTeam(soldier);
    if (!ownTeam) return false;
    if (target.typeId === "minecraft:player") {
        const targetTeam = getPlayerTeam(target);
        return !!targetTeam && getTeamRelation(ownTeam, targetTeam) === TEAM_RELATION.HOSTILE;
    }
    if (target.typeId === "siedler:soldier" || target.hasTag?.("soldier")) {
        const targetTeam = getSoldierTeamFromEntity(target);
        return !!targetTeam && getTeamRelation(ownTeam, targetTeam) === TEAM_RELATION.HOSTILE;
    }
    return target.typeId?.startsWith("minecraft:") && !target.hasTag?.("villager");
}

function getSoldierTeamFromEntity(entity) {
    try {
        const ownerId = entity.getDynamicProperty("soldier:ownerId");
        if (!ownerId) return null;
        const player = world.getPlayers().find(candidate => candidate.id === ownerId);
        return player ? getPlayerTeam(player) : null;
    } catch { return null; }
}

function getShotCooldown(soldier) {
    const level = Number(soldier.level) || 1;
    return Math.max(650, DEFAULT_SHOT_COOLDOWN - (level - 1) * 65);
}

function cancelMovement(soldier) {
    soldier.desiredDirection.x = 0;
    soldier.desiredDirection.z = 0;
    soldier.velocity.x *= 0.35;
    soldier.velocity.z *= 0.35;
}

function isDead(entity) {
    try {
        const health = entity.getComponent("minecraft:health");
        return health ? health.currentValue <= 0 : false;
    } catch { return true; }
}

function isValid(entity) {
    try { return !!entity && entity.isValid === true; } catch { return false; }
}

function distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return dx * dx + dz * dz;
}

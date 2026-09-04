import { system, world } from "@minecraft/server";
import { SOLDIERS, SOLDIER_CONFIG } from "./config.js";
import { getPlayerTeam, getSoldierTeam } from "../teams/index.js";
import { getTeamRelation, TEAM_RELATION } from "../teams/relations.js";

const ARROW_ID = "minecraft:arrow";
const ARCHER_MIN_RANGE = 5.5;
const ARROW_SPEED = 2.8;
const AIM_HEIGHT = 0.95;
const ARROW_GRAVITY = 0.05;
const DEFAULT_SHOT_COOLDOWN = 1200;

let started = false;

export function startRangedAI() {
    if (started) return;
    started = true;
    system.runInterval(updateArchers, 2);
    console.info("[Soldier Ranged] Archer projectile AI started");
}

function updateArchers() {
    const now = Date.now();
    for (const soldier of SOLDIERS.values()) {
        if (soldier.type !== "archer" || !isValid(soldier.entity)) continue;
        try {
            updateArcher(soldier, now);
        } catch (error) {
            if (SOLDIER_CONFIG.debug) console.warn(`[Soldier Ranged] ${error}`);
        }
    }
}

function updateArcher(soldier, now) {
    const entity = soldier.entity;
    let target = soldier.targetId ? findEntity(entity, soldier.targetId, 26) : null;

    if (!target || !isEnemy(soldier, target)) {
        target = findTarget(soldier);
        soldier.targetId = target?.id ?? null;
    }

    // Ranged AI takes over after the normal Soldier AI tick. This prevents
    // archers from using the melee applyDamage attack and makes them fire real arrows.
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

    entity.setRotation?.({
        x: -Math.atan2(target.location.y + AIM_HEIGHT - entity.location.y, distance) * 180 / Math.PI,
        y: Math.atan2(-dx, dz) * 180 / Math.PI
    });

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

    if (shootArrow(soldier, target)) {
        soldier.rangedNextShot = now + cooldown;
    } else {
        soldier.rangedNextShot = now + 250;
    }
}

function shootArrow(soldier, target) {
    const shooter = soldier.entity;
    const dx = target.location.x - shooter.location.x;
    const dz = target.location.z - shooter.location.z;
    const horizontalDistance = Math.hypot(dx, dz);
    if (horizontalDistance <= 0.01) return false;

    const spawn = {
        x: shooter.location.x + dx / horizontalDistance * 0.55,
        y: shooter.location.y + 1.45,
        z: shooter.location.z + dz / horizontalDistance * 0.55
    };

    try {
        const arrow = shooter.dimension.spawnEntity(ARROW_ID, spawn);
        const projectile = arrow.getComponent("minecraft:projectile");
        if (!projectile?.shoot) {
            arrow.remove();
            return false;
        }

        const targetY = target.location.y + AIM_HEIGHT;
        const travelTime = horizontalDistance / ARROW_SPEED;
        const dy = targetY - spawn.y + 0.5 * ARROW_GRAVITY * travelTime * travelTime;
        const length = Math.hypot(dx, dy, dz);

        // Setting the projectile owner makes the arrow behave like a real
        // projectile fired by this soldier, including proper hit attribution.
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

        try {
            shooter.dimension.playSound("bow", shooter.location);
        } catch {}

        if (SOLDIER_CONFIG.debug) {
            console.info(`[Soldier Ranged] ${shooter.id} fired arrow at ${target.id}`);
        }
        return true;
    } catch (error) {
        if (SOLDIER_CONFIG.debug) console.warn(`[Soldier Ranged] Arrow spawn failed: ${error}`);
        return false;
    }
}

function findTarget(soldier) {
    const entity = soldier.entity;
    const ownTeam = getSoldierTeam(soldier);
    if (!ownTeam) return null;

    let best = null;
    let bestDistance = Infinity;
    try {
        for (const candidate of entity.dimension.getEntities({ location: entity.location, maxDistance: 24 })) {
            if (!isValid(candidate) || candidate.id === entity.id || isDead(candidate) || !isEnemy(soldier, candidate)) continue;
            const distance = distanceSquared(entity.location, candidate.location);
            if (distance < bestDistance) {
                best = candidate;
                bestDistance = distance;
            }
        }
    } catch {}
    return best;
}

function findEntity(reference, id, radius) {
    if (!id || !isValid(reference)) return null;
    try {
        return reference.dimension.getEntities({ location: reference.location, maxDistance: radius }).find(entity => entity.id === id) ?? null;
    } catch {
        return null;
    }
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
    } catch {
        return null;
    }
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
    } catch {
        return true;
    }
}

function isValid(entity) {
    try { return !!entity && entity.isValid === true; } catch { return false; }
}

function distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return dx * dx + dz * dz;
}

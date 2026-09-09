import { SOLDIER_CONFIG, SOLDIERS } from "./config.js";
import { getPlayerTeam, getSoldierTeam } from "../teams/index.js";
import { getTeamRelation, TEAM_RELATION } from "../teams/relations.js";

const MAX_TARGET_DISTANCE = 32;
const CHARGE_START_DISTANCE = 10;
const CHARGE_MIN_DISTANCE = 4;
const CHARGE_HIT_DISTANCE = 2.55;
const PASS_MAX_DISTANCE = 8;
const CHARGE_COOLDOWN = 3200;
const CHARGE_TIMEOUT = 1800;
const CHARGE_DAMAGE_MULTIPLIER = 2.0;
const CHARGE_IMPULSE = 0.24;
const PASS_IMPULSE = 0.075;
const ATTACK_COOLDOWN = 650;
const TARGET_SWITCH_MARGIN = 4;
const STUCK_DISTANCE = 0.22;
const STUCK_TIME = 650;

export function runCavalryAI(soldier, now) {
    const entity = soldier.entity;
    if (!entity?.isValid) return false;
    const mount = getMount(soldier);
    if (!mount) { soldier.targetId = null; stopCavalry(soldier); return false; }
    soldier.mount = mount;

    const target = getCavalryTarget(soldier);
    if (!target) { soldier.targetId = null; stopCavalry(soldier); return true; }
    soldier.targetId = target.id;

    const distance = horizontalDistance(mount.location, target.location);
    let state = soldier.cavalryState ?? "approach";

    if (isStuck(soldier, mount, now)) {
        soldier.cavalryPassSide = (soldier.cavalryPassSide ?? 1) * -1;
        soldier.cavalryState = "pass";
        state = "pass";
    }

    if (state === "charge") {
        if (!isEnemy(soldier, target) || distance > MAX_TARGET_DISTANCE + 4) {
            soldier.cavalryState = "approach";
            state = "approach";
        } else if (distance <= CHARGE_HIT_DISTANCE) {
            performChargeHit(soldier, target, now);
            setStateMove(soldier);
            setPassDirection(soldier, mount, target);
            return true;
        } else if (now - (soldier.cavalryChargeStarted ?? now) > CHARGE_TIMEOUT) {
            soldier.cavalryState = "pass";
            state = "pass";
        } else {
            setStateMove(soldier);
            setChargeDirection(soldier, mount, target);
            return true;
        }
    }

    if (state === "pass") {
        if (distance >= PASS_MAX_DISTANCE) {
            soldier.cavalryState = "approach";
        } else {
            setStateMove(soldier);
            setPassDirection(soldier, mount, target);
            return true;
        }
    }

    if (distance <= CHARGE_HIT_DISTANCE) {
        soldier.cavalryState = "pass";
        setStateMove(soldier);
        setPassDirection(soldier, mount, target);
        return true;
    }

    if (distance >= CHARGE_MIN_DISTANCE && distance <= CHARGE_START_DISTANCE && now >= (soldier.cavalryNextCharge ?? 0)) {
        startCharge(soldier, target, now);
        return true;
    }

    soldier.cavalryState = "approach";
    setStateMove(soldier);
    setApproachDirection(soldier, mount, target, distance);
    return true;
}

export function runCavalryAttackCommand(soldier, target, now) {
    if (!target?.isValid || !isEnemy(soldier, target)) return false;
    soldier.targetId = target.id;
    return runCavalryAI(soldier, now);
}

function startCharge(soldier, target, now) {
    soldier.cavalryState = "charge";
    soldier.cavalryChargeTargetId = target.id;
    soldier.cavalryChargeStarted = now;
    soldier.cavalryNextCharge = now + CHARGE_COOLDOWN;
    setStateMove(soldier);
    setChargeDirection(soldier, soldier.mount, target);
}

function performChargeHit(soldier, target, now) {
    if ((soldier.cavalryLastHit ?? 0) + ATTACK_COOLDOWN > now) {
        soldier.cavalryState = "pass";
        return;
    }
    const entity = soldier.entity;
    const damage = Number(entity.getDynamicProperty("soldier:damage") ?? 6);
    const chargedDamage = Math.max(1, Math.round(damage * CHARGE_DAMAGE_MULTIPLIER));
    try {
        target.applyDamage(chargedDamage);
        const dx = target.location.x - entity.location.x;
        const dz = target.location.z - entity.location.z;
        const length = Math.hypot(dx, dz) || 1;
        target.applyImpulse?.({ x: dx / length * CHARGE_IMPULSE, y: 0.10, z: dz / length * CHARGE_IMPULSE });
        entity.applyImpulse?.({ x: -dx / length * PASS_IMPULSE, y: 0, z: -dz / length * PASS_IMPULSE });
    } catch (error) {
        console.warn(`[Cavalry AI] Charge attack failed: ${error}`);
    }
    soldier.cavalryLastHit = now;
    soldier.cavalryState = "pass";
}

function setApproachDirection(soldier, mount, target, distance) {
    const dir = normalized(target.location.x - mount.location.x, target.location.z - mount.location.z);
    if (!dir) return;
    const side = distance < 5.5 ? (soldier.cavalryPassSide ?? 1) * 0.18 : 0;
    setDirection(soldier, mount, dir.x - dir.z * side, dir.z + dir.x * side);
}

function setChargeDirection(soldier, mount, target) {
    if (!mount?.isValid) return;
    const dir = normalized(target.location.x - mount.location.x, target.location.z - mount.location.z);
    if (dir) setDirection(soldier, mount, dir.x, dir.z);
}

function setPassDirection(soldier, mount, target) {
    if (!mount?.isValid) return;
    const dir = normalized(target.location.x - mount.location.x, target.location.z - mount.location.z);
    if (!dir) return;
    const side = soldier.cavalryPassSide ?? 1;
    setDirection(soldier, mount, -dir.z * side + dir.x * 0.55, dir.x * side + dir.z * 0.55);
}

function setDirection(soldier, mount, x, z) {
    const dir = normalized(x, z);
    if (!dir) return;
    soldier.desiredDirection.x = dir.x;
    soldier.desiredDirection.z = dir.z;
    try { mount.setRotation?.({ x: 0, y: Math.atan2(-dir.x, dir.z) * 180 / Math.PI }); } catch {}
}

function setStateMove(soldier) {
    soldier.phase = SOLDIER_CONFIG.STATES.MOVE;
    soldier.desiredDirection ??= { x: 0, z: 0 };
    soldier.velocity ??= { x: 0, z: 0 };
}

function stopCavalry(soldier) {
    soldier.cavalryState = "approach";
    if (soldier.desiredDirection) { soldier.desiredDirection.x = 0; soldier.desiredDirection.z = 0; }
    soldier.phase = SOLDIER_CONFIG.STATES.IDLE;
}

function getMount(soldier) {
    if (soldier.mount?.isValid && soldier.mount.hasTag?.("soldier_mount")) return soldier.mount;
    try {
        const entities = soldier.entity.dimension.getEntities({ location: soldier.entity.location, maxDistance: 7 });
        const owned = entities.find(e => e.isValid && e.hasTag?.("soldier_mount") && e.getDynamicProperty?.("soldier:riderId") === soldier.entity.id);
        if (owned) return owned;
    } catch {}
    return null;
}

function getCavalryTarget(soldier) {
    let current = null;
    try {
        if (soldier.targetId) current = soldier.entity.dimension.getEntities({ location: soldier.entity.location, maxDistance: MAX_TARGET_DISTANCE + 2 })
            .find(e => e.id === soldier.targetId && !isMount(e) && !isDead(e) && isEnemy(soldier, e)) ?? null;
    } catch {}

    let best = null;
    let bestScore = Infinity;
    try {
        for (const candidate of soldier.entity.dimension.getEntities({ location: soldier.entity.location, maxDistance: MAX_TARGET_DISTANCE })) {
            if (!candidate.isValid || candidate.id === soldier.entity.id || isMount(candidate) || isDead(candidate) || !isEnemy(soldier, candidate)) continue;
            const distance = Math.sqrt(distanceSquared(candidate.location, soldier.entity.location));
            const score = distance + targetPriority(candidate);
            if (score < bestScore) { best = candidate; bestScore = score; }
        }
    } catch (error) { console.warn(`[Cavalry AI] Target search failed: ${error}`); }

    if (current && best && current.id !== best.id) {
        const currentDistance = Math.sqrt(distanceSquared(current.location, soldier.entity.location));
        if (bestScore + TARGET_SWITCH_MARGIN >= currentDistance) return current;
    }
    return current ?? best;
}

function targetPriority(e) {
    if (e.typeId === "minecraft:player") return -4;
    if (e.hasTag?.("soldier") || ["siedler:soldier", "siedler:infantry", "siedler:archer", "siedler:cavalry"].includes(e.typeId)) return -3;
    return 0;
}

const MONSTER_TYPES = new Set([
    "minecraft:zombie", "minecraft:zombie_villager", "minecraft:husk", "minecraft:drowned",
    "minecraft:skeleton", "minecraft:stray", "minecraft:bogged", "minecraft:wither_skeleton",
    "minecraft:creeper", "minecraft:spider", "minecraft:cave_spider", "minecraft:silverfish",
    "minecraft:endermite", "minecraft:enderman", "minecraft:witch", "minecraft:phantom", "minecraft:slime",
    "minecraft:magma_cube", "minecraft:blaze", "minecraft:ghast", "minecraft:guardian", "minecraft:elder_guardian",
    "minecraft:shulker", "minecraft:pillager", "minecraft:vindicator", "minecraft:evocation_illager", "minecraft:vex",
    "minecraft:ravager", "minecraft:piglin", "minecraft:piglin_brute", "minecraft:zombified_piglin",
    "minecraft:hoglin", "minecraft:zoglin", "minecraft:warden", "minecraft:breeze"
]);

function isMount(e) { try { return !!e?.hasTag?.("soldier_mount"); } catch { return false; } }

function isEnemy(soldier, target) {
    const team = getSoldierTeam(soldier);
    if (!team || !target?.isValid || isMount(target)) return false;
    if (target.typeId === "minecraft:player") {
        const t = getPlayerTeam(target);
        return !!t && getTeamRelation(team, t) === TEAM_RELATION.HOSTILE;
    }
    if (target.hasTag?.("soldier") || ["siedler:soldier", "siedler:infantry", "siedler:archer", "siedler:cavalry"].includes(target.typeId)) {
        const s = SOLDIERS.get(target.id);
        const t = s ? getSoldierTeam(s) : null;
        return !!t && getTeamRelation(team, t) === TEAM_RELATION.HOSTILE;
    }
    return MONSTER_TYPES.has(target.typeId);
}

function isDead(e) { try { return (e.getComponent("minecraft:health")?.currentValue ?? 1) <= 0; } catch { return false; } }

function isStuck(soldier, mount, now) {
    if (!soldier.cavalryLastPosition) {
        soldier.cavalryLastPosition = { ...mount.location };
        soldier.cavalryLastPositionAt = now;
        return false;
    }
    const moved = Math.sqrt(distanceSquared(mount.location, soldier.cavalryLastPosition));
    if (moved >= STUCK_DISTANCE) {
        soldier.cavalryLastPosition = { ...mount.location };
        soldier.cavalryLastPositionAt = now;
        return false;
    }
    return now - (soldier.cavalryLastPositionAt ?? now) >= STUCK_TIME && soldier.phase === SOLDIER_CONFIG.STATES.MOVE;
}

function normalized(x, z) { const l = Math.hypot(x, z); return l <= 0.001 ? null : { x: x / l, z: z / l }; }
function horizontalDistance(a, b) { return Math.hypot(b.x - a.x, b.z - a.z); }
function distanceSquared(a, b) { const x = b.x - a.x, z = b.z - a.z; return x * x + z * z; }

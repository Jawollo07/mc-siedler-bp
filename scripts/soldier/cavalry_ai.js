import { world } from "@minecraft/server";
import { SOLDIER_CONFIG, SOLDIERS } from "./config.js";
import { getPlayerTeam, getSoldierTeam } from "../teams/index.js";
import { getTeamRelation, TEAM_RELATION } from "../teams/relations.js";

const CHARGE_DISTANCE = 8;
const CHARGE_MIN_DISTANCE = 3.0;
const PASS_DISTANCE = 2.6;
const REPOSITION_DISTANCE = 5;
const ATTACK_COOLDOWN = 850;
const CHARGE_COOLDOWN = 5000;
const CHARGE_DAMAGE_MULTIPLIER = 1.75;
const CHARGE_IMPULSE = 0.18;
const PASS_IMPULSE = 0.08;
const MAX_TARGET_DISTANCE = 24;

/**
 * Dedicated cavalry combat AI.
 * Movement is handled by ai.js/applyNaturalMovement(). This module only
 * calculates the desired direction and combat state. That prevents the
 * mounted unit from receiving two competing movement systems.
 */
export function runCavalryAI(soldier, now) {
    const entity = soldier.entity;
    if (!entity?.isValid) return false;

    const mount = getMount(soldier);
    if (!mount) {
        soldier.targetId = null;
        stopCavalry(soldier);
        return false;
    }

    const target = getCavalryTarget(soldier);
    if (!target) {
        soldier.targetId = null;
        stopCavalry(soldier);
        return true;
    }

    soldier.mount = mount;
    soldier.targetId = target.id;
    const distance = horizontalDistance(entity.location, target.location);

    if (soldier.cavalryState === "charge" && distance <= PASS_DISTANCE) {
        performChargeHit(soldier, target, now);
        return true;
    }

    if (soldier.cavalryState === "pass" && distance >= REPOSITION_DISTANCE) {
        soldier.cavalryState = "circle";
    }

    if (soldier.cavalryState === "circle" || !soldier.cavalryState) {
        setStateMove(soldier);
        if (distance >= CHARGE_MIN_DISTANCE && distance <= CHARGE_DISTANCE && now >= (soldier.cavalryNextCharge ?? 0)) {
            startCharge(soldier, target, now);
            return true;
        }
        setCavalryDirection(soldier, target, false);
        return true;
    }

    if (soldier.cavalryState === "charge") {
        setStateMove(soldier);
        setCavalryDirection(soldier, target, true);
        return true;
    }

    if (soldier.cavalryState === "pass") {
        setStateMove(soldier);
        setCavalryDirection(soldier, target, false);
        return true;
    }

    setStateMove(soldier);
    setCavalryDirection(soldier, target, false);
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
    setCavalryDirection(soldier, target, true);
}

function performChargeHit(soldier, target, now) {
    if ((soldier.cavalryLastHit ?? 0) + ATTACK_COOLDOWN > now) {
        soldier.cavalryState = "pass";
        setStateMove(soldier);
        return;
    }

    const entity = soldier.entity;
    const damage = Number(entity.getDynamicProperty("soldier:damage") ?? 6);
    const chargedDamage = Math.max(1, Math.round(damage * CHARGE_DAMAGE_MULTIPLIER));

    try {
        target.applyDamage(chargedDamage);
        const dx = target.location.x - entity.location.x;
        const dz = target.location.z - entity.location.z;
        const distance = Math.hypot(dx, dz) || 1;
        target.applyImpulse?.({
            x: (dx / distance) * CHARGE_IMPULSE,
            y: 0.05,
            z: (dz / distance) * CHARGE_IMPULSE
        });
        entity.applyImpulse?.({
            x: (-dx / distance) * PASS_IMPULSE,
            y: 0,
            z: (-dz / distance) * PASS_IMPULSE
        });
    } catch (error) {
        console.warn(`[Cavalry AI] Charge attack failed: ${error}`);
    }

    soldier.cavalryLastHit = now;
    soldier.cavalryState = "pass";
    soldier.cavalryNextCharge = now + CHARGE_COOLDOWN;
    setStateMove(soldier);
}

function setCavalryDirection(soldier, target, aggressive) {
    const entity = soldier.entity;
    const mount = getMount(soldier);
    if (!mount?.isValid) return;

    const dx = target.location.x - entity.location.x;
    const dz = target.location.z - entity.location.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= 0.01) return;

    let dirX = dx / distance;
    let dirZ = dz / distance;

    // During a pass, keep riding forward instead of turning directly into the target.
    if (soldier.cavalryState === "pass") {
        const rotation = mount.getRotation?.() ?? entity.getRotation?.() ?? { y: 0 };
        const yaw = Number(rotation.y) * Math.PI / 180;
        dirX = -Math.sin(yaw);
        dirZ = Math.cos(yaw);
    }

    // applyNaturalMovement() consumes these values and moves the mount.
    soldier.desiredDirection.x = dirX;
    soldier.desiredDirection.z = dirZ;

    try {
        const yaw = Math.atan2(-dirX, dirZ) * 180 / Math.PI;
        mount.setRotation?.({ x: 0, y: yaw });
    } catch {}
}

function setStateMove(soldier) {
    // ai.js uses phase === MOVE as the movement gate. The old cavalry AI only
    // changed cavalryState, so applyNaturalMovement() considered the horse idle.
    soldier.phase = SOLDIER_CONFIG.STATES.MOVE;
    if (!soldier.desiredDirection) soldier.desiredDirection = { x: 0, z: 0 };
    if (!soldier.velocity) soldier.velocity = { x: 0, z: 0 };
}

function stopCavalry(soldier) {
    soldier.cavalryState = "circle";
    if (soldier.desiredDirection) {
        soldier.desiredDirection.x = 0;
        soldier.desiredDirection.z = 0;
    }
    if (soldier.velocity) {
        soldier.velocity.x *= 0.5;
        soldier.velocity.z *= 0.5;
    }
    soldier.phase = SOLDIER_CONFIG.STATES.IDLE;
}

function getMount(soldier) {
    if (soldier.mount?.isValid && soldier.mount.hasTag?.("soldier_mount")) return soldier.mount;
    try {
        const nearby = soldier.entity.dimension.getEntities({
            location: soldier.entity.location,
            maxDistance: 3.5
        });
        return nearby.find(entity =>
            entity.isValid &&
            entity.id !== soldier.entity.id &&
            entity.hasTag?.("soldier_mount")
        ) ?? null;
    } catch {
        return null;
    }
}

function getCavalryTarget(soldier) {
    if (soldier.targetId) {
        try {
            for (const entity of soldier.entity.dimension.getEntities({
                location: soldier.entity.location,
                maxDistance: MAX_TARGET_DISTANCE
            })) {
                if (
                    entity.id === soldier.targetId &&
                    !isMount(entity) &&
                    isEnemy(soldier, entity) &&
                    !isDead(entity)
                ) return entity;
            }
        } catch {}
    }

    let best = null;
    let bestDistance = Infinity;
    try {
        for (const candidate of soldier.entity.dimension.getEntities({
            location: soldier.entity.location,
            maxDistance: MAX_TARGET_DISTANCE
        })) {
            if (
                !candidate.isValid ||
                candidate.id === soldier.entity.id ||
                isMount(candidate) ||
                isDead(candidate) ||
                !isEnemy(soldier, candidate)
            ) continue;

            const distance = horizontalDistanceSquared(soldier.entity.location, candidate.location);
            if (distance < bestDistance) {
                best = candidate;
                bestDistance = distance;
            }
        }
    } catch (error) {
        console.warn(`[Cavalry AI] Target search failed: ${error}`);
    }
    return best;
}

function isMount(entity) {
    try {
        return !!entity?.hasTag?.("soldier_mount");
    } catch {
        return false;
    }
}

function isEnemy(soldier, target) {
    const soldierTeam = getSoldierTeam(soldier);
    if (!soldierTeam || !target?.isValid || isMount(target)) return false;

    if (target.typeId === "minecraft:player") {
        const targetTeam = getPlayerTeam(target);
        return !!targetTeam && getTeamRelation(soldierTeam, targetTeam) === TEAM_RELATION.HOSTILE;
    }

    if (target.hasTag?.("soldier") || target.typeId === "siedler:soldier" || target.typeId === "siedler:infantry" || target.typeId === "siedler:archer" || target.typeId === "siedler:cavalry") {
        const targetSoldier = SOLDIERS.get(target.id);
        const targetTeam = targetSoldier ? getSoldierTeam(targetSoldier) : null;
        return !!targetTeam && getTeamRelation(soldierTeam, targetTeam) === TEAM_RELATION.HOSTILE;
    }

    return target.typeId?.startsWith("minecraft:") && !target.hasTag?.("villager");
}

function isDead(entity) {
    try {
        return (entity.getComponent("minecraft:health")?.currentValue ?? 1) <= 0;
    } catch {
        return false;
    }
}

function horizontalDistance(a, b) {
    return Math.hypot(b.x - a.x, b.z - a.z);
}

function horizontalDistanceSquared(a, b) {
    const x = b.x - a.x;
    const z = b.z - a.z;
    return x * x + z * z;
}

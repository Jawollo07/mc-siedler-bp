import { system } from "@minecraft/server";

import {
    SOLDIERS,
    SOLDIER_CONFIG
} from "./config.js";

import {
    getPlayerTeam,
    getSoldierTeam
} from "../teams/index.js";

import {
    getTeamRelation,
    TEAM_RELATION
} from "../teams/relations.js";

const ARROW_ID = "minecraft:arrow";

const ARCHER_MIN_RANGE = 6;
const ARCHER_PREFERRED_RANGE = 12;
const ARCHER_MAX_RANGE = 40;

// Bedrock's projectile shoot speed is kept at 6.0 for the intended
// soldier bow range. The ballistic solver uses the exact same value.
const ARROW_SPEED = 6.0;
const ARROW_GRAVITY = 0.05;
const ARROW_DRAG = 0.99;
const MAX_ARROW_FLIGHT_TICKS = 120;

const AIM_HEIGHT = 0.95;
const AIM_FORWARD_OFFSET = 0.35;
const TARGET_LEAD_ITERATIONS = 3;
const MAX_LEAD_TICKS = 20;

const DEFAULT_SHOT_COOLDOWN = 1200;
const TARGET_RECHECK_MS = 500;
const VISIBILITY_MARGIN = 0.05;
const ARROW_TRACK_INTERVAL = 1;

const RETREAT_SPEED = 0.20;
const APPROACH_SPEED = 0.18;

const STRAFE_INTERVAL = 1200;
const STRAFE_DURATION = 650;
const STRAFE_STRENGTH = 0.055;

let started = false;

export function startRangedAI() {
    if (started) return;
    started = true;

    system.runInterval(updateArchers, 2);
    system.runInterval(updateTrackedArrows, ARROW_TRACK_INTERVAL);

    console.info("[Soldier Ranged AI] Started");
}

function updateArchers() {
    const now = Date.now();

    for (const [id, soldier] of SOLDIERS) {
        try {
            if (!isValid(soldier.entity)) {
                SOLDIERS.delete(id);
                continue;
            }

            if (soldier.type !== "archer") continue;
            updateArcher(soldier, now);
        } catch (error) {
            console.warn(`[Soldier Ranged AI] Archer update failed: ${formatError(error)}`);
        }
    }
}

function updateArcher(soldier, now) {
    const entity = soldier.entity;
    if (!isValid(entity)) return;

    let target = null;

    if (soldier.targetId) {
        target = findEntityById(entity, soldier.targetId);

        if (!target || !isValid(target) || isDead(target) || !isEnemy(soldier, target)) {
            soldier.targetId = null;
            target = null;
        }
    }

    if (!target && (!soldier.rangedLastTargetSearch || now >= soldier.rangedLastTargetSearch)) {
        target = findTarget(soldier);
        soldier.rangedLastTargetSearch = now + TARGET_RECHECK_MS;
        if (target) soldier.targetId = target.id;
    }

    if (!target) {
        soldier.targetId = null;
        cancelMovement(soldier);
        soldier.phase = SOLDIER_CONFIG.STATES.IDLE;
        return;
    }

    const dx = target.location.x - entity.location.x;
    const dz = target.location.z - entity.location.z;
    const distance = Math.hypot(dx, dz);

    if (distance > ARCHER_MAX_RANGE) {
        moveTowardTarget(soldier, target, APPROACH_SPEED);
        faceTarget(entity, target);
        soldier.phase = SOLDIER_CONFIG.STATES.MOVE;
        return;
    }

    if (distance < ARCHER_MIN_RANGE) {
        moveAwayFromTarget(soldier, target, RETREAT_SPEED);
        faceTarget(entity, target);
        soldier.phase = SOLDIER_CONFIG.STATES.MOVE;
        return;
    }

    if (!hasLineOfSight(entity, target)) {
        moveTowardTarget(soldier, target, APPROACH_SPEED * 0.65);
        faceTarget(entity, target);
        soldier.phase = SOLDIER_CONFIG.STATES.MOVE;
        return;
    }

    faceTarget(entity, target);

    if (distance > ARCHER_PREFERRED_RANGE + 2) {
        moveTowardTarget(soldier, target, APPROACH_SPEED * 0.55);
        soldier.phase = SOLDIER_CONFIG.STATES.MOVE;
        return;
    }

    if (distance < ARCHER_PREFERRED_RANGE - 2) {
        moveAwayFromTarget(soldier, target, RETREAT_SPEED * 0.55);
        soldier.phase = SOLDIER_CONFIG.STATES.MOVE;
        return;
    }

    soldier.phase = SOLDIER_CONFIG.STATES.ATTACK;
    cancelMovement(soldier);
    updateStrafe(soldier, target, now);

    if (!soldier.rangedNextShot || now >= soldier.rangedNextShot) {
        shootArrow(soldier, target, now);
    }
}

function findTarget(soldier) {
    const entity = soldier.entity;
    if (!isValid(entity)) return null;

    const candidates = entity.dimension.getEntities({
        location: entity.location,
        maxDistance: ARCHER_MAX_RANGE
    });

    let bestTarget = null;
    let bestScore = Infinity;

    for (const candidate of candidates) {
        if (!isValid(candidate) || candidate.id === entity.id || isDead(candidate)) continue;

        const ownerId = soldier.ownerId ?? getDynamicString(entity, "soldier:ownerId", null);
        if (ownerId && candidate.id === ownerId) continue;
        if (!isEnemy(soldier, candidate)) continue;

        const distance = Math.sqrt(distanceSquared(entity.location, candidate.location));
        let score = distance;

        if (hasLineOfSight(entity, candidate)) score -= 5;
        else score += 8;

        if (candidate.typeId === "minecraft:player") score -= 3;
        if (candidate.typeId === "siedler:soldier") score -= 2;

        score += Math.abs(distance - ARCHER_PREFERRED_RANGE) * 0.25;

        if (score < bestScore) {
            bestScore = score;
            bestTarget = candidate;
        }
    }

    return bestTarget;
}

function moveTowardTarget(soldier, target, speed) {
    const entity = soldier.entity;
    const dx = target.location.x - entity.location.x;
    const dz = target.location.z - entity.location.z;
    const distance = Math.hypot(dx, dz);

    if (distance <= 0.01) {
        cancelMovement(soldier);
        return;
    }

    soldier.desiredDirection = { x: dx / distance, z: dz / distance };
    soldier.rangedMovementSpeed = speed;
}

function moveAwayFromTarget(soldier, target, speed) {
    const entity = soldier.entity;
    const dx = entity.location.x - target.location.x;
    const dz = entity.location.z - target.location.z;
    const distance = Math.hypot(dx, dz);

    if (distance <= 0.01) {
        cancelMovement(soldier);
        return;
    }

    soldier.desiredDirection = { x: dx / distance, z: dz / distance };
    soldier.rangedMovementSpeed = speed;
}

function cancelMovement(soldier) {
    soldier.desiredDirection = { x: 0, z: 0 };
    soldier.rangedMovementSpeed = 0;

    if (soldier.velocity) {
        soldier.velocity.x = 0;
        soldier.velocity.z = 0;
    }
}

function updateStrafe(soldier, target, now) {
    if (!soldier.rangedStrafe) {
        soldier.rangedStrafe = { x: 0, z: 0, until: 0, next: now };
    }

    const strafe = soldier.rangedStrafe;

    if (now >= strafe.next) {
        const dx = target.location.x - soldier.entity.location.x;
        const dz = target.location.z - soldier.entity.location.z;
        const distance = Math.hypot(dx, dz);

        if (distance <= 0.01) return;

        const side = Math.random() < 0.5 ? -1 : 1;
        strafe.x = (-dz / distance) * side;
        strafe.z = (dx / distance) * side;
        strafe.until = now + STRAFE_DURATION;
        strafe.next = now + STRAFE_INTERVAL + Math.random() * 500;
    }

    if (now < strafe.until) {
        soldier.desiredDirection = { x: strafe.x, z: strafe.z };
        soldier.rangedMovementSpeed = STRAFE_STRENGTH;
        return;
    }

    soldier.desiredDirection = { x: 0, z: 0 };
    soldier.rangedMovementSpeed = 0;
}

function shootArrow(soldier, target, now) {
    const entity = soldier.entity;
    if (!isValid(entity) || !isValid(target)) return;

    const origin = {
        x: entity.location.x,
        y: entity.location.y + AIM_HEIGHT,
        z: entity.location.z
    };

    const predictedTarget = predictTargetPosition(origin, target);
    const dx = predictedTarget.x - origin.x;
    const dz = predictedTarget.z - origin.z;
    const horizontalDistance = Math.hypot(dx, dz);

    if (horizontalDistance <= 0.01) return;

    const direction = calculateArrowDirection(origin, predictedTarget, horizontalDistance);
    if (!direction) return;

    const spawnLocation = {
        x: origin.x + direction.x * AIM_FORWARD_OFFSET,
        y: origin.y + direction.y * AIM_FORWARD_OFFSET,
        z: origin.z + direction.z * AIM_FORWARD_OFFSET
    };

    let arrow = null;

    try {
        arrow = entity.dimension.spawnEntity(ARROW_ID, spawnLocation);
    } catch (error) {
        console.warn(`[Soldier Ranged AI] Arrow spawn failed: ${formatError(error)}`);
        return;
    }

    if (!isValid(arrow)) return;

    try {
        const projectile = arrow.getComponent("minecraft:projectile");
        if (!projectile) {
            arrow.remove();
            return;
        }

        try { projectile.owner = entity; } catch {}

        projectile.shoot(direction, {
            speed: ARROW_SPEED,
            uncertainty: 0
        });

        setArrowRotation(arrow, direction);
    } catch (error) {
        console.warn(`[Soldier Ranged AI] Projectile launch failed: ${formatError(error)}`);
        try { arrow.remove(); } catch {}
        return;
    }

    try {
        arrow.setDynamicProperty("siedler:archerArrow", true);
        arrow.setDynamicProperty("siedler:ownerId", entity.id);
        arrow.setDynamicProperty("siedler:level", soldier.level ?? 1);
        arrow.setDynamicProperty("siedler:targetId", target.id);
    } catch {}

    trackArrow(arrow, entity.id, now);
    soldier.rangedNextShot = now + getShotCooldown(soldier);

    try {
        entity.dimension.playSound("random.bow", entity.location);
    } catch {}
}

function predictTargetPosition(origin, target) {
    const predicted = {
        x: target.location.x,
        y: target.location.y + AIM_HEIGHT,
        z: target.location.z
    };

    let flightTicks = estimateFlightTicks(origin, predicted);
    const velocity = getEntityVelocity(target);

    if (!velocity) return predicted;

    for (let iteration = 0; iteration < TARGET_LEAD_ITERATIONS; iteration++) {
        const leadTicks = Math.min(MAX_LEAD_TICKS, flightTicks);

        predicted.x = target.location.x + velocity.x * leadTicks;
        predicted.y = target.location.y + AIM_HEIGHT + velocity.y * leadTicks;
        predicted.z = target.location.z + velocity.z * leadTicks;

        flightTicks = estimateFlightTicks(origin, predicted);
    }

    return predicted;
}

function calculateArrowDirection(origin, target, horizontalDistance) {
    const dx = target.x - origin.x;
    const dz = target.z - origin.z;
    const targetHeight = target.y - origin.y;

    if (horizontalDistance <= 0.01) return null;

    const horizontalX = dx / horizontalDistance;
    const horizontalZ = dz / horizontalDistance;

    const minAngle = -0.25;
    const maxAngle = 1.05;
    const samples = 52;

    let previousAngle = minAngle;
    let previousError = getArrowHeightAtDistance(horizontalDistance, previousAngle) - targetHeight;
    let solutionAngle = null;

    for (let i = 1; i <= samples; i++) {
        const angle = minAngle + (maxAngle - minAngle) * (i / samples);
        const error = getArrowHeightAtDistance(horizontalDistance, angle) - targetHeight;

        if (previousError === 0 || error === 0 || previousError * error < 0) {
            let lower = previousAngle;
            let upper = angle;
            let lowerError = previousError;

            for (let iteration = 0; iteration < 18; iteration++) {
                const middle = (lower + upper) / 2;
                const middleError = getArrowHeightAtDistance(horizontalDistance, middle) - targetHeight;

                if (Math.abs(middleError) < 0.0005) {
                    lower = middle;
                    upper = middle;
                    break;
                }

                if (lowerError * middleError <= 0) {
                    upper = middle;
                } else {
                    lower = middle;
                    lowerError = middleError;
                }
            }

            solutionAngle = (lower + upper) / 2;
            break;
        }

        previousAngle = angle;
        previousError = error;
    }

    if (solutionAngle === null) {
        let bestAngle = minAngle;
        let bestError = Infinity;

        for (let i = 0; i <= samples; i++) {
            const angle = minAngle + (maxAngle - minAngle) * (i / samples);
            const error = Math.abs(getArrowHeightAtDistance(horizontalDistance, angle) - targetHeight);

            if (error < bestError) {
                bestError = error;
                bestAngle = angle;
            }
        }

        solutionAngle = bestAngle;
    }

    const horizontalFactor = Math.cos(solutionAngle);

    return {
        x: horizontalX * horizontalFactor,
        y: Math.sin(solutionAngle),
        z: horizontalZ * horizontalFactor
    };
}

function getArrowHeightAtDistance(horizontalDistance, angle) {
    let horizontalPosition = 0;
    let height = 0;
    let horizontalVelocity = Math.cos(angle) * ARROW_SPEED;
    let verticalVelocity = Math.sin(angle) * ARROW_SPEED;

    for (let tick = 0; tick < MAX_ARROW_FLIGHT_TICKS; tick++) {
        const previousHorizontalPosition = horizontalPosition;
        const previousHeight = height;

        horizontalPosition += horizontalVelocity;
        height += verticalVelocity;

        if (horizontalPosition >= horizontalDistance) {
            const segment = horizontalPosition - previousHorizontalPosition;
            const progress = segment > 0
                ? (horizontalDistance - previousHorizontalPosition) / segment
                : 0;

            return previousHeight + (height - previousHeight) * progress;
        }

        horizontalVelocity *= ARROW_DRAG;
        verticalVelocity = verticalVelocity * ARROW_DRAG - ARROW_GRAVITY;
    }

    return height;
}

function estimateFlightTicks(origin, target) {
    const horizontalDistance = Math.hypot(
        target.x - origin.x,
        target.z - origin.z
    );

    if (horizontalDistance <= 0.01) return 1;

    let horizontalVelocity = ARROW_SPEED;
    let position = 0;

    for (let tick = 1; tick <= MAX_ARROW_FLIGHT_TICKS; tick++) {
        position += horizontalVelocity;
        if (position >= horizontalDistance) return tick;
        horizontalVelocity *= ARROW_DRAG;
    }

    return MAX_ARROW_FLIGHT_TICKS;
}

const trackedArrows = new Map();

function trackArrow(arrow, ownerId, now) {
    trackedArrows.set(arrow.id, {
        arrow,
        ownerId,
        lastPosition: { ...arrow.location },
        createdAt: now
    });
}

function updateTrackedArrows() {
    const now = Date.now();

    for (const [id, data] of trackedArrows) {
        const arrow = data.arrow;

        if (!isValid(arrow)) {
            trackedArrows.delete(id);
            continue;
        }

        try {
            const current = arrow.location;
            const dx = current.x - data.lastPosition.x;
            const dy = current.y - data.lastPosition.y;
            const dz = current.z - data.lastPosition.z;
            const distance = Math.hypot(dx, dy, dz);

            if (distance > 0.01) {
                const direction = {
                    x: dx / distance,
                    y: dy / distance,
                    z: dz / distance
                };

                if (hasBlockingRay(arrow.dimension, data.lastPosition, direction, distance)) {
                    try { arrow.remove(); } catch {}
                    trackedArrows.delete(id);
                    continue;
                }

                setArrowRotation(arrow, direction);
            }

            data.lastPosition = { ...current };

            if (now - data.createdAt > 10000) {
                try { arrow.remove(); } catch {}
                trackedArrows.delete(id);
            }
        } catch {
            trackedArrows.delete(id);
        }
    }
}

function hasLineOfSight(source, target) {
    const heights = [0.25, 0.65, 0.95, 1.35];

    for (const height of heights) {
        const start = {
            x: source.location.x,
            y: source.location.y + 1,
            z: source.location.z
        };

        const end = {
            x: target.location.x,
            y: target.location.y + height,
            z: target.location.z
        };

        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const dz = end.z - start.z;
        const distance = Math.hypot(dx, dy, dz);

        if (distance <= 0.01) return true;

        const direction = {
            x: dx / distance,
            y: dy / distance,
            z: dz / distance
        };

        if (!hasBlockingRay(
            source.dimension,
            start,
            direction,
            Math.max(0, distance - VISIBILITY_MARGIN)
        )) return true;
    }

    return false;
}

function hasBlockingRay(dimension, location, direction, maxDistance) {
    try {
        return !!dimension.getBlockFromRay(location, direction, { maxDistance });
    } catch {
        return true;
    }
}

function isEnemy(soldier, entity) {
    if (!isValid(entity)) return false;

    const archer = soldier.entity;
    if (!isValid(archer) || entity.id === archer.id) return false;

    const ownerId = soldier.ownerId ?? getDynamicString(archer, "soldier:ownerId", null);
    if (ownerId && entity.id === ownerId) return false;

    const typeId = entity.typeId ?? "";

    const friendlyTypes = new Set([
        "siedler:trader",
        "siedler:villager",
        "siedler:merchant"
    ]);

    if (friendlyTypes.has(typeId)) return false;

    if (typeId === "minecraft:player") {
        const soldierTeam = getSoldierTeam(soldier);
        const playerTeam = getPlayerTeam(entity);
        if (!soldierTeam || !playerTeam) return false;

        return getTeamRelation(soldierTeam, playerTeam) === TEAM_RELATION.HOSTILE;
    }

    if (typeId === "siedler:soldier") {
        const soldierTeam = getSoldierTeam(soldier);
        const targetSoldier = SOLDIERS.get(entity.id);
        const targetTeam = targetSoldier ? getSoldierTeam(targetSoldier) : null;
        if (!soldierTeam || !targetTeam) return false;

        return getTeamRelation(soldierTeam, targetTeam) === TEAM_RELATION.HOSTILE;
    }

    if (typeId.startsWith("siedler:")) return isExplicitSiedlerEnemy(entity);

    if (typeId.startsWith("minecraft:")) {
        const families = getTypeFamily(entity);
        return families.includes("monster") || families.includes("hostile");
    }

    return false;
}

function isExplicitSiedlerEnemy(entity) {
    const hostileTypes = new Set([
        "siedler:monster",
        "siedler:pillager",
        "siedler:raider"
    ]);

    if (hostileTypes.has(entity.typeId)) return true;

    const families = getTypeFamily(entity);
    return families.includes("monster") || families.includes("hostile");
}

function findEntityById(source, id) {
    if (!id) return null;

    try {
        for (const entity of source.dimension.getEntities()) {
            if (entity.id === id) return entity;
        }
    } catch {}

    return null;
}

function getTypeFamily(entity) {
    try {
        return entity.getComponent("minecraft:type_family")?.getTypeFamilies?.() ?? [];
    } catch {
        return [];
    }
}

function getDynamicString(entity, property, fallback = null) {
    try {
        const value = entity.getDynamicProperty(property);
        return typeof value === "string" && value.length > 0 ? value : fallback;
    } catch {
        return fallback;
    }
}

function getEntityVelocity(entity) {
    try {
        const velocity = entity.getVelocity?.();
        if (!velocity) return null;

        return {
            x: Number(velocity.x) || 0,
            y: Number(velocity.y) || 0,
            z: Number(velocity.z) || 0
        };
    } catch {
        return null;
    }
}

function getShotCooldown(soldier) {
    const level = Math.max(1, Number(soldier.level ?? 1));
    const reduction = Math.min(0.40, (level - 1) * 0.07);

    return Math.max(600, DEFAULT_SHOT_COOLDOWN * (1 - reduction));
}

function distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
}

function faceTarget(entity, target) {
    try {
        const dx = target.location.x - entity.location.x;
        const dz = target.location.z - entity.location.z;
        const horizontal = Math.hypot(dx, dz);
        if (horizontal <= 0.01) return;

        const yaw = Math.atan2(-dx, dz) * 180 / Math.PI;
        entity.setRotation({ x: 0, y: yaw });
    } catch {}
}

function setArrowRotation(arrow, direction) {
    try {
        const horizontal = Math.hypot(direction.x, direction.z);
        if (horizontal <= 0.0001) return;

        const yaw = Math.atan2(-direction.x, direction.z) * 180 / Math.PI;
        const pitch = -Math.atan2(direction.y, horizontal) * 180 / Math.PI;

        arrow.setRotation({ x: pitch, y: yaw });
    } catch {}
}

function isDead(entity) {
    try {
        const health = entity.getComponent("minecraft:health");
        return !!health && health.currentValue <= 0;
    } catch {
        return false;
    }
}

function isValid(entity) {
    try {
        if (!entity) return false;
        return typeof entity.isValid === "function"
            ? entity.isValid()
            : entity.isValid === true;
    } catch {
        return false;
    }
}

function formatError(error) {
    return error instanceof Error ? error.message : String(error);
}
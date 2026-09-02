import { system } from "@minecraft/server";
import { SOLDIERS, SOLDIER_CONFIG } from "./config.js";

export function startSoldierAI() {
    if (!SOLDIER_CONFIG.enabled) {
        console.info("[Soldier AI] Disabled");
        return;
    }

    system.runInterval(updateSoldiers, SOLDIER_CONFIG.AI_INTERVAL);
    console.info(
        `[Soldier AI] Started (AI=${SOLDIER_CONFIG.AI_INTERVAL}, target=${SOLDIER_CONFIG.TARGET_INTERVAL})`
    );
}

function updateSoldiers() {
    if (SOLDIERS.size === 0) return;

    const now = Date.now();

    for (const [entityId, soldier] of SOLDIERS) {
        try {
            if (!updateSoldier(soldier, now)) {
                SOLDIERS.delete(entityId);
            }
        } catch (error) {
            console.warn(
                `[Soldier AI] Failed to update ${entityId}: ${formatError(error)}`
            );
        }
    }
}

function updateSoldier(soldier, now) {
    const entity = soldier?.entity;

    if (!isValidEntity(entity)) return false;

    synchronizeSoldierData(soldier);

    if (soldier.targetId) {
        const target = findEntityById(entity, soldier.targetId);

        if (!target || !isEnemy(entity, target)) {
            clearTarget(soldier);
        }
    }

    if (!soldier.targetId && now >= soldier.nextTargetSearch) {
        const target = findTarget(entity);

        soldier.nextTargetSearch = now + ticksToMilliseconds(SOLDIER_CONFIG.TARGET_INTERVAL);

        if (target) setTarget(soldier, target);
    }

    if (!soldier.targetId) {
        setState(soldier, SOLDIER_CONFIG.STATES.IDLE);
        return true;
    }

    const target = findEntityById(entity, soldier.targetId);

    if (!target || !isEnemy(entity, target)) {
        clearTarget(soldier);
        return true;
    }

    const distance = distanceBetween(entity.location, target.location);
    const attackRange = getDynamicNumber(entity, "soldier:attackRange", SOLDIER_CONFIG.DEFAULT_ATTACK_RANGE);

    if (distance <= attackRange + SOLDIER_CONFIG.ATTACK_DISTANCE_PADDING) {
        setState(soldier, SOLDIER_CONFIG.STATES.ATTACK);

        if (now >= soldier.nextAttack) {
            attack(soldier, target);
            soldier.nextAttack = now + getAttackCooldown(soldier);
        }

        return true;
    }

    setState(soldier, SOLDIER_CONFIG.STATES.MOVE);

    if (now >= soldier.nextMovement) {
        moveTowards(entity, target);
        soldier.nextMovement = now + ticksToMilliseconds(SOLDIER_CONFIG.MOVEMENT_INTERVAL);
    }

    return true;
}

function synchronizeSoldierData(soldier) {
    if (!Number.isFinite(soldier.nextAttack)) soldier.nextAttack = 0;
    if (!Number.isFinite(soldier.nextTargetSearch)) soldier.nextTargetSearch = 0;
    if (!Number.isFinite(soldier.nextMovement)) soldier.nextMovement = 0;
    if (!soldier.phase) soldier.phase = SOLDIER_CONFIG.STATES.IDLE;
    if (!soldier.abilityCooldowns) soldier.abilityCooldowns = {};
}
function findEntityById(referenceEntity, targetId) {
    if (!targetId || !isValidEntity(referenceEntity)) return null;

    try {
        const entities = referenceEntity.dimension.getEntities({
            location: referenceEntity.location,
            maxDistance: SOLDIER_CONFIG.SEARCH_RADIUS + 4
        });

        for (const entity of entities) {
            if (entity.id === targetId) return entity;
        }
    } catch {
        return null;
    }

    return null;
}

function isValidEntity(entity) {
    try {
        return !!entity && entity.isValid === true;
    } catch {
        return false;
    }
}

function setTarget(soldier, target) {
    if (!target?.id) return;

    soldier.targetId = target.id;
    setState(soldier, SOLDIER_CONFIG.STATES.ATTACK);
}

function clearTarget(soldier) {
    soldier.targetId = null;
    setState(soldier, SOLDIER_CONFIG.STATES.IDLE);
}

function setState(soldier, state) {
    if (soldier.phase === state) return;

    soldier.phase = state;

    if (SOLDIER_CONFIG.debug) {
        console.info(
            `[Soldier AI] ${soldier.entity?.id ?? "unknown"} -> ${state}`
        );
    }
}

function isEnemy(soldier, target) {
    if (!target?.isValid) {
        return false;
    }

    const soldierTeam = getSoldierTeam(soldier);

    if (!soldierTeam) {
        return false;
    }

    /*
     * Player target
     */
    if (target.typeId === "minecraft:player") {
        const targetTeam = getPlayerTeam(target);

        if (!targetTeam) {
            /*
             * Spieler ohne Team können optional
             * als neutral behandelt werden.
             */
            return false;
        }

        return (
            getTeamRelation(
                soldierTeam,
                targetTeam
            ) === TEAM_RELATION.HOSTILE
        );
    }

    /*
     * Soldier target
     */
    if (target.hasTag("soldier")) {
        const targetTeam = getSoldierTeamByEntity(target);

        if (!targetTeam) {
            return false;
        }

        return (
            getTeamRelation(
                soldierTeam,
                targetTeam
            ) === TEAM_RELATION.HOSTILE
        );
    }

    /*
     * Normal mobs can remain friendly.
     */
    return false;
}
function isDead(entity) {
    try {
        const health = entity.getComponent("minecraft:health");
        return !!health && health.currentValue <= 0;
    } catch {
        return true;
    }
}

function attack(soldier, target) {
    const entity = soldier.entity;

    if (!isValidEntity(entity) || !isValidEntity(target)) return;

    if (!isEnemy(entity, target)) {
        clearTarget(soldier);
        return;
    }

    const damage = getDynamicNumber(entity, "soldier:damage", SOLDIER_CONFIG.DEFAULT_DAMAGE);

    try {
        target.applyDamage(damage);

        if (SOLDIER_CONFIG.debug) {
            console.info(
                `[Soldier AI] ${entity.id} attacked ${target.id} for ${damage} damage`
            );
        }
    } catch (error) {
        if (SOLDIER_CONFIG.debug) {
            console.warn(`[Soldier AI] Attack failed: ${formatError(error)}`);
        }
        clearTarget(soldier);
    }
}

function moveTowards(entity, target) {
    if (!isValidEntity(entity) || !isValidEntity(target)) return;

    try {
        const dx = target.location.x - entity.location.x;
        const dz = target.location.z - entity.location.z;
        const distanceSquared = dx * dx + dz * dz;

        if (distanceSquared <= 0.0001) return;

        const distance = Math.sqrt(distanceSquared);
        const speed = getDynamicNumber(entity, "soldier:speed", SOLDIER_CONFIG.DEFAULT_SPEED);

        entity.lookAt(target.location);
        entity.applyImpulse({
            x: (dx / distance) * speed,
            y: 0,
            z: (dz / distance) * speed
        });
    } catch {
        // Entity may have been removed between checks.
    }
}

function getDynamicNumber(entity, property, fallback) {
    try {
        const value = Number(entity.getDynamicProperty(property));
        return Number.isFinite(value) && value > 0 ? value : fallback;
    } catch {
        return fallback;
    }
}

function getAttackCooldown(soldier) {
    switch (Number(soldier.level)) {
        case 3:
            return 700;
        case 2:
            return 800;
        default:
            return 1000;
    }
}

function distanceSquaredBetween(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;

    return dx * dx + dy * dy + dz * dz;
}

function distanceBetween(a, b) {
    return Math.sqrt(distanceSquaredBetween(a, b));
}

function ticksToMilliseconds(ticks) {
    return ticks * 50;
}

function formatError(error) {
    return error instanceof Error ? error.message : String(error);
}

export { SOLDIER_CONFIG as STATES };

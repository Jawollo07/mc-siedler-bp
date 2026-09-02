import { system, world } from "@minecraft/server";
import { SOLDIERS, SOLDIER_CONFIG, SOLDIER_TYPES } from "./config.js";
import { getPlayerTeam, getSoldierTeam } from "../teams/index.js";
import { getTeamRelation, TEAM_RELATION } from "../teams/relations.js";

const SOLDIER_ID = "siedler:soldier";
const TICK_MS = 50;

let aiStarted = false;

export function startSoldierAI() {
    if (aiStarted) return;

    aiStarted = true;

    if (!SOLDIER_CONFIG.enabled) {
        console.info("[Soldier AI] Disabled");
        return;
    }

    // Re-register soldiers after a script/world restart.
    system.runTimeout(discoverSoldiers, 1);
    system.runInterval(discoverSoldiers, 40);
    system.runInterval(updateSoldiers, SOLDIER_CONFIG.AI_INTERVAL);

    console.info("[Soldier AI] Started");
}

function discoverSoldiers() {
    for (const dimension of getDimensions()) {
        try {
            for (const entity of dimension.getEntities({ type: SOLDIER_ID })) {
                if (!entity.isValid || SOLDIERS.has(entity.id)) continue;
                registerExistingSoldier(entity);
            }
        } catch (error) {
            debug(`Discovery failed: ${formatError(error)}`);
        }
    }
}

function registerExistingSoldier(entity) {
    const type = getDynamicString(entity, "soldier:type", getTaggedValue(entity, "soldier_type:") ?? "infantry");
    const level = getDynamicNumber(entity, "soldier:level", Number(getTaggedValue(entity, "soldier_level:")) || 1);
    const typeData = SOLDIER_TYPES[type] ?? SOLDIER_TYPES.infantry;
    const levelData = typeData.levels?.[level] ?? typeData.levels?.[1];

    SOLDIERS.set(entity.id, {
        entity,
        type,
        level,
        ownerId: getDynamicString(entity, "soldier:ownerId", null),
        phase: SOLDIER_CONFIG.STATES.IDLE,
        targetId: null,
        abilities: levelData?.abilities ?? [],
        abilityCooldowns: {},
        spawnLocation: { ...entity.location },
        createdAt: world.getAbsoluteTime(),
        nextAttack: 0,
        nextTargetSearch: 0,
        nextMovement: 0,
        command: null
    });

    debug(`Registered existing soldier ${entity.id}`);
}

function updateSoldiers() {
    for (const [id, soldier] of SOLDIERS) {
        try {
            if (!updateSoldier(soldier, Date.now())) {
                SOLDIERS.delete(id);
            }
        } catch (error) {
            debug(`Update failed for ${id}: ${formatError(error)}`);
        }
    }
}

function updateSoldier(soldier, now) {
    const entity = soldier.entity;
    if (!isValid(entity)) return false;

    synchronize(soldier);

    if (soldier.targetId) {
        const current = findEntityById(entity, soldier.targetId);
        if (!current || !isEnemy(soldier, current)) {
            soldier.targetId = null;
        }
    }

    if (!soldier.targetId && now >= soldier.nextTargetSearch) {
        const target = findTarget(soldier);
        soldier.nextTargetSearch = now + ticksToMs(SOLDIER_CONFIG.TARGET_INTERVAL);
        if (target) soldier.targetId = target.id;
    }

    if (!soldier.targetId) {
        setState(soldier, SOLDIER_CONFIG.STATES.IDLE);
        return true;
    }

    const target = findEntityById(entity, soldier.targetId);
    if (!target || !isEnemy(soldier, target) || isDead(target)) {
        soldier.targetId = null;
        return true;
    }

    const distance = distanceBetween(entity.location, target.location);
    const range = getDynamicNumber(entity, "soldier:attackRange", SOLDIER_CONFIG.DEFAULT_ATTACK_RANGE);

    if (distance <= range + SOLDIER_CONFIG.ATTACK_DISTANCE_PADDING) {
        setState(soldier, SOLDIER_CONFIG.STATES.ATTACK);

        if (now >= soldier.nextAttack) {
            attack(soldier, target);
            soldier.nextAttack = now + getAttackCooldown(soldier);
        }
    } else {
        setState(soldier, SOLDIER_CONFIG.STATES.MOVE);

        if (now >= soldier.nextMovement) {
            moveTowards(entity, target);
            soldier.nextMovement = now + ticksToMs(SOLDIER_CONFIG.MOVEMENT_INTERVAL);
        }
    }

    return true;
}

function synchronize(soldier) {
    if (!Number.isFinite(soldier.nextAttack)) soldier.nextAttack = 0;
    if (!Number.isFinite(soldier.nextTargetSearch)) soldier.nextTargetSearch = 0;
    if (!Number.isFinite(soldier.nextMovement)) soldier.nextMovement = 0;
    if (!soldier.phase) soldier.phase = SOLDIER_CONFIG.STATES.IDLE;
}

function findTarget(soldier) {
    const entity = soldier.entity;
    const soldierTeam = getSoldierTeam(soldier);
    if (!soldierTeam) return null;

    let best = null;
    let bestDistance = Infinity;

    try {
        const entities = entity.dimension.getEntities({
            location: entity.location,
            maxDistance: SOLDIER_CONFIG.SEARCH_RADIUS
        });

        for (const candidate of entities) {
            if (!isValid(candidate) || candidate.id === entity.id || isDead(candidate)) continue;
            if (!isEnemy(soldier, candidate)) continue;

            const distance = distanceSquared(entity.location, candidate.location);
            if (distance < bestDistance) {
                best = candidate;
                bestDistance = distance;
            }
        }
    } catch (error) {
        debug(`Target search failed: ${formatError(error)}`);
    }

    return best;
}

function isEnemy(soldier, target) {
    if (!isValid(target)) return false;

    const soldierTeam = getSoldierTeam(soldier);
    if (!soldierTeam) return false;

    if (target.typeId === "minecraft:player") {
        const targetTeam = getPlayerTeam(target);
        if (!targetTeam) return false;
        return getTeamRelation(soldierTeam, targetTeam) === TEAM_RELATION.HOSTILE;
    }

    if (target.typeId === SOLDIER_ID || target.hasTag?.("soldier")) {
        const targetSoldier = SOLDIERS.get(target.id);
        const targetTeam = targetSoldier ? getSoldierTeam(targetSoldier) : getSoldierTeamFromEntity(target);
        if (!targetTeam) return false;
        return getTeamRelation(soldierTeam, targetTeam) === TEAM_RELATION.HOSTILE;
    }

    return false;
}

function getSoldierTeamFromEntity(entity) {
    try {
        const ownerId = entity.getDynamicProperty("soldier:ownerId");
        if (!ownerId) return null;
        const player = world.getPlayers().find(p => p.id === ownerId);
        return player ? getPlayerTeam(player) : null;
    } catch {
        return null;
    }
}

function attack(soldier, target) {
    const entity = soldier.entity;
    if (!isValid(entity) || !isValid(target) || !isEnemy(soldier, target)) return;

    const damage = getDynamicNumber(entity, "soldier:damage", SOLDIER_CONFIG.DEFAULT_DAMAGE);

    try {
        target.applyDamage(damage);
        debug(`${entity.id} attacked ${target.id} for ${damage}`);
    } catch (error) {
        debug(`Attack failed: ${formatError(error)}`);
        soldier.targetId = null;
    }
}

function moveTowards(entity, target) {
    if (!isValid(entity) || !isValid(target)) return;

    try {
        const dx = target.location.x - entity.location.x;
        const dz = target.location.z - entity.location.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        if (distance < 0.05) return;

        const speed = getDynamicNumber(entity, "soldier:speed", SOLDIER_CONFIG.DEFAULT_SPEED);
        entity.lookAt(target.location);

        // Impulse movement is deliberately small; repeated impulses create smooth movement.
        entity.applyImpulse({
            x: (dx / distance) * speed,
            y: 0.04,
            z: (dz / distance) * speed
        });
    } catch (error) {
        debug(`Movement failed: ${formatError(error)}`);
    }
}

function findEntityById(reference, id) {
    if (!id || !isValid(reference)) return null;

    try {
        return reference.dimension.getEntities({
            location: reference.location,
            maxDistance: SOLDIER_CONFIG.SEARCH_RADIUS + 4
        }).find(entity => entity.id === id) ?? null;
    } catch {
        return null;
    }
}

function getAttackCooldown(soldier) {
    switch (Number(soldier.level)) {
        case 3: return 700;
        case 2: return 800;
        default: return 1000;
    }
}

function setState(soldier, state) {
    if (soldier.phase === state) return;
    soldier.phase = state;
    debug(`${soldier.entity?.id ?? "unknown"} -> ${state}`);
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
    try {
        return !!entity && entity.isValid === true;
    } catch {
        return false;
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

function getDynamicString(entity, property, fallback) {
    try {
        const value = entity.getDynamicProperty(property);
        return typeof value === "string" && value.length ? value : fallback;
    } catch {
        return fallback;
    }
}

function getTaggedValue(entity, prefix) {
    try {
        return entity.getTags().find(tag => tag.startsWith(prefix))?.slice(prefix.length) ?? null;
    } catch {
        return null;
    }
}

function distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
}

function distanceBetween(a, b) {
    return Math.sqrt(distanceSquared(a, b));
}

function ticksToMs(ticks) {
    return ticks * TICK_MS;
}

function getDimensions() {
    return [
        world.getDimension("overworld"),
        world.getDimension("nether"),
        world.getDimension("the_end")
    ];
}

function debug(message) {
    if (SOLDIER_CONFIG.debug) console.info(`[Soldier AI] ${message}`);
}

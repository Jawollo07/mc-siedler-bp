import { world, system } from "@minecraft/server";
import { SOLDIERS, SOLDIER_TYPES } from "./config.js";

const SOLDIER_ENTITY_IDS = Object.freeze([
    "siedler:soldier",
    "siedler:infantry",
    "siedler:archer",
    "siedler:cavalry"
]);

const DIMENSIONS = Object.freeze([
    "overworld",
    "nether",
    "the_end"
]);

/**
 * Rebuilds the in-memory soldier registry from the actual persisted entities.
 * Entity IDs and the Map itself are runtime-only, while owner/type/level are
 * stored on the entity as dynamic properties.
 */
export function discoverPersistedSoldiers() {
    const seen = new Set();

    for (const dimensionId of DIMENSIONS) {
        let dimension;
        try {
            dimension = world.getDimension(dimensionId);
        } catch {
            continue;
        }

        for (const entityType of SOLDIER_ENTITY_IDS) {
            try {
                for (const entity of dimension.getEntities({ type: entityType })) {
                    if (!entity?.isValid) continue;
                    seen.add(entity.id);
                    registerEntity(entity);
                }
            } catch {}
        }
    }

    // Remove entries whose entities no longer exist. This keeps the Soldier
    // Staff from displaying stale soldiers after deaths/restarts.
    for (const [id, soldier] of SOLDIERS) {
        if (!seen.has(id) || !soldier?.entity?.isValid) SOLDIERS.delete(id);
    }
}

function registerEntity(entity) {
    const type = readString(entity, "soldier:type") ?? inferType(entity);
    const level = Math.max(1, Math.min(7, readNumber(entity, "soldier:level") ?? 1));
    const typeData = SOLDIER_TYPES[type] ?? SOLDIER_TYPES.infantry;
    const levelData = typeData?.levels?.[level] ?? typeData?.levels?.[1];
    const existing = SOLDIERS.get(entity.id);

    if (existing) {
        existing.entity = entity;
        existing.type = type;
        existing.level = level;
        existing.ownerId = readString(entity, "soldier:ownerId") ?? existing.ownerId ?? null;
        if (!existing.mount?.isValid && typeData?.mount) existing.mount = findMount(entity);
        return existing;
    }

    const soldier = {
        entity,
        mount: typeData?.mount ? findMount(entity) : null,
        type,
        level,
        ownerId: readString(entity, "soldier:ownerId"),
        phase: "idle",
        targetId: null,
        abilities: levelData?.abilities ?? [],
        abilityCooldowns: {},
        spawnLocation: { ...entity.location },
        createdAt: world.getAbsoluteTime(),
        nextAttack: 0,
        nextTargetSearch: 0,
        nextMovement: 0,
        command: null,
        desiredDirection: { x: 0, z: 0 },
        velocity: { x: 0, z: 0 },
        lastPosition: { ...entity.location },
        attack: null,
        strafe: { x: 0, z: 0, until: 0, next: 0 },
        cavalryState: "circle",
        cavalryNextCharge: 0,
        cavalryLastHit: 0
    };

    SOLDIERS.set(entity.id, soldier);
    return soldier;
}

function inferType(entity) {
    if (entity.typeId === "siedler:archer") return "archer";
    if (entity.typeId === "siedler:cavalry") return "cavalry";
    return "infantry";
}

function readString(entity, property) {
    try {
        const value = entity.getDynamicProperty(property);
        return typeof value === "string" && value.length ? value : null;
    } catch {
        return null;
    }
}

function readNumber(entity, property) {
    try {
        const value = entity.getDynamicProperty(property);
        return typeof value === "number" && Number.isFinite(value) ? value : null;
    } catch {
        return null;
    }
}

function findMount(soldier) {
    try {
        const riderId = soldier.id;
        return soldier.dimension
            .getEntities({ type: "minecraft:horse", location: soldier.location, maxDistance: 3 })
            .find(entity => entity.isValid && entity.hasTag?.(`cavalry_mount_${String(riderId).replace(/[^A-Za-z0-9_-]/g, "_").slice(-48)}`)) ?? null;
    } catch {
        return null;
    }
}

system.runTimeout(discoverPersistedSoldiers, 1);
system.runInterval(discoverPersistedSoldiers, 10);

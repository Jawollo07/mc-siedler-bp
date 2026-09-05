import {
    system,
    world
} from "@minecraft/server";

import {
    SOLDIER_TYPES,
    SOLDIER_CONFIG,
    SOLDIERS
} from "./config.js";

const DEBUG = false;
const CAVALRY_MOUNT_ID = "minecraft:horse";

const SOLDIER_ENTITY_IDS = Object.freeze({
    infantry: "siedler:infantry",
    archer: "siedler:archer",
    cavalry: "siedler:cavalry"
});

export function spawnSoldier(
    dimension,
    location,
    type = "infantry",
    level = 1,
    owner
) {
    if (!SOLDIER_CONFIG.enabled) return null;

    const typeData = SOLDIER_TYPES[type];
    if (!typeData) {
        console.warn(`[Soldier] Unknown type: ${type}`);
        return null;
    }

    const levelData = typeData.levels?.[level];
    if (!levelData) {
        console.warn(`[Soldier] Level ${level} does not exist for ${type}`);
        return null;
    }

    let entity;
    let mount;
    try {
        const entityId = SOLDIER_ENTITY_IDS[type] ?? "siedler:soldier";
        entity = dimension.spawnEntity(entityId, location);
    } catch (error) {
        console.warn(`[Soldier] Spawn failed for ${type}: ${error}`);
        return null;
    }

    try {
        entity.nameTag = `§e${typeData.displayName} §7Lv. ${level} §8(0 XP)`;
        entity.addTag("soldier");
        entity.addTag("villager");
        entity.addTag(`soldier_type:${type}`);
        entity.addTag(`soldier_level:${level}`);

        if (owner) {
            entity.addTag(`owner:${owner.name}`);
            entity.setDynamicProperty("soldier:ownerId", owner.id);
        }

        entity.setDynamicProperty("soldier:type", type);
        entity.setDynamicProperty("soldier:level", level);
        entity.setDynamicProperty("soldier:xp", 0);
        entity.setDynamicProperty("soldier:damage", levelData.damage ?? 4);
        entity.setDynamicProperty("soldier:attackRange", levelData.attackRange ?? 1.5);
        entity.setDynamicProperty("soldier:speed", levelData.speed ?? 0.25);
        setSoldierHealth(entity, levelData.health);

        if (typeData.mount) {
            try {
                mount = spawnCavalryMount(dimension, location, owner, level);
                mountCavalrySoldier(entity, mount);
            } catch (error) {
                console.warn(`[Soldier] Cavalry mount failed: ${error}`);
                try { if (mount?.isValid) mount.remove(); } catch {}
                mount = undefined;
            }
        }

        if (levelData.equipment) {
            system.runTimeout(() => {
                if (entity?.isValid) applyEquipment(entity, levelData.equipment);
            }, 2);
        }

        SOLDIERS.set(entity.id, {
            entity,
            mount: mount ?? null,
            type,
            level,
            ownerId: owner?.id ?? null,
            phase: "idle",
            targetId: null,
            abilities: levelData.abilities ?? [],
            abilityCooldowns: {},
            spawnLocation: { ...location },
            createdAt: world.getAbsoluteTime(),
            nextAttack: 0,
            nextTargetSearch: 0,
            nextMovement: 0,
            command: null,
            desiredDirection: { x: 0, z: 0 },
            velocity: { x: 0, z: 0 },
            lastPosition: { ...location },
            attack: null,
            strafe: { x: 0, z: 0, until: 0, next: 0 },
            cavalryState: "circle",
            cavalryNextCharge: 0,
            cavalryLastHit: 0
        });

        return entity;
    } catch (error) {
        console.warn(`[Soldier] Initialization failed: ${error}`);
        try { if (entity?.isValid) entity.remove(); } catch {}
        try { if (mount?.isValid) mount.remove(); } catch {}
        return null;
    }
}

function spawnCavalryMount(dimension, location, owner, level) {
    const mount = dimension.spawnEntity(CAVALRY_MOUNT_ID, {
        x: location.x,
        y: location.y,
        z: location.z
    });

    if (!mount?.isValid) throw new Error("Cavalry mount is invalid after spawn");

    mount.addTag("soldier_mount");
    mount.addTag("cavalry_mount");
    mount.setDynamicProperty("soldier:ownerId", owner?.id ?? "");
    mount.setDynamicProperty("soldier:level", level);

    // Keep the horse as a normal adult vanilla horse. The soldier is mounted
    // through the vanilla /ride command instead of a custom horse entity.
    try {
        const ageable = mount.getComponent("minecraft:ageable");
        if (ageable?.setBaby) ageable.setAdult?.();
    } catch {}

    return mount;
}

function mountCavalrySoldier(soldier, mount) {
    const riderTag = `cavalry_rider_${sanitizeTag(soldier.id)}`;
    const mountTag = `cavalry_mount_${sanitizeTag(soldier.id)}`;

    soldier.addTag(riderTag);
    mount.addTag(mountTag);

    try {
        // Use Minecraft's native riding system. Temporary unique tags avoid
        // relying on entity names or unsupported UUID selectors.
        const result = mount.dimension.runCommand(
            `ride @e[type=siedler:cavalry,tag=${riderTag},c=1] start_riding @e[type=minecraft:horse,tag=${mountTag},c=1]`
        );
        if (DEBUG) console.log(`[Soldier] Mounted cavalry using /ride: ${result?.successCount ?? 0}`);
    } finally {
        try { soldier.removeTag(riderTag); } catch {}
        // Keep the permanent mount tag; cavalry_ai uses it for discovery.
    }

    if (!isRidingEntity(soldier, mount)) {
        // Fallback for servers where /ride does not immediately update the
        // rider state. This still uses the native rideable component rather
        // than creating a custom horse entity.
        const rideable = mount.getComponent("minecraft:rideable");
        if (!rideable || typeof rideable.addRider !== "function" || !rideable.addRider(soldier)) {
            throw new Error("/ride did not mount the cavalry soldier");
        }
    }

    mount.setDynamicProperty("soldier:riderId", soldier.id);
}

function isRidingEntity(soldier, mount) {
    try {
        const rideable = mount.getComponent("minecraft:rideable");
        if (!rideable) return false;
        return rideable.getRiders?.().some(rider => rider.id === soldier.id) ?? false;
    } catch {
        return false;
    }
}

function sanitizeTag(value) {
    return String(value).replace(/[^A-Za-z0-9_-]/g, "_").slice(-48);
}

export function setSoldierHealth(entity, value) {
    if (!entity?.isValid || typeof value !== "number") return;
    try {
        const health = entity.getComponent("minecraft:health");
        if (!health) {
            console.warn("[Soldier] Entity has no health component.");
            return;
        }
        if (typeof health.setCurrentValue === "function") {
            health.setCurrentValue(value);
            return;
        }
        health.resetToMaxValue();
        const maxHealth = health.effectiveMax;
        if (value < maxHealth) entity.applyDamage(maxHealth - value);
    } catch (error) {
        console.warn(`[Soldier] Failed to set health: ${error}`);
    }
}

export function applyEquipment(entity, equipment) {
    if (!entity?.isValid || !equipment) return;

    const slotMap = {
        mainhand: "slot.weapon.mainhand",
        offhand: "slot.weapon.offhand",
        helmet: "slot.armor.head",
        chestplate: "slot.armor.chest",
        leggings: "slot.armor.legs",
        boots: "slot.armor.feet"
    };

    for (const [slotName, data] of Object.entries(equipment)) {
        if (!data?.item) continue;
        const slotType = slotMap[slotName];
        if (!slotType) continue;

        try {
            const amount = Math.max(1, Math.min(64, Number(data.amount ?? 1)));
            const command = `replaceitem entity @s ${slotType} 0 ${data.item} ${amount}`;
            const result = entity.runCommand(command);
            if (DEBUG) console.log(`[Soldier] Equipped ${data.item} on ${slotName}`);
            if (!result) console.warn(`[Soldier] No command result while equipping ${slotName}`);
        } catch (error) {
            console.warn(`[Soldier] Failed to equip ${slotName}: ${error}`);
        }
    }
}

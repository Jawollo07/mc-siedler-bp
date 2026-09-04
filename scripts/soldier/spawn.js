import {
    system,
    world
} from "@minecraft/server";

import {
    SOLDIER_TYPES,
    SOLDIER_CONFIG,
    SOLDIERS
} from "./config.js";

const DEBUG = true;

/** All soldier variants use the same registered entity definition and differentiate
 * themselves via dynamic properties and tags. */
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
                mount = dimension.spawnEntity(typeData.mount, {
                    x: location.x,
                    y: location.y,
                    z: location.z
                });
                mount.addTag("soldier_mount");
                mount.setDynamicProperty("soldier:ownerId", owner?.id ?? "");
                mount.setDynamicProperty("soldier:level", level);
                if (typeof entity.startRiding === "function") {
                    entity.startRiding(mount);
                } else {
                    console.warn("[Soldier] Riding API is unavailable; cavalry spawned without mount.");
                }
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
            command: null
        });

        return entity;
    } catch (error) {
        console.warn(`[Soldier] Initialization failed: ${error}`);
        try { if (entity?.isValid) entity.remove(); } catch {}
        try { if (mount?.isValid) mount.remove(); } catch {}
        return null;
    }
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

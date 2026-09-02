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
    try {
        entity = dimension.spawnEntity("siedler:soldier", location);
    } catch (error) {
        console.warn(`[Soldier] Spawn failed: ${error}`);
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

        if (levelData.equipment) {
            system.runTimeout(() => {
                if (entity?.isValid) applyEquipment(entity, levelData.equipment);
            }, 2);
        }

        SOLDIERS.set(entity.id, {
            entity,
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

import { system, world } from "@minecraft/server";
import { SOLDIER_TYPES, SOLDIER_CONFIG, SOLDIERS } from "./config.js";

/**
 * Spawns a soldier and registers it for the script AI.
 * @param {Dimension} dimension
 * @param {Vector3} location
 * @param {string} type
 * @param {number} level
 * @param {Player | null} owner
 * @returns {Entity | null}
 */
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
        entity = dimension.spawnEntity("siedler:soldier", location, {
            initialPersistence: true
        });
    } catch (error) {
        console.warn(`[Soldier] Spawn failed: ${error}`);
        return null;
    }

    entity.nameTag = `§e${typeData.displayName} §7Lv. ${level}`;
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
    entity.setDynamicProperty("soldier:damage", levelData.damage ?? 4);
    entity.setDynamicProperty(
        "soldier:attackRange",
        levelData.attackRange ?? 1.5
    );
    entity.setDynamicProperty("soldier:speed", levelData.speed ?? 0.25);

    system.runTimeout(() => {
        applyEquipment(entity, levelData.equipment);
    }, 2);
    const health = entity.getComponent("minecraft:health");

    if (health) {
        health.setCurrentValue(levelData.health);
        health.setMaxValue(levelData.health);
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
        nextMovement: 0
    });

    return entity;
}

/**
 * Applies equipment and enchantments using commands.
 */
function applyEquipment(entity, equipment) {
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
        const commandSlot = slotMap[slotName];
        if (!commandSlot || !data?.item) continue;

        try {
            entity.runCommand(
                `replaceitem entity @s ${commandSlot} ${data.item} ${data.amount ?? 1}`
            );

            if (Array.isArray(data.enchantments)) {
                for (const enchantment of data.enchantments) {
                    entity.runCommand(
                        `enchant @s ${enchantment.id} ${enchantment.level}`
                    );
                }
            }
        } catch (error) {
            console.warn(
                `[Soldier] Failed to equip ${slotName}: ${error}`
            );
        }
    }
}

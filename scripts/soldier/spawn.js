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

/**
 * Spawns a soldier and registers it for the script AI.
 *
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
    if (!SOLDIER_CONFIG.enabled) {
        return null;
    }

    const typeData = SOLDIER_TYPES[type];

    if (!typeData) {
        console.warn(`[Soldier] Unknown type: ${type}`);
        return null;
    }

    const levelData = typeData.levels?.[level];

    if (!levelData) {
        console.warn(
            `[Soldier] Level ${level} does not exist for ${type}`
        );

        return null;
    }

    let entity;

    /*
     * Spawn custom soldier entity.
     */
    try {
        entity = dimension.spawnEntity(
            "siedler:soldier",
            location
        );
    } catch (error) {
        console.warn(
            `[Soldier] Spawn failed: ${error}`
        );

        return null;
    }

    try {
        /*
         * Basic metadata.
         */
        entity.nameTag =
            `§e${typeData.displayName} §7Lv. ${level}`;

        entity.addTag("soldier");
        entity.addTag("villager");

        entity.addTag(
            `soldier_type:${type}`
        );

        entity.addTag(
            `soldier_level:${level}`
        );

        /*
         * Owner.
         */
        if (owner) {
            entity.addTag(
                `owner:${owner.name}`
            );

            entity.setDynamicProperty(
                "soldier:ownerId",
                owner.id
            );
        }

        /*
         * Dynamic properties used by the AI.
         */
        entity.setDynamicProperty(
            "soldier:type",
            type
        );

        entity.setDynamicProperty(
            "soldier:level",
            level
        );

        entity.setDynamicProperty(
            "soldier:damage",
            levelData.damage ?? 4
        );

        entity.setDynamicProperty(
            "soldier:attackRange",
            levelData.attackRange ?? 1.5
        );

        entity.setDynamicProperty(
            "soldier:speed",
            levelData.speed ?? 0.25
        );

        /*
         * Set health.
         */
        setSoldierHealth(
            entity,
            levelData.health
        );

        /*
         * Equipment is applied one tick later so the entity
         * is fully initialized before its equipment slots are changed.
         */
        if (levelData.equipment) {
            system.runTimeout(() => {
                if (!entity?.isValid) {
                    return;
                }

                applyEquipment(
                    entity,
                    levelData.equipment
                );
            }, 2);
        }

        /*
         * Register soldier for AI.
         */
        SOLDIERS.set(entity.id, {
            entity,
            type,
            level,
            ownerId: owner?.id ?? null,
            phase: "idle",
            targetId: null,
            abilities:
                levelData.abilities ?? [],
            abilityCooldowns: {},
            spawnLocation: {
                ...location
            },
            createdAt:
                world.getAbsoluteTime(),
            nextAttack: 0,
            nextTargetSearch: 0,
            nextMovement: 0
        });

        return entity;
    } catch (error) {
        console.warn(
            `[Soldier] Initialization failed: ${error}`
        );

        try {
            if (entity?.isValid) {
                entity.remove();
            }
        } catch {}

        return null;
    }
}

/**
 * Sets the soldier's health.
 *
 * @param {Entity} entity
 * @param {number} value
 */
function setSoldierHealth(entity, value) {
    if (
        !entity?.isValid ||
        typeof value !== "number"
    ) {
        return;
    }

    try {
        const health =
            entity.getComponent(
                "minecraft:health"
            );

        if (!health) {
            console.warn(
                "[Soldier] Entity has no health component."
            );

            return;
        }

        if (
            typeof health.setCurrentValue ===
            "function"
        ) {
            health.setCurrentValue(value);
            return;
        }

        health.resetToMaxValue();

        const maxHealth =
            health.effectiveMax;

        if (value < maxHealth) {
            entity.applyDamage(
                maxHealth - value
            );
        }
    } catch (error) {
        console.warn(
            `[Soldier] Failed to set health: ${error}`
        );
    }
}

/**
 * Applies equipment to the soldier.
 *
 * Custom Bedrock entities on the current dedicated-server runtime do not
 * expose minecraft:equippable through Entity.getComponent(). The entity
 * component itself remains in soldier.json for Bedrock's equipment system,
 * but Script API equipment access is not reliable for this custom mob.
 *
 * Therefore the script uses /replaceitem for the actual equipment slots.
 * This targets the real entity equipment slots and works for non-player
 * entities as well.
 *
 * @param {Entity} entity
 * @param {Object} equipment
 */
function applyEquipment(entity, equipment) {
    if (!entity?.isValid || !equipment) {
        return;
    }

    const slotMap = {
        mainhand: "slot.weapon.mainhand",
        offhand: "slot.weapon.offhand",
        helmet: "slot.armor.head",
        chestplate: "slot.armor.chest",
        leggings: "slot.armor.legs",
        boots: "slot.armor.feet"
    };

    for (const [slotName, data] of Object.entries(equipment)) {
        if (!data?.item) {
            continue;
        }

        const slotType = slotMap[slotName];

        if (!slotType) {
            console.warn(
                `[Soldier] Unknown equipment slot: ${slotName}`
            );
            continue;
        }

        try {
            const amount = Math.max(
                1,
                Math.min(64, Number(data.amount ?? 1))
            );

            const command =
                `replaceitem entity @s ${slotType} 0 ${data.item} ${amount}`;

            const result = entity.runCommand(command);

            if (DEBUG) {
                console.log(
                    `[Soldier] Equipped ${data.item} on ${slotName}`
                );
            }

            if (!result) {
                console.warn(
                    `[Soldier] No command result while equipping ${slotName}`
                );
            }
        } catch (error) {
            console.warn(
                `[Soldier] Failed to equip ${slotName}: ${error}`
            );
        }
    }
}

import {
    system,
    world,
    ItemStack,
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
         * Equipment is applied one tick later.
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

        /*
         * @minecraft/server 2.9.0
         *
         * setCurrentValue() is available on
         * EntityHealthComponent.
         */
        if (
            typeof health.setCurrentValue ===
            "function"
        ) {
            health.setCurrentValue(value);
            return;
        }

        /*
         * Fallback for unexpected API differences.
         */
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
 * Applies soldier equipment using the entity inventory.
 *
 * Inventory layout:
 *
 * 0 = Mainhand
 * 1 = Offhand
 * 2 = Helmet
 * 3 = Chestplate
 * 4 = Leggings
 * 5 = Boots
 *
 * @param {Entity} entity
 * @param {Object} equipment
 */
function applyEquipment(entity, equipment) {
    if (!entity?.isValid || !equipment) {
        return;
    }

    try {
        const inventory =
            entity.getComponent("minecraft:inventory");

        if (!inventory?.container) {
            console.warn(
                "[Soldier] Entity has no usable inventory."
            );

            return;
        }

        const slotMap = {
            mainhand: 0,
            offhand: 1,
            helmet: 2,
            chestplate: 3,
            leggings: 4,
            boots: 5
        };

        for (
            const [slotName, data]
            of Object.entries(equipment)
        ) {
            if (!data?.item) {
                continue;
            }

            const slot = slotMap[slotName];

            if (slot === undefined) {
                console.warn(
                    `[Soldier] Unknown equipment slot: ${slotName}`
                );

                continue;
            }

            try {
                const itemStack = new ItemStack(
                    data.item,
                    data.amount ?? 1
                );

                /*
                 * Put the item into the soldier inventory.
                 */
                inventory.container.setItem(
                    slot,
                    itemStack
                );

                console.log(
                    `[Soldier] Equipped ${data.item} on ${slotName}`
                );
            } catch (error) {
                console.warn(
                    `[Soldier] Failed to equip ${slotName}: ${error}`
                );
            }
        }
    } catch (error) {
        console.warn(
            `[Soldier] Equipment initialization failed: ${error}`
        );
    }
}
/**
 * Applies enchantments to an ItemStack.
 *
 * @param {ItemStack} itemStack
 * @param {Array} enchantments
 */
function applyEnchantments(
    itemStack,
    enchantments
) {
    if (
        !itemStack ||
        !Array.isArray(enchantments)
    ) {
        return;
    }

    try {
        const enchantable =
            itemStack.getComponent(
                "minecraft:enchantable"
            );

        if (!enchantable) {
            return;
        }

        for (
            const enchantment
            of enchantments
        ) {
            if (
                !enchantment?.id ||
                typeof enchantment.level !==
                    "number"
            ) {
                continue;
            }

            try {
                enchantable.addEnchantment({
                    type: enchantment.id,
                    level: enchantment.level
                });
            } catch (error) {
                console.warn(
                    `[Soldier] Failed to enchant ${itemStack.typeId}: ${error}`
                );
            }
        }
    } catch (error) {
        console.warn(
            `[Soldier] Enchantment setup failed: ${error}`
        );
    }
}
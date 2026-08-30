import { system, world, ItemStack, EquipmentSlot } from "@minecraft/server";
import { SOLDIER_TYPES, SOLDIER_CONFIG, SOLDIERS } from "./config.js";

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
    if (!SOLDIER_CONFIG.enabled) return null;

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

    // Spawn the custom soldier entity.
    try {
        entity = dimension.spawnEntity(
            "siedler:soldier",
            location
        );
    } catch (error) {
        console.warn(`[Soldier] Spawn failed: ${error}`);
        return null;
    }

    try {
        /*
         * Basic soldier metadata.
         */
        entity.nameTag =
            `§e${typeData.displayName} §7Lv. ${level}`;

        entity.addTag("soldier");
        entity.addTag("villager");
        entity.addTag(`soldier_type:${type}`);
        entity.addTag(`soldier_level:${level}`);

        if (owner) {
            entity.addTag(`owner:${owner.name}`);
            entity.setDynamicProperty(
                "soldier:ownerId",
                owner.id
            );
        }

        /*
         * Dynamic properties used by the soldier AI.
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
         * Set health after the entity has spawned.
         */
        setSoldierHealth(entity, levelData.health);

        /*
         * Equipment needs to be applied after spawning.
         * This also gives the custom entity time to initialize.
         */
        if (levelData.equipment) {
            system.runTimeout(() => {
                if (!entity?.isValid) return;

                applyEquipment(
                    entity,
                    levelData.equipment
                );
            }, 2);
        }

        /*
         * Register the soldier in the AI registry.
         */
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
    } catch (error) {
        console.warn(
            `[Soldier] Failed to initialize soldier: ${error}`
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
 * The custom entity should have a maximum health
 * high enough for the highest soldier level.
 *
 * @param {Entity} entity
 * @param {number} value
 */
function setSoldierHealth(entity, value) {
    if (!entity?.isValid || typeof value !== "number") {
        return;
    }

    try {
        const health = entity.getComponent(
            "minecraft:health"
        );

        if (!health) {
            console.warn(
                "[Soldier] Entity has no health component."
            );
            return;
        }

        /*
         * The current Health API exposes resetToMaxValue()
         * rather than setCurrentValue().
         *
         * We therefore use the entity's configured maximum
         * health and damage it down only if necessary.
         */
        const maxHealth = health.effectiveMax;

        if (value >= maxHealth) {
            health.resetToMaxValue();
            return;
        }

        /*
         * If the entity supports setCurrentValue, use it.
         * This is kept as a compatibility check.
         */
        if (typeof health.setCurrentValue === "function") {
            health.setCurrentValue(value);
            return;
        }

        /*
         * Fallback:
         * Reset to maximum and apply the required amount
         * of damage.
         */
        health.resetToMaxValue();

        const damage = maxHealth - value;

        if (damage > 0) {
            entity.applyDamage(damage);
        }
    } catch (error) {
        console.warn(
            `[Soldier] Failed to set health: ${error}`
        );
    }
}

/**
 * Applies equipment and enchantments using the
 * EntityEquippable component.
 *
 * @param {Entity} entity
 * @param {Object} equipment
 */
function applyEquipment(entity, equipment) {
    if (!entity?.isValid || !equipment) return;

    const equippable = entity.getComponent("minecraft:equippable");

    if (!equippable) {
        console.warn("[Soldier] Entity has no equippable component.");
        return;
    }

    const slotMap = {
        mainhand: EquipmentSlot.Mainhand,
        offhand: EquipmentSlot.Offhand,
        helmet: EquipmentSlot.Head,
        chestplate: EquipmentSlot.Chest,
        leggings: EquipmentSlot.Legs,
        boots: EquipmentSlot.Feet
    };

    for (const [slotName, data] of Object.entries(equipment)) {
        if (!data?.item) continue;

        const slot = slotMap[slotName];

        if (!slot) {
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

            equippable.setEquipment(slot, itemStack);

            console.log(
                `[Soldier] Equipped ${data.item} on ${slotName}`
            );

            // Enchantments können wir danach separat behandeln.
        } catch (error) {
            console.warn(
                `[Soldier] Failed to equip ${slotName}: ${error}`
            );
        }
    }
}
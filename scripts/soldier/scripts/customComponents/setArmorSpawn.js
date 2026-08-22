import { system, ItemStack } from "@minecraft/server";

/**
 * DANH SÁCH CẤU HÌNH
 */
const ARMOR_SET_MAP = {
    "fv:full_set_copper_armor": "fv:copper",
    "fv:full_set_copper_armor_enchanted": "fv:copper_enchanted",
    "fv:full_set_chainmail_armor": "fv:chainmail",
    "fv:full_set_chainmail_armor_enchanted": "fv:chainmail_enchanted",
    "fv:full_set_gold_armor": "fv:gold",
    "fv:full_set_gold_armor_enchanted": "fv:gold_enchanted",
    "fv:full_set_iron_armor": "fv:iron",
    "fv:full_set_iron_armor_enchanted": "fv:iron_enchanted",
    "fv:full_set_diamond_armor": "fv:diamond",
    "fv:full_set_diamond_armor_enchanted": "fv:diamond_enchanted",
    "fv:full_set_netherite_armor": "fv:netherite",
    "fv:full_set_netherite_armor_enchanted": "fv:netherite_enchanted"
};

system.beforeEvents.startup.subscribe((initEvent) => {
    initEvent.itemComponentRegistry.registerCustomComponent("fv:set_armor_spawn", {
        onUseOn(event) {
            const { source: player, itemStack, block } = event;

            const eventToTrigger = ARMOR_SET_MAP[itemStack.typeId];
            if (!eventToTrigger) return;

            // 1. spawn position
            const spawnLoc = {
                x: block.location.x + 0.5,
                y: block.location.y + 1,
                z: block.location.z + 0.5
            };

            try {
                const dimension = player.dimension;

                // 2. spawn perform entity
                const armorStand = dimension.spawnEntity("fv:copy_armor_stand", spawnLoc);

                // 3. Calculate look direction (Rotation)
                // take angle roll perform exist of player. roll 180 mode to perform entity look facing player.
                const playerRot = player.getRotation();
                armorStand.setRotation({ x: 0, y: playerRot.y + 180 });

                // 4. Trigger the event
                armorStand.triggerEvent(eventToTrigger);

                // 5. Remove item
                const inventory = player.getComponent("minecraft:inventory");
                if (inventory) {
                    const container = inventory.container;
                    const slot = player.selectedSlotIndex;

                    if (itemStack.amount > 1) {
                        const newItem = itemStack.clone();
                        newItem.amount -= 1;
                        container.setItem(slot, newItem);
                    } else {
                        container.setItem(slot, undefined);
                    }
                }
            } catch (error) {
                console.warn("Error: " + error);
            }
        }
    });
});
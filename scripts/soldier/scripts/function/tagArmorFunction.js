import { world, system, EquipmentSlot, EntityEquippableComponent } from "@minecraft/server";

// Run check every tick (20 times/second)
system.runInterval(() => {
    for (const player of world.getPlayers()) {
        const equip = player.getComponent(EntityEquippableComponent.componentId);
        if (!equip) continue;

        const item = equip.getEquipment(EquipmentSlot.Mainhand);

        // Remove old tag if has
        player.removeTag("hold_helmet");
        player.removeTag("hold_chestplate");
        player.removeTag("hold_leggings");
        player.removeTag("hold_boots");

        if (!item) continue;

        const itemId = item.typeId;

        // Check and add tag based on item name
        if (itemId.includes("helmet")) {
            player.addTag("hold_helmet");
        }
        if (itemId.includes("chestplate")) {
            player.addTag("hold_chestplate");
        }
        if (itemId.includes("leggings")) {
            player.addTag("hold_leggings");
        }
        if (itemId.includes("boots")) {
            player.addTag("hold_boots");
        }
    }
});

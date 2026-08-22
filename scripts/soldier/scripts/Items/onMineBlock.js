// onMineBlock.js
import { world, system, EquipmentSlot, GameMode, Player } from "@minecraft/server"; // Added system

const ItemOnMineComponent = {
    onMineBlock({ source }) {
        if (!(source instanceof Player)) return;

        const equippable = source.getComponent("minecraft:equippable");
        if (!equippable) return;

        const mainhand = equippable.getEquipmentSlot(EquipmentSlot.Mainhand);
        if (!mainhand.hasItem()) return;

        if (source.getGameMode() === GameMode.Creative) return;

        const itemStack = mainhand.getItem();
        const durability = itemStack.getComponent("minecraft:durability");
        if (!durability) return;

        const enchantable = itemStack.getComponent("minecraft:enchantable");
        const unbreakingLevel = enchantable?.getEnchantment("unbreaking")?.level;

        const damageChance = durability.getDamageChance(unbreakingLevel) / 100;
        if (Math.random() > damageChance) return;

        const shouldBreak = durability.damage === durability.maxDurability;

        if (shouldBreak) {
            mainhand.setItem(undefined);
            source.playSound("random.break", {
                location: source.location,
                volume: 1,
                pitch: 1
            });
        } else {
            durability.damage++;
            mainhand.setItem(itemStack);
        }
    }
};

// FIX API ERROR: Use system.beforeEvents.startup instead of world.beforeEvents.worldInitialize
system.beforeEvents.startup.subscribe(({ itemComponentRegistry }) => {
    itemComponentRegistry.registerCustomComponent("fv:on_mine_block", ItemOnMineComponent);
});
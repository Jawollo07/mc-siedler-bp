import { system, ItemStack, EnchantmentTypes } from "@minecraft/server";

// 1. Split the Loot list
const FISHER_FISH = ["minecraft:cod", "minecraft:salmon", "minecraft:pufferfish", "minecraft:tropical_fish"];

const FISHER_TREASURE = [
    { id: "minecraft:nautilus_shell", stackable: true },
    { id: "minecraft:name_tag", stackable: true },
    { id: "minecraft:saddle", stackable: false },
    { id: "minecraft:bow", enchant: true, stackable: false },
    { id: "minecraft:fishing_rod", enchant: true, stackable: false },
    { id: "minecraft:enchanted_book", enchant: true, stackable: false }
];

const ENCHANTS_POOL = ["unbreaking", "mending", "luck_of_the_sea", "lure", "sharpness", "protection", "efficiency", "power"];

/**
 * Hàm thêm Enchant ngẫu nhiên theo dải Level
 */
function applyRandomEnchant(itemStack, minLvl, maxLvl) {
    const enchantable = itemStack.getComponent("minecraft:enchantable");
    if (!enchantable) return;

    let addedCount = 0;
    while (addedCount < 1) {
        const randomId = ENCHANTS_POOL[Math.floor(Math.random() * ENCHANTS_POOL.length)];
        const enchantType = EnchantmentTypes.get(randomId);

        if (enchantType) {
            try {
                // Calculate level enchant based on the allowed range
                const finalMax = Math.min(maxLvl, enchantType.maxLevel);
                const finalMin = Math.min(minLvl, finalMax);
                const level = Math.floor(Math.random() * (finalMax - finalMin + 1)) + finalMin;

                enchantable.addEnchantment({ type: enchantType, level: level });
                addedCount++;
            } catch (e) { }
        }
    }
}

system.afterEvents.scriptEventReceive.subscribe((event) => {
    const { id, sourceEntity } = event;
    if (id !== "fv:fisher_products" || !sourceEntity) return;

    const inventory = sourceEntity.getComponent("minecraft:inventory");
    if (!inventory) return;
    const container = inventory.container;

    // --- GET LEVEL AND XP perform exist ---
    let level = 0;
    let xp = 0;
    try {
        level = sourceEntity.getProperty("fv:level") ?? 0;
        xp = sourceEntity.getProperty("fv:xp") ?? 0;
    } catch (e) {
        level = 0;
    }

    // --- SECTION 1: roll quantity item item BY LEVEL ---
    // Group probabilities: [Level 0, 1, 2, 3, 4, 5]
    const fishChances = [0.8, 0.7, 0.6, 0.5, 0.4, 0.3];
    const treasureChances = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7]; // Level 5 is adjusted to 0.7 relative the total is 1.0

    const randGroup = Math.random();
    let selectedItem = null;
    let isFish = true;

    if (randGroup < fishChances[level]) {
        // Fish group: rate valid all fish types equally likely
        const fishId = FISHER_FISH[Math.floor(Math.random() * FISHER_FISH.length)];
        selectedItem = { id: fishId, stackable: true };
    } else {
        // Treasure group: rate valid all items equally likely
        selectedItem = FISHER_TREASURE[Math.floor(Math.random() * FISHER_TREASURE.length)];
        isFish = false;
    }

    // Create ItemStack
    const itemStack = new ItemStack(selectedItem.id, 1);

    // Handle enchantments if is special treasure items
    if (selectedItem.enchant) {
        let minL = 1, maxL = 2;
        if (level === 1) { minL = 1; maxL = 3; }
        else if (level >= 2) { minL = 3; maxL = 5; } // Default max level is 5

        applyRandomEnchant(itemStack, minL, maxL);
    }

    // Add to inventory
    if (selectedItem.stackable === false) {
        let emptySlot = -1;
        for (let i = 0; i < container.size; i++) {
            if (!container.getItem(i)) { emptySlot = i; break; }
        }
        if (emptySlot !== -1) container.setItem(emptySlot, itemStack);
        else container.addItem(itemStack);
    } else {
        container.addItem(itemStack);
    }

    // --- MECHANISM ADD XP AND LEVEL UP (FIXED) ---
    if (level < 5) {
        const xpGains = [20, 18, 16, 14, 12];
        let newXp = xp + xpGains[level];
        let newLevel = level;

        if (newXp >= 100) {
            newLevel += 1;
            newXp -= 100;
            if (newLevel > 5) newLevel = 5;
            if (newLevel === 5) newXp = 0;

            console.warn(`§e[Scripting][warning]-§f [Fisher] Dân làng thăng cấp: §6Cấp độ ${newLevel}`);
        }

        sourceEntity.setProperty("fv:xp", newXp);
        sourceEntity.setProperty("fv:level", newLevel);
    }

}, { namespaces: ["fv"] });
import { system, ItemStack } from "@minecraft/server";

// Configure the item exchange list (Keep original logic)
const MASON_RECIPES = {
    "minecraft:cobblestone": { result: "minecraft:stone", ratio: 1 },
    "minecraft:stone": { result: "minecraft:stone_bricks", ratio: 1 },
    "fv:heart_of_stone": { result: "fv:rock_tortois_spawn_egg", ratio: 1 },
    "minecraft:brick": { result: "minecraft:brick_block", ratio: 4 }
};

/** Hàm hỗ trợ thêm item an toàn (chia nhỏ stack và kiểm tra kho đầy) */
function safeAddItems(container, typeId, totalAmount) {
    let remaining = totalAmount;
    while (remaining > 0) {
        let stackSize = Math.min(remaining, 64);
        try {
            const itemStack = new ItemStack(typeId, stackSize);
            const result = container.addItem(itemStack);
            if (result) {
                return remaining - (stackSize - result.amount);
            }
        } catch (e) {
            return remaining;
        }
        remaining -= stackSize;
    }
    return 0;
}

system.afterEvents.scriptEventReceive.subscribe((event) => {
    const { id, sourceEntity } = event;

    if (id !== "fv:mason_products" || !sourceEntity) return;

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

    // --- SECTION 1: GIVE COBBLESTONE BY LEVEL ---
    // Level 0: 8, Level 1: 16, Level 2: 24... (+8 per level)
    const rewardAmount = (level + 1) * 8;
    safeAddItems(container, "minecraft:cobblestone", rewardAmount);

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

            // Debug notification qua console.warn
            console.warn(`§e[Scripting][warning]-§f [Mason] Dân làng thăng cấp: §6Cấp độ ${newLevel}`);
        }

        sourceEntity.setProperty("fv:xp", newXp);
        sourceEntity.setProperty("fv:level", newLevel);
    }

    // --- SECTION 2: logic change item (KEEP UNCHANGED) ---
    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (!item) continue;

        const recipe = MASON_RECIPES[item.typeId];
        if (recipe) {
            const { result, ratio } = recipe;
            const amount = item.amount;

            if (amount >= ratio) {
                const resultAmount = Math.floor(amount / ratio);
                const remainder = amount % ratio;
                const sourceId = item.typeId;

                // Clear the current slot to avoid occupying it
                container.setItem(i, undefined);

                // Add the resulting item (Safely merge stacks)
                safeAddItems(container, result, resultAmount);

                // If old materials remain, add them back
                if (remainder > 0) {
                    safeAddItems(container, sourceId, remainder);
                }
            }
        }
    }

}, { namespaces: ["fv"] });
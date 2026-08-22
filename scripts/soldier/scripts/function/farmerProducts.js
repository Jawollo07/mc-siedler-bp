import { system, ItemStack } from "@minecraft/server";

// Cấu hình đổi đồ nghề nông (Giữ nguyên logic cũ)
const FARMER_RECIPES = [
    { source: "minecraft:wheat", ratio: 1, result: "minecraft:bread", resultAmount: 1 },
    {
        source: "minecraft:carrot", ratio: 1,
        secondary: { id: "minecraft:gold_nugget", amount: 2 },
        result: "minecraft:golden_carrot", resultAmount: 1
    },
    {
        source: "minecraft:apple", ratio: 1,
        secondary: { id: "minecraft:gold_nugget", amount: 4 },
        result: "minecraft:golden_apple", resultAmount: 1
    },
    { source: "minecraft:bone", ratio: 1, result: "minecraft:bone_meal", resultAmount: 6 }
];

/** Hàm hỗ trợ thêm item an toàn (chia nhỏ stack) */
function safeAddItems(container, typeId, totalAmount) {
    let remaining = totalAmount;
    while (remaining > 0) {
        let stackSize = Math.min(remaining, 64);
        const result = container.addItem(new ItemStack(typeId, stackSize));
        if (result) return remaining - (stackSize - result.amount);
        remaining -= stackSize;
    }
    return 0;
}

system.afterEvents.scriptEventReceive.subscribe((event) => {
    const { id, sourceEntity } = event;
    if (id !== "fv:farmer_products" || !sourceEntity) return;

    const inventory = sourceEntity.getComponent("minecraft:inventory");
    if (!inventory) return;
    const container = inventory.container;

    // --- LẤY CẤP ĐỘ VÀ XP HIỆN TẠI ---
    let level = 0;
    let xp = 0;
    try {
        level = sourceEntity.getProperty("fv:level") ?? 0;
        xp = sourceEntity.getProperty("fv:xp") ?? 0;
    } catch (e) {
        level = 0;
    }

    // --- PHẦN 1: PHẦN THƯỞNG THEO CẤP ĐỘ ---
    if (level === 0) {
        safeAddItems(container, "minecraft:wheat_seeds", 4);
    }
    else if (level === 1) {
        safeAddItems(container, "minecraft:wheat_seeds", 8);
        safeAddItems(container, "minecraft:bread", 1);
    }
    else if (level === 2) {
        safeAddItems(container, "minecraft:wheat_seeds", 8);
        safeAddItems(container, "minecraft:bread", 2);
    }
    else if (level === 3) {
        safeAddItems(container, "minecraft:apple", 4);
        safeAddItems(container, "minecraft:bread", 4);
    }
    else if (level === 4) {
        safeAddItems(container, "minecraft:apple", 8);
        safeAddItems(container, "minecraft:bread", 6);
    }
    else if (level === 5) {
        safeAddItems(container, "minecraft:apple", 16);
        safeAddItems(container, "minecraft:bread", 8);
    }

    // --- CƠ CHẾ CỘNG XP VÀ LÊN CẤP (CỐ ĐỊNH) ---
    if (level < 5) {
        const xpGains = [20, 18, 16, 14, 12];
        let newXp = xp + xpGains[level];
        let newLevel = level;

        if (newXp >= 100) {
            newLevel += 1;
            newXp -= 100;
            if (newLevel > 5) newLevel = 5;
            if (newLevel === 5) newXp = 0;

            console.warn(`§e[Scripting][warning]-§f [Farmer] Dân làng thăng cấp: §6Cấp độ ${newLevel}`);
        }

        sourceEntity.setProperty("fv:xp", newXp);
        sourceEntity.setProperty("fv:level", newLevel);
    }

    // --- PHẦN 2: LOGIC CHẾ TẠO (GIỮ NGUYÊN) ---
    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (!item) continue;

        const recipe = FARMER_RECIPES.find(r => r.source === item.typeId);
        if (recipe) {
            let multiplier = 0;
            let canCraft = false;

            if (recipe.secondary) {
                let totalSec = 0;
                for (let j = 0; j < container.size; j++) {
                    const sub = container.getItem(j);
                    if (sub?.typeId === recipe.secondary.id) totalSec += sub.amount;
                }

                multiplier = Math.min(Math.floor(item.amount / recipe.ratio), Math.floor(totalSec / recipe.secondary.amount));

                if (multiplier > 0) {
                    let toRemove = multiplier * recipe.secondary.amount;
                    for (let j = 0; j < container.size && toRemove > 0; j++) {
                        const sub = container.getItem(j);
                        if (sub?.typeId === recipe.secondary.id) {
                            const take = Math.min(sub.amount, toRemove);
                            if (sub.amount === take) container.setItem(j, undefined);
                            else { sub.amount -= take; container.setItem(j, sub); }
                            toRemove -= take;
                        }
                    }
                    canCraft = true;
                }
            } else {
                multiplier = Math.floor(item.amount / recipe.ratio);
                if (multiplier > 0) canCraft = true;
            }

            if (canCraft) {
                const remainder = item.amount - (multiplier * recipe.ratio);
                const totalResult = multiplier * recipe.resultAmount;
                const sourceId = item.typeId;

                container.setItem(i, undefined);
                safeAddItems(container, recipe.result, totalResult);

                if (remainder > 0) {
                    safeAddItems(container, sourceId, remainder);
                }
            }
        }
    }

}, { namespaces: ["fv"] });
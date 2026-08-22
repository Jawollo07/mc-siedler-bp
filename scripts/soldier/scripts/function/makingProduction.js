import { system, ItemStack } from "@minecraft/server";

/** Hàm hỗ trợ trừ vật phẩm */
function removeItem(container, typeId, amount) {
    let toRemove = amount;
    for (let i = 0; i < container.size && toRemove > 0; i++) {
        const item = container.getItem(i);
        if (item?.typeId === typeId) {
            const take = Math.min(item.amount, toRemove);
            if (item.amount === take) container.setItem(i, undefined);
            else { item.amount -= take; container.setItem(i, item); }
            toRemove -= take;
        }
    }
}

/** Hàm hỗ trợ thêm item an toàn */
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
    if (id !== "fv:refine_inventory" || !sourceEntity) return;

    const inventory = sourceEntity.getComponent("minecraft:inventory");
    if (!inventory) return;
    const container = inventory.container;

    // --- LẤY CẤP ĐỘ VÀ XP HIỆN TẠI ---
    let level = 0;
    let xp = 0;
    try {
        level = sourceEntity.getProperty("fv:level") ?? 0;
        xp = sourceEntity.getProperty("fv:xp") ?? 0;
    } catch (e) { level = 0; }

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
            console.warn(`§e[Scripting][warning]-§f [Armorer] Dân làng thăng cấp: §6Cấp độ ${newLevel}`);
        }
        sourceEntity.setProperty("fv:xp", newXp);
        sourceEntity.setProperty("fv:level", newLevel);
    }

    // --- LOGIC TINH CHẾ ---
    const nuggetRatio = [9, 8, 7, 6, 5, 4][level];
    const fuelLimit = [32, 30, 28, 26, 24, 22][level];
    let didRefine = false; // Cờ kiểm tra xem có thực hiện nung không

    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (!item) continue;

        const typeId = item.typeId;
        const amount = item.amount;

        switch (typeId) {
            // Nhóm Nugget
            case "fv:raw_iron_nugget":
            case "minecraft:iron_nugget":
            case "fv:raw_copper_nugget":
            case "minecraft:copper_nugget":
            case "fv:raw_gold_nugget":
            case "minecraft:gold_nugget": {
                if (amount >= nuggetRatio) {
                    const ingotId = typeId.includes("iron") ? "minecraft:iron_ingot" : (typeId.includes("copper") ? "minecraft:copper_ingot" : "minecraft:gold_ingot");
                    const ingots = Math.floor(amount / nuggetRatio);
                    const remainder = amount % nuggetRatio;

                    container.setItem(i, undefined);
                    safeAddItems(container, ingotId, ingots);
                    if (remainder > 0) safeAddItems(container, typeId, remainder);

                    didRefine = true; // Đánh dấu là có nung thỏi
                } else if (typeId.startsWith("fv:raw_")) {
                    // Chuyển đổi nugget thô sang thường (Tính là Craft, không tốn than)
                    const normalNugget = typeId.replace("fv:raw_", "minecraft:");
                    container.setItem(i, undefined);
                    safeAddItems(container, normalNugget, amount);
                }
                break;
            }

            // Nhóm Raw Ore -> Ingot (1:1) - Tốn than
            case "minecraft:raw_iron":
            case "minecraft:raw_copper":
            case "minecraft:raw_gold": {
                const ingotId = typeId.replace("raw_", "") + "_ingot";
                container.setItem(i, undefined);
                safeAddItems(container, ingotId, amount);
                didRefine = true;
                break;
            }

            // Ancient Debris -> Netherite Scrap (1:1) - Tốn than
            case "minecraft:ancient_debris":
                container.setItem(i, undefined);
                safeAddItems(container, "minecraft:netherite_scrap", amount);
                didRefine = true;
                break;
        }
    }

    // --- XỬ LÝ NHIÊN LIỆU (CHỈ KHI CÓ NUNG) ---
    if (didRefine) {
        // Ưu tiên trừ than đá trước, sau đó mới đến than củi
        let coalCount = 0;
        for (let j = 0; j < container.size; j++) {
            const f = container.getItem(j);
            if (f?.typeId === "minecraft:coal") coalCount += f.amount;
        }

        if (coalCount >= fuelLimit) {
            removeItem(container, "minecraft:coal", fuelLimit);
        } else {
            removeItem(container, "minecraft:coal", coalCount);
            removeItem(container, "minecraft:charcoal", fuelLimit - coalCount);
        }
    }

    // --- NHẬN THAN CỦI THƯỞNG (Sau khi đã trừ xong than tiêu hao) ---
    const charcoalRewards = [2, 4, 6, 8, 10, 12];
    safeAddItems(container, "minecraft:charcoal", charcoalRewards[level]);

}, { namespaces: ["fv"] });
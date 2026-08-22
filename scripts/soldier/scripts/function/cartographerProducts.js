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

/** Hàm lấy tổng số lượng item */
function getItemCount(container, typeId) {
    let count = 0;
    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (item?.typeId === typeId) count += item.amount;
    }
    return count;
}

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
    if (id !== "fv:cartographer_products" || !sourceEntity) return;

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
        safeAddItems(container, "minecraft:paper", 4);
    }
    else if (level === 1) {
        safeAddItems(container, "minecraft:paper", 8);
        if (Math.random() < 0.5) safeAddItems(container, "minecraft:empty_map", 1);
    }
    else if (level === 2) {
        safeAddItems(container, "minecraft:paper", 10);
        if (Math.random() < 0.5) safeAddItems(container, "minecraft:empty_map", 1);
        if (Math.random() < 0.3) safeAddItems(container, "minecraft:glass", 2);
    }
    else if (level === 3) {
        safeAddItems(container, "minecraft:paper", 12);
        if (Math.random() < 0.5) safeAddItems(container, "minecraft:empty_map", 2);
        if (Math.random() < 0.3) safeAddItems(container, "minecraft:glass", 4);
    }
    else if (level === 4) {
        safeAddItems(container, "minecraft:paper", 14);
        safeAddItems(container, "minecraft:glass", 8);
        if (Math.random() < 0.5) safeAddItems(container, "minecraft:empty_map", 3);
        if (Math.random() < 0.2) safeAddItems(container, "minecraft:compass", 1);
    }
    else if (level === 5) {
        safeAddItems(container, "minecraft:paper", 16);
        safeAddItems(container, "minecraft:glass", 10);
        // Theo progression 1, 1, 2, 3... level 5 nhận 4 bản đồ
        if (Math.random() < 0.5) safeAddItems(container, "minecraft:empty_map", 4);
        if (Math.random() < 0.5) safeAddItems(container, "minecraft:compass", 1);
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

            console.warn(`§e[Scripting][warning]-§f [Cartographer] Dân làng thăng cấp: §6Cấp độ ${newLevel}`);
        }

        sourceEntity.setProperty("fv:xp", newXp);
        sourceEntity.setProperty("fv:level", newLevel);
    }

    // --- PHẦN 2: LOGIC CHẾ TẠO (GIỮ NGUYÊN) ---

    // 1. Mía -> Giấy [1:1]
    let caneCount = getItemCount(container, "minecraft:sugar_cane");
    if (caneCount > 0) {
        let actualAdded = caneCount - safeAddItems(container, "minecraft:paper", caneCount);
        if (actualAdded > 0) removeItem(container, "minecraft:sugar_cane", actualAdded);
    }

    // 2. Giấy -> Giấy viết được (fv:paper_writable) [1:1]
    let paperTotal = getItemCount(container, "minecraft:paper");
    if (paperTotal > 0) {
        let actualAdded = paperTotal - safeAddItems(container, "fv:paper_writable", paperTotal);
        if (actualAdded > 0) removeItem(container, "minecraft:paper", actualAdded);
    }

    // 3. Thỏi đồng (2) -> Ống nhòm (1)
    let copperCount = getItemCount(container, "minecraft:copper_ingot");
    let maxSpyglass = Math.floor(copperCount / 2);
    let spyglassCrafted = 0;
    for (let i = 0; i < maxSpyglass; i++) {
        if (safeAddItems(container, "minecraft:spyglass", 1) === 0) spyglassCrafted++;
        else break;
    }
    if (spyglassCrafted > 0) removeItem(container, "minecraft:copper_ingot", spyglassCrafted * 2);

}, { namespaces: ["fv"] });
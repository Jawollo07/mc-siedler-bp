import { system, ItemStack } from "@minecraft/server";

/**
 * Hàm hỗ trợ lấy số lượng một item cụ thể trong container
 */
function getItemCount(container, typeId) {
    let count = 0;
    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (item?.typeId === typeId) count += item.amount;
    }
    return count;
}

/**
 * Hàm trừ item trong container
 */
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

/** * Hàm hỗ trợ thêm item an toàn (chia nhỏ stack)
 * Hàm này sẽ tự động gộp vào các ô có sẵn hoặc tìm ô trống
 */
function safeAddItems(container, typeId, totalAmount) {
    let remaining = totalAmount;
    while (remaining > 0) {
        // Mặc định chia 64, nhưng với item đặc biệt như fv:copper_boom (stack 8), 
        // Minecraft sẽ tự xử lý nếu item đó được định nghĩa max_stack_size là 8.
        let stackSize = Math.min(remaining, 64);
        try {
            const itemStack = new ItemStack(typeId, stackSize);
            const result = container.addItem(itemStack);
            if (result) {
                return remaining - (stackSize - result.amount);
            }
        } catch (e) {
            // Trường hợp stackSize vượt quá max_stack_size của item (ví dụ copper_boom)
            // Ta thử thêm từng cái 1 cho an toàn tuyệt đối
            const singleItem = new ItemStack(typeId, 1);
            const result = container.addItem(singleItem);
            if (result) return remaining;
            remaining -= 1;
            continue;
        }
        remaining -= stackSize;
    }
    return 0;
}

system.afterEvents.scriptEventReceive.subscribe((event) => {
    const { id, sourceEntity } = event;
    if (id !== "fv:fletcher_products" || !sourceEntity) return;

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
        safeAddItems(container, "minecraft:arrow", 8);
        safeAddItems(container, "minecraft:stick", 8);
    }
    else if (level === 1) {
        safeAddItems(container, "minecraft:arrow", 16);
        safeAddItems(container, "minecraft:stick", 16);
    }
    else if (level === 2) {
        safeAddItems(container, "minecraft:arrow", 20);
        safeAddItems(container, "fv:copper_boom", 1);
    }
    else if (level === 3) {
        safeAddItems(container, "minecraft:arrow", 24);
        safeAddItems(container, "fv:copper_boom", 2);
    }
    else if (level === 4) {
        safeAddItems(container, "minecraft:arrow", 28);
        safeAddItems(container, "fv:copper_boom", 3);
    }
    else if (level === 5) {
        safeAddItems(container, "minecraft:arrow", 32);
        safeAddItems(container, "fv:copper_boom", 4);
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

            console.warn(`§e[Scripting][warning]-§f [Fletcher] Dân làng thăng cấp: §6Cấp độ ${newLevel}`);
        }

        sourceEntity.setProperty("fv:xp", newXp);
        sourceEntity.setProperty("fv:level", newLevel);
    }

    // --- PHẦN 2: CHẾ TẠO CÔNG CỤ (GIỮ NGUYÊN LOGIC CŨ) ---
    let sticks = getItemCount(container, "minecraft:stick");
    let hooks = getItemCount(container, "minecraft:tripwire_hook");
    let copper = getItemCount(container, "minecraft:copper_ingot");
    let gunpowder = getItemCount(container, "minecraft:gunpowder");

    // 1. Chế tạo Nỏ (Crossbow) - 2 Gậy + 1 Móc dây
    let canCraftCrossbow = Math.min(Math.floor(sticks / 2), hooks);
    if (canCraftCrossbow > 0) {
        let actualAdded = canCraftCrossbow - safeAddItems(container, "minecraft:crossbow", canCraftCrossbow);
        if (actualAdded > 0) {
            removeItem(container, "minecraft:stick", actualAdded * 2);
            removeItem(container, "minecraft:tripwire_hook", actualAdded);
            sticks -= (actualAdded * 2);
        }
    }

    // 2. Chế tạo Cung (Bow) - 3 Gậy
    let canCraftBow = Math.floor(sticks / 3);
    if (canCraftBow > 0) {
        let actualAdded = canCraftBow - safeAddItems(container, "minecraft:bow", canCraftBow);
        if (actualAdded > 0) {
            removeItem(container, "minecraft:stick", actualAdded * 3);
            sticks -= (actualAdded * 3);
        }
    }

    // 3. Chế tạo Copper Boom - 2 Thỏi đồng + 1 Gunpowder
    let canCraftBoom = Math.min(Math.floor(copper / 2), gunpowder);
    if (canCraftBoom > 0) {
        let actualAdded = canCraftBoom - safeAddItems(container, "fv:copper_boom", canCraftBoom);
        if (actualAdded > 0) {
            removeItem(container, "minecraft:copper_ingot", actualAdded * 2);
            removeItem(container, "minecraft:gunpowder", actualAdded);
        }
    }

}, { namespaces: ["fv"] });
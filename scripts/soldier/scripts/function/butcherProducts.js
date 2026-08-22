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

/** Hàm hỗ trợ thêm item an toàn (chia nhỏ stack) */
function safeAddItems(container, typeId, totalAmount) {
    let remaining = totalAmount;
    while (remaining > 0) {
        let stackSize = Math.min(remaining, 64);
        const result = container.addItem(new ItemStack(typeId, stackSize));
        if (result) {
            return remaining - (stackSize - result.amount);
        }
        remaining -= stackSize;
    }
    return 0;
}

system.afterEvents.scriptEventReceive.subscribe((event) => {
    const { id, sourceEntity } = event;
    if (id !== "fv:butcher_products" || !sourceEntity) return;

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
        safeAddItems(container, "minecraft:cookie", 8);
    } else if (level === 1) {
        safeAddItems(container, "minecraft:cookie", 16);
    } else if (level === 2) {
        safeAddItems(container, "minecraft:pumpkin_pie", 2);
        safeAddItems(container, "minecraft:cookie", 16);
    } else if (level === 3) {
        safeAddItems(container, "minecraft:pumpkin_pie", 4);
        safeAddItems(container, "minecraft:cookie", 16);
    } else if (level === 4) {
        safeAddItems(container, "minecraft:pumpkin_pie", 8);
        safeAddItems(container, "minecraft:cookie", 18);
    } else if (level === 5) {
        safeAddItems(container, "minecraft:pumpkin_pie", 16);
        safeAddItems(container, "minecraft:cookie", 20);
        if (Math.random() < 0.5) {
            safeAddItems(container, "minecraft:cake", 1);
        }
    }

    // --- CƠ CHẾ CỘNG XP VÀ LÊN CẤP ---
    if (level < 5) {
        const xpGains = [20, 18, 16, 14, 12];
        let newXp = xp + xpGains[level];
        let newLevel = level;

        if (newXp >= 100) {
            newLevel += 1;
            newXp -= 100;
            if (newLevel > 5) newLevel = 5;
            if (newLevel === 5) newXp = 0;

            // Thông báo chỉ qua console.warn
            console.warn(`§e[Scripting][warning]-§f [Butcher] Dân làng thăng cấp: §6Cấp độ ${newLevel}`);
        }

        sourceEntity.setProperty("fv:xp", newXp);
        sourceEntity.setProperty("fv:level", newLevel);
    }

    // --- PHẦN 2: CHẾ TẠO ĐẶC BIỆT ---
    // 1. Súp nấm
    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (item?.typeId === "minecraft:bowl") {
            const leftover = safeAddItems(container, "minecraft:mushroom_stew", 1);
            if (leftover === 0) removeItem(container, "minecraft:bowl", 1);
            break;
        }
    }

    // 2. Bánh bí ngô
    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (item?.typeId === "minecraft:pumpkin") {
            const totalPies = item.amount * 4;
            const leftover = safeAddItems(container, "minecraft:pumpkin_pie", totalPies);
            const piesAdded = totalPies - leftover;
            const pumpkinsUsed = Math.floor(piesAdded / 4);
            if (pumpkinsUsed > 0) removeItem(container, "minecraft:pumpkin", pumpkinsUsed);
        }
    }

    // --- PHẦN 3: NẤU ĐỒ ĂN ---
    const cookMap = {
        "minecraft:porkchop": "minecraft:cooked_porkchop",
        "minecraft:mutton": "minecraft:cooked_mutton",
        "minecraft:chicken": "minecraft:cooked_chicken",
        "minecraft:rabbit": "minecraft:cooked_rabbit",
        "minecraft:beef": "minecraft:cooked_beef",
        "minecraft:cod": "minecraft:cooked_cod",
        "minecraft:salmon": "minecraft:cooked_salmon",
        "minecraft:potato": "minecraft:baked_potato"
    };

    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (!item) continue;
        const cookedId = cookMap[item.typeId];
        if (cookedId) {
            const amount = item.amount;
            const leftover = safeAddItems(container, cookedId, amount);
            const actualCooked = amount - leftover;
            if (actualCooked > 0) removeItem(container, item.typeId, actualCooked);
        }
    }
}, { namespaces: ["fv"] });
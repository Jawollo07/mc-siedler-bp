import { system, ItemStack } from "@minecraft/server";

// Danh sách mã data cho thuốc có lợi và mũi tên tẩm thuốc có hại
const POSITIVE_POOL = [22, 22, 22, 22, 29, 29, 29, 29, 2, 4, 6, 8, 10, 12, 25, 31, 35];
const NEGATIVE_ARROW_POOL = [14, 16, 18, 20, 24, 27, 33, 36];

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

system.afterEvents.scriptEventReceive.subscribe((event) => {
    const { id, sourceEntity } = event;
    if (id !== "fv:cleric_products" || !sourceEntity) return;

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

    // --- PHẦN 1: PHẦN THƯỞNG (QUÀ TẶNG) THEO CẤP ĐỘ ---
    // Số lượng thuốc tặng = level + 1 (Level 0 tặng 1, Level 5 tặng 6)
    const giftCount = level + 1;
    let giftsGiven = 0;

    for (let i = 0; i < container.size && giftsGiven < giftCount; i++) {
        if (!container.getItem(i)) {
            const giftData = POSITIVE_POOL[Math.floor(Math.random() * POSITIVE_POOL.length)];
            // Sử dụng replaceitem để hỗ trợ data value của thuốc
            sourceEntity.runCommand(`replaceitem entity @s slot.inventory ${i} potion 1 ${giftData}`);
            giftsGiven++;
        }
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

            console.warn(`§e[Scripting][warning]-§f [Cleric] Dân làng thăng cấp: §6Cấp độ ${newLevel}`);
        }

        sourceEntity.setProperty("fv:xp", newXp);
        sourceEntity.setProperty("fv:level", newLevel);
    }

    // --- PHẦN 2: XỬ LÝ MŨI TÊN (CHẾ TẠO) ---
    let arrowSlots = [];
    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (item && item.typeId === "minecraft:arrow" && !item.nameTag) {
            arrowSlots.push({ slot: i, amount: item.amount });
        }
    }

    for (const entry of arrowSlots) {
        container.setItem(entry.slot, undefined);
        const data = NEGATIVE_ARROW_POOL[Math.floor(Math.random() * NEGATIVE_ARROW_POOL.length)];
        sourceEntity.runCommand(`replaceitem entity @s slot.inventory ${entry.slot} arrow ${entry.amount} ${data}`);
    }

    // --- PHẦN 3: XỬ LÝ CHAI THỦY TINH (CHẾ TẠO) ---
    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (item?.typeId === "minecraft:glass_bottle") {
            let bottles = item.amount;
            let emptySlots = [];
            for (let s = 0; s < container.size; s++) {
                if (!container.getItem(s)) emptySlots.push(s);
            }

            let canCraft = Math.min(bottles, emptySlots.length);
            if (canCraft > 0) {
                removeItem(container, "minecraft:glass_bottle", canCraft);
                for (let j = 0; j < canCraft; j++) {
                    const d = POSITIVE_POOL[Math.floor(Math.random() * POSITIVE_POOL.length)];
                    sourceEntity.runCommand(`replaceitem entity @s slot.inventory ${emptySlots[j]} potion 1 ${d}`);
                }
            }
        }
    }

}, { namespaces: ["fv"] });
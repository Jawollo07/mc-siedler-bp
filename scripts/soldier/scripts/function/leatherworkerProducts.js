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

/** Hàm lấy tổng số lượng vật phẩm */
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
    if (id !== "fv:leatherworker_products" || !sourceEntity) return;

    const inventory = sourceEntity.getComponent("minecraft:inventory");
    if (!inventory) return;
    const container = inventory.container;

    // --- [MỚI] LẤY CẤP ĐỘ VÀ XP ---
    let level = 0;
    let xp = 0;
    try {
        level = sourceEntity.getProperty("fv:level") ?? 0;
        xp = sourceEntity.getProperty("fv:xp") ?? 0;
    } catch (e) { level = 0; }

    // --- PHẦN 1: PHẦN THƯỞNG THEO LEVEL (THAY THẾ QUÀ TẶNG CŨ) ---
    if (level === 0) {
        safeAddItems(container, "minecraft:leather", 1);
    }
    else if (level === 1) {
        safeAddItems(container, "minecraft:leather", 1);
        if (Math.random() < 0.5) safeAddItems(container, "minecraft:saddle", 1);
    }
    else if (level === 2) {
        safeAddItems(container, "minecraft:leather", 2);
        safeAddItems(container, "minecraft:rabbit_hide", 2);
        if (Math.random() < 0.5) safeAddItems(container, "minecraft:saddle", 1);
    }
    else if (level === 3) {
        safeAddItems(container, "minecraft:leather", 3);
        safeAddItems(container, "minecraft:rabbit_hide", 3);
        safeAddItems(container, "minecraft:saddle", 1);
    }
    else if (level === 4) {
        safeAddItems(container, "minecraft:leather", 4);
        safeAddItems(container, "minecraft:armadillo_scute", 1);
        safeAddItems(container, "minecraft:saddle", 1);
    }
    else if (level === 5) {
        safeAddItems(container, "minecraft:leather", 5);
        safeAddItems(container, "minecraft:armadillo_scute", 2);
        safeAddItems(container, "minecraft:turtle_scute", 1);
        safeAddItems(container, "minecraft:saddle", 1);
    }

    // [MỚI] CƠ CHẾ CỘNG XP VÀ LÊN CẤP
    if (level < 5) {
        const xpGains = [20, 18, 16, 14, 12];
        let newXp = xp + xpGains[level];
        let newLevel = level;

        if (newXp >= 100) {
            newLevel += 1;
            newXp -= 100;
            if (newLevel > 5) newLevel = 5;
            if (newLevel === 5) newXp = 0;
            console.warn(`§e[Scripting][warning]-§f [Leatherworker] Dân làng thăng cấp: §6Cấp độ ${newLevel}`);
        }
        sourceEntity.setProperty("fv:xp", newXp);
        sourceEntity.setProperty("fv:level", newLevel);
    }

    // --- PHẦN 2: CHẾ TẠO GIÁP NGỰA (GIỮ NGUYÊN GỐC) ---
    const horseMaterials = [
        { matId: "minecraft:diamond", armorId: "minecraft:diamond_horse_armor" },
        { matId: "minecraft:iron_ingot", armorId: "minecraft:iron_horse_armor" },
        { matId: "minecraft:copper_ingot", armorId: "minecraft:copper_horse_armor" },
        { matId: "minecraft:gold_ingot", armorId: "minecraft:golden_horse_armor" }
    ];

    for (const mat of horseMaterials) {
        let count = getItemCount(container, mat.matId);
        while (count >= 10) {
            const leftover = safeAddItems(container, mat.armorId, 1);
            if (leftover === 0) {
                removeItem(container, mat.matId, 10);
                count -= 10;
            } else break;
        }
    }

    // --- PHẦN 3: NÂNG CẤP GIÁP NGỰA NETHERITE (GIỮ NGUYÊN GỐC) ---
    let netherCount = getItemCount(container, "minecraft:netherite_ingot");
    if (netherCount > 0) {
        for (let i = 0; i < container.size; i++) {
            const item = container.getItem(i);
            if (item?.typeId === "minecraft:diamond_horse_armor" && netherCount > 0) {
                const amountToUpgrade = item.amount;
                const canUpgrade = Math.min(amountToUpgrade, netherCount);

                const leftover = safeAddItems(container, "minecraft:netherite_horse_armor", canUpgrade);
                const actualUpgraded = canUpgrade - leftover;

                if (actualUpgraded > 0) {
                    if (item.amount === actualUpgraded) container.setItem(i, undefined);
                    else { item.amount -= actualUpgraded; container.setItem(i, item); }

                    removeItem(container, "minecraft:netherite_ingot", actualUpgraded);
                    netherCount -= actualUpgraded;
                }
            }
        }
    }

    // --- PHẦN 4: CHẾ TẠO TỪ VẢY ĐỘNG VẬT (GIỮ NGUYÊN GỐC) ---

    // 1. Giáp mũ rùa (4 vảy rùa)
    let turtleScutes = getItemCount(container, "minecraft:turtle_scute");
    while (turtleScutes >= 4) {
        if (safeAddItems(container, "minecraft:turtle_helmet", 1) === 0) {
            removeItem(container, "minecraft:turtle_scute", 4);
            turtleScutes -= 4;
        } else break;
    }

    // 2. Giáp chó (6 vảy Armadillo)
    let armadilloScutes = getItemCount(container, "minecraft:armadillo_scute");
    while (armadilloScutes >= 6) {
        if (safeAddItems(container, "minecraft:wolf_armor", 1) === 0) {
            removeItem(container, "minecraft:armadillo_scute", 6);
            armadilloScutes -= 6;
        } else break;
    }

}, { namespaces: ["fv"] });
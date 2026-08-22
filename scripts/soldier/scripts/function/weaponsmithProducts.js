import { system, ItemStack } from "@minecraft/server";

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

/**
 * Hàm đếm tổng số lượng item
 */
function getItemCount(container, typeId) {
    let count = 0;
    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (item?.typeId === typeId) count += item.amount;
    }
    return count;
}

system.afterEvents.scriptEventReceive.subscribe((event) => {
    const { id, sourceEntity } = event;
    if (id !== "fv:weaponsmith_products" || !sourceEntity) return;

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
    const toolTypes = ["sword", "axe", "spear"];
    const randType = toolTypes[Math.floor(Math.random() * toolTypes.length)];

    if (level === 0) {
        container.addItem(new ItemStack(`minecraft:golden_${randType}`, 1));
    }
    else if (level === 1) {
        container.addItem(new ItemStack(`minecraft:stone_${randType}`, 1));
    }
    else if (level === 2) {
        container.addItem(new ItemStack(`minecraft:copper_${randType}`, 1));
    }
    else if (level === 3) {
        // Vũ khí sắt hoặc Khiên (Random)
        if (Math.random() < 0.5) container.addItem(new ItemStack(`minecraft:iron_${randType}`, 1));
        else container.addItem(new ItemStack("minecraft:shield", 1));
    }
    else if (level === 4) {
        // Vũ khí kim cương hoặc Khiên (Random)
        if (Math.random() < 0.5) container.addItem(new ItemStack(`minecraft:diamond_${randType}`, 1));
        else container.addItem(new ItemStack("minecraft:shield", 1));
    }
    else if (level === 5) {
        // Vũ khí kim cương VÀ Khiên (100%)
        container.addItem(new ItemStack(`minecraft:diamond_${randType}`, 1));
        container.addItem(new ItemStack("minecraft:shield", 1));
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
            console.warn(`§e[Scripting][warning]-§f [Weaponsmith] Dân làng thăng cấp: §6Cấp độ ${newLevel}`);
        }
        sourceEntity.setProperty("fv:xp", newXp);
        sourceEntity.setProperty("fv:level", newLevel);
    }

    // --- PHẦN 2: LOGIC CHẾ TẠO CHIA LÔ (6-6-6) (GIỮ NGUYÊN GỐC) ---
    const materials = [
        { id: "minecraft:gold_ingot", sword: "minecraft:golden_sword", axe: "minecraft:golden_axe", spear: "minecraft:golden_spear" },
        { id: "minecraft:copper_ingot", sword: "minecraft:copper_sword", axe: "minecraft:copper_axe", spear: "minecraft:copper_spear" },
        { id: "minecraft:iron_ingot", sword: "minecraft:iron_sword", axe: "minecraft:iron_axe", spear: "minecraft:iron_spear" },
        { id: "minecraft:diamond", sword: "minecraft:diamond_sword", axe: "minecraft:diamond_axe", spear: "minecraft:diamond_spear" }
    ];

    for (const mat of materials) {
        let count = getItemCount(container, mat.id);
        while (count >= 1) {
            let hasCrafted = false;

            // 6 Kiếm (2 thỏi)
            for (let i = 0; i < 6 && count >= 2; i++) {
                if (!container.addItem(new ItemStack(mat.sword, 1))) {
                    removeItem(container, mat.id, 2);
                    count -= 2;
                    hasCrafted = true;
                } else break;
            }
            // 6 Rìu (3 thỏi)
            for (let i = 0; i < 6 && count >= 3; i++) {
                if (!container.addItem(new ItemStack(mat.axe, 1))) {
                    removeItem(container, mat.id, 3);
                    count -= 3;
                    hasCrafted = true;
                } else break;
            }
            // 6 Spear (1 thỏi)
            for (let i = 0; i < 6 && count >= 1; i++) {
                if (!container.addItem(new ItemStack(mat.spear, 1))) {
                    removeItem(container, mat.id, 1);
                    count -= 1;
                    hasCrafted = true;
                } else break;
            }
            if (!hasCrafted) break;
        }
    }

    // --- PHẦN 3: NÂNG CẤP NETHERITE (GIỮ NGUYÊN GỐC) ---
    let netherCount = getItemCount(container, "minecraft:netherite_ingot");
    if (netherCount > 0) {
        for (let i = 0; i < container.size; i++) {
            const item = container.getItem(i);
            if (!item || netherCount <= 0) continue;

            let targetId = "";
            if (item.typeId === "minecraft:diamond_sword") targetId = "minecraft:netherite_sword";
            else if (item.typeId === "minecraft:diamond_axe") targetId = "minecraft:netherite_axe";
            else if (item.typeId === "minecraft:diamond_spear") targetId = "minecraft:netherite_spear";

            if (targetId !== "") {
                const netherItem = new ItemStack(targetId, 1);
                const oldEnchantable = item.getComponent("minecraft:enchantable");
                const newEnchantable = netherItem.getComponent("minecraft:enchantable");

                // Chuyển phù phép
                if (oldEnchantable && newEnchantable) {
                    const enchants = oldEnchantable.getEnchantments();
                    for (const ench of enchants) {
                        newEnchantable.addEnchantment(ench);
                    }
                }

                // Thực hiện đổi item
                if (!container.addItem(netherItem)) {
                    container.setItem(i, undefined); // Xóa đồ kim cương cũ
                    removeItem(container, "minecraft:netherite_ingot", 1);
                    netherCount--;
                }
            }
        }
    }
}, { namespaces: ["fv"] });
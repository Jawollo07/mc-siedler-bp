import { system, ItemStack, ItemComponentTypes } from "@minecraft/server";

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

system.afterEvents.scriptEventReceive.subscribe((event) => {
    const { id, sourceEntity } = event;
    if (id !== "fv:toolsmith_products" || !sourceEntity) return;

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

    // --- PHẦN 1: PHẦN THƯỞNG THEO LEVEL ---
    const TOOLS_TYPE = ["pickaxe", "shovel", "hoe"];
    const randomToolType = TOOLS_TYPE[Math.floor(Math.random() * TOOLS_TYPE.length)];

    const levelRewards = [
        { tool: `minecraft:golden_${randomToolType}`, armor: "fv:full_set_gold_armor" },        // Level 0
        { tool: `minecraft:stone_${randomToolType}`, armor: "fv:full_set_chainmail_armor" },   // Level 1
        { tool: `minecraft:copper_${randomToolType}`, armor: "fv:full_set_copper_armor" },     // Level 2
        { tool: `minecraft:iron_${randomToolType}`, armor: "fv:full_set_iron_armor" },         // Level 3
        { tool: `minecraft:diamond_${randomToolType}`, armor: "fv:full_set_diamond_armor" },   // Level 4
        { tool: `minecraft:diamond_${randomToolType}`, armor: "fv:full_set_diamond_armor" }    // Level 5
    ];

    const currentReward = levelRewards[level];

    // LOGIC THƯỞNG MỚI:
    if (level < 5) {
        // Cấp 0-4: Random 50/50 giữa Tool hoặc Armor
        if (Math.random() < 0.5) {
            container.addItem(new ItemStack(currentReward.tool, 1));
        } else {
            container.addItem(new ItemStack(currentReward.armor, 1));
        }
    } else {
        // Cấp 5: 100% nhận 1 bộ Giáp Kim Cương
        container.addItem(new ItemStack("fv:full_set_diamond_armor", 1));

        // Vẫn cộng thêm 1 lượt random (giáp hoặc tool) như quy tắc chung
        if (Math.random() < 0.5) {
            container.addItem(new ItemStack(currentReward.tool, 1));
        } else {
            container.addItem(new ItemStack(currentReward.armor, 1));
        }
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
            console.warn(`§e[Scripting][warning]-§f [Toolsmith] Dân làng thăng cấp: §6Cấp độ ${newLevel}`);
        }
        sourceEntity.setProperty("fv:xp", newXp);
        sourceEntity.setProperty("fv:level", newLevel);
    }

    // --- PHẦN 2: TÍNH NĂNG SỬA CHỮA (GIỮ NGUYÊN GỐC) ---
    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (!item) continue;
        const itemId = item.typeId;
        const isRepairable = item.hasTag("minecraft:is_pickaxe") || item.hasTag("minecraft:is_shovel") ||
            item.hasTag("minecraft:is_hoe") || item.hasTag("minecraft:is_axe") ||
            item.hasTag("minecraft:is_sword") || item.hasTag("minecraft:is_spear") ||
            itemId.includes("bow") || itemId.includes("crossbow") ||
            itemId.includes("helmet") || itemId.includes("chestplate") ||
            itemId.includes("leggings") || itemId.includes("boots");
        if (isRepairable) {
            const durability = item.getComponent(ItemComponentTypes.Durability);
            if (durability && durability.damage > 0) {
                durability.damage = 0;
                container.setItem(i, item);
            }
        }
    }

    // --- PHẦN 3: LOGIC CHẾ TẠO FULL SET & CÔNG CỤ (GIỮ NGUYÊN GỐC) ---
    const materials = [
        { id: "minecraft:diamond", pick: "minecraft:diamond_pickaxe", shovel: "minecraft:diamond_shovel", hoe: "minecraft:diamond_hoe", fullSet: "fv:full_set_diamond_armor" },
        { id: "minecraft:iron_ingot", pick: "minecraft:iron_pickaxe", shovel: "minecraft:iron_shovel", hoe: "minecraft:iron_hoe", fullSet: "fv:full_set_iron_armor" },
        { id: "minecraft:copper_ingot", pick: "minecraft:copper_pickaxe", shovel: "minecraft:copper_shovel", hoe: "minecraft:copper_hoe", fullSet: "fv:full_set_copper_armor" },
        { id: "minecraft:gold_ingot", pick: "minecraft:golden_pickaxe", shovel: "minecraft:golden_shovel", hoe: "minecraft:golden_hoe", fullSet: "fv:full_set_gold_armor" }
    ];

    for (const mat of materials) {
        let count = getItemCount(container, mat.id);
        while (count >= 20) {
            if (!container.addItem(new ItemStack(mat.fullSet, 1))) {
                removeItem(container, mat.id, 20);
                count -= 20;
            } else break;
        }
        while (count >= 1) {
            let madeSomething = false;
            if (count >= 3) if (!container.addItem(new ItemStack(mat.pick, 1))) { removeItem(container, mat.id, 3); count -= 3; madeSomething = true; }
            if (count >= 2) if (!container.addItem(new ItemStack(mat.hoe, 1))) { removeItem(container, mat.id, 2); count -= 2; madeSomething = true; }
            if (count >= 1) if (!container.addItem(new ItemStack(mat.shovel, 1))) { removeItem(container, mat.id, 1); count -= 1; madeSomething = true; }
            if (!madeSomething) break;
        }
    }

    // --- PHẦN 4: NÂNG CẤP NETHERITE (GIỮ NGUYÊN GỐC) ---
    let netherCount = getItemCount(container, "minecraft:netherite_ingot");

    for (let i = 0; i < container.size; i++) {
        if (netherCount <= 0) break;
        const item = container.getItem(i);
        if (!item) continue;

        let targetId = "";
        let costPerItem = 1;

        if (item.typeId === "minecraft:diamond_pickaxe") targetId = "minecraft:netherite_pickaxe";
        else if (item.typeId === "minecraft:diamond_shovel") targetId = "minecraft:netherite_shovel";
        else if (item.typeId === "minecraft:diamond_hoe") targetId = "minecraft:netherite_hoe";
        else if (item.typeId === "fv:full_set_diamond_armor") { targetId = "fv:full_set_netherite_armor"; costPerItem = 4; }
        else if (item.typeId === "fv:full_set_diamond_armor_enchanted") { targetId = "fv:full_set_netherite_armor_enchanted"; costPerItem = 4; }

        if (targetId !== "") {
            const maxByNetherite = Math.floor(netherCount / costPerItem);
            const amountToUpgrade = Math.min(item.amount, maxByNetherite);

            if (amountToUpgrade > 0) {
                const netherItemStack = new ItemStack(targetId, amountToUpgrade);
                const oldEnch = item.getComponent(ItemComponentTypes.Enchantable);
                const newEnch = netherItemStack.getComponent(ItemComponentTypes.Enchantable);
                if (oldEnch && newEnch) {
                    for (const ench of oldEnch.getEnchantments()) {
                        newEnch.addEnchantment(ench);
                    }
                }
                const leftover = container.addItem(netherItemStack);
                const actualAdded = leftover ? amountToUpgrade - leftover.amount : amountToUpgrade;

                if (actualAdded > 0) {
                    if (item.amount === actualAdded) container.setItem(i, undefined);
                    else { item.amount -= actualAdded; container.setItem(i, item); }
                    const totalCost = actualAdded * costPerItem;
                    removeItem(container, "minecraft:netherite_ingot", totalCost);
                    netherCount -= totalCost;
                }
            }
        }
    }
}, { namespaces: ["fv"] });
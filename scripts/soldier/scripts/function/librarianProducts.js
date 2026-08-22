import { system, ItemStack, EnchantmentTypes } from "@minecraft/server";

// --- 1. CẤU HÌNH HỆ THỐNG ---
const FULL_SET_UPGRADES = {
    // Giữ fv: cho đồ custom của ông
    "fv:full_set_copper_armor": "fv:full_set_copper_armor_enchanted",
    "fv:full_set_chainmail_armor": "fv:full_set_chainmail_armor_enchanted",
    "fv:full_set_gold_armor": "fv:full_set_gold_armor_enchanted",
    "fv:full_set_iron_armor": "fv:full_set_iron_armor_enchanted",
    "fv:full_set_diamond_armor": "fv:full_set_diamond_armor_enchanted",
    "fv:full_set_netherite_armor": "fv:full_set_netherite_armor_enchanted"
};

const FIXED_ARMOR_ENCHANTS = ["protection", "unbreaking", "mending"];
const FIXED_BOOTS_ENCHANTS = ["protection", "unbreaking", "mending", "depth_strider"];
const FIXED_CROSSBOW_ENCHANTS = ["quick_charge", "piercing", "unbreaking", "mending"];
const COMMON_ENCHANTS = ["unbreaking", "mending"];

const REROLL_POOLS = {
    sword: ["sharpness", "smite", "fire_aspect", "looting", "knockback"],
    tool: ["efficiency", "fortune", "silk_touch"],
    bow: ["power", "punch", "flame", "infinity"],
    spear: ["sharpness", "smite", "bane_of_arthropods", "looting", "knockback", "fire_aspect", "lunge"]
};

// --- 2. HÀM HỖ TRỢ ---

function getItemCount(container, typeId) {
    let count = 0;
    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (item?.typeId === typeId) count += item.amount;
    }
    return count;
}

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

// --- 3. LOGIC PHÙ PHÉP TINH LUYỆN ---

function applyLibrarianEnchant(itemStack, config) {
    const enchantable = itemStack.getComponent("minecraft:enchantable");
    if (!enchantable) return;

    const tid = itemStack.typeId;
    // Kiểm tra Spear bằng tag hoặc typeId
    const isSpear = tid.includes("_spear") || itemStack.hasTag("minecraft:is_spear");

    // A. NHÓM ĐỒ CỐ ĐỊNH
    if (tid.includes("_helmet") || tid.includes("_chestplate") || tid.includes("_leggings") || tid.includes("_boots") || tid === "minecraft:crossbow") {
        let targetList = FIXED_ARMOR_ENCHANTS;
        if (tid.includes("_boots")) targetList = FIXED_BOOTS_ENCHANTS;
        if (tid === "minecraft:crossbow") targetList = FIXED_CROSSBOW_ENCHANTS;

        targetList.forEach(enchId => {
            const type = EnchantmentTypes.get(enchId);
            if (type) try { enchantable.addEnchantment({ type: type, level: type.maxLevel }); } catch (e) { }
        });
        return;
    }

    // B. NHÓM ĐỒ RE-ROLL
    // Thêm các dòng chung (Unbreaking, Mending)
    if (tid !== "minecraft:book" && tid !== "minecraft:enchanted_book") {
        COMMON_ENCHANTS.forEach(enchId => {
            const type = EnchantmentTypes.get(enchId);
            if (type) try { enchantable.addEnchantment({ type: type, level: type.maxLevel }); } catch (e) { }
        });
    }

    let pool = [];
    if (tid === "minecraft:bow") pool = REROLL_POOLS.bow;
    else if (isSpear) pool = REROLL_POOLS.spear;
    else if (tid.includes("_sword")) pool = REROLL_POOLS.sword;
    else if (tid.includes("_pickaxe") || tid.includes("_axe") || tid.includes("_shovel") || tid.includes("_hoe")) pool = REROLL_POOLS.tool;
    else if (tid === "minecraft:enchanted_book" || tid === "minecraft:book") pool = ["sharpness", "protection", "efficiency", "power", "looting", "fortune"];

    for (let i = 0; i < config.rolls; i++) {
        let selectedId = pool[Math.floor(Math.random() * pool.length)];

        if (tid === "minecraft:bow") {
            if (selectedId === "infinity" && enchantable.hasEnchantment("mending")) continue;
            if (selectedId === "mending" && enchantable.hasEnchantment("infinity")) continue;
        }

        const type = EnchantmentTypes.get(selectedId);
        if (type) {
            try { enchantable.addEnchantment({ type: type, level: Math.min(config.level, type.maxLevel) }); } catch (e) { }
        }
    }
}

// --- 4. SỰ KIỆN CHÍNH ---

system.afterEvents.scriptEventReceive.subscribe((event) => {
    const { id, sourceEntity } = event;
    if (id !== "fv:librarian_products" || !sourceEntity) return;

    const inventory = sourceEntity.getComponent("minecraft:inventory");
    if (!inventory) return;
    const container = inventory.container;

    let level = sourceEntity.getProperty("fv:level") ?? 0;
    let xp = sourceEntity.getProperty("fv:xp") ?? 0;

    const xpRewards = [8, 12, 16, 20, 24, 28];
    safeAddItems(container, "minecraft:experience_bottle", xpRewards[level]);

    if (level < 5) {
        const gains = [20, 18, 16, 14, 12];
        xp += gains[level];
        if (xp >= 100) {
            level = Math.min(level + 1, 5);
            xp = (level === 5) ? 0 : xp - 100;
            console.warn(`§e[Librarian]§f Thăng cấp: §6Cấp độ ${level}`);
        }
        sourceEntity.setProperty("fv:level", level);
        sourceEntity.setProperty("fv:xp", xp);
    }

    let totalXp = getItemCount(container, "minecraft:experience_bottle");

    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (!item) continue;

        const upgradedId = FULL_SET_UPGRADES[item.typeId];
        if (upgradedId && totalXp >= 32) {
            removeItem(container, "minecraft:experience_bottle", 32);
            totalXp -= 32;
            container.setItem(i, undefined);
            safeAddItems(container, upgradedId, item.amount);
            continue;
        }

        let config = null;
        const tid = item.typeId;
        const isSpear = tid.includes("_spear") || item.hasTag("minecraft:is_spear");

        if (tid === "minecraft:book") config = { cost: 4, level: 4, rolls: 1, isBook: true };
        else if (tid.includes("_helmet") || tid.includes("_chestplate") || tid.includes("_leggings") || tid.includes("_boots")) config = { cost: 8, level: 5, rolls: 1 };
        else if (tid.includes("_sword") || tid.includes("_pickaxe") || tid.includes("_axe") || tid.includes("_shovel") || tid.includes("_hoe") ||
            tid === "minecraft:bow" || tid === "minecraft:crossbow" || isSpear) {
            config = { cost: 12, level: 5, rolls: 2 };
        }

        if (config && totalXp >= config.cost) {
            removeItem(container, "minecraft:experience_bottle", config.cost);
            totalXp -= config.cost;

            if (config.isBook) {
                const amt = item.amount;
                container.setItem(i, undefined);
                let enchBook = new ItemStack("minecraft:enchanted_book", 1);
                applyLibrarianEnchant(enchBook, config);
                container.addItem(enchBook);
                if (amt > 1) safeAddItems(container, "minecraft:book", amt - 1);
            } else {
                let single = item.clone();
                single.amount = 1;
                applyLibrarianEnchant(single, config);

                if (item.amount > 1) {
                    item.amount -= 1;
                    container.setItem(i, item);
                    container.addItem(single);
                } else {
                    container.setItem(i, single);
                }
            }
        }
    }
}, { namespaces: ["fv"] });
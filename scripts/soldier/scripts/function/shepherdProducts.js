import { system, ItemStack } from "@minecraft/server";

// Bảng màu tương ứng với Data Value của Bed/Dye/Wool
const COLOR_DATA = {
    "white": 0, "orange": 1, "magenta": 2, "light_blue": 3, "yellow": 4, "lime": 5, "pink": 6, "gray": 7, "light_gray": 8, "cyan": 9, "purple": 10, "blue": 11, "brown": 12, "green": 13, "red": 14, "black": 15
};
const COLORS = Object.keys(COLOR_DATA);

/** Hàm hỗ trợ trừ vật phẩm (Giữ nguyên gốc) */
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

/** Hàm tìm ô trống để dùng lệnh replaceitem (Đảm bảo không đè item cũ) */
function findEmptySlot(container) {
    for (let i = 0; i < container.size; i++) {
        if (!container.getItem(i)) return i;
    }
    return -1;
}

system.afterEvents.scriptEventReceive.subscribe((event) => {
    const { id, sourceEntity } = event;
    if (id !== "fv:shepherd_products" || !sourceEntity) return;

    const inventory = sourceEntity.getComponent("minecraft:inventory");
    if (!inventory) return;
    const container = inventory.container;

    // --- 1. LẤY CẤP ĐỘ VÀ XP (MỚI) ---
    let level = 0;
    let xp = 0;
    try {
        level = sourceEntity.getProperty("fv:level") ?? 0;
        xp = sourceEntity.getProperty("fv:xp") ?? 0;
    } catch (e) { level = 0; }

    // --- 2. PHẦN THƯỞNG THEO LEVEL (Dùng replaceitem để fix màu) ---

    // Thuốc nhuộm (Luôn có: level + 1 cái)
    for (let d = 0; d < (level + 1); d++) {
        let slot = findEmptySlot(container);
        if (slot !== -1) {
            const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
            const dataVal = COLOR_DATA[randomColor];
            sourceEntity.runCommand(`replaceitem entity @s slot.inventory ${slot} dye 1 ${dataVal}`);
        }
    }

    // Giường (50% cơ hội)
    if (Math.random() < 0.5) {
        let slot = findEmptySlot(container);
        if (slot !== -1) {
            const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
            const dataVal = COLOR_DATA[randomColor];
            sourceEntity.runCommand(`replaceitem entity @s slot.inventory ${slot} bed 1 ${dataVal}`);
        }
    }

    // Các vật phẩm khác (Dùng addItem bình thường)
    if (level >= 1 && Math.random() < 0.5) container.addItem(new ItemStack("minecraft:shears", 1));
    if (level >= 2 && Math.random() < 0.5) container.addItem(new ItemStack("minecraft:armor_stand", 1));
    if (level >= 3 && Math.random() < 0.5) container.addItem(new ItemStack("minecraft:feather", 2));
    if (level >= 4 && Math.random() < 0.5) container.addItem(new ItemStack("minecraft:painting", 1));
    if (level === 5) container.addItem(new ItemStack("minecraft:string", 1));

    // CỘNG XP VÀ LÊN CẤP
    if (level < 5) {
        const xpGains = [20, 18, 16, 14, 12];
        let newXp = xp + xpGains[level];
        let newLevel = level;
        if (newXp >= 100) {
            newLevel += 1; newXp -= 100;
            if (newLevel > 5) newLevel = 5;
            if (newLevel === 5) newXp = 0;
            console.warn(`§e[Scripting][warning]-§f [Shepherd] Dân làng thăng cấp: §6Cấp độ ${newLevel}`);
        }
        sourceEntity.setProperty("fv:xp", newXp);
        sourceEntity.setProperty("fv:level", newLevel);
    }

    // --- 3. LOGIC CHẾ TẠO GỐC (KHÔI PHỤC 100%) ---
    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (!item) continue;

        // Chế tạo Giường: 3 Len + 2 Gỗ
        if (item.typeId.endsWith("_wool")) {
            const color = item.typeId.replace("minecraft:", "").replace("_wool", "");
            const dataValue = COLOR_DATA[color] ?? 0;

            if (item.amount >= 3) {
                let plankType = null;
                for (let j = 0; j < container.size; j++) {
                    const p = container.getItem(j);
                    if (p?.typeId.endsWith("_planks") && p.amount >= 2) {
                        plankType = p.typeId;
                        break;
                    }
                }

                if (plankType) {
                    removeItem(container, item.typeId, 3);
                    removeItem(container, plankType, 2);
                    // Dùng replaceitem vào chính ô vừa xử lý để nhận giường đúng màu
                    sourceEntity.runCommand(`replaceitem entity @s slot.inventory ${i} bed 1 ${dataValue}`);
                    continue;
                }
            }
        }

        // Chế tạo Tù và (Goat Horn)
        if (item.typeId === "minecraft:goat_horn") {
            const dyeToHorn = {
                "minecraft:yellow_dye": "fv:team_call_horn",
                "minecraft:green_dye": "fv:team_stand_horn",
                "minecraft:red_dye": "fv:team_attack_horn"
            };
            for (let j = 0; j < container.size; j++) {
                const dye = container.getItem(j);
                if (dye && dyeToHorn[dye.typeId]) {
                    removeItem(container, "minecraft:goat_horn", 1);
                    removeItem(container, dye.typeId, 1);
                    container.addItem(new ItemStack(dyeToHorn[dye.typeId], 1));
                    break;
                }
            }
        }
    }

}, { namespaces: ["fv"] });
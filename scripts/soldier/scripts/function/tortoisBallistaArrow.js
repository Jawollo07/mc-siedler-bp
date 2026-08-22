import { world, system } from "@minecraft/server";

// --- CẤU HÌNH ---
const ENTITY_ID = "fv:heavy_tortois_ballista";
const AMMO_PROP = "fv:type_arrow";

// Bảng ánh xạ: Property Value <-> Item ID
const AMMO_MAP = {
    5: "fv:netherite_ballista_arrow",
    4: "fv:diamond_ballista_arrow",
    2: "fv:iron_ballista_arrow",
    1: "fv:copper_ballista_arrow",
    3: "fv:gold_ballista_arrow"
};

// Thứ tự ưu tiên quét từ cao xuống thấp (Đúng kịch bản của bạn)
const PRIORITY_ORDER = [5, 4, 2, 1, 3];

/**
 * Hàm trừ đúng 1 vật phẩm dựa trên ID
 */
function consumeAmmo(container, itemId) {
    for (let i = 0; i < 27; i++) {
        const item = container.getItem(i);
        if (item && item.typeId === itemId) {
            if (item.amount > 1) {
                item.amount -= 1;
                container.setItem(i, item);
            } else {
                container.setItem(i, null);
            }
            return true;
        }
    }
    return false;
}

/**
 * Hàm quét kho đồ và thiết lập Property theo ưu tiên
 */
function updateBallistaAmmoState(entity) {
    if (!entity || !entity.isValid) return;

    const inventory = entity.getComponent("minecraft:inventory")?.container;
    if (!inventory) return;

    let finalValue = 0;

    // Quét theo thứ tự ưu tiên: Cái nào đứng trước trong PRIORITY_ORDER sẽ được xét trước
    for (const val of PRIORITY_ORDER) {
        const itemId = AMMO_MAP[val];
        let hasItem = false;

        // Quét 27 slot tìm item tương ứng
        for (let i = 0; i < 27; i++) {
            const item = inventory.getItem(i);
            if (item && item.typeId === itemId) {
                hasItem = true;
                break;
            }
        }

        if (hasItem) {
            finalValue = val;
            break; // Tìm thấy loại ưu tiên cao nhất rồi, không quét tiếp nữa
        }
    }

    const currentProp = entity.getProperty(AMMO_PROP);

    // --- TRIGGER EVENT CAN/CANT SHOOT ---
    if (currentProp === 0 && finalValue > 0) {
        entity.triggerEvent("fv:can_shoot");
    } else if (currentProp > 0 && finalValue === 0) {
        entity.triggerEvent("fv:cant_shoot");
    }

    // --- CẬP NHẬT PROPERTY ---
    if (currentProp !== finalValue) {
        entity.setProperty(AMMO_PROP, finalValue);
    }
}

// --- XỬ LÝ KHI NHẬN LỆNH BẮN (/scriptevent) ---
system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id !== "fv:ballista_fire") return;

    const tortoise = event.sourceEntity;
    if (!tortoise || tortoise.typeId !== ENTITY_ID) return;

    const inventory = tortoise.getComponent("minecraft:inventory")?.container;
    if (!inventory) return;

    // Đọc Property hiện tại để biết đang bắn loại nào
    const currentPropValue = tortoise.getProperty(AMMO_PROP);

    if (currentPropValue > 0) {
        const itemIdToConsume = AMMO_MAP[currentPropValue];
        if (itemIdToConsume) {
            consumeAmmo(inventory, itemIdToConsume);
        }
    }

    // Sau khi trừ đồ, cập nhật lại Property ngay lập tức để nạp mũi tên tiếp theo
    updateBallistaAmmoState(tortoise);
});

// --- QUÉT ĐỊNH KỲ ĐỂ CẬP NHẬT TRẠNG THÁI KHI NẠP ĐỒ (Passive) ---
system.runInterval(() => {
    const tortoises = world.getDimension("overworld").getEntities({ type: ENTITY_ID });
    for (const tortoise of tortoises) {
        updateBallistaAmmoState(tortoise);
    }
}, 20); // 1 giây quét 1 lần
import { world, system } from "@minecraft/server";

// --- CẤU HÌNH CHUẨN ---
const ENTITY_ID = "fv:heavy_tortois";
const AMMO_PROP = "fv:type_ammo"; // Đã thống nhất tên này
const ITEM_GP = "minecraft:gunpowder";
const ITEM_POTATO = "minecraft:potato";
const ITEM_POT_EX = "fv:potato_explode";

const LOGIC_MAP = {
    "potato_explode": "fv:potato_explode",
    "potato": "fv:potato",
    "none": "fv:none"
};

/**
 * HÀM 1: CẬP NHẬT TRẠNG THÁI DỰA TRÊN KHO ĐỒ (Logic lõi)
 */
function updateTortoiseState(tortoise) {
    if (!tortoise || !tortoise.isValid) return;

    const inventory = tortoise.getComponent("minecraft:inventory");
    if (!inventory || !inventory.container) return;

    const inv = inventory.container;
    let gpCount = 0;
    let potCount = 0;
    let potExCount = 0;

    // Quét sạch 27 slot
    for (let i = 0; i < 27; i++) {
        const item = inv.getItem(i);
        if (!item) continue;
        if (item.typeId === ITEM_GP) gpCount += item.amount;
        else if (item.typeId === ITEM_POT_EX) potExCount += item.amount;
        else if (item.typeId === ITEM_POTATO) potCount += item.amount;
    }

    // Logic ưu tiên: Phải có thuốc súng mới tính tiếp
    let finalType = "none";
    if (gpCount > 0) {
        if (potExCount > 0) finalType = "potato_explode";
        else if (potCount > 0) finalType = "potato";
    }

    // Kiểm tra và cập nhật Property + Event
    const currentProp = tortoise.getProperty(AMMO_PROP);
    if (currentProp !== finalType) {
        tortoise.setProperty(AMMO_PROP, finalType);
        const eventTrigger = LOGIC_MAP[finalType];
        if (eventTrigger) tortoise.triggerEvent(eventTrigger);
    }
}

/**
 * HÀM 2: TRỪ 1 VẬT PHẨM TRONG KHO ĐỒ
 */
function consumeOne(container, typeId) {
    for (let i = 0; i < 27; i++) {
        const item = container.getItem(i);
        if (item && item.typeId === typeId) {
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

// --- TÍNH NĂNG 1: TRỪ ĐẠN KHI NHẬN LỆNH BẮN (/scriptevent) ---
system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id !== "fv:tortois_fire") return;

    const tortoise = event.sourceEntity;
    if (!tortoise || tortoise.typeId !== ENTITY_ID) return;

    const inventory = tortoise.getComponent("minecraft:inventory");
    if (!inventory || !inventory.container) return;

    const currentAmmo = tortoise.getProperty(AMMO_PROP);
    if (currentAmmo === "none") return;

    // Tiến hành trừ 1 thuốc súng + 1 khoai tương ứng
    const hasGP = consumeOne(inventory.container, ITEM_GP);
    if (hasGP) {
        const ammoId = (currentAmmo === "potato_explode") ? ITEM_POT_EX : ITEM_POTATO;
        consumeOne(inventory.container, ammoId);
    }

    // Cập nhật trạng thái ngay sau phát bắn để nạp viên tiếp theo
    updateTortoiseState(tortoise);
});

// --- TÍNH NĂNG 2: QUÉT ĐỊNH KỲ (Passive) ---
system.runInterval(() => {
    const dimension = world.getDimension("overworld");
    const tortoises = dimension.getEntities({ type: ENTITY_ID });
    for (const tortoise of tortoises) {
        updateTortoiseState(tortoise);
    }
}, 20); // 1 giây quét 1 lần để tiết kiệm tài nguyên
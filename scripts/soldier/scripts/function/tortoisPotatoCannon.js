import { world, system } from "@minecraft/server";

// --- CONFIGURATION normalized ---
const ENTITY_ID = "fv:heavy_tortois";
const AMMO_PROP = "fv:type_ammo"; // This name has been standardized
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

    // scan all 27 slots
    for (let i = 0; i < 27; i++) {
        const item = inv.getItem(i);
        if (!item) continue;
        if (item.typeId === ITEM_GP) gpCount += item.amount;
        else if (item.typeId === ITEM_POT_EX) potExCount += item.amount;
        else if (item.typeId === ITEM_POTATO) potCount += item.amount;
    }

    // logic priority priority: right has gunpowder before continuing
    let finalType = "none";
    if (gpCount > 0) {
        if (potExCount > 0) finalType = "potato_explode";
        else if (potCount > 0) finalType = "potato";
    }

    // Check and update update Property + event
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

// --- FEATURE 1: deduct ammunition when receiving the shoot command (/scriptevent) ---
system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id !== "fv:tortois_fire") return;

    const tortoise = event.sourceEntity;
    if (!tortoise || tortoise.typeId !== ENTITY_ID) return;

    const inventory = tortoise.getComponent("minecraft:inventory");
    if (!inventory || !inventory.container) return;

    const currentAmmo = tortoise.getProperty(AMMO_PROP);
    if (currentAmmo === "none") return;

    // Deduct 1 gunpowder + 1 corresponding potato
    const hasGP = consumeOne(inventory.container, ITEM_GP);
    if (hasGP) {
        const ammoId = (currentAmmo === "potato_explode") ? ITEM_POT_EX : ITEM_POTATO;
        consumeOne(inventory.container, ammoId);
    }

    // Update state immediately after firing to load next round
    updateTortoiseState(tortoise);
});

// --- FEATURE 2: PERIODIC SCAN (Passive) ---
system.runInterval(() => {
    const dimension = world.getDimension("overworld");
    const tortoises = dimension.getEntities({ type: ENTITY_ID });
    for (const tortoise of tortoises) {
        updateTortoiseState(tortoise);
    }
}, 20); // scan once per second to save resources
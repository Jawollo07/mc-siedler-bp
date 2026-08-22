import { world, system } from "@minecraft/server";

// --- CONFIGURATION ---
const ENTITY_ID = "fv:heavy_tortois_ballista";
const AMMO_PROP = "fv:type_arrow";

// Mapping table: Property Value <-> item ID
const AMMO_MAP = {
    5: "fv:netherite_ballista_arrow",
    4: "fv:diamond_ballista_arrow",
    2: "fv:iron_ballista_arrow",
    1: "fv:copper_ballista_arrow",
    3: "fv:gold_ballista_arrow"
};

// Priority order scan from highest to lowest (according to your setup)
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

    // scan in priority order: The one listed first in PRIORITY_ORDER will be checked first
    for (const val of PRIORITY_ORDER) {
        const itemId = AMMO_MAP[val];
        let hasItem = false;

        // scan all 27 slots find item interact corresponding
        for (let i = 0; i < 27; i++) {
            const item = inventory.getItem(i);
            if (item && item.typeId === itemId) {
                hasItem = true;
                break;
            }
        }

        if (hasItem) {
            finalValue = val;
            break; // Found type priority priority height most then, stop scanning
        }
    }

    const currentProp = entity.getProperty(AMMO_PROP);

    // --- TRIGGER CAN/CANNOT SHOOT EVENTS ---
    if (currentProp === 0 && finalValue > 0) {
        entity.triggerEvent("fv:can_shoot");
    } else if (currentProp > 0 && finalValue === 0) {
        entity.triggerEvent("fv:cant_shoot");
    }

    // --- UPDATE PROPERTY ---
    if (currentProp !== finalValue) {
        entity.setProperty(AMMO_PROP, finalValue);
    }
}

// --- HANDLE SHOOT COMMAND (/scriptevent) ---
system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id !== "fv:ballista_fire") return;

    const tortoise = event.sourceEntity;
    if (!tortoise || tortoise.typeId !== ENTITY_ID) return;

    const inventory = tortoise.getComponent("minecraft:inventory")?.container;
    if (!inventory) return;

    // Read the current Property to determine which type is loaded
    const currentPropValue = tortoise.getProperty(AMMO_PROP);

    if (currentPropValue > 0) {
        const itemIdToConsume = AMMO_MAP[currentPropValue];
        if (itemIdToConsume) {
            consumeAmmo(inventory, itemIdToConsume);
        }
    }

    // After removing the item, immediately update the Property to load the next arrow
    updateBallistaAmmoState(tortoise);
});

// --- PERIODIC scan to update update state state when load item (Passive) ---
system.runInterval(() => {
    const tortoises = world.getDimension("overworld").getEntities({ type: ENTITY_ID });
    for (const tortoise of tortoises) {
        updateBallistaAmmoState(tortoise);
    }
}, 20); // scan once per second
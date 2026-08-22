import { world, system } from "@minecraft/server";

// Day-tracking variable to detect a new day
let currentWorldDay = undefined;

/**
 * Kiểm tra sự tồn tại của bánh mì trong container
 */
function hasBread(container) {
    if (!container) return false;
    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (item?.typeId === "minecraft:bread") return true;
    }
    return false;
}

/**
 * Hàm trừ 1 bánh mì trong kho đồ
 */
function consumeOneBread(container) {
    if (!container) return false;
    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (item?.typeId === "minecraft:bread") {
            if (item.amount > 1) {
                item.amount -= 1;
                container.setItem(i, item);
            } else {
                container.setItem(i, undefined);
            }
            return true;
        }
    }
    return false;
}

// Loop 1: Process EATING and DAY DEDUCTION (Cycle 10 second)
system.runInterval(() => {
    // Initialize the day for the first time
    if (currentWorldDay === undefined) {
        try {
            currentWorldDay = world.getDay();
            return;
        } catch (e) { return; }
    }

    const dayNow = world.getDay();

    // Detect transition to a new day
    if (dayNow > currentWorldDay) {
        currentWorldDay = dayNow;

        const villagers = world.getDimension("overworld").getEntities({
            type: "fv:villager_free_handle"
        });

        for (const villager of villagers) {
            if (!villager.isValid) continue;

            const inventory = villager.getComponent("minecraft:inventory");
            const container = inventory?.container;

            // Check the tool-protection Property
            const hasEquipment = villager.getProperty("fv:has_equipment");

            // Feed the villager
            const ateSuccessfully = consumeOneBread(container);

            if (ateSuccessfully) {
                // Eating successful: reset strike
                villager.setProperty("fv:dangdinhcong", false);
                villager.setProperty("fv:demnguoc", 3);

                // BREAD-HOLDING EFFECT:
                // Only use replaceitem if villager villager is NOT holding a tool (fv:has_equipment == false)
                if (hasEquipment === false) {
                    villager.runCommand("replaceitem entity @s slot.weapon.mainhand 0 bread 1");
                }
                // If hasEquipment == true, the villager still eats (deducts bread), but the tool remains in hand.
            } else {
                // Nothing to eat -> Start/continue strike
                villager.setProperty("fv:dangdinhcong", true);

                const daysLeft = villager.getProperty("fv:demnguoc");
                if (daysLeft > 1) {
                    villager.setProperty("fv:demnguoc", daysLeft - 1);
                } else if (daysLeft === 1) {
                    villager.setProperty("fv:demnguoc", 0);
                    // Patience exhausted, stop working
                    villager.triggerEvent("become_villager");
                }
            }
        }
    }
}, 200);

// Loop 2: Synchronize strike state immediately (Cycle 5 second)
system.runInterval(() => {
    const villagers = world.getDimension("overworld").getEntities({
        type: "fv:villager_free_handle"
    });

    for (const villager of villagers) {
        if (!villager.isValid) continue;

        const inventory = villager.getComponent("minecraft:inventory");
        const container = inventory?.container;

        const isStrike = villager.getProperty("fv:dangdinhcong");
        const hasSalary = hasBread(container);

        // if player throws more bread into while currently strike success -> strike ends immediately
        if (isStrike && hasSalary) {
            villager.setProperty("fv:dangdinhcong", false);
            villager.setProperty("fv:demnguoc", 3);
        }
        // if suddenly runs out of bread in storage -> switch to strike-pending state
        else if (!isStrike && !hasSalary) {
            villager.setProperty("fv:dangdinhcong", true);
        }
    }
}, 100);

console.warn("[FV-DEBUG] >>> VILLAGER STRIKE SYSTEM v3.0 (SAFE-EQUIP) LOADED <<<");
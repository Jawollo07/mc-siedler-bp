import { world, system, ItemStack } from "@minecraft/server";

const COLOR_ID_MAP = {
    0: "minecraft:white_wool", 1: "minecraft:orange_wool", 2: "minecraft:magenta_wool",
    3: "minecraft:light_blue_wool", 4: "minecraft:yellow_wool", 5: "minecraft:lime_wool",
    6: "minecraft:pink_wool", 7: "minecraft:gray_wool", 8: "minecraft:light_gray_wool",
    9: "minecraft:cyan_wool", 10: "minecraft:purple_wool", 11: "minecraft:blue_wool",
    12: "minecraft:brown_wool", 13: "minecraft:green_wool", 14: "minecraft:red_wool",
    15: "minecraft:black_wool"
};

world.afterEvents.dataDrivenEntityTrigger.subscribe((data) => {
    // FIX BUG: Use eventId according to the documentation you just provided
    const { entity, eventId } = data;

    // 1. Check perform entity and correct name event
    if (!entity || entity.typeId !== "minecraft:sheep") return;

    // Check name event main confirmation from log if needed, likeng theo sheep.json is minecraft:on_sheared
    if (eventId !== "minecraft:on_sheared") return;

    // 2. Get the color from component Color immediately
    const colorComp = entity.getComponent("minecraft:color");
    const colorValue = colorComp ? colorComp.value : 0;
    const woolId = COLOR_ID_MAP[colorValue] || "minecraft:white_wool";

    // 3. spawn the item
    const count = Math.floor(Math.random() * 3) + 1;
    const loc = { x: entity.location.x, y: entity.location.y, z: entity.location.z };
    const dimension = entity.dimension;

    // Use system.run to to avoid the error Read-Only when currently in event
    system.run(() => {
        try {
            dimension.spawnItem(new ItemStack(woolId, count), {
                x: loc.x,
                y: loc.y + 0.5,
                z: loc.z
            });

            // Confirmation sound
            dimension.runCommand(`playsound mob.sheep.shear @a ${loc.x} ${loc.y} ${loc.z} 0.5 1`);
        } catch (e) {
            // perform entity has entity may have disappeared
        }
    });
}, {
    eventTypes: ["minecraft:on_sheared"]
});
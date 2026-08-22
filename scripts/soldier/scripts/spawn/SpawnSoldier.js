import { world } from "@minecraft/server";

// List of keywords in block IDs that troops are NOT allowed to spawn on
// (Beds are the main cause of head-on collisions with ceilings)
const UNSAFE_BLOCKS = [
    "bed",      // Block all bed types (minecraft:yellow_bed, red_bed...)
    "carpet",   // (Optional) Block carpets to prevent floating objects
    "slab"      // (Optional) Block slabs if the ceiling is too low];
]
// Function to check if a block is unsafe for spawning
function isUnsafeBlock(block) {
    if (!block) return true;
    const typeId = block.typeId;

    // Check if the block's typeId contains any of the unsafe keywords
    return UNSAFE_BLOCKS.some(unsafe => typeId.includes(unsafe));
}

// Listen for the DataDrivenEntityTrigger event
world.afterEvents.dataDrivenEntityTrigger.subscribe(({ eventId, entity }) => {
    // Only process the "minecraft:spawn_from_village" event with the correct entity type
    if (eventId !== "minecraft:spawn_from_village" || entity.typeId !== "minecraft:villager_v2") return;

    const { location, dimension } = entity;

    // Check if the entity is valid for safe spawning
    if (!entity.isValid || !location || !dimension) return;

    spawnRandomCustomVillager(dimension, location);
});

// Function to spawn 1 in 2 custom entities randomly near Villager
function spawnRandomCustomVillager(dimension, location) {
    const mobTypes = ["fv:villager_melee", "fv:villager_ranged"];
    const randomMob = mobTypes[Math.floor(Math.random() * mobTypes.length)];

    // Increase the number of attempts to 15 to make it easier to find a location if the house is too crowded
    for (let attempt = 0; attempt < 15; attempt++) {
        const offsetX = Math.random() * 10 - 5;
        const offsetZ = Math.random() * 10 - 5;

        // Round the coordinates to get the center of the block, helping to check the block below and above more accurately
        const spawnX = Math.floor(location.x + offsetX) + 0.5;
        const spawnZ = Math.floor(location.z + offsetZ) + 0.5;
        const spawnY = Math.floor(location.y);

        const blockBelow = dimension.getBlock({ x: spawnX, y: spawnY - 1, z: spawnZ });
        const blockAt = dimension.getBlock({ x: spawnX, y: spawnY, z: spawnZ });
        const blockAbove = dimension.getBlock({ x: spawnX, y: spawnY + 1, z: spawnZ });

        // Check if the blocks exist
        if (!blockAt || !blockAbove || !blockBelow) continue;

        // 1. Check for empty space (Must be Air)
        const isAirAt = blockAt.typeId === "minecraft:air" || blockAt.typeId === "minecraft:light_block";
        const isAirAbove = blockAbove.typeId === "minecraft:air" || blockAbove.typeId === "minecraft:light_block";

        // 2. Check for ground (Must not be Air)
        const hasGround = blockBelow.typeId !== "minecraft:air";

        // 3. IMPORTANT: Check if the block below OR the block the entity is standing on is a Bed
        // (Sometimes the entity's feet are considered to be inside the bed block)
        const isSafeFromBed = !isUnsafeBlock(blockBelow) && !isUnsafeBlock(blockAt);

        if (isAirAt && isAirAbove && hasGround && isSafeFromBed) {
            try {
                dimension.spawnEntity(randomMob, { x: spawnX, y: spawnY, z: spawnZ });
                // console.log(`Spawned ${randomMob} at safe location.`);
                return;
            } catch (e) {
                console.warn(`Failed to spawn ${randomMob}: ${e}`);
            }
        }
    }

    // console.warn("No suitable spawn location found (bed avoided).");
}
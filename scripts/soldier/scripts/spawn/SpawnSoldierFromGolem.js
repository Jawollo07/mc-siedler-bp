import { world } from "@minecraft/server";

// Listen for the DataDrivenEntityTrigger event
world.afterEvents.dataDrivenEntityTrigger.subscribe(({ eventId, entity }) => {
    // only handle processing with event "minecraft:from_village" and correct entity is minecraft:villager_v2
    if (eventId !== "minecraft:from_village" || entity.typeId !== "minecraft:iron_golem") return;

    const { location, dimension } = entity;
    if (!location || !dimension) return;

    spawnRandomCustomVillager(dimension, location);
});

// Function to randomly spawn 1 of 2 custom entities near the Villager
function spawnRandomCustomVillager(dimension, location) {
    const mobTypes = ["fv:hay_golem", "fv:villager_healer"];
    const randomMob = mobTypes[Math.floor(Math.random() * mobTypes.length)];

    for (let attempt = 0; attempt < 10; attempt++) {
        const offsetX = Math.random() * 10 - 5;
        const offsetZ = Math.random() * 10 - 5;

        const spawnX = location.x + offsetX;
        const spawnY = location.y;
        const spawnZ = location.z + offsetZ;

        const blockBelow = dimension.getBlock({ x: spawnX, y: spawnY - 1, z: spawnZ });
        const blockAt = dimension.getBlock({ x: spawnX, y: spawnY, z: spawnZ });
        const blockAbove = dimension.getBlock({ x: spawnX, y: spawnY + 1, z: spawnZ });

        if (!blockAt || !blockAbove || !blockBelow) continue;

        if (
            blockAt.typeId === "minecraft:air" &&
            blockAbove.typeId === "minecraft:air" &&
            blockBelow.typeId !== "minecraft:air"
        ) {
            try {
                dimension.spawnEntity(randomMob, { x: spawnX, y: spawnY, z: spawnZ });
                return;
            } catch (e) {
                console.warn(`Failed to spawn ${randomMob}: ${e}`);
            }
        }
    }

    console.warn("No suitable soldier spawn location found around the Villager.");
}

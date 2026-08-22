import { world } from "@minecraft/server";

// Lắng nghe sự kiện DataDrivenEntityTrigger
world.afterEvents.dataDrivenEntityTrigger.subscribe(({ eventId, entity }) => {
    // Chỉ xử lý với event "minecraft:from_village" và đúng entity là minecraft:villager_v2
    if (eventId !== "minecraft:from_village" || entity.typeId !== "minecraft:iron_golem") return;

    const { location, dimension } = entity;
    if (!location || !dimension) return;

    spawnRandomCustomVillager(dimension, location);
});

// Hàm spawn 1 trong 2 thực thể custom ngẫu nhiên gần Villager
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

    console.warn("Không tìm được vị trí spawn lính phù hợp quanh Villager.");
}

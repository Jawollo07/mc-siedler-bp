import { world, system } from "@minecraft/server";

// Your Golem entity ID
const GOLEM_ID = "fv:iron_golem_guard";

// List of IDs types carved pumpkins
const PUMPKIN_IDS = ["minecraft:carved_pumpkin", "minecraft:lit_pumpkin"];
const BODY_BLOCK_ID = "minecraft:iron_block";

world.afterEvents.playerPlaceBlock.subscribe((event) => {
    const { block, dimension, player } = event;

    // 1. Check if player just placed a type of pumpkin pumpkin valid
    if (!PUMPKIN_IDS.includes(block.typeId)) return;

    // Use Object Vector for offset (Fix Incorrect number of arguments)
    const body1 = block.offset({ x: 0, y: -1, z: 0 }); // block directly below pumpkin pumpkin
    const body2 = block.offset({ x: 0, y: -2, z: 0 }); // block bottom

    if (!body1 || !body2) return;

    // 2. Check structure 2 block iron vertically
    if (body1.typeId === BODY_BLOCK_ID && body2.typeId === BODY_BLOCK_ID) {

        system.run(() => {
            if (!block.isValid || !body1.isValid || !body2.isValid) return;

            // Remove 3 block structure
            block.setType("minecraft:air");
            body1.setType("minecraft:air");
            body2.setType("minecraft:air");

            // spawn coordinates exist position block bottom
            const spawnLoc = {
                x: body2.location.x + 0.5,
                y: body2.location.y,
                z: body2.location.z + 0.5
            };

            try {
                // Summon Golem
                const golem = dimension.spawnEntity(GOLEM_ID, spawnLoc);

                // Rotate Golem facing player
                if (player && golem) {
                    const playerRot = player.getRotation();
                    golem.setRotation({ x: 0, y: playerRot.y + 180 });
                }

                // --- ADD EFFECTS HERE ---

                // 1. Summoning sound (Golem death sound, but lower the pitch for more power)
                dimension.playSound("mob.irongolem.death", spawnLoc, { pitch: 0.5, volume: 1 });

                // 2. Explosive smoke particle effect (Large Explosion)
                dimension.spawnParticle("minecraft:large_explosion", {
                    x: spawnLoc.x,
                    y: spawnLoc.y + 1, // Explode in the middle of the Golem's body
                    z: spawnLoc.z
                });

                // 3. Add a little small dust around feet
                for (let i = 0; i < 5; i++) {
                    dimension.spawnParticle("minecraft:basic_smoke_particle", {
                        x: spawnLoc.x + (Math.random() - 0.5),
                        y: spawnLoc.y,
                        z: spawnLoc.z + (Math.random() - 0.5)
                    });
                }

            } catch (err) {
                console.warn(`[FV-ERROR] Lỗi triệu hồi Golem: ${err}`);
            }
        });
    }
});
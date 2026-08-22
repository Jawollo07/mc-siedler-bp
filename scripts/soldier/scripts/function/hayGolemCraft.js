import { world, system } from "@minecraft/server";

// ID perform entity and block structure
const HAY_GOLEM_ID = "fv:hay_golem";
const PUMPKIN_IDS = ["minecraft:carved_pumpkin", "minecraft:lit_pumpkin"];
const HAY_BLOCK_ID = "minecraft:hay_block";

world.afterEvents.playerPlaceBlock.subscribe((event) => {
    const { block, dimension, player } = event;

    // 1. Check if player just placed Pumpkin
    if (!PUMPKIN_IDS.includes(block.typeId)) return;

    // 2. Check block immediately side below pumpkin
    const body = block.offset({ x: 0, y: -1, z: 0 });

    if (!body || !body.isValid) return;

    // if block side below is or Bale
    if (body.typeId === HAY_BLOCK_ID) {

        system.run(() => {
            // Check validity before removal
            if (!block.isValid || !body.isValid) return;

            // Remove Pumpkin and or Bale
            block.setType("minecraft:air");
            body.setType("minecraft:air");

            // spawn coordinates (exist position block or)
            const spawnLoc = {
                x: body.location.x + 0.5,
                y: body.location.y,
                z: body.location.z + 0.5
            };

            try {
                // Summon or Golem
                const golem = dimension.spawnEntity(HAY_GOLEM_ID, spawnLoc);

                // Rotate face toward toward player
                if (player && golem) {
                    const playerRot = player.getRotation();
                    golem.setRotation({ x: 0, y: playerRot.y + 180 });
                }

                // Sound effect (dry grass/foliage sound)
                dimension.playSound("dig.grass", spawnLoc, { pitch: 0.8, volume: 1 });

                // performance corresponding flying leaf particles or light smoke
                dimension.spawnParticle("minecraft:crop_growth_emitter", spawnLoc);

            } catch (err) {
                console.warn(`[FV-ERROR] Lỗi triệu hồi Hay Golem: ${err}`);
            }
        });
    }
});
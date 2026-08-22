import { world, system } from "@minecraft/server";

// ID thực thể và block cấu tạo
const HAY_GOLEM_ID = "fv:hay_golem";
const PUMPKIN_IDS = ["minecraft:carved_pumpkin", "minecraft:lit_pumpkin"];
const HAY_BLOCK_ID = "minecraft:hay_block";

world.afterEvents.playerPlaceBlock.subscribe((event) => {
    const { block, dimension, player } = event;

    // 1. Kiểm tra nếu người chơi vừa đặt Bí ngô
    if (!PUMPKIN_IDS.includes(block.typeId)) return;

    // 2. Kiểm tra block ngay bên dưới quả bí ngô
    const body = block.offset({ x: 0, y: -1, z: 0 });

    if (!body || !body.isValid) return;

    // Nếu block bên dưới là Khối Rơm
    if (body.typeId === HAY_BLOCK_ID) {

        system.run(() => {
            // Kiểm tra tính hợp lệ trước khi xóa
            if (!block.isValid || !body.isValid) return;

            // Xóa Bí ngô và Khối rơm
            block.setType("minecraft:air");
            body.setType("minecraft:air");

            // Tọa độ spawn (tại vị trí khối rơm)
            const spawnLoc = {
                x: body.location.x + 0.5,
                y: body.location.y,
                z: body.location.z + 0.5
            };

            try {
                // Triệu hồi Hay Golem
                const golem = dimension.spawnEntity(HAY_GOLEM_ID, spawnLoc);

                // Xoay mặt về phía người chơi
                if (player && golem) {
                    const playerRot = player.getRotation();
                    golem.setRotation({ x: 0, y: playerRot.y + 180 });
                }

                // Hiệu ứng âm thanh (tiếng cỏ khô/cây cối)
                dimension.playSound("dig.grass", spawnLoc, { pitch: 0.8, volume: 1 });

                // Hiệu ứng hạt lá bay hoặc khói nhẹ
                dimension.spawnParticle("minecraft:crop_growth_emitter", spawnLoc);

            } catch (err) {
                console.warn(`[FV-ERROR] Lỗi triệu hồi Hay Golem: ${err}`);
            }
        });
    }
});
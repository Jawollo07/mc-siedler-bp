import { world, system } from "@minecraft/server";

// ID thực thể Golem của bạn
const GOLEM_ID = "fv:iron_golem_guard";

// Danh sách ID các loại bí ngô mặt người
const PUMPKIN_IDS = ["minecraft:carved_pumpkin", "minecraft:lit_pumpkin"];
const BODY_BLOCK_ID = "minecraft:iron_block";

world.afterEvents.playerPlaceBlock.subscribe((event) => {
    const { block, dimension, player } = event;

    // 1. Kiểm tra nếu người chơi vừa đặt một loại bí ngô hợp lệ
    if (!PUMPKIN_IDS.includes(block.typeId)) return;

    // Sử dụng Object Vector cho offset (Sửa lỗi Incorrect number of arguments)
    const body1 = block.offset({ x: 0, y: -1, z: 0 }); // Block ngay dưới bí ngô
    const body2 = block.offset({ x: 0, y: -2, z: 0 }); // Block dưới cùng

    if (!body1 || !body2) return;

    // 2. Kiểm tra cấu tạo 2 block sắt thẳng đứng
    if (body1.typeId === BODY_BLOCK_ID && body2.typeId === BODY_BLOCK_ID) {

        system.run(() => {
            if (!block.isValid || !body1.isValid || !body2.isValid) return;

            // Xóa 3 block cấu tạo
            block.setType("minecraft:air");
            body1.setType("minecraft:air");
            body2.setType("minecraft:air");

            // Tọa độ spawn tại vị trí block dưới cùng
            const spawnLoc = {
                x: body2.location.x + 0.5,
                y: body2.location.y,
                z: body2.location.z + 0.5
            };

            try {
                // Triệu hồi Golem
                const golem = dimension.spawnEntity(GOLEM_ID, spawnLoc);

                // Xoay Golem đối diện người chơi
                if (player && golem) {
                    const playerRot = player.getRotation();
                    golem.setRotation({ x: 0, y: playerRot.y + 180 });
                }

                // --- THÊM HIỆU ỨNG TẠI ĐÂY ---

                // 1. Âm thanh triệu hồi (Tiếng Golem chết nhưng chỉnh pitch thấp cho uy lực)
                dimension.playSound("mob.irongolem.death", spawnLoc, { pitch: 0.5, volume: 1 });

                // 2. Hiệu ứng hạt khói bùng nổ (Large Explosion)
                dimension.spawnParticle("minecraft:large_explosion", {
                    x: spawnLoc.x,
                    y: spawnLoc.y + 1, // Bùng nổ ở giữa thân Golem
                    z: spawnLoc.z
                });

                // 3. Thêm một chút khói bụi nhỏ xung quanh chân
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
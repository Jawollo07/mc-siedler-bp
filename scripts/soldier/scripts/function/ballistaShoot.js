import { world, system } from "@minecraft/server";

// --- CẤU HÌNH CHỈ SỐ (Bro có thể căn chỉnh tại đây) ---
const BALLISTA_ID = "fv:ballista";
const SHOOT_FORCE = 3.2; // Lực bắn theo yêu cầu

// Tọa độ xuất phát của mũi tên so với vị trí Ballista { x, y, z }
// Căn chỉnh cho mũi tên bay ra từ đúng rãnh trượt của Ballista
const PROJECTILE_OFFSET = { x: 0, y: 1.8, z: 0 };

// Bảng ánh xạ Property -> Thực thể đạn tương ứng
const ARROW_TYPE_MAP = {
    1: "fv:throw_copper_ballista_arrow",
    2: "fv:throw_iron_ballista_arrow",
    3: "fv:throw_gold_ballista_arrow",
    4: "fv:throw_diamond_ballista_arrow",
    5: "fv:throw_netherite_ballista_arrow"
};

// --- LOGIC XỬ LÝ BẮN ---
world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
    const { player, target: ballista } = event;

    // 1. Kiểm tra có đúng là Ballista không
    if (ballista.typeId !== BALLISTA_ID) return;

    // 2. Kiểm tra điều kiện bắn từ Property (Khớp với logic JSON của bro)
    const status = ballista.getProperty("fv:ballista_status");
    const arrowType = ballista.getProperty("fv:type_arrow");

    // Chỉ thực hiện script khi Ballista ở trạng thái 'ready' và có đạn (arrowType > 0)
    // Và quan trọng: Player phải đang cưỡi Ballista (Kiểm tra rider)
    if (status === "ready" && arrowType > 0) {

        // Kiểm tra xem player có phải là người đang ngồi trên Ballista không
        const rideable = ballista.getComponent("minecraft:rideable");
        const riders = rideable.getRiders();
        const isRider = riders.some(r => r.id === player.id);

        if (isRider) {
            // Chạy logic bắn trong system.run để tránh lỗi đồng bộ (vì đây là beforeEvent)
            system.run(() => {
                shootBallista(ballista, player, arrowType);
            });
        }
    }
});

/**
 * Hàm thực hiện triệu hồi và bắn mũi tên
 */
function shootBallista(ballista, shooter, type) {
    const dimension = ballista.dimension;
    const projectileId = ARROW_TYPE_MAP[type];

    if (!projectileId) return;

    // Tính toán hướng nhìn của Ballista
    const viewDir = ballista.getViewDirection();

    // Tính toán vị trí xuất phát dựa trên Offset
    const spawnLocation = {
        x: ballista.location.x + (viewDir.x * 0.5) + PROJECTILE_OFFSET.x,
        y: ballista.location.y + PROJECTILE_OFFSET.y,
        z: ballista.location.z + (viewDir.z * 0.5) + PROJECTILE_OFFSET.z
    };

    // Triệu hồi mũi tên
    const arrow = dimension.spawnEntity(projectileId, spawnLocation);

    // Xử lý Component Projectile
    const projectileComp = arrow.getComponent("minecraft:projectile");

    if (projectileComp) {
        // Thiết lập Owner là người bắn (Cực kỳ quan trọng)
        projectileComp.owner = shooter;

        // Tính toán Velocity (Hướng nhìn * Lực bắn)
        const velocity = {
            x: viewDir.x * SHOOT_FORCE,
            y: viewDir.y * SHOOT_FORCE,
            z: viewDir.z * SHOOT_FORCE
        };

        // Khai hỏa!
        projectileComp.shoot(velocity);
    }
}
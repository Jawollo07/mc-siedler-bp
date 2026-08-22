// File: shootCatapult.js
import { system } from "@minecraft/server";

// Nhận scriptevent catapult:fire
system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id !== "catapult:fire") return;

    const catapult = event.sourceEntity;
    // Kiểm tra tính hợp lệ của Entity nguồn
    if (!catapult || !catapult.isValid) return;

    const ammoType = catapult.getProperty("fv:reload_catapult");
    if (ammoType === "empty") {
        console.warn("Catapult chưa nạp đạn!");
        return;
    }

    const baseDirection = catapult.getViewDirection();
    const pitchRad = 45 * (Math.PI / 180);
    const flatLen = Math.sqrt(baseDirection.x ** 2 + baseDirection.z ** 2);
    if (flatLen === 0) return;

    const xzNorm = {
        x: baseDirection.x / flatLen,
        z: baseDirection.z / flatLen
    };

    const direction = {
        x: xzNorm.x * Math.cos(pitchRad),
        y: Math.sin(pitchRad),
        z: xzNorm.z * Math.cos(pitchRad)
    };

    const offset = 2.0;
    const spawnPos = {
        x: catapult.location.x + direction.x * offset,
        y: catapult.location.y + direction.y * offset + 3.5,
        z: catapult.location.z + direction.z * offset
    };

    // Spawn fv:block_fly
    const projectile = catapult.dimension.spawnEntity("fv:block_fly", spawnPos);
    if (!projectile || !projectile.isValid) return;

    try {
        const projComp = projectile.getComponent("minecraft:projectile");
        if (projComp) {
            // FIX: Đặt owner là Entity kích hoạt (Catapult)
            projComp.owner = catapult;

            projComp.shoot(
                {
                    x: direction.x * 2.2,  // bạn có thể chỉnh power tùy ý
                    y: direction.y * 2.2,
                    z: direction.z * 2.2
                },
                { uncertainty: 0.02 }
            );
        }
    } catch (e) {
        console.warn("Lỗi khi gán owner hoặc bắn Projectile:", e);
    }

    // Gọi event tương ứng lên viên block_fly
    projectile.triggerEvent(ammoType);

    // Reset reload_catapult về empty
    catapult.setProperty("fv:reload_catapult", "empty");
});
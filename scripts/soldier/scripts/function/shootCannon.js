import { system } from "@minecraft/server";

// 1️⃣ Hàm tính toán hướng bắn với Pitch cố định
function getDirectionWithFixedPitch(baseDirection, pitchDeg) {
    const pitchRad = pitchDeg * (Math.PI / 180);
    const flatLen = Math.sqrt(baseDirection.x ** 2 + baseDirection.z ** 2);

    if (flatLen === 0) return { x: 0, y: Math.sin(pitchRad), z: 0 };

    const xzNorm = {
        x: baseDirection.x / flatLen,
        z: baseDirection.z / flatLen,
    };

    return {
        x: xzNorm.x * Math.cos(pitchRad),
        y: Math.sin(pitchRad),
        z: xzNorm.z * Math.cos(pitchRad),
    };
}

// 2️⃣ Hàm thực hiện bắn (Dựa hoàn toàn vào Property, không dùng Inventory)
function shoot(shooter, power = 1.6, uncertainty = 0) {
    // Lấy trạng thái reload từ Property fv:reload
    const reloadState = shooter.getProperty("fv:reload");

    // Chỉ bắn khi trạng thái là potato hoặc potatoexp
    if (reloadState !== "potato" && reloadState !== "potatoexp") {
        return;
    }

    const baseDirection = shooter.getViewDirection();
    // Cố định góc bắn hướng lên 25 độ theo ý bạn
    const direction = getDirectionWithFixedPitch(baseDirection, 25);
    const headPos = shooter.getHeadLocation();

    // spawnOffset = 1.8 để tránh va chạm với hitbox của chính đại bác
    const spawnPos = {
        x: headPos.x + direction.x * 1.8,
        y: headPos.y + 1.2,
        z: headPos.z + direction.z * 1.8,
    };

    // Spawn thực thể đạn fv:potato_fly
    const potato = shooter.dimension.spawnEntity("fv:potato_fly", spawnPos);

    // Lưu ý Module 2.4.0: isValid không có ngoặc
    if (!potato || !potato.isValid) return;

    const projectile = potato.getComponent("minecraft:projectile");
    if (projectile && projectile.isValid) {
        try {
            // Gán owner để tính toán sát thương/faction chính xác
            projectile.owner = shooter;
        } catch (e) { }

        // Đẩy đạn bay đi
        projectile.shoot(
            {
                x: direction.x * power,
                y: direction.y * power,
                z: direction.z * power,
            },
            {
                uncertainty: uncertainty,
            }
        );
    }

    // Nếu nạp khoai nổ thì kích hoạt event potato_exp
    if (reloadState === "potatoexp") {
        potato.triggerEvent("potato_exp");
    }

    // RESET PROPERTY: Sau khi bắn xong, đưa về empty để Animation Controller chạy nạp đạn
    shooter.setProperty("fv:reload", "empty");

    // Đã xóa dòng playSound theo yêu cầu của bạn vì animation đã có sound sẵn.
}

// 3️⃣ Lắng nghe lệnh bắn từ Scriptevent
system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id !== "cannon:shoot") return;

    const shooter = event.sourceEntity;

    // Kiểm tra thực thể (isValid không ngoặc)
    if (!shooter || !shooter.isValid) return;

    // Thiết lập mặc định
    let power = 1.6;
    let uncertainty = 0;

    // Phân tách message (VD: /scriptevent cannon:shoot 1.8 0)
    if (event.message) {
        const params = event.message.split(" ");
        const p = parseFloat(params[0]);
        const u = parseFloat(params[1]);

        if (!isNaN(p)) power = p;
        if (!isNaN(u)) uncertainty = u;
    }

    shoot(shooter, power, uncertainty);
});
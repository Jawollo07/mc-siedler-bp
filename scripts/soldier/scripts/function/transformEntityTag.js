import { world, system } from "@minecraft/server";

// Danh sách các family không được phép ngồi thuyền
const BOSS_FAMILIES = ["mainboss", "general"];

system.runInterval(() => {
    // Duyệt qua tất cả các Dimension để đảm bảo boss không bị trap ở bất cứ đâu
    for (const dimensionId of ["overworld", "nether", "the_end"]) {
        const dimension = world.getDimension(dimensionId);
        const entities = dimension.getEntities();

        for (const entity of entities) {
            // Lưu ý Module 2.4.0: isValid không có ngoặc đơn
            if (!entity.isValid) continue;

            // 1. Kiểm tra xem thực thể có thuộc nhóm Boss không thông qua Type Family
            const famComp = entity.getComponent("minecraft:type_family");
            if (!famComp || !famComp.isValid) continue;

            // Kiểm tra xem boss có thuộc 1 trong 2 family mục tiêu không
            const isTargetBoss = BOSS_FAMILIES.some(family => famComp.hasTypeFamily(family));
            if (!isTargetBoss) continue;

            // 2. Kiểm tra thành phần Riding (Đang ngồi)
            const ridingComp = entity.getComponent("minecraft:riding");

            // Nếu có component riding và nó đang hợp lệ
            if (ridingComp && ridingComp.isValid) {
                const vehicle = ridingComp.entityRidingOn;

                // 3. Kiểm tra xem "phương tiện" có phải là thuyền không
                // Chúng ta dùng includes("boat") để bắt được tất cả các loại thuyền (oak_boat, birch_boat, v.v.)
                if (vehicle && vehicle.isValid && vehicle.typeId.includes("boat")) {
                    try {
                        // Xóa chiếc thuyền ngay lập tức
                        vehicle.remove();

                        // (Tùy chọn) Có thể thêm hiệu ứng âm thanh hoặc hạt bụi tại đây để tăng tính uy lực
                        // dimension.playSound("random.break", entity.location);
                    } catch (e) {
                        // Tránh crash nếu thực thể bị xóa bởi script khác cùng lúc
                    }
                }
            }
        }
    }
}, 10); // Chạy mỗi 0.5 giây (10 ticks) để đảm bảo phản ứng nhanh mà vẫn giữ hiệu năng tốt
import { world, system } from "@minecraft/server";

// Biến theo dõi ngày để phát hiện ngày mới
let currentWorldDay = undefined;

/**
 * Kiểm tra sự tồn tại của bánh mì trong container
 */
function hasBread(container) {
    if (!container) return false;
    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (item?.typeId === "minecraft:bread") return true;
    }
    return false;
}

/**
 * Hàm trừ 1 bánh mì trong kho đồ
 */
function consumeOneBread(container) {
    if (!container) return false;
    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (item?.typeId === "minecraft:bread") {
            if (item.amount > 1) {
                item.amount -= 1;
                container.setItem(i, item);
            } else {
                container.setItem(i, undefined);
            }
            return true;
        }
    }
    return false;
}

// Vòng lặp 1: Xử lý ĂN và TRỪ NGÀY (Chu kỳ 10 giây)
system.runInterval(() => {
    // Khởi tạo ngày lần đầu
    if (currentWorldDay === undefined) {
        try {
            currentWorldDay = world.getDay();
            return;
        } catch (e) { return; }
    }

    const dayNow = world.getDay();

    // Phát hiện bước sang ngày mới
    if (dayNow > currentWorldDay) {
        currentWorldDay = dayNow;

        const villagers = world.getDimension("overworld").getEntities({
            type: "fv:villager_free_handle"
        });

        for (const villager of villagers) {
            if (!villager.isValid) continue;

            const inventory = villager.getComponent("minecraft:inventory");
            const container = inventory?.container;

            // Kiểm tra Property bảo vệ dụng cụ
            const hasEquipment = villager.getProperty("fv:has_equipment");

            // Tiến hành cho dân làng ăn
            const ateSuccessfully = consumeOneBread(container);

            if (ateSuccessfully) {
                // Ăn thành công: Reset đình công
                villager.setProperty("fv:dangdinhcong", false);
                villager.setProperty("fv:demnguoc", 3);

                // HIỆU ỨNG CẦM BÁNH MÌ:
                // Chỉ replaceitem nếu dân làng KHÔNG cầm dụng cụ (fv:has_equipment == false)
                if (hasEquipment === false) {
                    villager.runCommand("replaceitem entity @s slot.weapon.mainhand 0 bread 1");
                }
                // Nếu hasEquipment == true, dân làng vẫn ăn (trừ bánh mì) nhưng tay vẫn giữ nguyên dụng cụ.
            } else {
                // Không có gì ăn -> Bắt đầu/Tiếp tục đình công
                villager.setProperty("fv:dangdinhcong", true);

                const daysLeft = villager.getProperty("fv:demnguoc");
                if (daysLeft > 1) {
                    villager.setProperty("fv:demnguoc", daysLeft - 1);
                } else if (daysLeft === 1) {
                    villager.setProperty("fv:demnguoc", 0);
                    // Hết nhẫn nại, nghỉ việc
                    villager.triggerEvent("become_villager");
                }
            }
        }
    }
}, 200);

// Vòng lặp 2: Đồng bộ trạng thái đình công tức thời (Chu kỳ 5 giây)
system.runInterval(() => {
    const villagers = world.getDimension("overworld").getEntities({
        type: "fv:villager_free_handle"
    });

    for (const villager of villagers) {
        if (!villager.isValid) continue;

        const inventory = villager.getComponent("minecraft:inventory");
        const container = inventory?.container;

        const isStrike = villager.getProperty("fv:dangdinhcong");
        const hasSalary = hasBread(container);

        // Nếu người chơi ném thêm bánh mì vào lúc đang đình công -> Hết đình công ngay
        if (isStrike && hasSalary) {
            villager.setProperty("fv:dangdinhcong", false);
            villager.setProperty("fv:demnguoc", 3);
        }
        // Nếu bỗng dưng hết bánh mì trong kho -> Chuyển sang trạng thái chờ đình công
        else if (!isStrike && !hasSalary) {
            villager.setProperty("fv:dangdinhcong", true);
        }
    }
}, 100);

console.warn("[FV-DEBUG] >>> VILLAGER STRIKE SYSTEM v3.0 (SAFE-EQUIP) LOADED <<<");
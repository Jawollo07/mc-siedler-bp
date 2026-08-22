import { system, world, EquipmentSlot } from "@minecraft/server";

// --- HÀM 1: LẤY EVENT AN TOÀN (SNAPSHOT) ---
function getVillagerEventSafe(target) {
    try {
        if (!target.isValid) return "fv:plains";
        const markComp = target.getComponent("minecraft:mark_variant");
        const val = markComp ? markComp.value : 0;
        const events = ["fv:plains", "fv:desert", "fv:jungle", "fv:savanna", "fv:snow", "fv:swamp", "fv:taiga"];
        return events[val] || "fv:plains";
    } catch (e) { return "fv:plains"; }
}

// --- HÀM 2: THỰC THI BIẾN ĐỔI ---
function executeConversion(dimension, spawnPos, eventName, target, entityTypeId) {
    system.run(() => {
        // Xóa dân làng cũ
        if (target.isValid) target.remove();

        try {
            // Spawn entity mới theo đúng ID đã phân loại
            dimension.spawnEntity(entityTypeId, spawnPos, { spawnEvent: eventName });
        } catch (err) {
            console.warn(`[FV-ERROR] Lỗi spawn ${entityTypeId}: ${err}`);
            // Fallback
            try {
                dimension.spawnEntity(entityTypeId, spawnPos);
            } catch (fatal) { }
        }
    });
}

// --- ĐỊNH NGHĨA CUSTOM COMPONENT ---
const FreehandHitComponent = {
    onHitEntity(event) {
        const { attackingEntity, hitEntity } = event;

        // 1. Kiểm tra đối tượng
        if (!attackingEntity || !hitEntity) return;
        if (hitEntity.typeId !== "minecraft:villager_v2") return;

        // 2. Chụp dữ liệu NGAY LẬP TỨC (Snapshot)
        const eventName = getVillagerEventSafe(hitEntity);
        const spawnPos = { x: hitEntity.location.x, y: hitEntity.location.y, z: hitEntity.location.z };
        const dimension = hitEntity.dimension;

        // 3. Logic lọc
        if (hitEntity.hasComponent("minecraft:is_baby")) return;

        // --- PHÂN LOẠI NGHỀ NGHIỆP (LOGIC MỚI) ---
        let finalEntityId = "fv:villager_free_handle"; // Mặc định cho Nitwit, Unskilled, Farmer...

        const fam = hitEntity.getComponent("minecraft:type_family");
        if (fam) {
            if (fam.hasTypeFamily("weaponsmith")) {
                finalEntityId = "fv:villager_melee"; // Thợ rèn -> Tanker
            } else if (fam.hasTypeFamily("fletcher")) {
                finalEntityId = "fv:villager_ranged"; // Thợ cung -> Ranged
            }
        }

        // 4. Trừ độ bền/số lượng item
        const eq = attackingEntity.getComponent("minecraft:equippable");
        if (eq) {
            const item = eq.getEquipment(EquipmentSlot.Mainhand);
            if (item && item.typeId === "fv:freehand_decree") {
                if (item.amount > 1) {
                    item.amount -= 1;
                    eq.setEquipment(EquipmentSlot.Mainhand, item);
                } else {
                    eq.setEquipment(EquipmentSlot.Mainhand, undefined);
                }
            }
        }

        // 5. Thực thi biến đổi với ID đã phân loại
        executeConversion(dimension, spawnPos, eventName, hitEntity, finalEntityId);
    }
};

// --- ĐĂNG KÝ COMPONENT ---
system.beforeEvents.startup.subscribe((event) => {
    event.itemComponentRegistry.registerCustomComponent("fv:freehand_hit_event", FreehandHitComponent);
    console.warn("[FV-SYSTEM] Đã đăng ký Custom Component: fv:freehand_hit_event (Phân loại nghề)");
});
import { world, system, EquipmentSlot } from "@minecraft/server";

console.warn("[FV-DEBUG] >>> VILLAGER HANDLE SCRIPT UPDATED <<<");

// --- HÀM LẤY EVENT BIOME (Dành cho lính thường) ---
function getVillagerEventSafe(target) {
    try {
        // Module 2.4.0: isValid không có ngoặc
        if (!target || !target.isValid) return "fv:plains";
        const markComp = target.getComponent("minecraft:mark_variant");
        const val = markComp ? markComp.value : 0;
        const events = ["fv:plains", "fv:desert", "fv:jungle", "fv:savanna", "fv:snow", "fv:swamp", "fv:taiga"];
        return events[val] || "fv:plains";
    } catch (e) { return "fv:plains"; }
}

// --- HÀM THỰC THI SPAWN ---
function executeSpawn(dimension, spawnPos, eventName, target, player, equippableComp, entityTypeId) {
    system.run(() => {
        // Kiểm tra an toàn trước khi xóa target
        if (target && target.isValid) target.remove();

        try {
            // Thực hiện spawn với event được chỉ định
            dimension.spawnEntity(entityTypeId, spawnPos, { spawnEvent: eventName });
        } catch (err) {
            try { dimension.spawnEntity(entityTypeId, spawnPos); } catch (e) { }
        }

        // Trừ Item (Chỉ trừ nếu là người chơi dùng)
        try {
            if (player && player.isValid && equippableComp) {
                const item = equippableComp.getEquipment(EquipmentSlot.Mainhand);
                if (item && item.amount > 1) {
                    item.amount -= 1;
                    equippableComp.setEquipment(EquipmentSlot.Mainhand, item);
                } else {
                    equippableComp.setEquipment(EquipmentSlot.Mainhand, undefined);
                }
            }
        } catch (e) { }
    });
}

// --- XỬ LÝ TƯƠNG TÁC (INTERACT) ---
world.afterEvents.playerInteractWithEntity.subscribe((event) => {
    const { player, target } = event;

    // Kiểm tra an toàn tuyệt đối cho player và target
    if (!player || !target || !player.isValid || !target.isValid) return;
    if (target.typeId !== "minecraft:villager_v2") return;

    // Kiểm tra Item trên tay
    const eq = player.getComponent("minecraft:equippable");
    const item = eq?.getEquipment(EquipmentSlot.Mainhand);
    if (item?.typeId !== "fv:freehand_decree") return;

    try {
        if (target.hasComponent("minecraft:is_baby")) return;
        const fam = target.getComponent("minecraft:type_family");
        if (!fam) return;

        // Bỏ qua Nitwit/Unskilled trong phần interact (để OnHit xử lý)
        if (fam.hasTypeFamily("nitwit") || fam.hasTypeFamily("unskilled")) return;

        let finalEntityType = "fv:villager_free_handle";
        let spawnEvent = getVillagerEventSafe(target);

        // PHÂN LOẠI NGHỀ
        if (fam.hasTypeFamily("fletcher")) {
            finalEntityType = "fv:villager_ranged";
        } else if (fam.hasTypeFamily("weaponsmith")) {
            finalEntityType = "fv:villager_melee";
        }
        // Xử lý Healer từ Cleric
        else if (fam.hasTypeFamily("cleric")) {
            finalEntityType = "fv:villager_healer";
            spawnEvent = "minecraft:entity_spawned";
        }

        const spawnPos = target.location;
        const dim = target.dimension;

        executeSpawn(dim, spawnPos, spawnEvent, target, player, eq, finalEntityType);

    } catch (e) { }
});

// --- XỬ LÝ KHI BỊ ĐÁNH (ON HIT) ---
world.afterEvents.entityHurt.subscribe((event) => {
    const { damageSource, target } = event;

    // Đảm bảo damageSource tồn tại trước khi lấy damagingEntity
    if (!damageSource) return;
    const player = damageSource.damagingEntity;

    // SỬA LỖI DÒNG 91: Tách điều kiện kiểm tra để tránh lỗi "of undefined"
    if (!player) return;
    if (!player.isValid || player.typeId !== "minecraft:player") return;

    // Kiểm tra target (Villager)
    if (!target || !target.isValid || target.typeId !== "minecraft:villager_v2") return;

    // Kiểm tra Item trên tay
    const eq = player.getComponent("minecraft:equippable");
    const item = eq?.getEquipment(EquipmentSlot.Mainhand);
    if (item?.typeId !== "fv:freehand_decree") return;

    try {
        if (target.hasComponent("minecraft:is_baby")) return;
        const fam = target.getComponent("minecraft:type_family");
        if (!fam) return;

        let finalEntityType = "";
        let spawnEvent = "";

        // Cleric bị đánh thành Healer
        if (fam.hasTypeFamily("cleric")) {
            finalEntityType = "fv:villager_healer";
            spawnEvent = "minecraft:entity_spawned";
        }
        // Nitwit hoặc dân làng không nghề bị đánh thành lính tự do
        else if (fam.hasTypeFamily("nitwit") || fam.hasTypeFamily("unskilled")) {
            finalEntityType = "fv:villager_free_handle";
            spawnEvent = getVillagerEventSafe(target);
        }

        if (finalEntityType !== "") {
            const spawnPos = target.location;
            const dim = target.dimension;
            executeSpawn(dim, spawnPos, spawnEvent, target, player, eq, finalEntityType);
        }

    } catch (e) { }
});
import { world, system } from "@minecraft/server";

// Danh sách các tag faction hợp lệ
const colorTags = [
    "blue", "red", "grey", "yellow", "green", "black", "brown",
    "white", "purple", "cyan", "lime", "pink", "orange", "light_blue"
];

world.afterEvents.entityHurt.subscribe((event) => {
    const { hurtEntity: player, damage, damageSource } = event;

    // 1. KIỂM TRA AN TOÀN
    if (!player || !player.isValid) return;

    // Chỉ áp dụng khi người chơi bị thương
    if (player.typeId !== "minecraft:player") return;

    const damager = damageSource.damagingEntity;

    // 2. Kiểm tra Damager (Kẻ gây sát thương) tồn tại và hợp lệ
    if (!damager || !damager.isValid) return;

    // 3. Kiểm tra Damager có phải là Golem không (family: irongolem)
    const famComp = damager.getComponent("minecraft:type_family");
    if (!famComp || !famComp.hasTypeFamily("irongolem")) return;

    const playerTags = player.getTags();
    const damagerTags = damager.getTags();
    const pName = player.name.replace(/\s/g, "_"); // Tên đã chuẩn hóa của người chơi

    // Biến xác định có cần "miễn sát thương" không
    let isFriendlyFire = false;

    // --- ƯU TIÊN 1: CHECK OWNER (Mã định danh Mới & Cũ) ---
    // Logic: Kiểm tra xem Golem có tag "owner_Steve" (mới) HOẶC "owner_Steve_xxxx" (cũ) hay không
    const hasOwnerTag = damagerTags.some(tag => {
        return tag === `owner_${pName}` || tag.startsWith(`owner_${player.name}_`);
    });

    if (hasOwnerTag) {
        isFriendlyFire = true;
    }
    // --- ƯU TIÊN 2: CHECK FACTION (Đồng đội chung Team) ---
    else {
        const factionTag = colorTags.find(t => playerTags.includes(t) && damagerTags.includes(t));
        if (factionTag) {
            isFriendlyFire = true;
        }
    }

    // --- XỬ LÝ NẾU LÀ ĐỒNG ĐỘI/CHỦ NHÂN ---
    if (isFriendlyFire) {
        // Sử dụng system.run để xử lý hồi máu và vị trí ở tick tiếp theo (AfterEvent)
        system.run(() => {
            if (!player.isValid || !damager.isValid) return;

            // 1. Hồi lại máu (Triệt tiêu sát thương)
            const hpComp = player.getComponent("minecraft:health");
            if (hpComp) {
                const newHp = Math.min(hpComp.currentValue + damage, hpComp.effectiveMax);
                hpComp.setCurrentValue(newHp);
            }

            // 2. Triệt tiêu Knockback cho Player
            player.teleport(player.location, {
                dimension: player.dimension,
                rotation: player.getRotation(),
                checkForBlocks: false,
                keepVelocity: false // Xóa vận tốc đẩy lùi
            });

            // 3. Đẩy lùi Golem ra xa để ngăn nó tiếp tục combo
            try {
                const pushDir = {
                    x: damager.location.x - player.location.x,
                    z: damager.location.z - player.location.z
                };
                // Áp dụng lực đẩy lùi lên Golem
                damager.applyKnockback(pushDir.x, pushDir.z, 1.5, 0.5);
            } catch (e) {
                // Bỏ qua nếu golem kháng knockback
            }
        });
    }
});
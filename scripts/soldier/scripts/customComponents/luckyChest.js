import { world, system, EquipmentSlot, GameMode } from "@minecraft/server";

// Cấu hình ID Item -> ID Entity sẽ spawn
const SPAWN_MAPPING = {
    "fv:golden_lucky_chest": "fv:normal_lucky_chest",
    "fv:diamond_lucky_chest": "fv:good_lucky_chest",
    "fv:shooter": "fv:shooter",
    "fv:bamboo_turret": "fv:bamboo_turret",
    "fv:copper_watcher": "fv:copper_watcher",
    "fv:melon_golem": "fv:melon_golem",
    "fv:catapult": "fv:catapult",
    "fv:catapult_structure": "fv:catapult_structure",
    "fv:potato_cannon": "fv:potato_cannon",
    "fv:big_potato_cannon": "fv:big_potato_cannon",
    "fv:ballista": "fv:ballista",
    "fv:ballista_structure": "fv:ballista_structure" // <-- THÊM DÒNG NÀY Ở ĐÂY
};

const LuckyChestComponent = {
    onUseOn(event) {
        const { source: player, itemStack, block, blockFace } = event;

        if (!player || !block) return;

        const entityIdToSpawn = SPAWN_MAPPING[itemStack.typeId];
        if (!entityIdToSpawn) return;

        // 1. Tính toán vị trí spawn dựa trên mặt block
        let targetLoc = {
            x: block.location.x + 0.5,
            y: block.location.y,
            z: block.location.z + 0.5
        };

        switch (blockFace) {
            case "Up": targetLoc.y += 1; break;
            case "Down": targetLoc.y -= 1; break;
            case "North": targetLoc.z -= 1; break;
            case "South": targetLoc.z += 1; break;
            case "West": targetLoc.x -= 1; break;
            case "East": targetLoc.x += 1; break;
            default: targetLoc.y += 1; break;
        }

        // 2. Spawn thực thể và xoay hướng
        try {
            const spawnedEntity = player.dimension.spawnEntity(entityIdToSpawn, targetLoc);
            if (spawnedEntity) {
                const playerRot = player.getRotation();
                // Thực thể quay mặt về phía người chơi
                spawnedEntity.setRotation({ x: 0, y: playerRot.y + 180 });
            }
        } catch (err) {
            return;
        }

        // 3. Trừ Item (Chỉ trừ ở Sinh tồn)
        if (player.getGameMode() !== GameMode.creative) {
            const eq = player.getComponent("minecraft:equippable");
            if (eq) {
                const currentItem = eq.getEquipment(EquipmentSlot.Mainhand);
                if (currentItem && currentItem.typeId === itemStack.typeId) {
                    if (currentItem.amount > 1) {
                        currentItem.amount -= 1;
                        eq.setEquipment(EquipmentSlot.Mainhand, currentItem);
                    } else {
                        eq.setEquipment(EquipmentSlot.Mainhand, undefined);
                    }
                }
            }
        }
    }
};

// Đăng ký component
system.beforeEvents.startup.subscribe((event) => {
    event.itemComponentRegistry.registerCustomComponent("fv:lucky_chest_place", LuckyChestComponent);
});
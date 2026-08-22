import { world, system } from "@minecraft/server"; // Đã xóa import MinecraftDimensionTypes

const RAY_OPTIONS = {
    maxDistance: 20,
    includePassableBlocks: false,
};

// SỬA LỖI API: Thay thế MinecraftDimensionTypes bằng chuỗi tên chiều không gian
const DIMENSIONS = [
    "overworld",
    "nether",
    "the_end",
];

const VALID_TYPES = [
    "fv:villager_ranged",
    "fv:copper_watcher",
    "fv:shooter",
    "fv:minecart_shooter",
    "fv:bamboo_turret",
    "fv:melon_golem",
];

system.runInterval(() => {
    for (const dimName of DIMENSIONS) {
        const dim = world.getDimension(dimName);
        if (!dim) continue;

        for (const entity of dim.getEntities()) {
            if (!VALID_TYPES.includes(entity.typeId)) continue;

            let hits;
            try {
                // LƯU Ý: API getEntitiesFromViewDirection yêu cầu EntityQueryOptions. 
                // Ở đây bạn đang dùng RAY_OPTIONS, nó có thể không phải là vấn đề gây crash, 
                // nhưng nếu gặp lỗi về sau, hãy kiểm tra lại API này.
                hits = entity.getEntitiesFromViewDirection(RAY_OPTIONS);
            } catch (e) {
                continue;
            }

            if (!hits.length) continue;

            const target = hits[0].entity;

            // Kiểm tra family "player"
            // Lưu ý: getComponent("minecraft:type_family") trả về null nếu không tồn tại, nên cú pháp ? là an toàn
            const famComp = target.getComponent("minecraft:type_family");
            if (!famComp?.hasTypeFamily("player")) continue;

            // So sánh tag định danh
            const selfTags = entity.getTags().filter(t => t.startsWith("owner_"));
            const targetTags = target.getTags().filter(t => t.startsWith("owner_"));

            const sameOwnerTag = selfTags.find(tag => targetTags.includes(tag));

            if (sameOwnerTag) {
                entity.triggerEvent("fv:re_target");
            }
        }
    }
}, 1);
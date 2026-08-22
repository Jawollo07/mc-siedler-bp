import { world, system } from "@minecraft/server"; // Removed import MinecraftDimensionTypes

const RAY_OPTIONS = {
    maxDistance: 20,
    includePassableBlocks: false,
};

// FIX API ERROR: Replace MinecraftDimensionTypes by dimension name strings
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
                // NOTE: API getEntitiesFromViewDirection requires EntityQueryOptions. 
                // Here you are currently using RAY_OPTIONS; it may not be the cause of the crash, 
                // but if an error occurs later, check this API again.
                hits = entity.getEntitiesFromViewDirection(RAY_OPTIONS);
            } catch (e) {
                continue;
            }

            if (!hits.length) continue;

            const target = hits[0].entity;

            // Check family "player"
            // Note: getComponent("minecraft:type_family") returns null if it does not exist, so the ? syntax is safe
            const famComp = target.getComponent("minecraft:type_family");
            if (!famComp?.hasTypeFamily("player")) continue;

            // Compare identification tags
            const selfTags = entity.getTags().filter(t => t.startsWith("owner_"));
            const targetTags = target.getTags().filter(t => t.startsWith("owner_"));

            const sameOwnerTag = selfTags.find(tag => targetTags.includes(tag));

            if (sameOwnerTag) {
                entity.triggerEvent("fv:re_target");
            }
        }
    }
}, 1);
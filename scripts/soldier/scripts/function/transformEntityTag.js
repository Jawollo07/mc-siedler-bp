import { world, system } from "@minecraft/server";

// List the family not allowed ride boats
const BOSS_FAMILIES = ["mainboss", "general"];

system.runInterval(() => {
    // Iterate through all Dimensions to ensure bosses cannot get trapped anywhere
    for (const dimensionId of ["overworld", "nether", "the_end"]) {
        const dimension = world.getDimension(dimensionId);
        const entities = dimension.getEntities();

        for (const entity of entities) {
            // Note Module 2.4.0: isValid has no parentheses
            if (!entity.isValid) continue;

            // 1. Check whether perform entity has belongs to the boss group not via Type Family
            const famComp = entity.getComponent("minecraft:type_family");
            if (!famComp || !famComp.isValid) continue;

            // Check whether the boss belongs to one of the two target families
            const isTargetBoss = BOSS_FAMILIES.some(family => famComp.hasTypeFamily(family));
            if (!isTargetBoss) continue;

            // 2. Check successful section Riding (Riding)
            const ridingComp = entity.getComponent("minecraft:riding");

            // If the Riding component exists and is currently valid
            if (ridingComp && ridingComp.isValid) {
                const vehicle = ridingComp.entityRidingOn;

                // 3. Check whether "vehicle" has right is boat not
                // We use includes("boat") to catch all boat types (oak_boat, birch_boat, etc.)
                if (vehicle && vehicle.isValid && vehicle.typeId.includes("boat")) {
                    try {
                        // Remove the boat immediately
                        vehicle.remove();

                        // (Optional) Add a corresponding sound or dust particles here for more impact
                        // dimension.playSound("random.break", entity.location);
                    } catch (e) {
                        // Avoid a crash if the entity is removed by another script at the same time
                    }
                }
            }
        }
    }
}, 10); // run every 0.5 seconds (10 ticks) to ensure a fast response while maintaining good performance
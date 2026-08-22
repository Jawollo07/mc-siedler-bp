import { system, world, EquipmentSlot } from "@minecraft/server";

// --- function 1: GET event safe safe (SNAPSHOT) ---
function getVillagerEventSafe(target) {
    try {
        if (!target.isValid) return "fv:plains";
        const markComp = target.getComponent("minecraft:mark_variant");
        const val = markComp ? markComp.value : 0;
        const events = ["fv:plains", "fv:desert", "fv:jungle", "fv:savanna", "fv:snow", "fv:swamp", "fv:taiga"];
        return events[val] || "fv:plains";
    } catch (e) { return "fv:plains"; }
}

// --- function 2: EXECUTE TRANSFORMATION ---
function executeConversion(dimension, spawnPos, eventName, target, entityTypeId) {
    system.run(() => {
        // Remove old villager
        if (target.isValid) target.remove();

        try {
            // spawn entity new using the correct ID has classify type
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

// --- DEFINE custom component ---
const FreehandHitComponent = {
    onHitEntity(event) {
        const { attackingEntity, hitEntity } = event;

        // 1. Check object
        if (!attackingEntity || !hitEntity) return;
        if (hitEntity.typeId !== "minecraft:villager_v2") return;

        // 2. Capture data IMMEDIATELY (Snapshot)
        const eventName = getVillagerEventSafe(hitEntity);
        const spawnPos = { x: hitEntity.location.x, y: hitEntity.location.y, z: hitEntity.location.z };
        const dimension = hitEntity.dimension;

        // 3. Filtering logic
        if (hitEntity.hasComponent("minecraft:is_baby")) return;

        // --- JOB CLASSIFICATION (logic NEW) ---
        let finalEntityId = "fv:villager_free_handle"; // Default for Nitwit, Unskilled, Farmer...

        const fam = hitEntity.getComponent("minecraft:type_family");
        if (fam) {
            if (fam.hasTypeFamily("weaponsmith")) {
                finalEntityId = "fv:villager_melee"; // Blacksmith -> Tanker
            } else if (fam.hasTypeFamily("fletcher")) {
                finalEntityId = "fv:villager_ranged"; // Fletcher -> ranged
            }
        }

        // 4. Deduct durability/item count
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

        // 5. Execute transformation with ID has classify type
        executeConversion(dimension, spawnPos, eventName, hitEntity, finalEntityId);
    }
};

// --- REGISTER register component ---
system.beforeEvents.startup.subscribe((event) => {
    event.itemComponentRegistry.registerCustomComponent("fv:freehand_hit_event", FreehandHitComponent);
    console.warn("[FV-SYSTEM] Registered Custom Component: fv:freehand_hit_event (Job classification)");
});
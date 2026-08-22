import { world, system, EquipmentSlot } from "@minecraft/server";

console.warn("[FV-DEBUG] >>> VILLAGER HANDLE SCRIPT UPDATED <<<");

// --- GET BIOME event (for regular soldiers) ---
function getVillagerEventSafe(target) {
    try {
        // Module 2.4.0: isValid has no parentheses
        if (!target || !target.isValid) return "fv:plains";
        const markComp = target.getComponent("minecraft:mark_variant");
        const val = markComp ? markComp.value : 0;
        const events = ["fv:plains", "fv:desert", "fv:jungle", "fv:savanna", "fv:snow", "fv:swamp", "fv:taiga"];
        return events[val] || "fv:plains";
    } catch (e) { return "fv:plains"; }
}

// --- EXECUTE spawn ---
function executeSpawn(dimension, spawnPos, eventName, target, player, equippableComp, entityTypeId) {
    system.run(() => {
        // Check safe before removing the target
        if (target && target.isValid) target.remove();

        try {
            // perform perform spawn with the specified event
            dimension.spawnEntity(entityTypeId, spawnPos, { spawnEvent: eventName });
        } catch (err) {
            try { dimension.spawnEntity(entityTypeId, spawnPos); } catch (e) { }
        }

        // Remove item (Only deduct if used by a player)
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

// --- HANDLE INTERACTION (INTERACT) ---
world.afterEvents.playerInteractWithEntity.subscribe((event) => {
    const { player, target } = event;

    // Check safe absolute object for player and target
    if (!player || !target || !player.isValid || !target.isValid) return;
    if (target.typeId !== "minecraft:villager_v2") return;

    // Check item in hand
    const eq = player.getComponent("minecraft:equippable");
    const item = eq?.getEquipment(EquipmentSlot.Mainhand);
    if (item?.typeId !== "fv:freehand_decree") return;

    try {
        if (target.hasComponent("minecraft:is_baby")) return;
        const fam = target.getComponent("minecraft:type_family");
        if (!fam) return;

        // Skip Nitwit/Unskilled during interaction (let OnHit handle it)
        if (fam.hasTypeFamily("nitwit") || fam.hasTypeFamily("unskilled")) return;

        let finalEntityType = "fv:villager_melee";
        let spawnEvent = getVillagerEventSafe(target);

        // JOB CLASSIFICATION
        if (fam.hasTypeFamily("fletcher")) {
            finalEntityType = "fv:villager_ranged";
        } else if (fam.hasTypeFamily("weaponsmith")) {
            finalEntityType = "fv:villager_melee";
        }
        // Handle Healer from Cleric
        else if (fam.hasTypeFamily("cleric")) {
            finalEntityType = "fv:villager_healer";
            spawnEvent = "minecraft:entity_spawned";
        }

        const spawnPos = target.location;
        const dim = target.dimension;

        executeSpawn(dim, spawnPos, spawnEvent, target, player, eq, finalEntityType);

    } catch (e) { }
});

// --- PROCESSING when is attack (ON HIT) ---
world.afterEvents.entityHurt.subscribe((event) => {
    const { damageSource, target } = event;

    // Ensure damageSource exists before getting damagingEntity
    if (!damageSource) return;
    const player = damageSource.damagingEntity;

    // FIX BUG line 91: Separate the check conditions to to avoid the error "of undefined"
    if (!player) return;
    if (!player.isValid || player.typeId !== "minecraft:player") return;

    // Check target (Villager)
    if (!target || !target.isValid || target.typeId !== "minecraft:villager_v2") return;

    // Check item in hand
    const eq = player.getComponent("minecraft:equippable");
    const item = eq?.getEquipment(EquipmentSlot.Mainhand);
    if (item?.typeId !== "fv:freehand_decree") return;

    try {
        if (target.hasComponent("minecraft:is_baby")) return;
        const fam = target.getComponent("minecraft:type_family");
        if (!fam) return;

        let finalEntityType = "";
        let spawnEvent = "";

        // Cleric is converted to Healer
        if (fam.hasTypeFamily("cleric")) {
            finalEntityType = "fv:villager_healer";
            spawnEvent = "minecraft:entity_spawned";
        }
        // Nitwit or unemployed villager is converted to free soldier
        else if (fam.hasTypeFamily("nitwit") || fam.hasTypeFamily("unskilled")) {
            finalEntityType = "fv:villager_melee";
            spawnEvent = getVillagerEventSafe(target);
        }

        if (finalEntityType !== "") {
            const spawnPos = target.location;
            const dim = target.dimension;
            executeSpawn(dim, spawnPos, spawnEvent, target, player, eq, finalEntityType);
        }

    } catch (e) { }
});
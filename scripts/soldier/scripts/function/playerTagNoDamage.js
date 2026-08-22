import { world, system } from "@minecraft/server";

// List of valid faction tags
const colorTags = [
    "blue", "red", "grey", "yellow", "green", "black", "brown",
    "white", "purple", "cyan", "lime", "pink", "orange", "light_blue"
];

world.afterEvents.entityHurt.subscribe((event) => {
    const { hurtEntity: player, damage, damageSource } = event;

    // 1. SAFETY CHECK
    if (!player || !player.isValid) return;

    // Only apply when player is hurt
    if (player.typeId !== "minecraft:player") return;

    const damager = damageSource.damagingEntity;

    // 2. Check Damager (damage dealer) exists and is valid
    if (!damager || !damager.isValid) return;

    // 3. Check Damager is a Golem (family: irongolem)
    const famComp = damager.getComponent("minecraft:type_family");
    if (!famComp || !famComp.hasTypeFamily("irongolem")) return;

    const playerTags = player.getTags();
    const damagerTags = damager.getTags();
    const pName = player.name.replace(/\s/g, "_"); // Normalized name of player

    // Variable determining has needed "damage immunity" not
    let isFriendlyFire = false;

    // --- PRIORITY 1: CHECK owner (identifier new & old) ---
    // logic: Check whether Golem has tag "owner_Steve" (new) or "owner_Steve_xxxx" (old) or not
    const hasOwnerTag = damagerTags.some(tag => {
        return tag === `owner_${pName}` || tag.startsWith(`owner_${player.name}_`);
    });

    if (hasOwnerTag) {
        isFriendlyFire = true;
    }
    // --- PRIORITY 2: CHECK FACTION (teammate on the same team) ---
    else {
        const factionTag = colorTags.find(t => playerTags.includes(t) && damagerTags.includes(t));
        if (factionTag) {
            isFriendlyFire = true;
        }
    }

    // --- HANDLE TEAMMATE/owner ---
    if (isFriendlyFire) {
        // Use system.run to handle processing heal and position on the next tick (AfterEvent)
        system.run(() => {
            if (!player.isValid || !damager.isValid) return;

            // 1. Restore health (Cancel damage)
            const hpComp = player.getComponent("minecraft:health");
            if (hpComp) {
                const newHp = Math.min(hpComp.currentValue + damage, hpComp.effectiveMax);
                hpComp.setCurrentValue(newHp);
            }

            // 2. Cancel knockback for player
            player.teleport(player.location, {
                dimension: player.dimension,
                rotation: player.getRotation(),
                checkForBlocks: false,
                keepVelocity: false // Remove knockback velocity
            });

            // 3. Push the Golem away to to prevent it from continuing its combo
            try {
                const pushDir = {
                    x: damager.location.x - player.location.x,
                    z: damager.location.z - player.location.z
                };
                // Apply knockback up Golem
                damager.applyKnockback(pushDir.x, pushDir.z, 1.5, 0.5);
            } catch (e) {
                // Skip if golem knockback-resistant
            }
        });
    }
});
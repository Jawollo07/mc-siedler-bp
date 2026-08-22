// File: shootCatapult.js
import { system } from "@minecraft/server";

// Receive scriptevent catapult:fire
system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id !== "catapult:fire") return;

    const catapult = event.sourceEntity;
    // Check whether the source entity is valid
    if (!catapult || !catapult.isValid) return;

    const ammoType = catapult.getProperty("fv:reload_catapult");
    if (ammoType === "empty") {
        console.warn("Catapult is not loaded!");
        return;
    }

    const baseDirection = catapult.getViewDirection();
    const pitchRad = 45 * (Math.PI / 180);
    const flatLen = Math.sqrt(baseDirection.x ** 2 + baseDirection.z ** 2);
    if (flatLen === 0) return;

    const xzNorm = {
        x: baseDirection.x / flatLen,
        z: baseDirection.z / flatLen
    };

    const direction = {
        x: xzNorm.x * Math.cos(pitchRad),
        y: Math.sin(pitchRad),
        z: xzNorm.z * Math.cos(pitchRad)
    };

    const offset = 2.0;
    const spawnPos = {
        x: catapult.location.x + direction.x * offset,
        y: catapult.location.y + direction.y * offset + 3.5,
        z: catapult.location.z + direction.z * offset
    };

    // spawn fv:block_fly
    const projectile = catapult.dimension.spawnEntity("fv:block_fly", spawnPos);
    if (!projectile || !projectile.isValid) return;

    try {
        const projComp = projectile.getComponent("minecraft:projectile");
        if (projComp) {
            // FIX: Set owner to the triggering Entity (Catapult)
            projComp.owner = catapult;

            projComp.shoot(
                {
                    x: direction.x * 2.2,  // you can adjust power as desired
                    y: direction.y * 2.2,
                    z: direction.z * 2.2
                },
                { uncertainty: 0.02 }
            );
        }
    } catch (e) {
        console.warn("Error assigning owner or firing projectile:", e);
    }

    // Trigger the corresponding event up round block_fly
    projectile.triggerEvent(ammoType);

    // reset reload_catapult to empty
    catapult.setProperty("fv:reload_catapult", "empty");
});
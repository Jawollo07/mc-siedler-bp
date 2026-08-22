// File: shootBigCannon.js
import { system, world } from "@minecraft/server";

// Check inventory and set the property (Keep unchanged)
system.runInterval(() => {
    const entities = world.getDimension("overworld").getEntities({
        type: "fv:big_potato_cannon"
    });

    for (const cannon of entities) {
        const invComp = cannon.getComponent("inventory");
        if (!invComp || !invComp.container) continue;

        const container = invComp.container;

        let hasGunpowder = false;
        let hasPotato = false;
        let hasExplodePotato = false;

        for (let i = 0; i < container.size; i++) {
            const item = container.getItem(i);
            if (!item) continue;

            if (item.typeId === "minecraft:gunpowder" && item.amount > 0) {
                hasGunpowder = true;
            } else if (item.typeId === "minecraft:potato" && item.amount > 0) {
                hasPotato = true;
            } else if (item.typeId === "fv:potato_explode" && item.amount > 0) {
                hasExplodePotato = true;
            }
        }

        if (hasGunpowder && (hasPotato !== hasExplodePotato)) {
            cannon.setProperty("fv:canshoot", true);
            if (hasPotato) {
                cannon.setProperty("fv:potato_type", "normal");
            } else if (hasExplodePotato) {
                cannon.setProperty("fv:potato_type", "exp");
            }
        } else {
            cannon.setProperty("fv:canshoot", false);
            cannon.setProperty("fv:potato_type", "empty");
        }
    }
}, 5);

// Receive scriptevent bigcannon:shoot
system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id !== "bigcannon:shoot") return;

    const shooter = event.sourceEntity;
    // Check whether the source entity is valid
    if (!shooter || !shooter.isValid) return;

    const potatoType = shooter.getProperty("fv:potato_type");

    if (potatoType === "empty") {
        console.warn("Cannon has no ammunition!");
        return;
    }

    const baseDirection = shooter.getViewDirection();
    const pitchRad = 20 * (Math.PI / 180);
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

    const offset = 1.5;
    const spawnPos = {
        x: shooter.location.x + direction.x * offset,
        y: shooter.location.y + direction.y * offset,
        z: shooter.location.z + direction.z * offset
    };

    const projectile = shooter.dimension.spawnEntity("fv:potato_fly", spawnPos);
    if (!projectile || !projectile.isValid) return;

    try {
        const projComp = projectile.getComponent("minecraft:projectile");
        if (projComp) {
            // FIX: Set owner to the triggering Entity (Cannon)
            projComp.owner = shooter;

            projComp.shoot(
                {
                    x: direction.x * 2,
                    y: direction.y * 2,
                    z: direction.z * 2
                },
                { uncertainty: 0.05 }
            );
        }
    } catch (e) {
        console.warn("Error assigning owner or firing projectile:", e);
    }


    if (potatoType === "exp") {
        projectile.triggerEvent("potato_exp");
    }

    // Remove 1 gunpowder and 1 potato of the correct type after firing (Keep unchanged)
    const invComp = shooter.getComponent("inventory");
    if (invComp && invComp.container) {
        const container = invComp.container;
        let removedGunpowder = false;
        let removedPotato = false;

        for (let i = 0; i < container.size; i++) {
            const item = container.getItem(i);
            if (!item) continue;

            if (!removedGunpowder && item.typeId === "minecraft:gunpowder" && item.amount > 0) {
                item.amount -= 1;
                if (item.amount <= 0) container.setItem(i, undefined);
                else container.setItem(i, item);
                removedGunpowder = true;
                continue;
            }

            if (!removedPotato) {
                if (
                    (potatoType === "normal" && item.typeId === "minecraft:potato" && item.amount > 0) ||
                    (potatoType === "exp" && item.typeId === "fv:potato_explode" && item.amount > 0)
                ) {
                    item.amount -= 1;
                    if (item.amount <= 0) container.setItem(i, undefined);
                    else container.setItem(i, item);
                    removedPotato = true;
                }
            }

            if (removedGunpowder && removedPotato) break;
        }
    }

    // reset state after when shoot
    shooter.setProperty("fv:canshoot", false);
    shooter.setProperty("fv:potato_type", "empty");
});
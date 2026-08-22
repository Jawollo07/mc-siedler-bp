import { world, system, EquipmentSlot } from "@minecraft/server";
import { damageItem } from "../function/shieldDamage.js";

// 1. CONFIGURATION
const VALID_SHIELDS = [
    "fv:copper_shield",
    // Add other shields here
];

// 2. function HELPERS
function isValidShield(item) {
    if (!item) return false;
    if (VALID_SHIELDS.includes(item.typeId)) return true;
    if (item.hasTag("fv:shield")) return true;
    return false;
}

function isBlockingFacing(player, damager) {
    if (!damager) return false;
    const viewDir = player.getViewDirection();
    const distX = damager.location.x - player.location.x;
    const distZ = damager.location.z - player.location.z;
    const length = Math.sqrt(distX * distX + distZ * distZ);
    if (length === 0) return false;

    const dirToAttacker = { x: distX / length, z: distZ / length };
    const dotProduct = (viewDir.x * dirToAttacker.x) + (viewDir.z * dirToAttacker.z);
    return dotProduct > 0;
}

// 3. animation (No lag)
const playerBlockState = new Map();

system.runInterval(() => {
    for (const player of world.getPlayers()) {
        const eq = player.getComponent("minecraft:equippable");
        const mainHand = eq?.getEquipment(EquipmentSlot.Mainhand);
        const offHand = eq?.getEquipment(EquipmentSlot.Offhand);

        const hasMainShield = isValidShield(mainHand);
        const hasOffShield = isValidShield(offHand);
        const isSneaking = player.isSneaking;

        let currentState = "NONE";
        if (hasOffShield && isSneaking) currentState = "OFFHAND";
        else if (hasMainShield && isSneaking && !player.hasTag("offhand")) currentState = "MAINHAND";

        const lastState = playerBlockState.get(player.id) || "NONE";

        if (currentState !== lastState) {
            if (lastState === "MAINHAND") {
                player.runCommand("playanimation @s animation.player.use_shield_main_hand root 0");
                player.removeTag("mainhand");
            } else if (lastState === "OFFHAND") {
                player.runCommand("playanimation @s animation.player.use_shield_off_hand root 0");
                player.removeTag("offhand");
            }

            if (currentState === "MAINHAND") {
                player.runCommand("playanimation @s animation.player.use_shield_main_hand root 100");
                player.addTag("mainhand");
            } else if (currentState === "OFFHAND") {
                player.runCommand("playanimation @s animation.player.use_shield_off_hand root 100");
                player.addTag("offhand");
            }
            playerBlockState.set(player.id, currentState);
        }
    }
}, 2);

world.afterEvents.playerLeave.subscribe((ev) => {
    playerBlockState.delete(ev.playerId);
});

// 4. BLOCKING logic (STABLE)
world.afterEvents.entityHurt.subscribe((event) => {
    const player = event.hurtEntity;
    const damageSource = event.damageSource;
    const damager = damageSource.damagingEntity; // Can be a mob or safe Arrow

    if (player.typeId !== "minecraft:player") return;
    if (!player.isSneaking || !damager) return;

    // Check block angle
    if (!isBlockingFacing(player, damager)) return;

    // Check shield
    const eq = player.getComponent("minecraft:equippable");
    const mainHand = eq?.getEquipment(EquipmentSlot.Mainhand);
    const offHand = eq?.getEquipment(EquipmentSlot.Offhand);

    let blockingShield = null;
    let slotName = null;

    if (isValidShield(offHand)) {
        blockingShield = offHand;
        slotName = EquipmentSlot.Offhand;
    } else if (isValidShield(mainHand)) {
        blockingShield = mainHand;
        slotName = EquipmentSlot.Mainhand;
    }

    if (!blockingShield || !slotName) return;

    // --- PROCESSING (system Run to avoid lag logic) ---
    system.run(() => {
        // 1. Heal (block damage)
        const healthComp = player.getComponent("minecraft:health");
        if (healthComp) {
            const damageTaken = Math.round(event.damage);
            const newHealth = Math.min(healthComp.currentValue + damageTaken, healthComp.defaultValue);
            healthComp.setCurrentValue(newHealth);
        }

        // 2. block sound
        player.runCommand("playsound item.shield.block @s");

        // 3. Handle enemy knockback (only apply if it is NOT a projectile)
        if (damager.isValid && damageSource.cause !== "projectile") {
            const dx = damager.location.x - player.location.x;
            const dz = damager.location.z - player.location.z;
            try {
                damager.applyKnockback(dx, dz, 2.0, 0.5);
            } catch (e) { }
        }

        // 4. Deduct durability
        if (player.getGameMode() === "survival") {
            const currentEq = player.getComponent("minecraft:equippable");
            const currentShield = currentEq.getEquipment(slotName);

            if (currentShield) {
                const newItem = damageItem(currentShield);
                if (!newItem) {
                    world.playSound("random.break", player.location);
                    currentEq.setEquipment(slotName, undefined);
                } else {
                    currentEq.setEquipment(slotName, newItem);
                }
            }
        }
    });
});

// 5. DEDUCT DURABILITY when BREAK block
world.afterEvents.playerBreakBlock.subscribe(({ player, itemStackAfterBreak: item }) => {
    if (!item) return;
    if (item.hasTag("fv:durability") || isValidShield(item)) {
        const eq = player.getComponent("minecraft:equippable");
        const newItem = damageItem(item);

        if (!newItem) {
            world.playSound("random.break", player.location);
            eq.setEquipment(EquipmentSlot.Mainhand, undefined);
        } else {
            eq.setEquipment(EquipmentSlot.Mainhand, newItem);
        }
    }
});
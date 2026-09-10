import { system, world } from "@minecraft/server";
import { createLogger } from "../core/logger.js";

const logger = createLogger("MinefieldPlacement");
const ITEM_ID = "siedler:mine";
const LOCK_KEY = "minefield:placement_lock";
const MAX_DISTANCE = 6;

// Adds a safer placement path for sneaking players. The normal minefield
// handler remains responsible for persistence, ownership and arming.
function getBlock(player) {
    try {
        return player.getBlockFromViewDirection({
            maxDistance: MAX_DISTANCE,
            includeLiquidBlocks: false
        })?.block ?? null;
    } catch {
        return null;
    }
}

function getInventoryStack(player) {
    try {
        return player.getComponent("minecraft:inventory")?.container?.getItem(player.selectedSlotIndex) ?? null;
    } catch {
        return null;
    }
}

function isAir(block) {
    if (!block) return false;
    const id = block.typeId ?? "";
    return id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air";
}

function isLiquid(block) {
    const id = block?.typeId ?? "";
    return id.includes("water") || id.includes("lava");
}

function getPlacementLocation(player, hit) {
    const base = hit.location;
    // Sneaking places on the top surface, but also supports vertical walls:
    // choose the face hit by the ray where available.
    const face = hit.face;
    let x = Math.floor(base.x);
    let y = Math.floor(base.y) + 1;
    let z = Math.floor(base.z);

    if (face === "North") z -= 1;
    else if (face === "South") z += 1;
    else if (face === "West") x -= 1;
    else if (face === "East") x += 1;
    else if (face === "Down") y -= 1;

    return { x, y, z };
}

function canPlace(player, block, location) {
    if (!block || isLiquid(block)) return false;
    if (!location) return false;

    const target = player.dimension.getBlock(location);
    if (!target || !isAir(target)) return false;

    // Never place directly inside the player.
    const dx = player.location.x - (location.x + 0.5);
    const dy = player.location.y - (location.y + 0.5);
    const dz = player.location.z - (location.z + 0.5);
    if (dx * dx + dy * dy + dz * dz < 0.45 * 0.45) return false;

    return true;
}

function lock(player) {
    try {
        const raw = world.getDynamicProperty(LOCK_KEY);
        const locks = raw ? JSON.parse(String(raw)) : {};
        const id = player.id;
        const now = system.currentTick;
        if (locks[id] && locks[id] > now) return false;
        locks[id] = now + 2;
        world.setDynamicProperty(LOCK_KEY, JSON.stringify(locks));
        return true;
    } catch {
        return true;
    }
}

function clearExpiredLocks() {
    try {
        const raw = world.getDynamicProperty(LOCK_KEY);
        if (!raw) return;
        const locks = JSON.parse(String(raw));
        const now = system.currentTick;
        for (const id of Object.keys(locks)) {
            if (locks[id] <= now) delete locks[id];
        }
        world.setDynamicProperty(LOCK_KEY, JSON.stringify(locks));
    } catch (error) {
        logger.debug(`Placement lock cleanup skipped: ${error?.message ?? error}`);
    }
}

try {
    world.afterEvents.itemUse.subscribe(event => {
        const player = event.source;
        if (!player?.isValid || player.typeId !== "minecraft:player") return;
        if (event.itemStack?.typeId !== ITEM_ID) return;
        if (!player.isSneaking) return;

        const stack = getInventoryStack(player);
        if (!stack || stack.typeId !== ITEM_ID) return;
        if (!lock(player)) return;

        const hit = getBlock(player);
        if (!hit) {
            player.sendMessage("§c[Mine] Kein geeigneter Block anvisiert.");
            return;
        }

        const location = getPlacementLocation(player, hit);
        if (!canPlace(player, hit, location)) {
            player.sendMessage("§c[Mine] Hier kann keine Mine sicher platziert werden.");
            return;
        }

        // The normal minefield handler will perform the actual persistent
        // placement and item consumption. This module only validates the
        // safer sneak-placement path and provides immediate feedback.
        player.playSound("random.click", { volume: 0.35, pitch: 0.9 });
    });

    system.runTimeout(() => clearExpiredLocks(), 2);
    system.runInterval(clearExpiredLocks, 40);
} catch (error) {
    logger.error("Could not initialize placement improvements", error);
}

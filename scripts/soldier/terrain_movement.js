import { system } from "@minecraft/server";
import { SOLDIERS, SOLDIER_CONFIG } from "./config.js";

const TICK_INTERVAL = 1;
const JUMP_COOLDOWN_MS = 450;
const JUMP_IMPULSE = 0.38;
const EXTRA_SPEED_IMPULSE = 0.018;
const LOOK_AHEAD = 0.72;
const FOOT_Y_OFFSET = 0.1;
const HEAD_Y_OFFSET = 1.35;

let started = false;
const lastJump = new Map();

/**
 * Terrain assistance for the custom impulse-based Soldier AI.
 *
 * The normal Soldier AI deliberately uses impulses for responsive formation
 * movement. That bypasses vanilla path navigation, so this helper adds the
 * missing terrain behaviour: faster travel and short jumps over one-block
 * obstacles / stairs. Gravity and collision then handle the landing naturally.
 */
export function startSoldierTerrainMovement() {
    if (started) return;
    started = true;
    system.runInterval(updateTerrainMovement, TICK_INTERVAL);
    console.info("[Soldier Terrain] Speed + Block/Stair traversal enabled");
}

function updateTerrainMovement() {
    const now = Date.now();

    for (const [id, soldier] of SOLDIERS) {
        const entity = soldier?.entity;
        if (!entity?.isValid) {
            lastJump.delete(id);
            continue;
        }

        // Only assist active movement. Combat/idle states must remain untouched.
        if (soldier.phase !== SOLDIER_CONFIG.STATES.MOVE) continue;

        const direction = soldier.desiredDirection;
        if (!direction || Math.hypot(direction.x, direction.z) < 0.01) continue;

        const movementEntity = soldier.type === "cavalry"
            ? (soldier.mount?.isValid ? soldier.mount : entity)
            : entity;

        if (!movementEntity?.isValid) continue;

        // Give the existing AI a small additional forward impulse. This raises
        // practical travel speed without replacing its acceleration/braking model.
        try {
            const level = Math.max(1, Math.min(7, Number(soldier.level) || 1));
            const levelBoost = 0.85 + level * 0.06;
            const cavalryBoost = soldier.type === "cavalry" ? 1.35 : 1;
            movementEntity.applyImpulse({
                x: direction.x * EXTRA_SPEED_IMPULSE * levelBoost * cavalryBoost,
                y: 0,
                z: direction.z * EXTRA_SPEED_IMPULSE * levelBoost * cavalryBoost
            });
        } catch {}

        if (now - (lastJump.get(id) ?? 0) < JUMP_COOLDOWN_MS) continue;
        if (!needsTerrainStep(movementEntity, direction)) continue;

        try {
            movementEntity.applyImpulse({
                x: direction.x * 0.045,
                y: JUMP_IMPULSE,
                z: direction.z * 0.045
            });
            lastJump.set(id, now);
        } catch {}
    }
}

function needsTerrainStep(entity, direction) {
    const dimension = entity.dimension;
    const base = entity.location;
    const x = base.x + direction.x * LOOK_AHEAD;
    const z = base.z + direction.z * LOOK_AHEAD;

    const feetBlock = safeBlock(dimension, Math.floor(x), Math.floor(base.y + FOOT_Y_OFFSET), Math.floor(z));
    const headBlock = safeBlock(dimension, Math.floor(x), Math.floor(base.y + HEAD_Y_OFFSET), Math.floor(z));
    const aboveBlock = safeBlock(dimension, Math.floor(x), Math.floor(base.y + 1.05), Math.floor(z));

    if (!feetBlock || !headBlock || !aboveBlock) return false;

    // If the block directly ahead at foot level is solid but the space above is
    // free, a short jump lets the soldier climb a one-block obstacle or stair.
    const blockedAtFeet = !isPassable(feetBlock);
    const freeAtHead = isPassable(headBlock);
    const freeAbove = isPassable(aboveBlock);

    return blockedAtFeet && freeAtHead && freeAbove;
}

function safeBlock(dimension, x, y, z) {
    try {
        return dimension.getBlock({ x, y, z });
    } catch {
        return null;
    }
}

function isPassable(block) {
    if (!block) return false;
    try {
        if (block.isAir) return true;
        if (block.isLiquid) return true;
        const id = String(block.typeId ?? "");
        return id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:water" || id === "minecraft:flowing_water";
    } catch {
        return false;
    }
}

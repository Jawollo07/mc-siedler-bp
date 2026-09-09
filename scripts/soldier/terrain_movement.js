import { system } from "@minecraft/server";
import { SOLDIERS, SOLDIER_CONFIG } from "./config.js";

const TICK_INTERVAL = 1;
const JUMP_COOLDOWN_MS = 400;
const JUMP_IMPULSE = 0.40;
const EXTRA_SPEED_IMPULSE = 0.035;
const MAX_HORIZONTAL_SPEED = 0.55;
const LOOK_AHEAD = 0.78;
const FOOT_Y_OFFSET = 0.1;
const HEAD_Y_OFFSET = 1.35;

let started = false;
const lastJump = new Map();

export function startSoldierTerrainMovement() {
    if (started) return;
    started = true;
    system.runInterval(updateTerrainMovement, TICK_INTERVAL);
    console.info("[Soldier Terrain] Schnelle Bewegung + Block/Stair traversal enabled");
}

function updateTerrainMovement() {
    const now = Date.now();

    for (const [id, soldier] of SOLDIERS) {
        const entity = soldier?.entity;
        if (!entity?.isValid) {
            lastJump.delete(id);
            continue;
        }
        if (soldier.phase !== SOLDIER_CONFIG.STATES.MOVE) continue;

        const direction = soldier.desiredDirection;
        if (!direction || Math.hypot(direction.x, direction.z) < 0.01) continue;

        const movementEntity = soldier.type === "cavalry"
            ? (soldier.mount?.isValid ? soldier.mount : entity)
            : entity;
        if (!movementEntity?.isValid) continue;

        try {
            const level = Math.max(1, Math.min(7, Number(soldier.level) || 1));
            const levelBoost = 0.95 + level * 0.065;
            const cavalryBoost = soldier.type === "cavalry" ? 1.45 : 1;
            const velocity = movementEntity.getVelocity?.() ?? { x: 0, y: 0, z: 0 };
            const horizontalSpeed = Math.hypot(Number(velocity.x) || 0, Number(velocity.z) || 0);
            if (horizontalSpeed < MAX_HORIZONTAL_SPEED) {
                const remaining = Math.max(0, MAX_HORIZONTAL_SPEED - horizontalSpeed);
                const impulse = Math.min(EXTRA_SPEED_IMPULSE * levelBoost * cavalryBoost, remaining * 0.30);
                movementEntity.applyImpulse({
                    x: direction.x * impulse,
                    y: 0,
                    z: direction.z * impulse
                });
            }
        } catch {}

        if (now - (lastJump.get(id) ?? 0) < JUMP_COOLDOWN_MS) continue;

        const pathState = soldier.pathfinding;
        const pathWantsJump = pathState?.jumpRequired === true &&
            Math.abs(Number(pathState.verticalDelta) || 0) > 0;
        const terrainWantsJump = needsTerrainStep(movementEntity, direction);
        if (!pathWantsJump && !terrainWantsJump) continue;

        try {
            movementEntity.applyImpulse({
                x: direction.x * 0.05,
                y: JUMP_IMPULSE,
                z: direction.z * 0.05
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

    return !isPassable(feetBlock) && isPassable(headBlock) && isPassable(aboveBlock);
}

function safeBlock(dimension, x, y, z) {
    try { return dimension.getBlock({ x, y, z }); } catch { return null; }
}

function isPassable(block) {
    if (!block) return false;
    try {
        if (block.isAir || block.isLiquid) return true;
        const id = String(block.typeId ?? "");
        return id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air" ||
            id === "minecraft:water" || id === "minecraft:flowing_water";
    } catch { return false; }
}

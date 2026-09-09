import { system } from "@minecraft/server";
import { SOLDIERS, SOLDIER_CONFIG } from "./config.js";

const TICK_INTERVAL = 1;
const MOVE_IMPULSE = 0.045;
const BRAKE_IMPULSE = 0.12;
const MAX_SPEED = 0.72;
const TURN_RESPONSE = 0.34;
const MOUNT_SEARCH_RADIUS = 7;
const OBSTACLE_LOOK_AHEAD = 0.9;
const JUMP_IMPULSE = 0.48;
const JUMP_COOLDOWN = 500;

let started = false;

export function startCavalryController() {
    if (started) return;
    started = true;
    system.runInterval(updateCavalry, TICK_INTERVAL);
    console.info("[Soldier Cavalry] Dedicated mount controller enabled");
}

function updateCavalry() {
    const now = Date.now();
    for (const soldier of SOLDIERS.values()) {
        if (soldier?.type !== "cavalry") continue;
        if (!soldier.entity?.isValid || soldier.phase !== SOLDIER_CONFIG.STATES.MOVE) continue;

        const mount = getMount(soldier);
        if (!mount) continue;
        soldier.mount = mount;

        const target = getTarget(soldier, mount);
        if (!target) continue;

        const dx = target.location.x - mount.location.x;
        const dz = target.location.z - mount.location.z;
        const distance = Math.hypot(dx, dz);
        if (distance < 0.05) continue;

        const x = dx / distance;
        const z = dz / distance;
        soldier.desiredDirection ??= { x: 0, z: 0 };
        soldier.desiredDirection.x = x;
        soldier.desiredDirection.z = z;

        // Never let the rider A* movement overwrite the horse controller.
        if (soldier.pathfinding) {
            soldier.pathfinding.path = null;
            soldier.pathfinding.index = 0;
            soldier.pathfinding.jumpRequired = false;
            soldier.pathfinding.dropRequired = false;
        }

        try {
            const rotation = mount.getRotation?.() ?? { x: 0, y: 0 };
            const targetYaw = Math.atan2(-x, z) * 180 / Math.PI;
            const delta = normalizeAngle(targetYaw - rotation.y);
            mount.setRotation?.({ x: 0, y: rotation.y + delta * TURN_RESPONSE });

            const velocity = mount.getVelocity?.() ?? { x: 0, y: 0, z: 0 };
            const speed = Math.hypot(velocity.x ?? 0, velocity.z ?? 0);
            const acceleration = Math.max(0.01, 1 - Math.abs(delta) / 180 * 0.55);
            if (speed < MAX_SPEED) {
                const impulse = MOVE_IMPULSE * acceleration;
                mount.applyImpulse?.({ x: x * impulse, y: 0, z: z * impulse });
            } else if (speed > MAX_SPEED * 1.15) {
                mount.applyImpulse?.({
                    x: -(velocity.x ?? 0) * BRAKE_IMPULSE,
                    y: 0,
                    z: -(velocity.z ?? 0) * BRAKE_IMPULSE
                });
            }

            if (now >= (soldier.cavalryNextJump ?? 0) && needsJump(mount, x, z)) {
                mount.applyImpulse?.({ x: x * 0.06, y: JUMP_IMPULSE, z: z * 0.06 });
                soldier.cavalryNextJump = now + JUMP_COOLDOWN;
            }
        } catch {}
    }
}

function needsJump(mount, x, z) {
    try {
        const base = mount.location;
        const px = Math.floor(base.x + x * OBSTACLE_LOOK_AHEAD);
        const pz = Math.floor(base.z + z * OBSTACLE_LOOK_AHEAD);
        const feet = mount.dimension.getBlock({ x: px, y: Math.floor(base.y), z: pz });
        const head = mount.dimension.getBlock({ x: px, y: Math.floor(base.y + 1), z: pz });
        const above = mount.dimension.getBlock({ x: px, y: Math.floor(base.y + 2), z: pz });
        return !!feet && !!head && !!above && !isPassable(feet) && isPassable(head) && isPassable(above);
    } catch {
        return false;
    }
}

function isPassable(block) {
    try {
        if (block.isAir || block.isLiquid) return true;
        const id = String(block.typeId ?? "");
        return id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air" ||
            id === "minecraft:water" || id === "minecraft:flowing_water";
    } catch {
        return false;
    }
}

function getTarget(soldier, mount) {
    if (!soldier.targetId) return null;
    try {
        return mount.dimension.getEntities({ location: mount.location, maxDistance: 36 })
            .find(entity => entity.id === soldier.targetId && entity.isValid) ?? null;
    } catch {
        return null;
    }
}

function getMount(soldier) {
    if (soldier.mount?.isValid && soldier.mount.hasTag?.("soldier_mount")) return soldier.mount;
    try {
        const entities = soldier.entity.dimension.getEntities({ location: soldier.entity.location, maxDistance: MOUNT_SEARCH_RADIUS });
        const owned = entities.find(entity => {
            if (!entity.isValid || !entity.hasTag?.("soldier_mount")) return false;
            try { return entity.getDynamicProperty("soldier:riderId") === soldier.entity.id; } catch { return false; }
        });
        if (owned) {
            soldier.mount = owned;
            return owned;
        }
    } catch {}
    return null;
}

function normalizeAngle(angle) { return ((angle + 180) % 360 + 360) % 360 - 180; }

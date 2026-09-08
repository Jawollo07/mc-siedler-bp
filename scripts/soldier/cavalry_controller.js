import { system } from "@minecraft/server";
import { SOLDIERS, SOLDIER_CONFIG } from "./config.js";

const TICK_INTERVAL = 1;
const MOVE_IMPULSE = 0.032;
const BRAKE_IMPULSE = 0.08;
const MAX_SPEED = 0.62;
const TURN_RESPONSE = 0.3;
const MOUNT_SEARCH_RADIUS = 7;

let started = false;

/**
 * Dedicated mounted movement layer.
 * The normal Soldier pathfinder operates on the rider entity. A horse must be
 * steered from the mount itself, otherwise the two movement systems can fight
 * each other and cause cavalry to stall, orbit targets or move backwards.
 */
export function startCavalryController() {
    if (started) return;
    started = true;
    system.runInterval(updateCavalry, TICK_INTERVAL);
    console.info("[Soldier Cavalry] Dedicated mount controller enabled");
}

function updateCavalry() {
    for (const soldier of SOLDIERS.values()) {
        if (soldier?.type !== "cavalry") continue;
        if (!soldier.entity?.isValid) continue;
        if (soldier.phase !== SOLDIER_CONFIG.STATES.MOVE) continue;

        const mount = getMount(soldier);
        if (!mount) continue;

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

        // The A* module is intentionally disabled for cavalry while mounted.
        // This prevents rider-based waypoints from overwriting mount steering.
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
            mount.setRotation?.({ x: rotation.x * 0.8, y: rotation.y + delta * TURN_RESPONSE });

            const velocity = mount.getVelocity?.() ?? { x: 0, z: 0 };
            const speed = Math.hypot(velocity.x ?? 0, velocity.z ?? 0);
            if (speed < MAX_SPEED) {
                mount.applyImpulse?.({ x: x * MOVE_IMPULSE, y: 0, z: z * MOVE_IMPULSE });
            } else if (speed > MAX_SPEED * 1.2) {
                mount.applyImpulse?.({ x: -(velocity.x ?? 0) * BRAKE_IMPULSE, y: 0, z: -(velocity.z ?? 0) * BRAKE_IMPULSE });
            }
        } catch {}
    }
}

function getTarget(soldier, mount) {
    if (!soldier.targetId) return null;
    try {
        return mount.dimension.getEntities({ location: mount.location, maxDistance: 32 })
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

function normalizeAngle(angle) {
    return ((angle + 180) % 360 + 360) % 360 - 180;
}

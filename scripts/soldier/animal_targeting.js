import { system } from "@minecraft/server";
import { SOLDIERS, SOLDIER_CONFIG } from "./config.js";

const ANIMAL_TYPES = new Set([
    "minecraft:cow",
    "minecraft:mooshroom",
    "minecraft:pig",
    "minecraft:sheep",
    "minecraft:chicken",
    "minecraft:rabbit",
    "minecraft:horse",
    "minecraft:donkey",
    "minecraft:mule",
    "minecraft:llama",
    "minecraft:trader_llama",
    "minecraft:camel",
    "minecraft:sniffer",
    "minecraft:goat",
    "minecraft:polar_bear",
    "minecraft:panda",
    "minecraft:fox",
    "minecraft:wolf",
    "minecraft:cat",
    "minecraft:ocelot",
    "minecraft:turtle",
    "minecraft:dolphin",
    "minecraft:squid",
    "minecraft:glow_squid",
    "minecraft:axolotl",
    "minecraft:frog",
    "minecraft:tadpole",
    "minecraft:bee",
    "minecraft:parrot",
    "minecraft:armadillo",
    "minecraft:camel_husk"
]);

const SEARCH_RADIUS = SOLDIER_CONFIG.SEARCH_RADIUS;
const TARGET_INTERVAL_TICKS = Math.max(5, SOLDIER_CONFIG.TARGET_INTERVAL);

let started = false;

/**
 * Explicit passive/neutral animal targeting.
 *
 * The main Soldier AI intentionally has conservative target filtering. This
 * helper makes ordinary animals valid autonomous targets without opening the
 * target list to villagers, traders, players or arbitrary NPC entities.
 */
export function startAnimalTargeting() {
    if (started) return;
    started = true;
    system.runInterval(updateAnimalTargets, TARGET_INTERVAL_TICKS);
    console.info("[Soldier Animals] Passive/neutral animal targeting enabled");
}

function updateAnimalTargets() {
    for (const [, soldier] of SOLDIERS) {
        try {
            if (!soldier?.entity?.isValid) continue;
            if (soldier.command) continue;
            if (soldier.targetId) continue;
            if (soldier.phase !== SOLDIER_CONFIG.STATES.IDLE) continue;

            const target = findNearestAnimal(soldier);
            if (!target) continue;

            soldier.targetId = target.id;
            soldier.nextTargetSearch = Date.now() + 1000;
        } catch (error) {
            console.warn(`[Soldier Animals] Target search failed: ${formatError(error)}`);
        }
    }
}

function findNearestAnimal(soldier) {
    const entity = soldier.entity;
    let best = null;
    let bestDistance = Infinity;

    try {
        for (const candidate of entity.dimension.getEntities({
            location: entity.location,
            maxDistance: SEARCH_RADIUS
        })) {
            if (!candidate?.isValid || candidate.id === entity.id) continue;
            if (!ANIMAL_TYPES.has(candidate.typeId)) continue;
            if (candidate.hasTag?.("soldier_mount")) continue;
            if (candidate.hasTag?.("siedler_no_target")) continue;
            if (isDead(candidate)) continue;

            const distance = distanceSquared(entity.location, candidate.location);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = candidate;
            }
        }
    } catch (error) {
        console.warn(`[Soldier Animals] Entity scan failed: ${formatError(error)}`);
    }

    return best;
}

function isDead(entity) {
    try {
        return (entity.getComponent("minecraft:health")?.currentValue ?? 1) <= 0;
    } catch {
        return false;
    }
}

function distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
}

function formatError(error) {
    return error instanceof Error ? error.message : String(error);
}

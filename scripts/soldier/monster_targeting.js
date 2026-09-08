import { system } from "@minecraft/server";
import { SOLDIERS, SOLDIER_CONFIG } from "./config.js";

// Explicit hostile-mob whitelist. Passive/neutral animals are deliberately excluded.
const MONSTER_TYPES = new Set([
    "minecraft:zombie",
    "minecraft:zombie_villager",
    "minecraft:husk",
    "minecraft:drowned",
    "minecraft:skeleton",
    "minecraft:stray",
    "minecraft:bogged",
    "minecraft:wither_skeleton",
    "minecraft:creeper",
    "minecraft:spider",
    "minecraft:cave_spider",
    "minecraft:silverfish",
    "minecraft:endermite",
    "minecraft:enderman",
    "minecraft:witch",
    "minecraft:phantom",
    "minecraft:slime",
    "minecraft:magma_cube",
    "minecraft:blaze",
    "minecraft:ghast",
    "minecraft:guardian",
    "minecraft:elder_guardian",
    "minecraft:shulker",
    "minecraft:pillager",
    "minecraft:vindicator",
    "minecraft:evocation_illager",
    "minecraft:vex",
    "minecraft:ravager",
    "minecraft:piglin",
    "minecraft:piglin_brute",
    "minecraft:zombified_piglin",
    "minecraft:hoglin",
    "minecraft:zoglin",
    "minecraft:warden",
    "minecraft:breeze"
]);

const SEARCH_RADIUS = SOLDIER_CONFIG.SEARCH_RADIUS;
const TARGET_INTERVAL_TICKS = Math.max(5, SOLDIER_CONFIG.TARGET_INTERVAL);
let started = false;

export function startMonsterTargeting() {
    if (started) return;
    started = true;
    system.runInterval(updateMonsterTargets, TARGET_INTERVAL_TICKS);
    console.info("[Soldier Monsters] Hostile monster targeting enabled");
}

function updateMonsterTargets() {
    for (const [, soldier] of SOLDIERS) {
        try {
            if (!soldier?.entity?.isValid) continue;
            if (soldier.command) continue;
            if (soldier.targetId) continue;
            if (soldier.phase !== SOLDIER_CONFIG.STATES.IDLE) continue;

            const target = findNearestMonster(soldier);
            if (!target) continue;

            soldier.targetId = target.id;
            soldier.nextTargetSearch = Date.now() + 1000;
        } catch (error) {
            console.warn(`[Soldier Monsters] Target search failed: ${formatError(error)}`);
        }
    }
}

function findNearestMonster(soldier) {
    const entity = soldier.entity;
    let best = null;
    let bestDistance = Infinity;

    try {
        for (const candidate of entity.dimension.getEntities({
            location: entity.location,
            maxDistance: SEARCH_RADIUS
        })) {
            if (!candidate?.isValid || candidate.id === entity.id) continue;
            if (!MONSTER_TYPES.has(candidate.typeId)) continue;
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
        console.warn(`[Soldier Monsters] Entity scan failed: ${formatError(error)}`);
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

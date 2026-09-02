import { system, world } from "@minecraft/server";

/**
 * Market places are protected areas where hostile entities are not allowed.
 *
 * Configure additional markets by adding entries to MARKET_PLACES.
 */
export const MARKET_PLACES = [
    {
        id: "main_market",
        enabled: true,
        dimension: "overworld",
        center: {
            x: 100,
            y: 64,
            z: 200
        },
        radius: 32
    }
];

const DIMENSION_IDS = {
    overworld: "minecraft:overworld",
    nether: "minecraft:nether",
    the_end: "minecraft:the_end"
};

function distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return dx * dx + dz * dz;
}

function normalizeDimensionId(dimensionId) {
    return dimensionId?.startsWith("minecraft:")
        ? dimensionId.substring("minecraft:".length)
        : dimensionId;
}

/**
 * Returns the market containing the given location, or null if there is none.
 */
export function getMarketAt(location, dimensionId = "overworld") {
    const normalizedDimension = normalizeDimensionId(dimensionId);

    for (const market of MARKET_PLACES) {
        if (!market.enabled) continue;
        if (market.dimension !== normalizedDimension) continue;

        if (
            distanceSquared(location, market.center) <=
            market.radius * market.radius
        ) {
            return market;
        }
    }

    return null;
}

/**
 * Returns true when an entity is currently inside a configured market.
 */
export function isInMarket(entity) {
    if (!entity?.isValid) return false;

    return getMarketAt(
        entity.location,
        entity.dimension?.id
    ) !== null;
}

/**
 * Removes a hostile/monster entity when it is inside a market.
 *
 * The monster family is deliberately used instead of the generic mob family.
 * This keeps villagers, animals and Siedler soldiers unaffected.
 */
export function removeMonsterFromMarket(entity) {
    try {
        if (!entity?.isValid) return false;
        if (!entity.matches({ families: ["monster"] })) return false;
        if (!isInMarket(entity)) return false;

        entity.remove();
        return true;
    } catch (error) {
        console.warn(`[Market] Failed to remove monster: ${error}`);
        return false;
    }
}

/**
 * Removes all existing monsters from every configured market.
 *
 * This is a fallback for monsters that enter a market after spawning and for
 * monsters spawned by systems that do not use the normal monster spawn path.
 */
export function cleanupMarketMonsters() {
    for (const market of MARKET_PLACES) {
        if (!market.enabled) continue;

        try {
            const dimension = world.getDimension(market.dimension);
            const monsters = dimension.getEntities({
                location: market.center,
                maxDistance: market.radius,
                families: ["monster"]
            });

            for (const monster of monsters) {
                removeMonsterFromMarket(monster);
            }
        } catch (error) {
            console.warn(
                `[Market] Failed to check market ${market.id}: ${error}`
            );
        }
    }
}

/**
 * Remove newly spawned monsters immediately.
 *
 * This also covers monsters created directly by pillager squads, outpost
 * raids and other modules through Dimension.spawnEntity().
 */
if (world.afterEvents?.entitySpawn) {
    world.afterEvents.entitySpawn.subscribe(({ entity }) => {
        removeMonsterFromMarket(entity);
    });
}

// Run once every second as a safety net for monsters that walk/fly into a market.
system.runInterval(cleanupMarketMonsters, 20);

console.info("§a[Market] Monster-free market protection loaded");

import { system, world } from "@minecraft/server";

/**
 * Market places are protected rectangular areas where hostile entities are
 * not allowed.
 *
 * Coordinates describe the two opposite corners of the market. Y is ignored
 * for the protection check, so the complete vertical area is protected.
 */
export const MARKET_PLACES = [
    {
        id: "markt",
        enabled: true,
        dimension: "overworld",
        min: {
            x: 36,
            y: 106,
            z: 67
        },
        max: {
            x: -18,
            y: 106,
            z: 13
        }
    }
];

function normalizeDimensionId(dimensionId) {
    return dimensionId?.startsWith("minecraft:")
        ? dimensionId.substring("minecraft:".length)
        : dimensionId;
}

function isInsideRectangle(location, min, max) {
    const minX = Math.min(min.x, max.x);
    const maxX = Math.max(min.x, max.x);
    const minZ = Math.min(min.z, max.z);
    const maxZ = Math.max(min.z, max.z);

    return (
        location.x >= minX &&
        location.x <= maxX &&
        location.z >= minZ &&
        location.z <= maxZ
    );
}

/**
 * Returns the market containing the given location, or null if there is none.
 */
export function getMarketAt(location, dimensionId = "overworld") {
    const normalizedDimension = normalizeDimensionId(dimensionId);

    for (const market of MARKET_PLACES) {
        if (!market.enabled) continue;
        if (market.dimension !== normalizedDimension) continue;

        if (isInsideRectangle(location, market.min, market.max)) {
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
export function disableBlockBreakingInMarkets() {
    if (!world.beforeEvents?.blockBreak) return;

    world.beforeEvents.blockBreak.subscribe((event) => {
        const player = event.player;
        if (!player?.isValid) return;

        const market = getMarketAt(player.location, player.dimension?.id);
        if (!market) return;

        event.cancel = true;
        try {
            player.sendMessage(
                `§8[§6Market§8]§r §cDu kannst in diesem Bereich keine Blöcke abbauen.`
            );
        } catch {}
    });
}
export function disableBlockPlacingInMarkets() {
    if (!world.beforeEvents?.blockPlace) return;

    world.beforeEvents.blockPlace.subscribe((event) => {
        const player = event.player;
        if (!player?.isValid) return;

        const market = getMarketAt(player.location, player.dimension?.id);
        if (!market) return;

        event.cancel = true;
        try {
            player.sendMessage(
                `§8[§6Market§8]§r §cDu kannst in diesem Bereich keine Blöcke platzieren.`
            );
        } catch {}
    });
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
 */
export function cleanupMarketMonsters() {
    for (const market of MARKET_PLACES) {
        if (!market.enabled) continue;

        try {
            const dimension = world.getDimension(market.dimension);
            const minX = Math.min(market.min.x, market.max.x);
            const maxX = Math.max(market.min.x, market.max.x);
            const minZ = Math.min(market.min.z, market.max.z);
            const maxZ = Math.max(market.min.z, market.max.z);

            const monsters = dimension.getEntities({
                location: {
                    x: (minX + maxX) / 2,
                    y: market.min.y ?? 0,
                    z: (minZ + maxZ) / 2
                },
                maxDistance: Math.max(maxX - minX, maxZ - minZ),
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
 */
if (world.afterEvents?.entitySpawn) {
    world.afterEvents.entitySpawn.subscribe(({ entity }) => {
        removeMonsterFromMarket(entity);
    });
}

// Run once every second as a safety net for monsters that walk/fly into a market.
system.runInterval(cleanupMarketMonsters, 20);

console.info("§a[Market] Rectangular monster-free market protection loaded");

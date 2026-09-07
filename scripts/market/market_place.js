import { system, world } from "@minecraft/server";
import { createLogger } from "../core/logger.js";

const logger = createLogger("Market");

/**
 * Market places are protected rectangular areas where hostile entities are
 * not allowed and players cannot modify blocks.
 *
 * Coordinates describe the two opposite corners of the market. Y is ignored
 * for the protection check, so the complete vertical area is protected.
 */
export const MARKET_PLACES = [
    {
        id: "markt",
        enabled: true,
        dimension: "overworld",
        min: { x: 36, y: 106, z: 67 },
        max: { x: -18, y: 106, z: 13 }
    }
];

function normalizeDimensionId(dimensionId) {
    return dimensionId?.startsWith("minecraft:") ? dimensionId.substring("minecraft:".length) : dimensionId;
}

function isInsideRectangle(location, min, max) {
    const minX = Math.min(min.x, max.x);
    const maxX = Math.max(min.x, max.x);
    const minZ = Math.min(min.z, max.z);
    const maxZ = Math.max(min.z, max.z);
    return location.x >= minX && location.x <= maxX && location.z >= minZ && location.z <= maxZ;
}

export function getMarketAt(location, dimensionId = "overworld") {
    const normalizedDimension = normalizeDimensionId(dimensionId);
    for (const market of MARKET_PLACES) {
        if (!market.enabled || market.dimension !== normalizedDimension) continue;
        if (isInsideRectangle(location, market.min, market.max)) return market;
    }
    return null;
}

export function isInMarket(entity) {
    if (!entity?.isValid) return false;
    return getMarketAt(entity.location, entity.dimension?.id) !== null;
}

function sendMarketMessage(player, message) {
    try { player.sendMessage(`§8[§6Market§8]§r §c${message}`); } catch {}
}

export function disableBlockBreakingInMarkets() {
    const event = world.beforeEvents?.playerBreakBlock;
    if (!event || typeof event.subscribe !== "function") {
        logger.warn("playerBreakBlock-API nicht verfügbar; Abbau-Schutz deaktiviert.");
        return;
    }
    event.subscribe((eventData) => {
        const player = eventData.player;
        if (!player?.isValid) return;
        const market = getMarketAt(eventData.block.location, player.dimension?.id);
        if (!market) return;
        eventData.cancel = true;
        logger.debug(`Abbau blockiert: player=${player.id}, market=${market.id}`);
        sendMarketMessage(player, "Du kannst in diesem Bereich keine Blöcke abbauen.");
    });
}

export function disableBlockPlacingInMarkets() {
    const event = world.beforeEvents?.playerPlaceBlock;
    if (!event || typeof event.subscribe !== "function") {
        logger.warn("playerPlaceBlock-API nicht verfügbar; Platzierungs-Schutz deaktiviert.");
        return;
    }
    event.subscribe((eventData) => {
        const player = eventData.player;
        if (!player?.isValid) return;
        const market = getMarketAt(eventData.block.location, player.dimension?.id);
        if (!market) return;
        eventData.cancel = true;
        logger.debug(`Platzierung blockiert: player=${player.id}, market=${market.id}`);
        sendMarketMessage(player, "Du kannst in diesem Bereich keine Blöcke platzieren.");
    });
}

export function removeMonsterFromMarket(entity) {
    try {
        if (!entity?.isValid || !entity.matches({ families: ["monster"] }) || !isInMarket(entity)) return false;
        entity.remove();
        logger.debug(`Monster aus Marktplatz entfernt: type=${entity.typeId}`);
        return true;
    } catch (error) {
        logger.exception("Monster konnte nicht aus dem Marktplatz entfernt werden", error);
        return false;
    }
}

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
                location: { x: (minX + maxX) / 2, y: market.min.y ?? 0, z: (minZ + maxZ) / 2 },
                maxDistance: Math.max(maxX - minX, maxZ - minZ),
                families: ["monster"]
            });
            for (const monster of monsters) removeMonsterFromMarket(monster);
        } catch (error) {
            logger.exception(`Marktplatz ${market.id} konnte nicht geprüft werden`, error);
        }
    }
}

if (world.afterEvents?.entitySpawn) {
    world.afterEvents.entitySpawn.subscribe(({ entity }) => removeMonsterFromMarket(entity));
}

system.runInterval(cleanupMarketMonsters, 20);
logger.success("Monster-freier Marktplatzschutz geladen");

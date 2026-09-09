import {
    system,
    world,
    CustomCommandParamType,
    CustomCommandStatus,
    CommandPermissionLevel
} from "@minecraft/server";

import { createLogger } from "../core/logger.js";
import { MARKET_PLACES } from "./market_place.js";

const logger = createLogger("Market:Trader");

const TRADER_TYPE = "siedler:trader";
const OP_PERMISSION = CommandPermissionLevel.GameDirectors;

const AUTO_TRADER_INTERVAL = 200;
const AUTO_TRADER_INITIAL_DELAY = 40;
const TRADER_CONFINEMENT_INTERVAL = 20;
const UNLOADED_RETRY_LOG_INTERVAL = 1200;
let lastUnloadedLogTick = -UNLOADED_RETRY_LOG_INTERVAL;

const TRADER_TYPES = {
    food: { event: "siedler:set_food", name: "§aLebensmittelhändler", tag: "trader_food", variant: 0 },
    building: { event: "siedler:set_building", name: "§6Baustoffhändler", tag: "trader_building", variant: 1 },
    resources: { event: "siedler:set_resources", name: "§7Rohstoffhändler", tag: "trader_resources", variant: 2 },
    tools: { event: "siedler:set_tools", name: "§bWerkzeughändler", tag: "trader_tools", variant: 3 },
    weapons: { event: "siedler:set_weapons", name: "§cWaffenhändler", tag: "trader_weapons", variant: 4 },
    supplies: { event: "siedler:set_supplies", name: "§dVersorgungshändler", tag: "trader_supplies", variant: 5 },
    soldiers: { event: "siedler:set_soldiers", name: "§cSoldatenhändler", tag: "soldier_trader", variant: 6 },
    enchantments: { event: "siedler:set_enchantments", name: "§5Verzauberungshändler", tag: "trader_enchantments", variant: 7 }
};

const TRADER_TYPE_KEYS = Object.keys(TRADER_TYPES);
const VARIANT_TO_TYPE = Object.fromEntries(
    TRADER_TYPE_KEYS.map(type => [TRADER_TYPES[type].variant, type])
);

function playerOnly(origin) {
    try {
        const player = origin.sourceEntity;
        return player?.typeId === "minecraft:player" ? player : null;
    } catch {
        return null;
    }
}

function reply(player, message) {
    try {
        player.sendMessage(`§8[§bHändler§8]§r ${message}`);
    } catch {}
}

function getTraderVariant(trader) {
    if (!trader?.isValid || trader.typeId !== TRADER_TYPE) return null;
    try {
        const value = trader.getComponent("minecraft:variant")?.value;
        return Number.isInteger(value) ? value : null;
    } catch {
        return null;
    }
}

function getTraderType(trader) {
    const variant = getTraderVariant(trader);
    return variant === null ? null : VARIANT_TO_TYPE[variant] ?? null;
}

function hasTraderRole(trader) {
    return getTraderType(trader) !== null;
}

function traderHasRole(trader, type) {
    if (!TRADER_TYPES[type] || !trader?.isValid) return false;

    // Variant is the authoritative role identifier because it is persisted
    // by the entity component groups across reloads. Tags are only legacy data.
    if (getTraderType(trader) === type) return true;

    try {
        return trader.hasTag(TRADER_TYPES[type].tag);
    } catch {
        return false;
    }
}

function applyTraderType(trader, type) {
    const config = TRADER_TYPES[type];
    if (!config || !trader?.isValid) return false;

    try {
        trader.triggerEvent(config.event);
        try {
            if (config.tag && !trader.hasTag(config.tag)) trader.addTag(config.tag);
        } catch {}
        try {
            trader.nameTag = config.name;
        } catch {}
        return true;
    } catch (error) {
        logger.warn(`Typ ${type} konnte nicht angewendet werden: ${error}`);
        return false;
    }
}

function isLocationLoadedAndTicking(dimension, location) {
    if (!dimension || !location) return false;

    try {
        const block = dimension.getBlock({
            x: Math.floor(location.x),
            y: Math.floor(location.y),
            z: Math.floor(location.z)
        });
        return !!block;
    } catch (error) {
        const message = String(error);
        if (
            message.includes("LocationInUnloadedChunkError") ||
            message.includes("not in a chunk currently loaded")
        ) {
            return false;
        }
        logger.debug(`Markt-Chunk konnte nicht geprüft werden: ${error}`);
        return false;
    }
}

function isInsideMarket(location, market) {
    if (!location || !market) return false;

    const minX = Math.min(market.min.x, market.max.x);
    const maxX = Math.max(market.min.x, market.max.x);
    const minZ = Math.min(market.min.z, market.max.z);
    const maxZ = Math.max(market.min.z, market.max.z);

    return (
        location.x >= minX && location.x <= maxX &&
        location.z >= minZ && location.z <= maxZ
    );
}

function getAutomaticTraderLocation(market, index, total) {
    const configured = market.traderSpawn;
    const centerX = configured?.x ?? ((market.min.x + market.max.x) / 2);
    const centerY = configured?.y ?? ((market.min.y ?? 0) + 1);
    const centerZ = configured?.z ?? ((market.min.z + market.max.z) / 2);

    const radius = Math.max(2.5, Math.min(5, total * 0.55));
    const angle = (Math.PI * 2 * index) / Math.max(1, total);

    return {
        x: centerX + Math.cos(angle) * radius,
        y: centerY,
        z: centerZ + Math.sin(angle) * radius
    };
}

function getTraderEntities(dimension) {
    try {
        return dimension.getEntities({ type: TRADER_TYPE });
    } catch (error) {
        logger.debug(`Händler konnten nicht gesucht werden: ${error}`);
        return [];
    }
}

function getMarketForTrader(trader) {
    if (!trader?.isValid) return null;

    const dimensionId = trader.dimension?.id;
    const markets = MARKET_PLACES.filter(
        market => market.enabled && market.dimension === dimensionId
    );

    if (!markets.length) return null;

    const inside = markets.find(market => isInsideMarket(trader.location, market));
    if (inside) return inside;

    let nearest = null;
    let nearestDistance = Infinity;

    for (const market of markets) {
        const spawn = market.traderSpawn ?? {
            x: (market.min.x + market.max.x) / 2,
            y: (market.min.y ?? 0) + 1,
            z: (market.min.z + market.max.z) / 2
        };

        const dx = trader.location.x - spawn.x;
        const dz = trader.location.z - spawn.z;
        const distance = dx * dx + dz * dz;

        if (distance < nearestDistance) {
            nearest = market;
            nearestDistance = distance;
        }
    }

    return nearest;
}

function confineTrader(trader) {
    if (!trader?.isValid || trader.typeId !== TRADER_TYPE || !hasTraderRole(trader)) {
        return false;
    }

    const market = getMarketForTrader(trader);
    if (!market || isInsideMarket(trader.location, market)) return false;

    const target = getAutomaticTraderLocation(market, 0, 1);

    if (!isLocationLoadedAndTicking(trader.dimension, target)) return false;

    try {
        trader.teleport(target, {
            dimension: trader.dimension,
            keepVelocity: false
        });
        logger.debug(`Händler ${getTraderType(trader) ?? "unknown"} zurück auf Marktplatz teleportiert.`);
        return true;
    } catch (error) {
        const message = String(error);
        if (
            !message.includes("LocationInUnloadedChunkError") &&
            !message.includes("not in a chunk currently loaded")
        ) {
            logger.warn(`Händler konnte nicht auf den Marktplatz zurückgesetzt werden: ${error}`);
        }
        return false;
    }
}

function confineAllTraders() {
    for (const dimensionId of ["overworld", "nether", "the_end"]) {
        try {
            const dimension = world.getDimension(dimensionId);
            for (const trader of getTraderEntities(dimension)) {
                confineTrader(trader);
            }
        } catch (error) {
            logger.debug(`Händler-Eingrenzung ${dimensionId} fehlgeschlagen: ${error}`);
        }
    }
}

function spawnTraderAt(dimension, type, location, automatic = false) {
    const config = TRADER_TYPES[type];
    if (!config) return null;

    if (!isLocationLoadedAndTicking(dimension, location)) {
        const tick = system.currentTick ?? 0;
        if (!automatic || tick - lastUnloadedLogTick >= UNLOADED_RETRY_LOG_INTERVAL) {
            logger.debug(`Spawn verschoben: type=${type}, Markt-Chunk ist aktuell nicht geladen/tickend.`);
            lastUnloadedLogTick = tick;
        }
        return null;
    }

    try {
        const trader = dimension.spawnEntity(TRADER_TYPE, location);

        system.run(() => {
            if (!trader?.isValid) return;
            if (!applyTraderType(trader, type)) {
                logger.warn(`Händler konnte nicht initialisiert werden: type=${type}`);
                return;
            }
            logger.info(`${automatic ? "Automatischer Händler-Spawn" : "Händler gespawnt"}: type=${type}`);
        });

        return trader;
    } catch (error) {
        const message = String(error);
        if (
            message.includes("LocationInUnloadedChunkError") ||
            message.includes("not in a chunk currently loaded")
        ) return null;

        logger.warn(`Spawn fehlgeschlagen: type=${type}, error=${error}`);
        return null;
    }
}

function spawnTrader(player, type, location) {
    const config = TRADER_TYPES[type];
    if (!config) {
        reply(player, `§cUnbekannter Typ: ${type}`);
        reply(player, `§7Verfügbar: ${TRADER_TYPE_KEYS.join(", ")}`);
        return;
    }

    const market = MARKET_PLACES.find(candidate =>
        candidate.enabled &&
        candidate.dimension === player.dimension?.id &&
        isInsideMarket(location, candidate)
    );

    if (!market) {
        reply(player, "§cHändler können nur innerhalb eines Marktplatzes gespawnt werden.");
        return;
    }

    const trader = spawnTraderAt(player.dimension, type, location, false);
    if (!trader) {
        reply(player, "§cHändler konnte nicht gespawnt werden. Der Chunk ist möglicherweise noch nicht geladen.");
        return;
    }

    system.run(() => {
        try {
            if (trader.isValid) reply(player, `§a${config.name} §agespawnt.`);
        } catch {}
    });
}

function maintainMarketTraders() {
    for (const market of MARKET_PLACES) {
        if (!market.enabled) continue;

        try {
            const dimension = world.getDimension(market.dimension);
            const traders = getTraderEntities(dimension);
            const targetPerType = Math.max(1, Number(market.traderCountPerType ?? 1));

            // Erst alle vorhandenen Händler sichern, damit sie nicht hinauslaufen.
            for (const trader of traders) confineTrader(trader);

            // Alte Händler ohne erkennbare Variante werden einmalig zu Food repariert.
            for (const trader of traders) {
                if (!hasTraderRole(trader)) applyTraderType(trader, "food");
            }

            const roleCounts = Object.fromEntries(
                TRADER_TYPE_KEYS.map(type => [type, 0])
            );

            for (const trader of traders) {
                if (!trader?.isValid || trader.dimension?.id !== market.dimension) continue;
                if (!isInsideMarket(trader.location, market)) continue;

                const type = getTraderType(trader);
                if (!type) continue;

                roleCounts[type]++;
            }

            let spawnIndex = 0;
            const totalTypes = TRADER_TYPE_KEYS.length;

            for (const type of TRADER_TYPE_KEYS) {
                while (roleCounts[type] < targetPerType) {
                    const location = getAutomaticTraderLocation(
                        market,
                        spawnIndex % totalTypes,
                        totalTypes
                    );

                    const trader = spawnTraderAt(dimension, type, location, true);
                    if (!trader) break;

                    roleCounts[type]++;
                    spawnIndex++;
                }
            }
        } catch (error) {
            const message = String(error);
            if (
                !message.includes("LocationInUnloadedChunkError") &&
                !message.includes("not in a chunk currently loaded")
            ) {
                logger.warn(`Automatische Händler-Wartung für ${market.id} fehlgeschlagen: ${error}`);
            }
        }
    }
}

if (world.afterEvents?.entitySpawn?.subscribe) {
    world.afterEvents.entitySpawn.subscribe(({ entity }) => {
        if (entity?.typeId !== TRADER_TYPE) return;

        system.run(() => {
            try {
                if (!hasTraderRole(entity)) applyTraderType(entity, "food");
                confineTrader(entity);
            } catch (error) {
                logger.debug(`Spawn-Initialisierung fehlgeschlagen: ${error}`);
            }
        });
    });
}

system.runInterval(() => {
    for (const dimensionId of ["overworld", "nether", "the_end"]) {
        try {
            const dimension = world.getDimension(dimensionId);
            for (const trader of getTraderEntities(dimension)) {
                if (!hasTraderRole(trader)) applyTraderType(trader, "food");
            }
        } catch (error) {
            logger.debug(`Trader-Recovery ${dimensionId} fehlgeschlagen: ${error}`);
        }
    }
}, 200);

system.beforeEvents.startup.subscribe(event => {
    const registry = event.customCommandRegistry;

    registry.registerCommand({
        name: "siedler:trader",
        description: "Spawnt einen vordefinierten Händler.",
        permissionLevel: OP_PERMISSION,
        cheatsRequired: false,
        mandatoryParameters: [{ name: "type", type: CustomCommandParamType.String }]
    }, (origin, type) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => spawnTrader(player, String(type).toLowerCase(), player.location));
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({
        name: "siedler:trader_here",
        description: "Spawnt einen Händler vor dir.",
        permissionLevel: OP_PERMISSION,
        cheatsRequired: false,
        mandatoryParameters: [{ name: "type", type: CustomCommandParamType.String }]
    }, (origin, type) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        system.run(() => {
            const rotation = player.getRotation();
            const yaw = (rotation.y + 90) * Math.PI / 180;
            spawnTrader(player, String(type).toLowerCase(), {
                x: player.location.x + Math.cos(yaw) * 2,
                y: player.location.y,
                z: player.location.z + Math.sin(yaw) * 2
            });
        });

        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({
        name: "siedler:trader_types",
        description: "Zeigt alle Händlertypen.",
        permissionLevel: OP_PERMISSION,
        cheatsRequired: false
    }, origin => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        reply(player, `§bHändlertypen: §f${TRADER_TYPE_KEYS.join("§7, §f")}`);
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({
        name: "siedler:trader_remove",
        description: "Entfernt alle Siedler-Händler in deiner Dimension.",
        permissionLevel: OP_PERMISSION,
        cheatsRequired: false
    }, origin => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        system.run(() => {
            let removed = 0;
            try {
                for (const trader of player.dimension.getEntities({ type: TRADER_TYPE })) {
                    try {
                        trader.remove();
                        removed++;
                    } catch {}
                }
            } catch (error) {
                logger.warn(`Remove fehlgeschlagen: ${error}`);
            }
            reply(player, `§a${removed} Händler entfernt.`);
        });

        return { status: CustomCommandStatus.Success };
    });
});

logger.success("Händler-Commands, Recovery und automatischer Marktbestand geladen");

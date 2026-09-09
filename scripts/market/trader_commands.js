import { system, world, CustomCommandParamType, CustomCommandStatus, CommandPermissionLevel } from "@minecraft/server";
import { createLogger } from "../core/logger.js";
import { MARKET_PLACES } from "./market_place.js";

const logger = createLogger("Market:Trader");
const TRADER_TYPE = "siedler:trader";
const SOLDIER_TRADER_VARIANT = 6;
const OP_PERMISSION = CommandPermissionLevel.GameDirectors;
const AUTO_TRADER_INTERVAL = 200; // 10 seconds
const AUTO_TRADER_INITIAL_DELAY = 40; // 2 seconds after startup
const TRADER_CONFINEMENT_INTERVAL = 20; // 1 second

const TRADER_TYPES = {
    food: { event: "siedler:set_food", name: "§aLebensmittelhändler", tag: "trader_food" },
    building: { event: "siedler:set_building", name: "§6Baustoffhändler", tag: "trader_building" },
    resources: { event: "siedler:set_resources", name: "§7Rohstoffhändler", tag: "trader_resources" },
    tools: { event: "siedler:set_tools", name: "§bWerkzeughändler", tag: "trader_tools" },
    weapons: { event: "siedler:set_weapons", name: "§cWaffenhändler", tag: "trader_weapons" },
    supplies: { event: "siedler:set_supplies", name: "§dVersorgungshändler", tag: "trader_supplies" },
    soldiers: { event: "siedler:set_soldiers", name: "§cSoldatenhändler", tag: "soldier_trader" },
    enchantments: { event: "siedler:set_enchantments", name: "§5Verzauberungshändler", tag: "trader_enchantments" }
};

const TRADER_TYPE_KEYS = Object.keys(TRADER_TYPES);

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

function isSoldierTrader(trader) {
    if (!trader?.isValid || trader.typeId !== TRADER_TYPE) return false;
    try {
        if (trader.hasTag(TRADER_TYPES.soldiers.tag)) return true;
    } catch {}
    try {
        return trader.getComponent("minecraft:variant")?.value === SOLDIER_TRADER_VARIANT;
    } catch {
        return false;
    }
}

function hasTraderRole(trader) {
    return Object.values(TRADER_TYPES).some(config => {
        try {
            return config.tag && trader.hasTag(config.tag);
        } catch {
            return false;
        }
    }) || isSoldierTrader(trader);
}

function applyTraderType(trader, type) {
    const config = TRADER_TYPES[type];
    if (!config || !trader?.isValid) return false;

    try {
        trader.triggerEvent(config.event);
        if (config.tag && !trader.hasTag(config.tag)) trader.addTag(config.tag);
        try {
            trader.nameTag = config.name;
        } catch {}
        return true;
    } catch (error) {
        logger.warn(`Typ ${type} konnte nicht angewendet werden: ${error}`);
        return false;
    }
}

function spawnTraderAt(dimension, type, location, automatic = false) {
    const config = TRADER_TYPES[type];
    if (!config) return null;

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
        candidate.enabled && candidate.dimension === player.dimension?.id &&
        location.x >= Math.min(candidate.min.x, candidate.max.x) &&
        location.x <= Math.max(candidate.min.x, candidate.max.x) &&
        location.z >= Math.min(candidate.min.z, candidate.max.z) &&
        location.z <= Math.max(candidate.min.z, candidate.max.z)
    );

    if (!market) {
        reply(player, "§cHändler können nur innerhalb eines Marktplatzes gespawnt werden.");
        return;
    }

    const trader = spawnTraderAt(player.dimension, type, location, false);
    if (!trader) {
        reply(player, "§cHändler konnte nicht gespawnt werden.");
        return;
    }

    system.run(() => {
        try {
            if (trader.isValid) reply(player, `§a${config.name} §agespawnt.`);
        } catch {}
    });
}

function getTraderEntities(dimension) {
    try {
        return dimension.getEntities({ type: TRADER_TYPE });
    } catch (error) {
        logger.debug(`Händler konnten nicht gesucht werden: ${error}`);
        return [];
    }
}

function traderHasRole(trader, type) {
    const config = TRADER_TYPES[type];
    if (!config || !trader?.isValid) return false;
    try {
        if (trader.hasTag(config.tag)) return true;
    } catch {}
    if (type === "soldiers") return isSoldierTrader(trader);
    return false;
}

function isInsideMarket(location, market) {
    if (!location || !market) return false;
    const minX = Math.min(market.min.x, market.max.x);
    const maxX = Math.max(market.min.x, market.max.x);
    const minZ = Math.min(market.min.z, market.max.z);
    const maxZ = Math.max(market.min.z, market.max.z);
    return location.x >= minX && location.x <= maxX && location.z >= minZ && location.z <= maxZ;
}

function getAutomaticTraderLocation(market, index, total) {
    const configured = market.traderSpawn;
    const centerX = configured?.x ?? ((market.min.x + market.max.x) / 2);
    const centerY = configured?.y ?? ((market.min.y ?? 0) + 1);
    const centerZ = configured?.z ?? ((market.min.z + market.max.z) / 2);

    // Spread traders around the configured market spawn point instead of
    // putting every entity into the exact same block.
    const radius = Math.max(2.5, Math.min(5, total * 0.55));
    const angle = (Math.PI * 2 * index) / Math.max(1, total);
    return {
        x: centerX + Math.cos(angle) * radius,
        y: centerY,
        z: centerZ + Math.sin(angle) * radius
    };
}

function getMarketForTrader(trader) {
    if (!trader?.isValid) return null;
    const dimensionId = trader.dimension?.id;
    const markets = MARKET_PLACES.filter(market => market.enabled && market.dimension === dimensionId);
    if (markets.length === 0) return null;

    const inside = markets.find(market => isInsideMarket(trader.location, market));
    if (inside) return inside;

    // If a trader somehow leaves the market, return the nearest configured
    // market in this dimension so it can be brought back immediately.
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
    if (!trader?.isValid || trader.typeId !== TRADER_TYPE || !hasTraderRole(trader)) return false;

    const market = getMarketForTrader(trader);
    if (!market || isInsideMarket(trader.location, market)) return false;

    const target = getAutomaticTraderLocation(market, 0, 1);
    try {
        trader.teleport(target, { dimension: trader.dimension, keepVelocity: false });
        logger.debug(`Händler zurück auf den Marktplatz teleportiert: type=${trader.typeId}, market=${market.id}`);
        return true;
    } catch (error) {
        logger.warn(`Händler konnte nicht auf den Marktplatz zurückgesetzt werden: ${error}`);
        return false;
    }
}

function confineAllTraders() {
    for (const dimensionId of ["overworld", "nether", "the_end"]) {
        try {
            const dimension = world.getDimension(dimensionId);
            for (const trader of getTraderEntities(dimension)) confineTrader(trader);
        } catch (error) {
            logger.debug(`Händler-Eingrenzung ${dimensionId} fehlgeschlagen: ${error}`);
        }
    }
}

function maintainMarketTraders() {
    for (const market of MARKET_PLACES) {
        if (!market.enabled) continue;

        try {
            const dimension = world.getDimension(market.dimension);
            const traders = getTraderEntities(dimension);
            const targetPerType = Math.max(1, Number(market.traderCountPerType ?? 1));

            // Keep every configured trader physically inside its market before
            // counting the current stock. This prevents wander-off traders from
            // causing replacement duplicates.
            for (const trader of traders) confineTrader(trader);

            // Initialize old/untyped trader entities first so they can be
            // counted correctly on the next pass instead of creating duplicates.
            for (const trader of traders) {
                if (!hasTraderRole(trader)) applyTraderType(trader, "food");
            }

            const roleCounts = Object.fromEntries(TRADER_TYPE_KEYS.map(type => [type, 0]));
            for (const trader of traders) {
                if (!trader?.isValid || trader.dimension?.id !== market.dimension) continue;
                if (!traderHasRole(trader, "food") && !traderHasRole(trader, "building") && !traderHasRole(trader, "resources") && !traderHasRole(trader, "tools") && !traderHasRole(trader, "weapons") && !traderHasRole(trader, "supplies") && !traderHasRole(trader, "soldiers") && !traderHasRole(trader, "enchantments")) continue;

                // Only count traders that are currently inside this market.
                if (!isInsideMarket(trader.location, market)) continue;

                for (const type of TRADER_TYPE_KEYS) {
                    if (traderHasRole(trader, type)) {
                        roleCounts[type]++;
                        break;
                    }
                }
            }

            let spawnIndex = 0;
            const totalTypes = TRADER_TYPE_KEYS.length;
            for (const type of TRADER_TYPE_KEYS) {
                while (roleCounts[type] < targetPerType) {
                    const location = getAutomaticTraderLocation(market, spawnIndex % totalTypes, totalTypes);
                    const trader = spawnTraderAt(dimension, type, location, true);
                    if (!trader) break;
                    roleCounts[type]++;
                    spawnIndex++;
                }
            }
        } catch (error) {
            logger.warn(`Automatische Händler-Wartung für ${market.id} fehlgeschlagen: ${error}`);
        }
    }
}

// entitySpawn is optional because availability differs between Bedrock Script API versions.
if (world.afterEvents?.entitySpawn?.subscribe) {
    world.afterEvents.entitySpawn.subscribe(({ entity }) => {
        const trader = entity;
        if (trader.typeId !== TRADER_TYPE) return;

        system.run(() => {
            try {
                if (!hasTraderRole(trader)) applyTraderType(trader, "food");
                confineTrader(trader);
            } catch (error) {
                logger.warn(`Spawn-Initialisierung fehlgeschlagen: ${error}`);
            }
        });
    });
} else {
    logger.warn("world.afterEvents.entitySpawn ist in dieser Script-API-Version nicht verfügbar; Händler-Recovery übernimmt die Initialisierung.");
}

// Recovery for runtimes without entitySpawn and cleanup for manually removed/dead traders.
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

// Hard confinement: traders are checked every second and immediately returned
// to the configured market if vanilla AI makes them wander outside.
system.runInterval(confineAllTraders, TRADER_CONFINEMENT_INTERVAL);

// Keep the configured market staffed automatically. Missing or killed traders
// are recreated; existing traders are never duplicated just because the timer runs.
system.runTimeout(maintainMarketTraders, AUTO_TRADER_INITIAL_DELAY);
system.runInterval(maintainMarketTraders, AUTO_TRADER_INTERVAL);

// Custom commands are registered during the system startup event.
// IMPORTANT: startup belongs to system.beforeEvents, not world.beforeEvents.
system.beforeEvents.startup.subscribe((event) => {
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
    }, (origin) => {
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
    }, (origin) => {
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

logger.success("Händler-Commands, Recovery, Marktbestand und Händler-Eingrenzung geladen");

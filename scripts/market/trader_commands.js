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
const SOLDIER_TRADER_VARIANT = 6;

const OP_PERMISSION = CommandPermissionLevel.GameDirectors;

const AUTO_TRADER_INTERVAL = 200; // 10 Sekunden
const AUTO_TRADER_INITIAL_DELAY = 40; // 2 Sekunden
const TRADER_CONFINEMENT_INTERVAL = 20; // 1 Sekunde

// Verhindert Spam, falls der Marktplatz lange nicht geladen ist.
const UNLOADED_RETRY_LOG_INTERVAL = 1200;
let lastUnloadedLogTick = -UNLOADED_RETRY_LOG_INTERVAL;

const TRADER_TYPES = {
    food: {
        event: "siedler:set_food",
        name: "§aLebensmittelhändler",
        tag: "trader_food"
    },

    building: {
        event: "siedler:set_building",
        name: "§6Baustoffhändler",
        tag: "trader_building"
    },

    resources: {
        event: "siedler:set_resources",
        name: "§7Rohstoffhändler",
        tag: "trader_resources"
    },

    tools: {
        event: "siedler:set_tools",
        name: "§bWerkzeughändler",
        tag: "trader_tools"
    },

    weapons: {
        event: "siedler:set_weapons",
        name: "§cWaffenhändler",
        tag: "trader_weapons"
    },

    supplies: {
        event: "siedler:set_supplies",
        name: "§dVersorgungshändler",
        tag: "trader_supplies"
    },

    soldiers: {
        event: "siedler:set_soldiers",
        name: "§cSoldatenhändler",
        tag: "soldier_trader"
    },

    enchantments: {
        event: "siedler:set_enchantments",
        name: "§5Verzauberungshändler",
        tag: "trader_enchantments"
    }
};

const TRADER_TYPE_KEYS = Object.keys(TRADER_TYPES);


/* =========================================================
 * HELPER
 * ========================================================= */

function playerOnly(origin) {
    try {
        const player = origin.sourceEntity;

        return player?.typeId === "minecraft:player"
            ? player
            : null;
    } catch {
        return null;
    }
}


function reply(player, message) {
    try {
        player.sendMessage(`§8[§bHändler§8]§r ${message}`);
    } catch {
        // Spieler eventuell nicht mehr verfügbar.
    }
}


/* =========================================================
 * TRADER IDENTIFICATION
 * ========================================================= */

function isSoldierTrader(trader) {
    if (!trader?.isValid) {
        return false;
    }

    if (trader.typeId !== TRADER_TYPE) {
        return false;
    }

    try {
        if (trader.hasTag(TRADER_TYPES.soldiers.tag)) {
            return true;
        }
    } catch {
        // Ignorieren
    }

    try {
        return trader
            .getComponent("minecraft:variant")
            ?.value === SOLDIER_TRADER_VARIANT;
    } catch {
        return false;
    }
}


function hasTraderRole(trader) {
    if (!trader?.isValid) {
        return false;
    }

    return Object.values(TRADER_TYPES).some(config => {
        try {
            return config.tag && trader.hasTag(config.tag);
        } catch {
            return false;
        }
    }) || isSoldierTrader(trader);
}


function traderHasRole(trader, type) {
    const config = TRADER_TYPES[type];

    if (!config || !trader?.isValid) {
        return false;
    }

    try {
        if (trader.hasTag(config.tag)) {
            return true;
        }
    } catch {
        // Ignorieren
    }

    return type === "soldiers" && isSoldierTrader(trader);
}


/* =========================================================
 * TRADER TYPE
 * ========================================================= */

function applyTraderType(trader, type) {
    const config = TRADER_TYPES[type];

    if (!config || !trader?.isValid) {
        return false;
    }

    try {
        trader.triggerEvent(config.event);

        if (config.tag && !trader.hasTag(config.tag)) {
            trader.addTag(config.tag);
        }

        try {
            trader.nameTag = config.name;
        } catch {
            // NameTag optional.
        }

        return true;
    } catch (error) {
        logger.warn(
            `Typ ${type} konnte nicht angewendet werden: ${error}`
        );

        return false;
    }
}


/* =========================================================
 * CHUNK LOADING CHECK
 * ========================================================= */

/**
 * Prüft, ob sich die Position in einem aktuell geladenen
 * und tickenden Chunk befindet.
 *
 * WICHTIG:
 * getBlock() kann bei einem nicht geladenen Chunk
 * LocationInUnloadedChunkError werfen.
 *
 * Dieser Fehler wird hier absichtlich abgefangen.
 */
function isLocationLoadedAndTicking(dimension, location) {
    if (!dimension || !location) {
        return false;
    }

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

        logger.debug(
            `Markt-Chunk konnte nicht geprüft werden: ${error}`
        );

        return false;
    }
}


/* =========================================================
 * SAFE TRADER SPAWN
 * ========================================================= */

/**
 * Spawnt einen Händler nur dann, wenn der Ziel-Chunk
 * tatsächlich geladen und tickend ist.
 *
 * Bei einem ungeladenen Chunk wird NICHT versucht,
 * spawnEntity() aufzurufen.
 */
function spawnTraderAt(
    dimension,
    type,
    location,
    automatic = false
) {
    const config = TRADER_TYPES[type];

    if (!config) {
        return null;
    }

    /*
     * FIX:
     *
     * Vorher:
     * dimension.spawnEntity(...)
     *
     * ohne Prüfung.
     *
     * Dadurch:
     * LocationInUnloadedChunkError
     *
     * Jetzt wird der Chunk zuerst geprüft.
     */
    if (!isLocationLoadedAndTicking(dimension, location)) {
        const tick = system.currentTick ?? 0;

        /*
         * Automatische Spawns sollen nicht jede Sekunde
         * dieselbe Warnung schreiben.
         */
        if (
            !automatic ||
            tick - lastUnloadedLogTick >=
                UNLOADED_RETRY_LOG_INTERVAL
        ) {
            logger.debug(
                `Spawn verschoben: type=${type}, ` +
                `Markt-Chunk ist aktuell nicht geladen/tickend.`
            );

            lastUnloadedLogTick = tick;
        }

        return null;
    }

    try {
        const trader = dimension.spawnEntity(
            TRADER_TYPE,
            location
        );

        /*
         * Initialisierung einen Tick später.
         * Dadurch vermeiden wir unnötige Timing-Probleme
         * direkt während des Entity-Spawns.
         */
        system.run(() => {
            if (!trader?.isValid) {
                return;
            }

            if (!applyTraderType(trader, type)) {
                logger.warn(
                    `Händler konnte nicht initialisiert werden: type=${type}`
                );

                return;
            }

            logger.info(
                `${automatic
                    ? "Automatischer Händler-Spawn"
                    : "Händler gespawnt"
                }: type=${type}`
            );
        });

        return trader;
    } catch (error) {
        const message = String(error);

        /*
         * Sollte der Chunk zwischen Prüfung und spawnEntity()
         * trotzdem entladen worden sein, behandeln wir das
         * ebenfalls als normalen Retry-Fall.
         */
        if (
            message.includes("LocationInUnloadedChunkError") ||
            message.includes("not in a chunk currently loaded")
        ) {
            return null;
        }

        logger.warn(
            `Spawn fehlgeschlagen: type=${type}, error=${error}`
        );

        return null;
    }
}


/* =========================================================
 * MANUAL SPAWN
 * ========================================================= */

function spawnTrader(player, type, location) {
    const config = TRADER_TYPES[type];

    if (!config) {
        reply(
            player,
            `§cUnbekannter Typ: ${type}`
        );

        reply(
            player,
            `§7Verfügbar: ${TRADER_TYPE_KEYS.join(", ")}`
        );

        return;
    }

    /*
     * Händler dürfen nur innerhalb eines Marktplatzes
     * gespawnt werden.
     */
    const market = MARKET_PLACES.find(candidate =>
        candidate.enabled &&
        candidate.dimension === player.dimension?.id &&

        location.x >= Math.min(
            candidate.min.x,
            candidate.max.x
        ) &&

        location.x <= Math.max(
            candidate.min.x,
            candidate.max.x
        ) &&

        location.z >= Math.min(
            candidate.min.z,
            candidate.max.z
        ) &&

        location.z <= Math.max(
            candidate.min.z,
            candidate.max.z
        )
    );

    if (!market) {
        reply(
            player,
            "§cHändler können nur innerhalb eines Marktplatzes gespawnt werden."
        );

        return;
    }

    const trader = spawnTraderAt(
        player.dimension,
        type,
        location,
        false
    );

    if (!trader) {
        reply(
            player,
            "§cHändler konnte nicht gespawnt werden. " +
            "Der Chunk ist möglicherweise noch nicht geladen."
        );

        return;
    }

    system.run(() => {
        try {
            if (trader.isValid) {
                reply(
                    player,
                    `§a${config.name} §agespawnt.`
                );
            }
        } catch {
            // Ignorieren.
        }
    });
}


/* =========================================================
 * ENTITY SEARCH
 * ========================================================= */

function getTraderEntities(dimension) {
    try {
        return dimension.getEntities({
            type: TRADER_TYPE
        });
    } catch (error) {
        logger.debug(
            `Händler konnten nicht gesucht werden: ${error}`
        );

        return [];
    }
}


/* =========================================================
 * MARKET BOUNDS
 * ========================================================= */

function isInsideMarket(location, market) {
    if (!location || !market) {
        return false;
    }

    const minX = Math.min(
        market.min.x,
        market.max.x
    );

    const maxX = Math.max(
        market.min.x,
        market.max.x
    );

    const minZ = Math.min(
        market.min.z,
        market.max.z
    );

    const maxZ = Math.max(
        market.min.z,
        market.max.z
    );

    return (
        location.x >= minX &&
        location.x <= maxX &&
        location.z >= minZ &&
        location.z <= maxZ
    );
}


/* =========================================================
 * AUTOMATIC SPAWN LOCATION
 * ========================================================= */

function getAutomaticTraderLocation(
    market,
    index,
    total
) {
    const configured = market.traderSpawn;

    const centerX =
        configured?.x ??
        ((market.min.x + market.max.x) / 2);

    const centerY =
        configured?.y ??
        ((market.min.y ?? 0) + 1);

    const centerZ =
        configured?.z ??
        ((market.min.z + market.max.z) / 2);

    /*
     * Händler werden kreisförmig um den
     * konfigurierten Spawnpunkt verteilt.
     */
    const radius = Math.max(
        2.5,
        Math.min(5, total * 0.55)
    );

    const angle =
        (Math.PI * 2 * index) /
        Math.max(1, total);

    return {
        x: centerX + Math.cos(angle) * radius,
        y: centerY,
        z: centerZ + Math.sin(angle) * radius
    };
}


/* =========================================================
 * FIND MARKET
 * ========================================================= */

function getMarketForTrader(trader) {
    if (!trader?.isValid) {
        return null;
    }

    const dimensionId = trader.dimension?.id;

    const markets = MARKET_PLACES.filter(
        market =>
            market.enabled &&
            market.dimension === dimensionId
    );

    if (!markets.length) {
        return null;
    }

    /*
     * Zuerst prüfen, ob der Händler bereits
     * innerhalb eines Marktplatzes steht.
     */
    const inside = markets.find(
        market =>
            isInsideMarket(
                trader.location,
                market
            )
    );

    if (inside) {
        return inside;
    }

    /*
     * Wenn der Händler außerhalb steht,
     * den nächstgelegenen Marktplatz suchen.
     */
    let nearest = null;
    let nearestDistance = Infinity;

    for (const market of markets) {
        const spawn =
            market.traderSpawn ?? {
                x:
                    (market.min.x +
                        market.max.x) /
                    2,

                y:
                    (market.min.y ?? 0) + 1,

                z:
                    (market.min.z +
                        market.max.z) /
                    2
            };

        const dx =
            trader.location.x -
            spawn.x;

        const dz =
            trader.location.z -
            spawn.z;

        const distance =
            dx * dx +
            dz * dz;

        if (distance < nearestDistance) {
            nearest = market;
            nearestDistance = distance;
        }
    }

    return nearest;
}


/* =========================================================
 * KEEP TRADER INSIDE MARKET
 * ========================================================= */

function confineTrader(trader) {
    if (
        !trader?.isValid ||
        trader.typeId !== TRADER_TYPE ||
        !hasTraderRole(trader)
    ) {
        return false;
    }

    const market = getMarketForTrader(trader);

    if (!market) {
        return false;
    }

    /*
     * Händler befindet sich bereits korrekt
     * innerhalb des Marktplatzes.
     */
    if (
        isInsideMarket(
            trader.location,
            market
        )
    ) {
        return false;
    }

    const target =
        getAutomaticTraderLocation(
            market,
            0,
            1
        );

    /*
     * Auch beim Teleport prüfen wir den Chunk.
     */
    if (
        !isLocationLoadedAndTicking(
            trader.dimension,
            target
        )
    ) {
        return false;
    }

    try {
        trader.teleport(
            target,
            {
                dimension: trader.dimension,
                keepVelocity: false
            }
        );

        return true;
    } catch (error) {
        const message = String(error);

        if (
            !message.includes(
                "LocationInUnloadedChunkError"
            ) &&
            !message.includes(
                "not in a chunk currently loaded"
            )
        ) {
            logger.warn(
                `Händler konnte nicht auf den Marktplatz ` +
                `zurückgesetzt werden: ${error}`
            );
        }

        return false;
    }
}


function confineAllTraders() {
    for (
        const dimensionId of [
            "overworld",
            "nether",
            "the_end"
        ]
    ) {
        try {
            const dimension =
                world.getDimension(
                    dimensionId
                );

            const traders =
                getTraderEntities(
                    dimension
                );

            for (const trader of traders) {
                confineTrader(trader);
            }
        } catch (error) {
            logger.debug(
                `Händler-Eingrenzung ${dimensionId} ` +
                `fehlgeschlagen: ${error}`
            );
        }
    }
}


/* =========================================================
 * MARKET MAINTENANCE
 * ========================================================= */

function maintainMarketTraders() {
    for (const market of MARKET_PLACES) {
        if (!market.enabled) {
            continue;
        }

        try {
            const dimension =
                world.getDimension(
                    market.dimension
                );

            const traders =
                getTraderEntities(
                    dimension
                );

            const targetPerType =
                Math.max(
                    1,
                    Number(
                        market.traderCountPerType ??
                        1
                    )
                );

            /*
             * Händler innerhalb des Marktplatzes halten.
             */
            for (const trader of traders) {
                confineTrader(trader);
            }

            /*
             * Händler ohne Rolle reparieren.
             */
            for (const trader of traders) {
                if (!hasTraderRole(trader)) {
                    applyTraderType(
                        trader,
                        "food"
                    );
                }
            }

            /*
             * Anzahl je Händlertyp zählen.
             */
            const roleCounts =
                Object.fromEntries(
                    TRADER_TYPE_KEYS.map(
                        type => [type, 0]
                    )
                );

            for (const trader of traders) {
                if (
                    !trader?.isValid ||
                    trader.dimension?.id !==
                        market.dimension
                ) {
                    continue;
                }

                if (
                    !TRADER_TYPE_KEYS.some(
                        type =>
                            traderHasRole(
                                trader,
                                type
                            )
                    )
                ) {
                    continue;
                }

                if (
                    !isInsideMarket(
                        trader.location,
                        market
                    )
                ) {
                    continue;
                }

                for (
                    const type of TRADER_TYPE_KEYS
                ) {
                    if (
                        traderHasRole(
                            trader,
                            type
                        )
                    ) {
                        roleCounts[type]++;
                        break;
                    }
                }
            }

            /*
             * Fehlende Händler erzeugen.
             *
             * Wenn der Chunk nicht geladen ist,
             * bricht der aktuelle Durchlauf für
             * diesen Typ ab.
             *
             * Der nächste Wartungszyklus versucht
             * es automatisch erneut.
             */
            let spawnIndex = 0;

            const totalTypes =
                TRADER_TYPE_KEYS.length;

            for (
                const type of TRADER_TYPE_KEYS
            ) {
                while (
                    roleCounts[type] <
                    targetPerType
                ) {
                    const location =
                        getAutomaticTraderLocation(
                            market,
                            spawnIndex %
                                totalTypes,
                            totalTypes
                        );

                    const trader =
                        spawnTraderAt(
                            dimension,
                            type,
                            location,
                            true
                        );

                    /*
                     * Kein Fehler-Spam:
                     * Bei unloaded chunk einfach
                     * später erneut versuchen.
                     */
                    if (!trader) {
                        break;
                    }

                    roleCounts[type]++;
                    spawnIndex++;
                }
            }
        } catch (error) {
            const message = String(error);

            if (
                !message.includes(
                    "LocationInUnloadedChunkError"
                ) &&
                !message.includes(
                    "not in a chunk currently loaded"
                )
            ) {
                logger.warn(
                    `Automatische Händler-Wartung ` +
                    `für ${market.id} fehlgeschlagen: ${error}`
                );
            }
        }
    }
}


/* =========================================================
 * ENTITY SPAWN RECOVERY
 * ========================================================= */

if (
    world.afterEvents?.entitySpawn?.subscribe
) {
    world.afterEvents.entitySpawn.subscribe(
        ({ entity }) => {
            if (
                entity?.typeId !==
                TRADER_TYPE
            ) {
                return;
            }

            system.run(() => {
                try {
                    if (
                        !hasTraderRole(entity)
                    ) {
                        applyTraderType(
                            entity,
                            "food"
                        );
                    }

                    confineTrader(entity);
                } catch (error) {
                    logger.debug(
                        `Spawn-Initialisierung ` +
                        `fehlgeschlagen: ${error}`
                    );
                }
            });
        }
    );
}


/* =========================================================
 * TRADER RECOVERY
 * ========================================================= */

system.runInterval(() => {
    for (
        const dimensionId of [
            "overworld",
            "nether",
            "the_end"
        ]
    ) {
        try {
            const dimension =
                world.getDimension(
                    dimensionId
                );

            const traders =
                getTraderEntities(
                    dimension
                );

            for (const trader of traders) {
                if (
                    !hasTraderRole(
                        trader
                    )
                ) {
                    applyTraderType(
                        trader,
                        "food"
                    );
                }
            }
        } catch (error) {
            logger.debug(
                `Trader-Recovery ` +
                `${dimensionId} fehlgeschlagen: ${error}`
            );
        }
    }
}, 200);


/* =========================================================
 * SCHEDULED TASKS
 * ========================================================= */

/*
 * Händler alle 1 Sekunde im Marktplatz halten.
 */
system.runInterval(
    confineAllTraders,
    TRADER_CONFINEMENT_INTERVAL
);


/*
 * Erster Händler-Check 2 Sekunden nach
 * dem Start des Behavior Packs.
 */
system.runTimeout(
    maintainMarketTraders,
    AUTO_TRADER_INITIAL_DELAY
);


/*
 * Danach alle 10 Sekunden prüfen.
 *
 * Wichtig:
 * Auch wenn der Marktplatz beim ersten
 * Durchlauf unloaded ist, wird später
 * automatisch erneut versucht.
 */
system.runInterval(
    maintainMarketTraders,
    AUTO_TRADER_INTERVAL
);


/* =========================================================
 * COMMANDS
 * ========================================================= */

system.beforeEvents.startup.subscribe(
    event => {
        const registry =
            event.customCommandRegistry;


        /* -------------------------------------------------
         * /siedler:trader <type>
         * ------------------------------------------------- */

        registry.registerCommand(
            {
                name: "siedler:trader",

                description:
                    "Spawnt einen vordefinierten Händler.",

                permissionLevel:
                    OP_PERMISSION,

                cheatsRequired: false,

                mandatoryParameters: [
                    {
                        name: "type",
                        type:
                            CustomCommandParamType.String
                    }
                ]
            },

            (origin, type) => {
                const player =
                    playerOnly(origin);

                if (!player) {
                    return {
                        status:
                            CustomCommandStatus.Failure
                    };
                }

                system.run(() => {
                    spawnTrader(
                        player,
                        String(
                            type
                        ).toLowerCase(),
                        player.location
                    );
                });

                return {
                    status:
                        CustomCommandStatus.Success
                };
            }
        );


        /* -------------------------------------------------
         * /siedler:trader_here <type>
         * ------------------------------------------------- */

        registry.registerCommand(
            {
                name:
                    "siedler:trader_here",

                description:
                    "Spawnt einen Händler vor dir.",

                permissionLevel:
                    OP_PERMISSION,

                cheatsRequired: false,

                mandatoryParameters: [
                    {
                        name: "type",
                        type:
                            CustomCommandParamType.String
                    }
                ]
            },

            (origin, type) => {
                const player =
                    playerOnly(origin);

                if (!player) {
                    return {
                        status:
                            CustomCommandStatus.Failure
                    };
                }

                system.run(() => {
                    const rotation =
                        player.getRotation();

                    const yaw =
                        (
                            rotation.y +
                            90
                        ) *
                        Math.PI /
                        180;

                    const location = {
                        x:
                            player.location.x +
                            Math.cos(yaw) * 2,

                        y:
                            player.location.y,

                        z:
                            player.location.z +
                            Math.sin(yaw) * 2
                    };

                    spawnTrader(
                        player,
                        String(
                            type
                        ).toLowerCase(),
                        location
                    );
                });

                return {
                    status:
                        CustomCommandStatus.Success
                };
            }
        );


        /* -------------------------------------------------
         * /siedler:trader_types
         * ------------------------------------------------- */

        registry.registerCommand(
            {
                name:
                    "siedler:trader_types",

                description:
                    "Zeigt alle Händlertypen.",

                permissionLevel:
                    OP_PERMISSION,

                cheatsRequired: false
            },

            origin => {
                const player =
                    playerOnly(origin);

                if (!player) {
                    return {
                        status:
                            CustomCommandStatus.Failure
                    };
                }

                reply(
                    player,
                    `§bHändlertypen: §f${TRADER_TYPE_KEYS.join(", ")}`
                );

                return {
                    status:
                        CustomCommandStatus.Success
                };
            }
        );
    }
);

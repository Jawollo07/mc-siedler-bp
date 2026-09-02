import {
    system,
    CustomCommandParamType,
    CustomCommandStatus,
    CommandPermissionLevel
} from "@minecraft/server";

import {
    MARKET_PLACES,
    cleanupMarketMonsters
} from "./market_place.js";

const OP_PERMISSION = CommandPermissionLevel.GameDirectors;

function playerOnly(origin) {
    try {
        const player = origin.sourceEntity;
        if (!player || player.typeId !== "minecraft:player") return null;
        return player;
    } catch {
        return null;
    }
}

function reply(player, message) {
    try {
        player.sendMessage(`§8[§6Market§8]§r ${message}`);
    } catch {}
}

function findMarket(id) {
    return MARKET_PLACES.find((market) => market.id === id);
}

function registerCommand(registry, definition, handler) {
    registry.registerCommand(
        {
            ...definition,
            permissionLevel: OP_PERMISSION,
            cheatsRequired: false
        },
        handler
    );
}

function formatBounds(market) {
    const minX = Math.min(market.min.x, market.max.x);
    const maxX = Math.max(market.min.x, market.max.x);
    const minZ = Math.min(market.min.z, market.max.z);
    const maxZ = Math.max(market.min.z, market.max.z);

    return `X ${Math.round(minX)}..${Math.round(maxX)} | Z ${Math.round(minZ)}..${Math.round(maxZ)}`;
}

system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;

    registerCommand(
        registry,
        {
            name: "siedler:market_status",
            description: "Zeigt alle konfigurierten rechteckigen Marktplätze."
        },
        (origin) => {
            const player = playerOnly(origin);
            if (!player) return { status: CustomCommandStatus.Failure };

            system.run(() => {
                if (MARKET_PLACES.length === 0) {
                    reply(player, "§cKeine Marktplätze konfiguriert.");
                    return;
                }

                reply(player, `§7Marktplätze: §e${MARKET_PLACES.length}`);

                for (const market of MARKET_PLACES) {
                    reply(
                        player,
                        `§7${market.id}: ${market.enabled ? "§aAN" : "§cAUS"} §8| §7${market.dimension}`
                    );
                    reply(player, `§7Bereich: §e${formatBounds(market)}`);
                }
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    registerCommand(
        registry,
        {
            name: "siedler:market_enable",
            description: "Aktiviert einen Marktplatz.",
            mandatoryParameters: [
                { type: CustomCommandParamType.String, name: "id" }
            ]
        },
        (origin, args) => {
            const player = playerOnly(origin);
            if (!player) return { status: CustomCommandStatus.Failure };

            const market = findMarket(String(args[0] ?? "").trim());
            if (!market) {
                reply(player, "§cMarktplatz wurde nicht gefunden.");
                return { status: CustomCommandStatus.Failure };
            }

            market.enabled = true;
            reply(player, `§aMarktplatz '${market.id}' aktiviert.`);
            return { status: CustomCommandStatus.Success };
        }
    );

    registerCommand(
        registry,
        {
            name: "siedler:market_disable",
            description: "Deaktiviert einen Marktplatz.",
            mandatoryParameters: [
                { type: CustomCommandParamType.String, name: "id" }
            ]
        },
        (origin, args) => {
            const player = playerOnly(origin);
            if (!player) return { status: CustomCommandStatus.Failure };

            const market = findMarket(String(args[0] ?? "").trim());
            if (!market) {
                reply(player, "§cMarktplatz wurde nicht gefunden.");
                return { status: CustomCommandStatus.Failure };
            }

            market.enabled = false;
            reply(player, `§cMarktplatz '${market.id}' deaktiviert.`);
            return { status: CustomCommandStatus.Success };
        }
    );

    registerCommand(
        registry,
        {
            name: "siedler:market_setcorner1",
            description: "Setzt die erste Ecke des Marktplatzes auf deine aktuelle Position.",
            mandatoryParameters: [
                { type: CustomCommandParamType.String, name: "id" }
            ]
        },
        (origin, args) => {
            const player = playerOnly(origin);
            if (!player) return { status: CustomCommandStatus.Failure };

            const market = findMarket(String(args[0] ?? "").trim());
            if (!market) {
                reply(player, "§cMarktplatz wurde nicht gefunden.");
                return { status: CustomCommandStatus.Failure };
            }

            market.min = {
                x: Math.floor(player.location.x),
                y: player.dimension.heightRange?.min ?? 0,
                z: Math.floor(player.location.z)
            };
            market.dimension = player.dimension.id.replace(/^minecraft:/, "");

            reply(player, `§aEcke 1 von '${market.id}' gesetzt.`);
            reply(player, `§7${formatBounds(market)}`);
            return { status: CustomCommandStatus.Success };
        }
    );

    registerCommand(
        registry,
        {
            name: "siedler:market_setcorner2",
            description: "Setzt die zweite Ecke des Marktplatzes auf deine aktuelle Position.",
            mandatoryParameters: [
                { type: CustomCommandParamType.String, name: "id" }
            ]
        },
        (origin, args) => {
            const player = playerOnly(origin);
            if (!player) return { status: CustomCommandStatus.Failure };

            const market = findMarket(String(args[0] ?? "").trim());
            if (!market) {
                reply(player, "§cMarktplatz wurde nicht gefunden.");
                return { status: CustomCommandStatus.Failure };
            }

            market.max = {
                x: Math.floor(player.location.x),
                y: player.dimension.heightRange?.max ?? 319,
                z: Math.floor(player.location.z)
            };
            market.dimension = player.dimension.id.replace(/^minecraft:/, "");

            reply(player, `§aEcke 2 von '${market.id}' gesetzt.`);
            reply(player, `§7${formatBounds(market)}`);
            return { status: CustomCommandStatus.Success };
        }
    );

    registerCommand(
        registry,
        {
            name: "siedler:market_cleanup",
            description: "Entfernt sofort alle Monster aus allen aktiven Marktplätzen."
        },
        (origin) => {
            const player = playerOnly(origin);
            if (!player) return { status: CustomCommandStatus.Failure };

            system.run(() => {
                cleanupMarketMonsters();
                reply(player, "§aMonster-Bereinigung für alle aktiven Marktplätze ausgeführt.");
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    console.info("§a[Market] Rectangular market commands registered");
});

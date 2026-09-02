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

system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;

    registerCommand(
        registry,
        {
            name: "siedler:market_status",
            description: "Zeigt alle konfigurierten Marktplätze."
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
                        `§7${market.id}: ${market.enabled ? "§aAN" : "§cAUS"} §8| §7${market.dimension} §8| §7Radius §e${market.radius} §8| §7Center §e${Math.round(market.center.x)}, ${Math.round(market.center.y)}, ${Math.round(market.center.z)}`
                    );
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

            const id = String(args[0] ?? "").trim();
            const market = findMarket(id);

            if (!market) {
                reply(player, `§cMarktplatz '${id}' wurde nicht gefunden.`);
                return { status: CustomCommandStatus.Failure };
            }

            market.enabled = true;
            reply(player, `§aMarktplatz '${id}' aktiviert.`);
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

            const id = String(args[0] ?? "").trim();
            const market = findMarket(id);

            if (!market) {
                reply(player, `§cMarktplatz '${id}' wurde nicht gefunden.`);
                return { status: CustomCommandStatus.Failure };
            }

            market.enabled = false;
            reply(player, `§cMarktplatz '${id}' deaktiviert.`);
            return { status: CustomCommandStatus.Success };
        }
    );

    registerCommand(
        registry,
        {
            name: "siedler:market_radius",
            description: "Ändert den Radius eines Marktplatzes.",
            mandatoryParameters: [
                { type: CustomCommandParamType.String, name: "id" },
                { type: CustomCommandParamType.Float, name: "radius" }
            ]
        },
        (origin, args) => {
            const player = playerOnly(origin);
            if (!player) return { status: CustomCommandStatus.Failure };

            const id = String(args[0] ?? "").trim();
            const radius = Number(args[1]);
            const market = findMarket(id);

            if (!market) {
                reply(player, `§cMarktplatz '${id}' wurde nicht gefunden.`);
                return { status: CustomCommandStatus.Failure };
            }

            if (!Number.isFinite(radius) || radius <= 0 || radius > 512) {
                reply(player, "§cDer Radius muss zwischen 0 und 512 liegen.");
                return { status: CustomCommandStatus.Failure };
            }

            market.radius = radius;
            reply(player, `§aRadius von '${id}' auf §e${radius} §agesetzt.`);
            return { status: CustomCommandStatus.Success };
        }
    );

    registerCommand(
        registry,
        {
            name: "siedler:market_setcenter",
            description: "Setzt das Zentrum eines Marktplatzes auf deine aktuelle Position.",
            mandatoryParameters: [
                { type: CustomCommandParamType.String, name: "id" }
            ]
        },
        (origin, args) => {
            const player = playerOnly(origin);
            if (!player) return { status: CustomCommandStatus.Failure };

            const id = String(args[0] ?? "").trim();
            const market = findMarket(id);

            if (!market) {
                reply(player, `§cMarktplatz '${id}' wurde nicht gefunden.`);
                return { status: CustomCommandStatus.Failure };
            }

            market.center = {
                x: player.location.x,
                y: player.location.y,
                z: player.location.z
            };

            market.dimension = player.dimension.id.replace(/^minecraft:/, "");

            reply(
                player,
                `§aZentrum von '${id}' gesetzt: §e${Math.round(player.location.x)}, ${Math.round(player.location.y)}, ${Math.round(player.location.z)} §7(${market.dimension})`
            );

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

    console.info("§a[Market] Commands registered");
});

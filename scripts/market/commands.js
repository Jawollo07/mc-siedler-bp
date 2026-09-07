import {
    system,
    CustomCommandStatus,
    CommandPermissionLevel,
    world
} from "@minecraft/server";

import {
    MARKET_PLACES,
    cleanupMarketMonsters
} from "./market_place.js";

const OP_PERMISSION = CommandPermissionLevel.GameDirectors;
const MARKET_TELEPORT_PROPERTY = "market_teleport";

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

function getMarket() {
    return MARKET_PLACES[0] ?? null;
}

function getTeleportPoint() {
    const raw = world.getDynamicProperty(MARKET_TELEPORT_PROPERTY);
    if (typeof raw !== "string" || !raw) return null;

    try {
        const point = JSON.parse(raw);
        if (
            !point ||
            typeof point.x !== "number" ||
            typeof point.y !== "number" ||
            typeof point.z !== "number" ||
            typeof point.dimension !== "string"
        ) return null;
        return point;
    } catch {
        return null;
    }
}

function setTeleportPoint(player) {
    const point = {
        x: player.location.x,
        y: player.location.y,
        z: player.location.z,
        dimension: player.dimension.id
    };

    world.setDynamicProperty(MARKET_TELEPORT_PROPERTY, JSON.stringify(point));
    return point;
}

system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;

    registry.registerCommand(
        {
            name: "market",
            description: "Teleportiert dich zum Marktplatz.",
            cheatsRequired: false
        },
        (origin) => {
            const player = playerOnly(origin);
            if (!player) return { status: CustomCommandStatus.Failure };

            const market = getMarket();
            const point = getTeleportPoint();

            if (!market || !market.enabled) {
                reply(player, "§cDer Marktplatz ist nicht verfügbar.");
                return { status: CustomCommandStatus.Failure };
            }

            if (!point) {
                reply(player, "§cNoch kein Marktplatz-Teleportpunkt gesetzt. Nutze /market_tp_set.");
                return { status: CustomCommandStatus.Failure };
            }

            try {
                const dimension = world.getDimension(point.dimension);
                system.run(() => {
                    try {
                        player.teleport(
                            { x: point.x, y: point.y, z: point.z },
                            { dimension, checkForBlocks: true }
                        );
                        reply(player, "§aDu wurdest zum Marktplatz teleportiert.");
                    } catch (error) {
                        console.warn(`[Market] Teleport failed: ${error}`);
                        reply(player, "§cTeleport zum Marktplatz fehlgeschlagen.");
                    }
                });
            } catch (error) {
                console.warn(`[Market] Invalid teleport dimension: ${error}`);
                reply(player, "§cDie gespeicherte Marktplatz-Dimension ist ungültig.");
                return { status: CustomCommandStatus.Failure };
            }

            return { status: CustomCommandStatus.Success };
        }
    );

    registry.registerCommand(
        {
            name: "market_tp_set",
            description: "Setzt den Teleportpunkt des Marktplatzes auf deine Position.",
            permissionLevel: OP_PERMISSION,
            cheatsRequired: false
        },
        (origin) => {
            const player = playerOnly(origin);
            if (!player) return { status: CustomCommandStatus.Failure };

            const market = getMarket();
            if (!market) {
                reply(player, "§cKein Marktplatz konfiguriert.");
                return { status: CustomCommandStatus.Failure };
            }

            try {
                const point = setTeleportPoint(player);
                reply(player, `§aMarktplatz-Teleportpunkt gesetzt: §7${Math.floor(point.x)} ${Math.floor(point.y)} ${Math.floor(point.z)} §8(${point.dimension})`);
                return { status: CustomCommandStatus.Success };
            } catch (error) {
                console.warn(`[Market] Failed to save teleport point: ${error}`);
                reply(player, "§cTeleportpunkt konnte nicht gespeichert werden.");
                return { status: CustomCommandStatus.Failure };
            }
        }
    );

    registry.registerCommand(
        {
            name: "siedler:market_status",
            description: "Zeigt den konfigurierten Marktplatz und Teleportpunkt.",
            permissionLevel: OP_PERMISSION,
            cheatsRequired: false
        },
        (origin) => {
            const player = playerOnly(origin);
            if (!player) return { status: CustomCommandStatus.Failure };

            const market = getMarket();
            const point = getTeleportPoint();
            if (!market) {
                reply(player, "§cKein Marktplatz konfiguriert.");
                return { status: CustomCommandStatus.Failure };
            }

            reply(player, `§7Marktplatz: ${market.enabled ? "§aAN" : "§cAUS"} §8| §7${market.dimension}`);
            reply(player, point
                ? `§7Teleport: §a${Math.floor(point.x)} ${Math.floor(point.y)} ${Math.floor(point.z)} §8| §7${point.dimension}`
                : "§7Teleport: §cnicht gesetzt");
            return { status: CustomCommandStatus.Success };
        }
    );

    registry.registerCommand(
        {
            name: "siedler:market_enable",
            description: "Aktiviert den Marktplatz.",
            permissionLevel: OP_PERMISSION,
            cheatsRequired: false
        },
        (origin) => {
            const player = playerOnly(origin);
            if (!player) return { status: CustomCommandStatus.Failure };
            const market = getMarket();
            if (!market) {
                reply(player, "§cKein Marktplatz konfiguriert.");
                return { status: CustomCommandStatus.Failure };
            }
            market.enabled = true;
            reply(player, "§aMarktplatz aktiviert.");
            return { status: CustomCommandStatus.Success };
        }
    );

    registry.registerCommand(
        {
            name: "siedler:market_disable",
            description: "Deaktiviert den Marktplatz.",
            permissionLevel: OP_PERMISSION,
            cheatsRequired: false
        },
        (origin) => {
            const player = playerOnly(origin);
            if (!player) return { status: CustomCommandStatus.Failure };
            const market = getMarket();
            if (!market) {
                reply(player, "§cKein Marktplatz konfiguriert.");
                return { status: CustomCommandStatus.Failure };
            }
            market.enabled = false;
            reply(player, "§cMarktplatz deaktiviert.");
            return { status: CustomCommandStatus.Success };
        }
    );

    registry.registerCommand(
        {
            name: "siedler:market_cleanup",
            description: "Entfernt sofort alle Monster aus dem Marktplatz.",
            permissionLevel: OP_PERMISSION,
            cheatsRequired: false
        },
        (origin) => {
            const player = playerOnly(origin);
            if (!player) return { status: CustomCommandStatus.Failure };
            system.run(() => {
                cleanupMarketMonsters();
                reply(player, "§aMonster-Bereinigung ausgeführt.");
            });
            return { status: CustomCommandStatus.Success };
        }
    );

    console.info("[Market] Single-market commands registered");
});
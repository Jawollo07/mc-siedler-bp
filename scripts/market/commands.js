import {
    system,
    CustomCommandStatus,
    CommandPermissionLevel,
    world
} from "@minecraft/server";
import { createLogger } from "../core/logger.js";
import { MARKET_PLACES, cleanupMarketMonsters } from "./market_place.js";

const logger = createLogger("Market:Commands");
const ANY_PERMISSION = CommandPermissionLevel.Any;
const OP_PERMISSION = CommandPermissionLevel.GameDirectors;
const MARKET_TELEPORT_PROPERTY = "market_teleport";

function playerOnly(origin) {
    try {
        const player = origin.sourceEntity;
        return player?.typeId === "minecraft:player" ? player : null;
    } catch { return null; }
}

function reply(player, message) {
    try { player.sendMessage(`§8[§6Market§8]§r ${message}`); } catch {}
}

function getMarket() { return MARKET_PLACES[0] ?? null; }

function getTeleportPoint() {
    const raw = world.getDynamicProperty(MARKET_TELEPORT_PROPERTY);
    if (typeof raw !== "string" || !raw) return null;
    try {
        const point = JSON.parse(raw);
        if (!point || typeof point.x !== "number" || typeof point.y !== "number" || typeof point.z !== "number" || typeof point.dimension !== "string") return null;
        return point;
    } catch (error) {
        logger.warn(`Ungültiger gespeicherter Teleportpunkt: ${error}`);
        return null;
    }
}

function setTeleportPoint(player) {
    const point = { x: player.location.x, y: player.location.y, z: player.location.z, dimension: player.dimension.id };
    world.setDynamicProperty(MARKET_TELEPORT_PROPERTY, JSON.stringify(point));
    return point;
}

system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;

    registry.registerCommand({ name: "siedler:market", description: "Teleportiert dich zum Marktplatz.", permissionLevel: ANY_PERMISSION, cheatsRequired: false }, (origin) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        const market = getMarket();
        const point = getTeleportPoint();
        if (!market || !market.enabled) { reply(player, "§cDer Marktplatz ist nicht verfügbar."); return { status: CustomCommandStatus.Failure }; }
        if (!point) { reply(player, "§cNoch kein Marktplatz-Teleportpunkt gesetzt. Nutze /market_tp_set."); return { status: CustomCommandStatus.Failure }; }
        try {
            const dimension = world.getDimension(point.dimension);
            system.run(() => {
                try {
                    player.teleport({ x: point.x, y: point.y, z: point.z }, { dimension, checkForBlocks: true });
                    logger.info(`Teleport erfolgreich: player=${player.id}, dimension=${point.dimension}, x=${Math.floor(point.x)}, y=${Math.floor(point.y)}, z=${Math.floor(point.z)}`);
                    reply(player, "§aDu wurdest zum Marktplatz teleportiert.");
                } catch (error) {
                    logger.exception(`Teleport fehlgeschlagen für player=${player.id}`, error);
                    reply(player, "§cTeleport zum Marktplatz fehlgeschlagen.");
                }
            });
        } catch (error) {
            logger.exception(`Ungültige Teleport-Dimension: ${point.dimension}`, error);
            reply(player, "§cDie gespeicherte Marktplatz-Dimension ist ungültig.");
            return { status: CustomCommandStatus.Failure };
        }
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "siedler:market_tp_set", description: "Setzt den Teleportpunkt des Marktplatzes auf deine Position.", permissionLevel: OP_PERMISSION, cheatsRequired: false }, (origin) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        const market = getMarket();
        if (!market) { reply(player, "§cKein Marktplatz konfiguriert."); return { status: CustomCommandStatus.Failure }; }
        try {
            const point = setTeleportPoint(player);
            logger.info(`Teleportpunkt gesetzt: player=${player.id}, dimension=${point.dimension}, x=${Math.floor(point.x)}, y=${Math.floor(point.y)}, z=${Math.floor(point.z)}`);
            reply(player, `§aMarktplatz-Teleportpunkt gesetzt: §7${Math.floor(point.x)} ${Math.floor(point.y)} ${Math.floor(point.z)} §8(${point.dimension})`);
            return { status: CustomCommandStatus.Success };
        } catch (error) {
            logger.exception("Teleportpunkt konnte nicht gespeichert werden", error);
            reply(player, "§cTeleportpunkt konnte nicht gespeichert werden.");
            return { status: CustomCommandStatus.Failure };
        }
    });

    registry.registerCommand({ name: "siedler:market_status", description: "Zeigt den konfigurierten Marktplatz und Teleportpunkt.", permissionLevel: OP_PERMISSION, cheatsRequired: false }, (origin) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        const market = getMarket();
        const point = getTeleportPoint();
        if (!market) { reply(player, "§cKein Marktplatz konfiguriert."); return { status: CustomCommandStatus.Failure }; }
        logger.debug(`Status abgerufen: player=${player.id}`);
        reply(player, `§7Marktplatz: ${market.enabled ? "§aAN" : "§cAUS"} §8| §7${market.dimension}`);
        reply(player, point ? `§7Teleport: §a${Math.floor(point.x)} ${Math.floor(point.y)} ${Math.floor(point.z)} §8| §7${point.dimension}` : "§7Teleport: §cnicht gesetzt");
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "siedler:market_enable", description: "Aktiviert den Marktplatz.", permissionLevel: OP_PERMISSION, cheatsRequired: false }, (origin) => {
        const player = playerOnly(origin); if (!player) return { status: CustomCommandStatus.Failure };
        const market = getMarket(); if (!market) { reply(player, "§cKein Marktplatz konfiguriert."); return { status: CustomCommandStatus.Failure }; }
        market.enabled = true; logger.info(`Marktplatz aktiviert durch player=${player.id}`); reply(player, "§aMarktplatz aktiviert.");
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "siedler:market_disable", description: "Deaktiviert den Marktplatz.", permissionLevel: OP_PERMISSION, cheatsRequired: false }, (origin) => {
        const player = playerOnly(origin); if (!player) return { status: CustomCommandStatus.Failure };
        const market = getMarket(); if (!market) { reply(player, "§cKein Marktplatz konfiguriert."); return { status: CustomCommandStatus.Failure }; }
        market.enabled = false; logger.info(`Marktplatz deaktiviert durch player=${player.id}`); reply(player, "§cMarktplatz deaktiviert.");
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "siedler:market_cleanup", description: "Entfernt sofort alle Monster aus dem Marktplatz.", permissionLevel: OP_PERMISSION, cheatsRequired: false }, (origin) => {
        const player = playerOnly(origin); if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => { cleanupMarketMonsters(); logger.info(`Monster-Bereinigung ausgeführt durch player=${player.id}`); reply(player, "§aMonster-Bereinigung ausgeführt."); });
        return { status: CustomCommandStatus.Success };
    });

    logger.success("Single-market commands registered");
});

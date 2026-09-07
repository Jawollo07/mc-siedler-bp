import { world } from "@minecraft/server";
import { createLogger } from "../core/logger.js";

const logger = createLogger("Essentials:Players");

export function playerFrom(origin) {
    const player = origin?.sourceEntity;
    if (player?.typeId === "minecraft:player" && player.isValid) return player;

    logger.debug("Command-Ursprung ist kein gültiger Spieler.");
    return null;
}

export function findPlayer(identifier) {
    const value = String(identifier ?? "").trim();
    if (!value) return null;

    const players = world.getPlayers();
    const exactId = players.find(player => player.id === value);
    if (exactId) return exactId;

    const exactName = players.find(player => player.name.toLowerCase() === value.toLowerCase());
    if (exactName) return exactName;

    const prefixMatches = players.filter(player => player.name.toLowerCase().startsWith(value.toLowerCase()));
    if (prefixMatches.length === 1) return prefixMatches[0];

    logger.debug(`Spieler nicht eindeutig gefunden: "${value}" (${prefixMatches.length} Prefix-Treffer).`);
    return null;
}

export function targetOrSelf(player, identifier) {
    return identifier ? findPlayer(identifier) : player;
}

export function sendCommandError(player, message) {
    logger.warn(`Command-Fehler für ${player?.name ?? "unknown"}: ${message}`);
    try { player.sendMessage(`§c${message}`); } catch (error) {
        logger.debug(`Fehler beim Senden einer Command-Fehlermeldung: ${error}`);
    }
}

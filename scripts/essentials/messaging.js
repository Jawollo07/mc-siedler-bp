import {
    system,
    CommandPermissionLevel,
    CustomCommandParamType,
    CustomCommandStatus
} from "@minecraft/server";
import { createLogger } from "../core/logger.js";
import { lastMessagedPlayer } from "./state.js";
import { playerFrom, findPlayer, sendCommandError } from "./players.js";

const logger = createLogger("Essentials:Messaging");

function registerPlayerCommand(registry, name, description, callback, mandatoryParameters = []) {
    registry.registerCommand({
        name,
        description,
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
        ...(mandatoryParameters.length ? { mandatoryParameters } : {})
    }, callback);
}

function deliverMessage(sender, target, message) {
    lastMessagedPlayer.set(sender.id, target.id);
    lastMessagedPlayer.set(target.id, sender.id);
    sender.sendMessage(`§7[Ich → ${target.name}] §f${message}`);
    target.sendMessage(`§7[${sender.name} → Mir] §f${message}`);
    logger.info(`Private Nachricht: ${sender.name} -> ${target.name} (${message.length} Zeichen).`);
}

export function registerMessagingCommands(registry) {
    registerPlayerCommand(registry, "siedler:msg", "Sendet eine private Nachricht.", (origin, args) => {
        const player = playerFrom(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        const target = findPlayer(args?.[0]);
        if (!target) {
            logger.warn(`MSG abgelehnt: ${player.name} -> "${args?.[0] ?? ""}" nicht gefunden/eindeutig.`);
            sendCommandError(player, `Spieler "${args?.[0] ?? ""}" ist nicht online oder nicht eindeutig.`);
            return { status: CustomCommandStatus.Failure };
        }

        const message = String(args?.[1] ?? "").trim();
        if (!message) {
            sendCommandError(player, "Die Nachricht darf nicht leer sein.");
            return { status: CustomCommandStatus.Failure };
        }

        system.run(() => deliverMessage(player, target, message));
        return { status: CustomCommandStatus.Success };
    }, [
        { type: CustomCommandParamType.String, name: "spieler" },
        { type: CustomCommandParamType.String, name: "nachricht" }
    ]);

    registerPlayerCommand(registry, "siedler:reply", "Antwortet dem letzten privaten Gesprächspartner.", (origin, args) => {
        const player = playerFrom(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        const targetId = lastMessagedPlayer.get(player.id);
        const target = findPlayer(targetId);
        const message = String(args?.[0] ?? "").trim();

        if (!target) {
            logger.debug(`${player.name} konnte keinen erreichbaren Reply-Partner finden.`);
            sendCommandError(player, "Kein erreichbarer Gesprächspartner vorhanden.");
            return { status: CustomCommandStatus.Failure };
        }
        if (!message) {
            sendCommandError(player, "Die Nachricht darf nicht leer sein.");
            return { status: CustomCommandStatus.Failure };
        }

        system.run(() => deliverMessage(player, target, message));
        return { status: CustomCommandStatus.Success };
    }, [{ type: CustomCommandParamType.String, name: "nachricht" }]);
}

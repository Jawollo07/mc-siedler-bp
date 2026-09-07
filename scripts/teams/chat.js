import {
    world,
    system,
    CommandPermissionLevel,
    CustomCommandParamType,
    CustomCommandStatus
} from "@minecraft/server";
import { getTeams } from "./index.js";
import { createLogger } from "../core/logger.js";

const logger = createLogger("Teams:Chat");
const chatLogger = createLogger("Essentials:Chat");

function getPlayerTeam(player) {
    const teams = getTeams();

    for (const [name, data] of Object.entries(teams)) {
        const players = Array.isArray(data?.players) ? data.players : [];

        if (players.includes(player.id)) {
            return { name, ...data, players };
        }
    }

    return null;
}

function sendTeamMessage(player, rawMessage) {
    const message = String(rawMessage ?? "").trim();
    const team = getPlayerTeam(player);

    if (!team) {
        player.sendMessage("§cDu bist in keinem Team und kannst den Team-Chat nicht nutzen.");
        logger.debug(`Team-Chat abgelehnt: Spieler ${player.id} ohne Team.`);
        return false;
    }

    if (!message) {
        player.sendMessage("§cBitte gib eine Nachricht an.");
        return false;
    }

    const color = team.color || "§7";
    const formatted = `§8[§6Team§8|${color}${team.name}§8] ${color}${player.name}§8:§r ${message}`;
    let recipients = 0;

    for (const target of world.getAllPlayers()) {
        if (team.players.includes(target.id)) {
            target.sendMessage(formatted);
            recipients++;
        }
    }

    logger.info(
        `Team-Chat: ${player.name} (${player.id}) [${team.name}] (${recipients} Empfänger): ${message}`
    );

    if (recipients === 0) {
        player.sendMessage("§7Niemand von deinem Team ist online.");
    }

    return true;
}

function logPublicChat(player, message) {
    const team = getPlayerTeam(player);

    chatLogger.info(
        `Öffentlicher Chat: ${player.name} (${player.id})${
            team ? ` [Team: ${team.name}]` : " [kein Team]"
        }: ${message}`
    );
}

function registerTeamChatCommand(registry) {
    registry.registerCommand(
        {
            name: "siedler:teamchat",
            description: "Sendet eine Nachricht an dein Team.",
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false,
            mandatoryParameters: [
                {
                    type: CustomCommandParamType.String,
                    name: "nachricht"
                }
            ]
        },
        (origin, nachricht) => {
            const player = origin?.sourceEntity;

            if (!player || player.typeId !== "minecraft:player") {
                return { status: CustomCommandStatus.Failure };
            }

            system.run(() => sendTeamMessage(player, nachricht));
            return { status: CustomCommandStatus.Success };
        }
    );
}

let nativeBeforeChatRegistered = false;
let nativeAfterChatRegistered = false;

// Preferred path: native before-chat event. This allows Siedler Logic to
// intercept @team messages and replace the public broadcast safely.
const beforeChat = world.beforeEvents?.chatSend;

if (beforeChat && typeof beforeChat.subscribe === "function") {
    beforeChat.subscribe((event) => {
        const player = event.sender;
        const message = String(event.message ?? "").trim();

        if (!player || !message) {
            return;
        }

        const isTeamChat = /^@team(?:\s|$)/i.test(message);

        if (isTeamChat) {
            event.cancel = true;
            const teamMessage = message.replace(/^@team\s*/i, "").trim();
            system.run(() => sendTeamMessage(player, teamMessage));
            return;
        }

        logPublicChat(player, message);
    });

    nativeBeforeChatRegistered = true;
    logger.success("Native Before-Chat-Adapter registriert (@team + Public-Chat-Logging)");
    chatLogger.success("Öffentlicher Chat wird über die native Before-Chat-API geloggt");
} else {
    logger.warn(
        "Native Before-Chat-API ist in dieser Server/API-Kombination nicht verfügbar; Team-Chat nutzt /siedler:teamchat als Fallback."
    );
}

// Secondary path: if the before-chat API is unavailable, afterEvents.chatSend
// can still provide public chat logging without changing vanilla chat delivery.
// We deliberately do NOT interpret @team here because the message has already
// been broadcast and could no longer be hidden safely.
const afterChat = world.afterEvents?.chatSend;

if (afterChat && typeof afterChat.subscribe === "function") {
    afterChat.subscribe((event) => {
        if (nativeBeforeChatRegistered) {
            return;
        }

        const player = event.sender;
        const message = String(event.message ?? "").trim();

        if (!player || !message) {
            return;
        }

        logPublicChat(player, message);
    });

    nativeAfterChatRegistered = true;
    chatLogger.success(
        nativeBeforeChatRegistered
            ? "Public-Chat-After-Event verfügbar"
            : "Public-Chat wird über die native After-Chat-API geloggt"
    );
} else if (!nativeBeforeChatRegistered) {
    chatLogger.warn(
        "Keine native Chat-Event-API verfügbar; öffentlicher Chat kann nicht automatisch geloggt werden."
    );
}

// Always register a command fallback. It makes team chat usable even on
// server builds where chatSend is unavailable or still gated behind preview.
system.beforeEvents.startup.subscribe((event) => {
    try {
        registerTeamChatCommand(event.customCommandRegistry);
        logger.success("Team-Chat-Fallback /siedler:teamchat registriert");
    } catch (error) {
        logger.exception("Team-Chat-Fallback konnte nicht registriert werden", error);
    }
});

if (!nativeBeforeChatRegistered && !nativeAfterChatRegistered) {
    logger.warn(
        "Chat-System läuft im Fallback-Modus: /siedler:teamchat ist verfügbar; native Chat-Events fehlen."
    );
}

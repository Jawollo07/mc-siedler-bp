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

function registerTeamChatCommand(registry, name, description) {
    registry.registerCommand(
        {
            name,
            description,
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false,
            mandatoryParameters: [
                {
                    type: CustomCommandParamType.String,
                    name: "nachricht"
                }
            ]
        },
        (origin, args) => {
            const player = origin?.sourceEntity;

            if (!player || player.typeId !== "minecraft:player") {
                return { status: CustomCommandStatus.Failure };
            }

            const message = String(args?.[0] ?? "").trim();
            system.run(() => sendTeamMessage(player, message));
            return { status: CustomCommandStatus.Success };
        }
    );
}

let nativeBeforeChatRegistered = false;
let nativeAfterChatRegistered = false;

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
    chatLogger.success("Öffentlicher Chat wird über die native After-Chat-API geloggt");
} else if (!nativeBeforeChatRegistered) {
    chatLogger.warn(
        "Keine native Chat-Event-API verfügbar; öffentlicher Chat kann nicht automatisch geloggt werden."
    );
}

system.beforeEvents.startup.subscribe((event) => {
    try {
        registerTeamChatCommand(
            event.customCommandRegistry,
            "siedler:teamchat",
            "Sendet eine Nachricht an dein Team."
        );
        registerTeamChatCommand(
            event.customCommandRegistry,
            "siedler:tc",
            "Kurzform für den Team-Chat."
        );

        logger.success("Team-Chat-Fallback registriert: /siedler:teamchat und /siedler:tc");
    } catch (error) {
        logger.exception("Team-Chat-Fallback konnte nicht registriert werden", error);
    }
});

if (!nativeBeforeChatRegistered && !nativeAfterChatRegistered) {
    logger.warn(
        "Chat-System läuft im Fallback-Modus: /siedler:teamchat und /siedler:tc sind verfügbar; native Chat-Events fehlen."
    );
}

import { world, system } from "@minecraft/server";
import { getTeams } from "./index.js";
import { createLogger } from "../core/logger.js";

const logger = createLogger("Teams:Chat");

function getPlayerTeam(player) {
    const teams = getTeams();
    for (const [name, data] of Object.entries(teams)) {
        const players = Array.isArray(data?.players) ? data.players : [];
        if (players.includes(player.id)) return { name, ...data, players };
    }
    return null;
}

const chatSend = world.beforeEvents?.chatSend;

if (chatSend && typeof chatSend.subscribe === "function") {
    chatSend.subscribe((event) => {
        const player = event.sender;
        const message = String(event.message ?? "").trim();
        event.cancel = true;
        const team = getPlayerTeam(player);
        const color = team?.color || "§7";
        const isTeamChat = /^@team(?:\s|$)/i.test(message);

        system.run(() => {
            if (isTeamChat) {
                if (!team) {
                    player.sendMessage("§cDu bist in keinem Team und kannst den Team-Chat nicht nutzen.");
                    logger.debug(`Team-Chat abgelehnt: Spieler ${player.id} ohne Team.`);
                    return;
                }
                const teamMessage = message.replace(/^@team\s*/i, "").trim();
                if (!teamMessage) {
                    player.sendMessage("§cBitte schreibe eine Nachricht nach @team.");
                    return;
                }
                const formatted = `§8[§6Team§8|${color}${team.name}§8] ${color}${player.name}§8:§r ${teamMessage}`;
                let recipients = 0;
                for (const target of world.getAllPlayers()) {
                    if (team.players.includes(target.id)) {
                        target.sendMessage(formatted);
                        recipients++;
                    }
                }
                logger.debug(`Team-Chat: team=${team.name}, sender=${player.id}, recipients=${recipients}`);
                if (recipients === 0) player.sendMessage("§7Niemand von deinem Team ist online.");
                return;
            }
            world.sendMessage(`§8[${color}${player.name}§8]§r: ${message}`);
        });
    });
    logger.success("Team-Chat registriert");
} else {
    logger.warn("ChatSend-API ist nicht verfügbar; Team-Chat bleibt deaktiviert.");
}

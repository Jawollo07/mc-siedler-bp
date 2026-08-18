import { world, system } from "@minecraft/server";
import { getTeams } from "./index.js";

function getPlayerTeam(player) {
    const teams = getTeams();
    for (const [name, data] of Object.entries(teams)) {
        const players = Array.isArray(data?.players) ? data.players : [];
        if (players.includes(player.name)) {
            return { name, ...data, players };
        }
    }
    return null;
}

world.beforeEvents.chatSend.subscribe((event) => {
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
                if (team.players.includes(target.name)) {
                    target.sendMessage(formatted);
                    recipients++;
                }
            }

            if (recipients === 0) {
                player.sendMessage("§7Niemand von deinem Team ist online.");
            }
            return;
        }

        const formatted = `§8[${color}${player.name}§8]§r: ${message}`;
        world.sendMessage(formatted);
    });
});

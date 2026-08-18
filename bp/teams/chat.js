import { world, system } from "@minecraft/server";
import { getTeams } from "./index.js";

world.beforeEvents.chatSend.subscribe((event) => {
    const player = event.sender;
    const originalMessage = event.message;

    // Originale Nachricht immer stoppen
    event.cancel = true;

    // Team des Spielers finden
    const teams = getTeams();
    let playerTeam = null;
    let teamColor = "§7";

    for (const [name, data] of Object.entries(teams)) {
        if (data.players.includes(player.name)) {
            playerTeam = { name, ...data };
            teamColor = data.color || "§7";
            break;
        }
    }

    // Prüfen ob es eine Team-Nachricht ist
    const isTeamChat = originalMessage.toLowerCase().startsWith("@team ");

    system.run(() => {
        if (isTeamChat) {
            // ========== TEAM-CHAT ==========
            if (!playerTeam) {
                player.sendMessage("§cDu bist in keinem Team und kannst den Team-Chat nicht nutzen.");
                return;
            }

            // Nachricht ohne "@team " extrahieren
            const teamMessage = originalMessage.substring(6).trim();
            if (!teamMessage) {
                player.sendMessage("§cBitte schreibe eine Nachricht nach @team");
                return;
            }

            const formatted = `§8[§6Team§8|\( {teamColor} \){playerTeam.name}§8] \( {teamColor} \){player.name}§8:§r ${teamMessage}`;

            // Nur an Team-Mitglieder senden
            const onlinePlayers = world.getAllPlayers();
            let sent = false;

            for (const p of onlinePlayers) {
                if (playerTeam.players.includes(p.name)) {
                    p.sendMessage(formatted);
                    sent = true;
                }
            }

            // Falls niemand online ist (außer einem selbst)
            if (!sent) {
                player.sendMessage("§7Niemand von deinem Team ist online.");
            }

        } else {
            // ========== NORMALER CHAT ==========
            const formatted = `§8[\( {teamColor} \){player.name}§8]§r: ${originalMessage}`;
            world.sendMessage(formatted);
        }
    });
});
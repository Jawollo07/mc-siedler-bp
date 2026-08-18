import { world, system } from "@minecraft/server";
import { getClaimAt } from "./utils.js";
import { getTeams } from "../teams/index.js";

// Speichert den letzten angezeigten Claim pro Spieler (damit nicht jede Tick spammt)
const lastShown = new Map();

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        const claim = getClaimAt(player.location);
        const key = player.id;

        // Kein Claim
        if (!claim) {
            if (lastShown.get(key) !== null) {
                player.onScreenDisplay.setActionBar(""); // ActionBar leeren
                lastShown.set(key, null);
            }
            continue;
        }

        // Gleicher Claim wie vorher → nichts ändern
        if (lastShown.get(key) === claim.team) continue;

        // Neuen Text setzen
        const teams = getTeams();
        const teamData = teams[claim.team];
        const color = teamData?.color || "§f";

        const isOwnTeam = teamData?.players.includes(player.name);

        const text = isOwnTeam
            ? `§aDein Grundstück §7(\( {color} \){claim.team}§7)`
            : `§7Grundstück von \( {color} \){claim.team}`;

        player.onScreenDisplay.setActionBar(text);
        lastShown.set(key, claim.team);
    }
}, 10); // alle 0.5 Sekunden prüfen
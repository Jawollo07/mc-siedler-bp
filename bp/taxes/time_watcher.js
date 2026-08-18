import { world, system } from "@minecraft/server";
import { addTaxes } from "./taxes.js";
import { getTeams } from "../teams/index.js";
import { countVillagersInTeamClaims } from "../claims/utils.js";

// === KONFIGURATION ===
const MORNING_START = 0;
const MORNING_WINDOW = 200;

let dayStarted = false;

system.runInterval(() => {
    const timeNow = world.getTimeOfDay();

    if (timeNow >= MORNING_START && timeNow < MORNING_START + MORNING_WINDOW) {
        if (!dayStarted) {
            dayStarted = true;
            payAllTeamTaxes();
        }
    } else {
        dayStarted = false;
    }
}, 20);

function payAllTeamTaxes() {
    const teams = getTeams();
    let paidCount = 0;

    for (const [teamName, data] of Object.entries(teams)) {
        if (!data.taxChest) continue;

        // 1 Emerald pro Dorfbewohner im Claim
        const villagerCount = countVillagersInTeamClaims(teamName);
        const amount = villagerCount; // 1:1

        if (amount <= 0) {
            // Optional: Nachricht, dass keine Steuern fällig sind
            continue;
        }

        const success = addTaxes(data.taxChest, amount, teamName);

        if (success) {
            paidCount++;
            notifyTeamMembers(teamName, data, amount, villagerCount);
        }
    }

    if (paidCount > 0) {
        console.info(`[Steuern] ${paidCount} Team(s) haben Steuern erhalten.`);
    }
}

function notifyTeamMembers(teamName, teamData, amount, villagerCount) {
    const color = teamData.color || "§f";
    const message = `§a[Steuern] Euer Team \( {color} \){teamName}§a hat §e${amount} Emeralds§a erhalten ` +
                    `§7(${villagerCount} Dorfbewohner)`;

    const onlinePlayers = world.getAllPlayers();

    for (const player of onlinePlayers) {
        if (teamData.players.includes(player.name)) {
            player.sendMessage(message);
        }
    }
}
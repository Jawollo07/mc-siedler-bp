import { world, system } from "@minecraft/server";
import { addTaxes } from "./taxes.js";
import { getTeams } from "../teams/index.js";
import { countVillagersInTeamClaims } from "../claims/utils.js";

const MORNING_START = 0;
const MORNING_WINDOW = 200;

let dayStarted = false;
let lastPaidDay = -1;

system.runInterval(() => {
    const timeNow = world.getTimeOfDay();
    const currentDay = Math.floor(world.getAbsoluteTime() / 24000);

    if (timeNow >= MORNING_START && timeNow < MORNING_START + MORNING_WINDOW) {
        if (!dayStarted && lastPaidDay !== currentDay) {
            dayStarted = true;
            lastPaidDay = currentDay;
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
        if (!data?.taxChest) continue;

        const villagerCount = countVillagersInTeamClaims(teamName, ["fv:villager*", "minecraft:villager"]);
        const configuredAmount = Number.isFinite(Number(data.taxAmount)) ? Number(data.taxAmount) : villagerCount;
        const amount = Math.max(0, Math.floor(configuredAmount));

        if (amount <= 0) continue;

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
    const message = `§a[Steuern] Euer Team ${color}${teamName}§a hat §e${amount} Emeralds§a erhalten §7(${villagerCount} Dorfbewohner)`;

    for (const player of world.getAllPlayers()) {
        if (Array.isArray(teamData.players) && teamData.players.includes(player.name)) {
            player.sendMessage(message);
        }
    }
}

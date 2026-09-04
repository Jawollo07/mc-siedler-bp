import { ActionFormData } from "@minecraft/server-ui";
import { getTeams } from "../teams/index.js";

export default function showTaxStatsForm(teamName) {
    const teams = getTeams();
    const teamData = teams[teamName];
    if (!teamData) return;

    const form = new ActionFormData()
        .title(`Steuern für Team: ${teamName}`)
        .body(`Hier sind die Steuerinformationen für das Team "${teamName}".`)
        .button(`Gesamtsteuern: ${teamData.totalTaxes ?? 0}`)
        .button(`Letzte Zahlung: ${teamData.lastPaidDay ?? "Nie"}`)
        .button(`Steuerbonus: ${teamData.taxBonus ?? 0}%`)
        .button(`Steuertruhen: ${teamData.taxChest ? "Vorhanden" : "Nicht vorhanden"}`)
        .button(`Anzahl der Dorfbewohner: ${teamData.villagerCount ?? 0}`);
    return form;
}
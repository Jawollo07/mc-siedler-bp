import { ActionFormData } from "@minecraft/server-ui";
import { getPlayerTeam, getTeams } from "../teams/index.js";
import { calculateTax, normalizeTaxBonus } from "./config.js";
import { countVillagersInTeamClaims } from "../claims/utils.js";

export function showTaxStatsForm(teamNameOrPlayer) {
    const teamName = typeof teamNameOrPlayer === "string"
        ? teamNameOrPlayer
        : getPlayerTeam(teamNameOrPlayer);

    if (!teamName) return null;

    const teams = getTeams();
    const teamData = teams[teamName];
    if (!teamData) return null;

    const villagers = countVillagersInTeamClaims(teamName, "villager");
    const bonus = normalizeTaxBonus(teamData.taxBonus);
    const tax = calculateTax(villagers, bonus);

    return new ActionFormData()
        .title(`Steuern: ${teamName}`)
        .body(
            `§7Aktuelle Tagessteuer\n` +
            `§f${tax.total} Emeralds §7(${villagers} Dorfbewohner × ${bonus} Emeralds)\n\n` +
            `§7Steuer pro Dorfbewohner: §e${bonus} Emeralds/Tag\n` +
            `§7TaxBonus: §e${bonus}×\n` +
            `§7Bisher eingezahlt: §e${teamData.totalTaxes ?? 0} Emeralds\n` +
            `§7Letzte Zahlung: §e${teamData.lastTaxAmount ?? 0} Emeralds\n` +
            `§7Letzter Zahlungstag: §e${teamData.lastPaidDay ?? "Nie"}\n` +
            `§7Status: §e${teamData.lastPaymentStatus ?? "never"}\n` +
            `§7Fehlgeschlagene Versuche: §e${teamData.taxFailures ?? 0}`
        )
        .button(`Tagessteuer: ${tax.total} Emeralds`)
        .button(`Dorfbewohner: ${villagers}`)
        .button(`TaxBonus: ${bonus}×`)
        .button(`Gesamt eingezahlt: ${teamData.totalTaxes ?? 0} Emeralds`)
        .button(`Steuerkiste: ${teamData.taxChest ? "Konfiguriert" : "Nicht vorhanden"}`);
}

export default showTaxStatsForm;

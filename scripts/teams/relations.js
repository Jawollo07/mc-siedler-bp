import {getTeams, saveTeams} from "./index.js";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";

export const TEAM_RELATION = Object.freeze({
    FRIENDLY: "friendly",
    NEUTRAL: "neutral",
    HOSTILE: "hostile"
});
export function getTeamRelation(teamA, teamB) {
    if (!teamA || !teamB) {
        return TEAM_RELATION.NEUTRAL;
    }

    if (teamA === teamB) {
        return TEAM_RELATION.FRIENDLY;
    }

    const teams = getTeams();

    const teamData = teams[teamA];

    if (!teamData?.relations) {
        return TEAM_RELATION.NEUTRAL;
    }

    return (
        teamData.relations[teamB] ??
        TEAM_RELATION.NEUTRAL
    );
}
export function setTeamRelation(teamA, teamB, relation) {
    if (!teamA || !teamB || teamA === teamB) {
        return false;
    }

    if (!Object.values(TEAM_RELATION).includes(relation)) {
        return false;
    }

    const teams = getTeams();

    if (!teams[teamA] || !teams[teamB]) {
        return false;
    }

    teams[teamA].relations ??= {};
    teams[teamB].relations ??= {};

    teams[teamA].relations[teamB] = relation;
    teams[teamB].relations[teamA] = relation;

    return saveTeams(teams);
}
export async function showDiplomacyMenu(player) {
    try {
        const names = Object.keys(getTeams());
        if (names.length < 2) return player.sendMessage("§7Für Diplomatie werden mindestens zwei Teams benötigt.");
        const form = new ActionFormData().title("Diplomatie").body("Verwalte die Beziehungen zwischen Teams.").button("Beziehung ändern").button("Beziehungen anzeigen");
        const r = await form.show(player);
        if (r.canceled) return;
        if (r.selection === 0) await showSetRelationForm(player);
        if (r.selection === 1) showRelations(player);
    } catch (e) { formError(player, "Diplomatie", e); }
}

async function showSetRelationForm(player) {
    const teams = getTeams();
    const names = Object.keys(teams);
    if (names.length < 2) return player.sendMessage("§7Es werden mindestens zwei Teams benötigt.");
    const values = [TEAM_RELATION.FRIENDLY, TEAM_RELATION.NEUTRAL, TEAM_RELATION.HOSTILE];
    const labels = ["§aVerbündet", "§eNeutral", "§cFeindlich"];
    const form = new ModalFormData()
        .title("Team-Beziehung ändern")
        .dropdown("Team A", names, { defaultValueIndex: 0 })
        .dropdown("Team B", names, { defaultValueIndex: 1 })
        .dropdown("Beziehung", labels, { defaultValueIndex: 1 });
    const r = await form.show(player);
    if (r.canceled) return;
    const a = names[Number(r.formValues?.[0])];
    const b = names[Number(r.formValues?.[1])];
    const relation = values[Number(r.formValues?.[2])];
    if (!a || !b || !relation) return player.sendMessage("§cUngültige Auswahl.");
    if (a === b) return player.sendMessage("§cEin Team kann keine Beziehung zu sich selbst haben.");
    if (!setTeamRelation(a, b, relation)) return player.sendMessage("§cDie Beziehung konnte nicht gespeichert werden.");
    player.sendMessage(`§aBeziehung gesetzt: ${formatTeam(teams, a)} §7↔ ${formatTeam(teams, b)} §7= ${formatRelation(relation)}`);
}

function showRelations(player) {
    const teams = getTeams();
    const names = Object.keys(teams);
    const shown = new Set();
    player.sendMessage("§6--- Diplomatie ---");
    for (const a of names) for (const b of names) {
        if (a === b) continue;
        const key = [a, b].sort().join("::");
        if (shown.has(key)) continue;
        shown.add(key);
        player.sendMessage(`${formatTeam(teams, a)} §7↔ ${formatTeam(teams, b)} §7= ${formatRelation(getTeamRelation(a, b))}`);
    }
}

function formatTeam(teams, name) { return `${teams[name]?.color || "§f"}${name}§r`; }
function formatRelation(relation) {
    if (relation === TEAM_RELATION.FRIENDLY) return "§aVerbündet§r";
    if (relation === TEAM_RELATION.HOSTILE) return "§cFeindlich§r";
    return "§eNeutral§r";
}
function formError(player, action, error) {
    console.error(`[Teams] ${action}: ${error}`);
    player.sendMessage(`§cFehler beim ${action}: ${error}`);
}
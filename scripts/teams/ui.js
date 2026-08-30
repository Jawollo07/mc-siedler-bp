import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { world } from "@minecraft/server";
import { getTeams } from "./index.js";
import { getTeamRelation, setTeamRelation, TEAM_RELATION } from "./relations.js";

export async function showTeamMenu(player) {
    try {
        const form = new ActionFormData()
            .title("Team-Management")
            .body("Wähle eine Aktion:")
            .button("Team erstellen")
            .button("Spieler hinzufügen")
            .button("Spieler entfernen")
            .button("Team löschen")
            .button("Teams anzeigen")
            .button("Diplomatie verwalten")
            .button("Steuer setzen (Befehl)");
        const r = await form.show(player);
        if (r.canceled) return;
        switch (r.selection) {
            case 0: return showCreateTeamForm(player);
            case 1: return showAddPlayerForm(player);
            case 2: return showRemovePlayerForm(player);
            case 3: return showDeleteTeamForm(player);
            case 4: return showTeamList(player);
            case 5: return showDiplomacyMenu(player);
            case 6: player.sendMessage("§eVerwende /siedler:team_settax <team> <x> <y> <z> [amount]."); break;
        }
    } catch (e) { formError(player, "Team-Menü", e); }
}

async function showCreateTeamForm(player) {
    try {
        const form = new ModalFormData()
            .title("Team erstellen")
            .textField("Teamname", "MeinTeam", { defaultValue: "" })
            .textField("Farbe", "§f", { defaultValue: "§f" });
        const r = await form.show(player);
        if (r.canceled) return;
        const name = String(r.formValues?.[0] ?? "").trim();
        const color = String(r.formValues?.[1] ?? "§f").trim() || "§f";
        if (!name) return player.sendMessage("§cKein Teamname angegeben.");
        run(player, `siedler:team_create ${JSON.stringify(name)} ${JSON.stringify(color)}`);
    } catch (e) { formError(player, "Erstellen", e); }
}

async function showAddPlayerForm(player) {
    try {
        const teams = getTeams();
        const teamNames = Object.keys(teams);
        const players = world.getPlayers();
        if (!teamNames.length) return player.sendMessage("§7Es sind noch keine Teams vorhanden.");
        if (!players.length) return player.sendMessage("§7Es sind keine Spieler online.");
        const form = new ModalFormData()
            .title("Spieler zu Team hinzufügen")
            .dropdown("Spieler", players.map(p => p.name), { defaultValueIndex: Math.max(0, players.findIndex(p => p.id === player.id)) })
            .dropdown("Team", teamNames, { defaultValueIndex: 0 });
        const r = await form.show(player);
        if (r.canceled) return;
        const target = players[Number(r.formValues?.[0])];
        const team = teamNames[Number(r.formValues?.[1])];
        if (!target || !team) return player.sendMessage("§cUngültige Auswahl.");
        run(player, `siedler:team_add ${JSON.stringify(target.name)} ${JSON.stringify(team)}`);
    } catch (e) { formError(player, "Hinzufügen", e); }
}

async function showRemovePlayerForm(player) {
    try {
        const teams = getTeams();
        const names = Object.keys(teams);
        if (!names.length) return player.sendMessage("§7Es sind noch keine Teams vorhanden.");
        const teamForm = new ModalFormData().title("Spieler entfernen").dropdown("Team", names, { defaultValueIndex: 0 });
        const tr = await teamForm.show(player);
        if (tr.canceled) return;
        const team = names[Number(tr.formValues?.[0])];
        const ids = Array.isArray(teams[team]?.players) ? teams[team].players : [];
        const members = world.getPlayers().filter(p => ids.includes(p.id));
        if (!members.length) return player.sendMessage("§7Kein Mitglied dieses Teams ist online.");
        const memberForm = new ModalFormData().title(`Spieler aus ${team} entfernen`).dropdown("Spieler", members.map(p => p.name), { defaultValueIndex: 0 });
        const mr = await memberForm.show(player);
        if (mr.canceled) return;
        const target = members[Number(mr.formValues?.[0])];
        if (!target) return player.sendMessage("§cUngültige Spielerauswahl.");
        run(player, `siedler:team_remove ${JSON.stringify(target.name)} ${JSON.stringify(team)}`);
    } catch (e) { formError(player, "Entfernen", e); }
}

function showTeamList(player) {
    const teams = getTeams();
    const names = Object.keys(teams);
    if (!names.length) return player.sendMessage("§7Es sind aktuell keine Teams registriert.");
    player.sendMessage("§6--- Registrierte Teams ---");
    const online = world.getPlayers();
    for (const name of names) {
        const members = Array.isArray(teams[name]?.players) ? teams[name].players : [];
        const display = members.map(id => online.find(p => p.id === id)?.name ?? "§7[offline]§r");
        player.sendMessage(`${teams[name]?.color || "§f"}${name}§r: ${display.length ? display.join(", ") : "§7Keine Spieler§r"}`);
    }
}

async function showDeleteTeamForm(player) {
    try {
        const teams = getTeams();
        const names = Object.keys(teams);
        if (!names.length) return player.sendMessage("§7Es sind keine Teams zum Löschen vorhanden.");
        const form = new ActionFormData().title("Team löschen").body("Wähle ein Team:");
        for (const name of names) form.button(formatTeam(teams, name));
        const r = await form.show(player);
        if (r.canceled) return;
        const name = names[r.selection];
        if (name) run(player, `siedler:team_delete ${JSON.stringify(name)}`);
    } catch (e) { formError(player, "Löschen", e); }
}

async function showDiplomacyMenu(player) {
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
function run(player, command) {
    try { return player.runCommand(command); }
    catch (e) { console.error(`[Teams] Befehl fehlgeschlagen: ${command}: ${e}`); player.sendMessage(`§cBefehl fehlgeschlagen: ${e}`); return null; }
}
function formError(player, action, error) {
    console.error(`[Teams] ${action}: ${error}`);
    player.sendMessage(`§cFehler beim ${action}: ${error}`);
}

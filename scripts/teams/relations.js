import { getTeams, saveTeams } from "./index.js";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import {
    system,
    CommandPermissionLevel,
    CustomCommandParamType,
    CustomCommandStatus
} from "@minecraft/server";

export const TEAM_RELATION = Object.freeze({
    FRIENDLY: "friendly",
    NEUTRAL: "neutral",
    HOSTILE: "hostile"
});

export function getTeamRelation(teamA, teamB) {
    if (!teamA || !teamB) return TEAM_RELATION.NEUTRAL;
    if (teamA === teamB) return TEAM_RELATION.FRIENDLY;

    const teamData = getTeams()[teamA];
    return teamData?.relations?.[teamB] ?? TEAM_RELATION.NEUTRAL;
}

export function setTeamRelation(teamA, teamB, relation) {
    if (!teamA || !teamB || teamA === teamB) return false;
    if (!Object.values(TEAM_RELATION).includes(relation)) return false;

    const teams = getTeams();
    if (!teams[teamA] || !teams[teamB]) return false;

    teams[teamA].relations ??= {};
    teams[teamB].relations ??= {};
    teams[teamA].relations[teamB] = relation;
    teams[teamB].relations[teamA] = relation;

    return saveTeams(teams);
}

function playerOnly(origin) {
    const player = origin?.sourceEntity;
    return player?.typeId === "minecraft:player" ? player : null;
}

export async function showDiplomacyMenu(player) {
    try {
        const names = Object.keys(getTeams());
        if (names.length < 2) {
            player.sendMessage("§7Für Diplomatie werden mindestens zwei Teams benötigt.");
            return;
        }

        const form = new ActionFormData()
            .title("Diplomatie")
            .body("Verwalte die Beziehungen zwischen Teams.")
            .button("Beziehung ändern")
            .button("Beziehungen anzeigen");

        const result = await form.show(player);
        if (result.canceled) return;

        if (result.selection === 0) await showSetRelationForm(player);
        else if (result.selection === 1) showRelations(player);
    } catch (error) {
        formError(player, "Diplomatie", error);
    }
}

async function showSetRelationForm(player) {
    const teams = getTeams();
    const names = Object.keys(teams);

    if (names.length < 2) {
        player.sendMessage("§7Es werden mindestens zwei Teams benötigt.");
        return;
    }

    const values = [
        TEAM_RELATION.FRIENDLY,
        TEAM_RELATION.NEUTRAL,
        TEAM_RELATION.HOSTILE
    ];
    const labels = ["§aVerbündet", "§eNeutral", "§cFeindlich"];

    const form = new ModalFormData()
        .title("Team-Beziehung ändern")
        .dropdown("Team A", names, { defaultValueIndex: 0 })
        .dropdown("Team B", names, { defaultValueIndex: 1 })
        .dropdown("Beziehung", labels, { defaultValueIndex: 1 });

    const result = await form.show(player);
    if (result.canceled) return;

    const a = names[Number(result.formValues?.[0])];
    const b = names[Number(result.formValues?.[1])];
    const relation = values[Number(result.formValues?.[2])];

    if (!a || !b || !relation) {
        player.sendMessage("§cUngültige Auswahl.");
        return;
    }

    if (a === b) {
        player.sendMessage("§cEin Team kann keine Beziehung zu sich selbst haben.");
        return;
    }

    if (!setTeamRelation(a, b, relation)) {
        player.sendMessage("§cDie Beziehung konnte nicht gespeichert werden.");
        return;
    }

    player.sendMessage(
        `§aBeziehung gesetzt: ${formatTeam(teams, a)} §7↔ ${formatTeam(teams, b)} §7= ${formatRelation(relation)}`
    );
}

function showRelations(player) {
    const teams = getTeams();
    const names = Object.keys(teams);
    const shown = new Set();

    player.sendMessage("§6--- Diplomatie ---");

    for (const a of names) {
        for (const b of names) {
            if (a === b) continue;

            const key = [a, b].sort().join("::");
            if (shown.has(key)) continue;
            shown.add(key);

            player.sendMessage(
                `${formatTeam(teams, a)} §7↔ ${formatTeam(teams, b)} §7= ${formatRelation(getTeamRelation(a, b))}`
            );
        }
    }
}

function formatTeam(teams, name) {
    return `${teams[name]?.color || "§f"}${name}§r`;
}

function formatRelation(relation) {
    if (relation === TEAM_RELATION.FRIENDLY) return "§aVerbündet§r";
    if (relation === TEAM_RELATION.HOSTILE) return "§cFeindlich§r";
    return "§eNeutral§r";
}

function formError(player, action, error) {
    console.error(`[Teams] ${action}: ${error}`);
    player.sendMessage(`§cFehler beim ${action}: ${error}`);
}

system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;

    registry.registerCommand({
        name: "siedler:diplomacy",
        description: "Öffnet das Diplomatie-Menü.",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false
    }, (origin) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        system.run(() => showDiplomacyMenu(player));
        return { status: CustomCommandStatus.Success };
    });
});

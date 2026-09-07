import { getTeams, saveTeams, getPlayerTeam } from "./index.js";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import {
    system,
    CommandPermissionLevel,
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

/**
 * Opens the player-facing diplomacy dashboard.
 *
 * Everyone can view diplomacy. Players who belong to a team can only change
 * relationships originating from their own team. This prevents a normal
 * player from changing the diplomatic status of two unrelated teams.
 */
export async function showDiplomacyMenu(player) {
    try {
        const teams = getTeams();
        const names = Object.keys(teams);

        if (names.length < 2) {
            player.sendMessage("§7Für Diplomatie werden mindestens zwei Teams benötigt.");
            return;
        }

        const ownTeam = getPlayerTeam(player);
        const body = buildOverview(teams, names, ownTeam);

        const form = new ActionFormData()
            .title("§6Diplomatie")
            .body(body)
            .button("§aBeziehung verwalten\n§7Eigenes Team")
            .button("§bBeziehungen ansehen\n§7Alle Teams")
            .button("§eMein Team\n§7Status & Beziehungen");

        if (!ownTeam) {
            form.button("§7Kein Team\n§8Nur Anzeige verfügbar");
        }

        const result = await form.show(player);
        if (result.canceled) return;

        if (result.selection === 0) {
            if (!ownTeam) {
                player.sendMessage("§eDu bist keinem Team zugeordnet. Du kannst die Diplomatie nur ansehen.");
                return showDiplomacyMenu(player);
            }
            return showSetRelationForm(player, ownTeam);
        }

        if (result.selection === 1) return showRelations(player);
        if (result.selection === 2) return showOwnTeam(player, ownTeam);
    } catch (error) {
        formError(player, "Diplomatie", error);
    }
}

function buildOverview(teams, names, ownTeam) {
    let body = "§7Verwalte und überprüfe die Beziehungen zwischen den Siedler-Teams.\n\n";
    body += `§fTeams: §e${names.length}\n`;

    if (ownTeam && teams[ownTeam]) {
        body += `§fDein Team: ${formatTeam(teams, ownTeam)}\n\n`;

        const counts = countRelations(teams, ownTeam, names);
        body += `§aVerbündet: §f${counts.friendly}   `;
        body += `§eNeutral: §f${counts.neutral}   `;
        body += `§cFeindlich: §f${counts.hostile}`;
    } else {
        body += "§7Du bist aktuell keinem Team zugeordnet.\n\n";
        body += "§8Du kannst die Diplomatie einsehen, aber keine Beziehungen ändern.";
    }

    return body;
}

function countRelations(teams, ownTeam, names) {
    const counts = { friendly: 0, neutral: 0, hostile: 0 };

    for (const name of names) {
        if (name === ownTeam) continue;
        const relation = getTeamRelation(ownTeam, name);
        if (counts[relation] !== undefined) counts[relation]++;
    }

    return counts;
}

async function showSetRelationForm(player, ownTeam) {
    const teams = getTeams();
    const names = Object.keys(teams).filter(name => name !== ownTeam);

    if (!teams[ownTeam]) {
        player.sendMessage("§cDein Team existiert nicht mehr.");
        return;
    }

    if (!names.length) {
        player.sendMessage("§7Es gibt keine anderen Teams, mit denen eine Beziehung verwaltet werden kann.");
        return showDiplomacyMenu(player);
    }

    const values = [
        TEAM_RELATION.FRIENDLY,
        TEAM_RELATION.NEUTRAL,
        TEAM_RELATION.HOSTILE
    ];
    const labels = ["§aVerbündet", "§eNeutral", "§cFeindlich"];

    const form = new ModalFormData()
        .title("§6Diplomatie ändern")
        .dropdown(`Dein Team: ${ownTeam}`, names, { defaultValueIndex: 0 })
        .dropdown("Neue Beziehung", labels, { defaultValueIndex: 1 });

    const result = await form.show(player);
    if (result.canceled) return showDiplomacyMenu(player);

    const targetTeam = names[Number(result.formValues?.[0])];
    const relation = values[Number(result.formValues?.[1])];

    if (!targetTeam || !relation) {
        player.sendMessage("§cUngültige Auswahl.");
        return showDiplomacyMenu(player);
    }

    const current = getTeamRelation(ownTeam, targetTeam);

    if (current === relation) {
        player.sendMessage(
            `§7Die Beziehung zwischen ${formatTeam(teams, ownTeam)} §7und ${formatTeam(teams, targetTeam)} §7ist bereits ${formatRelation(relation)}.`
        );
        return showDiplomacyMenu(player);
    }

    const confirm = new ActionFormData()
        .title("§6Änderung bestätigen")
        .body(
            `${formatTeam(teams, ownTeam)} §7↔ ${formatTeam(teams, targetTeam)}\n\n` +
            `§7Aktuell: ${formatRelation(current)}\n` +
            `§7Neu: ${formatRelation(relation)}\n\n` +
            "§fDie Änderung gilt für beide Teams."
        )
        .button("§aBestätigen")
        .button("§cAbbrechen");

    const confirmation = await confirm.show(player);
    if (confirmation.canceled || confirmation.selection !== 0) {
        return showDiplomacyMenu(player);
    }

    if (!setTeamRelation(ownTeam, targetTeam, relation)) {
        player.sendMessage("§cDie Beziehung konnte nicht gespeichert werden.");
        return;
    }

    player.sendMessage(
        `§aDiplomatie geändert: ${formatTeam(teams, ownTeam)} §7↔ ${formatTeam(teams, targetTeam)} §7= ${formatRelation(relation)}`
    );

    return showDiplomacyMenu(player);
}

async function showRelations(player) {
    const teams = getTeams();
    const names = Object.keys(teams);
    const ownTeam = getPlayerTeam(player);

    const form = new ActionFormData()
        .title("§6Beziehungen")
        .body(
            ownTeam
                ? `§7Dein Team: ${formatTeam(teams, ownTeam)}\n§7Tippe auf ein Team für Details.`
                : "§7Alle gespeicherten Team-Beziehungen."
        );

    const pairs = [];
    const shown = new Set();

    for (const a of names) {
        for (const b of names) {
            if (a === b) continue;

            const key = [a, b].sort().join("::");
            if (shown.has(key)) continue;
            shown.add(key);

            pairs.push({ a, b, relation: getTeamRelation(a, b) });
            form.button(
                `${formatRelationPlain(getTeamRelation(a, b))}\n${a} ↔ ${b}`
            );
        }
    }

    if (!pairs.length) {
        player.sendMessage("§7Noch keine Team-Beziehungen vorhanden.");
        return showDiplomacyMenu(player);
    }

    const result = await form.show(player);
    if (result.canceled) return showDiplomacyMenu(player);

    const pair = pairs[result.selection];
    if (!pair) return showDiplomacyMenu(player);

    return showRelationDetails(player, pair.a, pair.b);
}

async function showRelationDetails(player, teamA, teamB) {
    const teams = getTeams();
    const relation = getTeamRelation(teamA, teamB);
    const canEdit = getPlayerTeam(player) === teamA || getPlayerTeam(player) === teamB;

    const form = new ActionFormData()
        .title("§6Diplomatie-Details")
        .body(
            `${formatTeam(teams, teamA)} §7↔ ${formatTeam(teams, teamB)}\n\n` +
            `§7Beziehung: ${formatRelation(relation)}\n\n` +
            `§7Team A Mitglieder: §f${getMemberCount(teams[teamA])}\n` +
            `§7Team B Mitglieder: §f${getMemberCount(teams[teamB])}`
        )
        .button("§7Zurück");

    if (canEdit) form.button("§eBeziehung ändern");

    const result = await form.show(player);
    if (result.canceled || result.selection === 0) return showRelations(player);

    if (canEdit) {
        const ownTeam = getPlayerTeam(player);
        return showSetRelationForm(player, ownTeam);
    }
}

async function showOwnTeam(player, ownTeam) {
    if (!ownTeam) {
        player.sendMessage("§7Du bist keinem Team zugeordnet.");
        return showDiplomacyMenu(player);
    }

    const teams = getTeams();
    const names = Object.keys(teams).filter(name => name !== ownTeam);
    const counts = countRelations(teams, ownTeam, Object.keys(teams));

    let body = `${formatTeam(teams, ownTeam)}\n\n`;
    body += `§7Mitglieder: §f${getMemberCount(teams[ownTeam])}\n\n`;
    body += `§aVerbündet: §f${counts.friendly}\n`;
    body += `§eNeutral: §f${counts.neutral}\n`;
    body += `§cFeindlich: §f${counts.hostile}`;

    const form = new ActionFormData()
        .title("§6Mein Team")
        .body(body)
        .button("§bBeziehungen anzeigen")
        .button("§aBeziehung ändern")
        .button("§7Zurück");

    const result = await form.show(player);
    if (result.canceled || result.selection === 2) return showDiplomacyMenu(player);
    if (result.selection === 0) return showOwnRelations(player, ownTeam, names);
    if (result.selection === 1) return showSetRelationForm(player, ownTeam);
}

async function showOwnRelations(player, ownTeam, names) {
    const teams = getTeams();
    const form = new ActionFormData()
        .title("§6Meine Diplomatie")
        .body(`${formatTeam(teams, ownTeam)} §7– Beziehungen zu anderen Teams`)
        .button("§7Zurück");

    const targets = [];
    for (const target of names) {
        targets.push(target);
        form.button(`${formatRelationPlain(getTeamRelation(ownTeam, target))}\n${target}`);
    }

    const result = await form.show(player);
    if (result.canceled || result.selection === 0) return showOwnTeam(player, ownTeam);

    const target = targets[result.selection - 1];
    if (!target) return showOwnTeam(player, ownTeam);

    return showRelationDetails(player, ownTeam, target);
}

function getMemberCount(teamData) {
    return Array.isArray(teamData?.players) ? teamData.players.length : 0;
}

function formatTeam(teams, name) {
    return `${teams[name]?.color || "§f"}${name}§r`;
}

function formatRelation(relation) {
    if (relation === TEAM_RELATION.FRIENDLY) return "§aVerbündet§r";
    if (relation === TEAM_RELATION.HOSTILE) return "§cFeindlich§r";
    return "§eNeutral§r";
}

function formatRelationPlain(relation) {
    if (relation === TEAM_RELATION.FRIENDLY) return "§a🤝 Verbündet";
    if (relation === TEAM_RELATION.HOSTILE) return "§c⚔ Feindlich";
    return "§e● Neutral";
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
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false
    }, (origin) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        system.run(() => showDiplomacyMenu(player));
        return { status: CustomCommandStatus.Success };
    });
});

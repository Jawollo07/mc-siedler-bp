import { world, system, CommandPermissionLevel, CustomCommandStatus } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { getClaimAt, countVillagersInTeamClaims, countTeamClaims, getClaims } from "../claims/utils.js";
import { getTeams } from "../teams/index.js";

const DIMENSIONS = ["overworld", "nether", "the_end"];
const SOLDIER_TYPES = ["infantry", "archer", "cavalry"];

function playerOnly(origin) {
    const player = origin?.sourceEntity;
    return player?.typeId === "minecraft:player" ? player : null;
}

function formatPosition(location) {
    return `${Math.floor(location.x)}, ${Math.floor(location.y)}, ${Math.floor(location.z)}`;
}

function formatDimension(player) {
    return player.dimension.id.replace("minecraft:", "");
}

function getPlayerTeam(player) {
    const teams = getTeams();
    for (const [name, data] of Object.entries(teams)) {
        if (Array.isArray(data?.players) && data.players.includes(player.id)) return { name, data };
    }
    return null;
}

function getTeamClaimCount(teamName) {
    return countTeamClaims(teamName, getClaims());
}

function getAllEntities(typeId = null) {
    const entities = [];
    for (const dimensionId of DIMENSIONS) {
        try {
            const dimension = world.getDimension(`minecraft:${dimensionId}`);
            entities.push(...dimension.getEntities(typeId ? { type: typeId } : {}));
        } catch {}
    }
    return entities;
}

function getSoldiers() {
    return getAllEntities().filter(entity => {
        try { return entity.hasTag("soldier") && entity.isValid; } catch { return false; }
    });
}

function getSoldierOwnerId(entity) {
    try {
        const value = entity.getDynamicProperty("soldier:ownerId");
        return typeof value === "string" ? value : null;
    } catch { return null; }
}

function getSoldierType(entity) {
    try {
        const value = entity.getDynamicProperty("soldier:type");
        if (typeof value === "string" && value) return value;
    } catch {}
    for (const type of SOLDIER_TYPES) {
        try { if (entity.hasTag(`soldier_type:${type}`)) return type; } catch {}
    }
    return "unknown";
}

function getSoldierLevel(entity) {
    try {
        const value = Number(entity.getDynamicProperty("soldier:level"));
        return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
    } catch { return 1; }
}

function getSoldierXP(entity) {
    try {
        const value = Number(entity.getDynamicProperty("soldier:xp"));
        return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
    } catch { return 0; }
}

function getTeamSoldiers(team) {
    if (!team) return [];
    const memberIds = new Set(Array.isArray(team.data?.players) ? team.data.players : []);
    return getSoldiers().filter(soldier => memberIds.has(getSoldierOwnerId(soldier)));
}

function buildOverview(player) {
    const team = getPlayerTeam(player);
    const claim = getClaimAt(player.location);
    const claims = team ? getTeamClaimCount(team.name) : 0;
    const villagers = team ? countVillagersInTeamClaims(team.name) : 0;
    const members = team?.data?.players?.length ?? 0;
    const taxBonus = Number(team?.data?.taxBonus ?? 0);
    const taxAmount = Math.min(256, villagers + Math.max(0, taxBonus));
    const soldiers = getTeamSoldiers(team);

    return [
        `§f${player.name}`,
        `§7Position: §f${formatPosition(player.location)}`,
        `§7Dimension: §f${formatDimension(player)}`,
        "",
        "§6§lDein Status",
        `§7Team: ${team ? `§f${team.name}` : "§cKein Team"}`,
        `§7Aktueller Claim: ${claim ? `§a${claim.team}` : "§7Frei"}`,
        `§7Teammitglieder: §f${members}`,
        `§7Team-Claims: §f${claims} Chunks`,
        `§7Dorfbewohner: §f${villagers}`,
        `§7Soldaten: §f${soldiers.length}`,
        `§7TaxBonus: §a+${taxBonus} Emerald/Tag`,
        `§7Tägliche Steuer: §e${taxAmount} Emerald${taxAmount === 1 ? "" : "s"}`
    ].join("\n");
}

function showMainMenu(player) {
    try {
        new ActionFormData()
            .title("§6Siedler – Dashboard")
            .body(buildOverview(player))
            .button("§e👤 Mein Profil")
            .button("§a🛡 Team & Rangliste")
            .button("§6🏠 Claims & Bevölkerung")
            .button("§b💰 Steuern & Wirtschaft")
            .button("§c⚔ Soldaten")
            .button("§d📊 Server-Statistiken")
            .button("§7🔄 Aktualisieren")
            .button("§c✕ Schließen")
            .show(player)
            .then((response) => {
                if (response.canceled) return;
                switch (response.selection) {
                    case 0: showProfile(player); break;
                    case 1: showTeam(player); break;
                    case 2: showClaims(player); break;
                    case 3: showTaxes(player); break;
                    case 4: showSoldiers(player); break;
                    case 5: showServerStats(player); break;
                    case 6: system.run(() => showMainMenu(player)); break;
                }
            })
            .catch((error) => console.error(`[PlayerStats] MainMenu: ${error}`));
    } catch (error) {
        console.error(`[PlayerStats] MainMenu error: ${error}`);
        try { player.sendMessage("§cDas Siedler-Dashboard konnte nicht geöffnet werden."); } catch {}
    }
}

function showProfile(player) {
    const team = getPlayerTeam(player);
    const soldiers = getTeamSoldiers(team).filter(s => getSoldierOwnerId(s) === player.id);
    const totalXP = soldiers.reduce((sum, s) => sum + getSoldierXP(s), 0);
    const avgLevel = soldiers.length ? (soldiers.reduce((sum, s) => sum + getSoldierLevel(s), 0) / soldiers.length).toFixed(1) : "0.0";
    const body = [
        `§6Spieler: §f${player.name}`,
        `§7Position: §f${formatPosition(player.location)}`,
        `§7Dimension: §f${formatDimension(player)}`,
        `§7Online-Spieler: §f${world.getAllPlayers().length}`,
        "",
        team ? `§7Team: §f${team.name}` : "§7Team: §cKeinem Team zugeordnet",
        team ? `§7Teammitglieder: §f${team.data.players?.length ?? 0}` : "",
        `§7Eigene Soldaten: §f${soldiers.length}`,
        `§7Soldaten-XP gesamt: §f${totalXP}`,
        `§7Durchschnittliches Soldatenlevel: §f${avgLevel}`,
        "",
        "§8Dein persönliches Profil"
    ].filter(Boolean).join("\n");
    showSubMenu(player, "§eMein Profil", body, true);
}

function showTeam(player) {
    const team = getPlayerTeam(player);
    if (!team) {
        showSubMenu(player, "§aTeam", "§cDu bist aktuell keinem Team zugeordnet.\n\n§7Ein Team kann dich über das Team-System hinzufügen.", true);
        return;
    }

    const teams = getTeams();
    const ranking = Object.entries(teams)
        .map(([name, data]) => {
            const villagers = countVillagersInTeamClaims(name);
            const claims = getTeamClaimCount(name);
            const soldiers = getTeamSoldiers({ name, data }).length;
            return { name, villagers, claims, soldiers };
        })
        .sort((a, b) => (b.villagers - a.villagers) || (b.soldiers - a.soldiers) || (b.claims - a.claims));

    const rank = Math.max(1, ranking.findIndex(entry => entry.name === team.name) + 1);
    const top = ranking.slice(0, 6).map((entry, index) =>
        `§7${index + 1}. ${entry.name === team.name ? "§e" : "§f"}${entry.name} §8– §a${entry.villagers} §7👤 §b${entry.soldiers} §7⚔ §6${entry.claims} §7⌂`
    );

    const body = [
        `§7Name: §f${team.name}`,
        `§7Rang: §e#${rank}§7 / ${ranking.length}`,
        `§7Mitglieder: §f${team.data.players?.length ?? 0}`,
        `§7Claims: §f${getTeamClaimCount(team.name)} Chunks`,
        `§7Dorfbewohner: §f${countVillagersInTeamClaims(team.name)}`,
        `§7Soldaten: §f${getTeamSoldiers(team).length}`,
        `§7Farbe: ${team.data.color || "§fKeine"}`,
        "",
        "§6§lTeam-Rangliste",
        top.length ? top.join("\n") : "§7Keine Teams vorhanden."
    ].join("\n");
    showSubMenu(player, "§aTeam & Rangliste", body, true);
}

function showClaims(player) {
    const team = getPlayerTeam(player);
    const claim = getClaimAt(player.location);
    const claims = team ? getTeamClaimCount(team.name) : 0;
    const villagers = team ? countVillagersInTeamClaims(team.name) : 0;
    const body = [
        "§6Aktueller Standort",
        `§7Chunk: §f${Math.floor(player.location.x / 16)}, ${Math.floor(player.location.z / 16)}`,
        `§7Claim: ${claim ? `§a${claim.team}` : "§7Frei"}`,
        "",
        "§6Deine Team-Claims",
        team ? `§7Team: §f${team.name}` : "§7Kein Team",
        team ? `§7Beanspruchte Chunks: §f${claims}` : "",
        team ? `§7Dorfbewohner: §f${villagers}` : "",
        team ? `§7Bevölkerung pro Claim: §f${claims ? (villagers / claims).toFixed(1) : "0.0"}` : "",
        team ? "§7Maximal: §f4 Chunks" : ""
    ].filter(Boolean).join("\n");
    showSubMenu(player, "§6Claims & Bevölkerung", body, true);
}

function showTaxes(player) {
    const team = getPlayerTeam(player);
    if (!team) {
        showSubMenu(player, "§bSteuern & Wirtschaft", "§cOhne Team gibt es keine Team-Steuern.", true);
        return;
    }
    const villagers = countVillagersInTeamClaims(team.name);
    const taxBonus = Math.max(0, Number(team.data.taxBonus ?? 0));
    const amount = Math.min(256, villagers + taxBonus);
    const body = [
        `§7Team: §f${team.name}`,
        `§7Dorfbewohner: §f${villagers}`,
        `§7Permanenter TaxBonus: §a+${taxBonus} Emerald/Tag`,
        `§7Tägliche Steuer: §e${amount} Emerald${amount === 1 ? "" : "s"}`,
        `§7Basis + Bonus: §f${villagers} + ${taxBonus} = ${amount}`,
        `§7Steuerkiste: ${team.data.taxChest ? "§aEingerichtet" : "§cNicht eingerichtet"}`,
        "",
        "§8Der TaxBonus entsteht ausschließlich durch besiegte Monster-Tokens und bleibt dauerhaft erhalten."
    ].join("\n");
    showSubMenu(player, "§bSteuern & Wirtschaft", body, true);
}

function showSoldiers(player) {
    const team = getPlayerTeam(player);
    const ownSoldiers = getSoldiers().filter(soldier => getSoldierOwnerId(soldier) === player.id);
    const teamSoldiers = getTeamSoldiers(team);
    const typeCounts = Object.fromEntries(SOLDIER_TYPES.map(type => [type, 0]));
    for (const soldier of ownSoldiers) {
        const type = getSoldierType(soldier);
        if (typeCounts[type] !== undefined) typeCounts[type]++;
    }
    const totalXP = ownSoldiers.reduce((sum, s) => sum + getSoldierXP(s), 0);
    const levelSum = ownSoldiers.reduce((sum, s) => sum + getSoldierLevel(s), 0);
    const avgLevel = ownSoldiers.length ? (levelSum / ownSoldiers.length).toFixed(1) : "0.0";
    const body = [
        `§7Eigene Soldaten: §f${ownSoldiers.length}`,
        `§7Team-Soldaten: §f${teamSoldiers.length}`,
        "",
        `§7Infanterie: §f${typeCounts.infantry}`,
        `§7Bogenschützen: §f${typeCounts.archer}`,
        `§7Kavallerie: §f${typeCounts.cavalry}`,
        "",
        `§7XP gesamt: §f${totalXP}`,
        `§7Durchschnittslevel: §f${avgLevel}`,
        "",
        "§8Soldaten werden über ihre persistenten Owner-, Typ-, Level- und XP-Daten ausgewertet."
    ].join("\n");
    showSubMenu(player, "§cSoldaten", body, true);
}

function showServerStats(player) {
    const players = world.getAllPlayers();
    const teams = getTeams();
    const claims = getClaims();
    const soldiers = getSoldiers();
    const teamCount = Object.keys(teams).length;
    const claimCount = Object.keys(claims).length;
    const villagers = getAllEntities("minecraft:villager").length;
    const monsters = getAllEntities().filter(entity => {
        try { return entity.hasTag("monster") || entity.typeId.includes("zombie") || entity.typeId.includes("skeleton") || entity.typeId.includes("pillager") || entity.typeId.includes("vindicator") || entity.typeId.includes("ravager"); } catch { return false; }
    }).length;
    const soldierTypes = Object.fromEntries(SOLDIER_TYPES.map(type => [type, 0]));
    for (const soldier of soldiers) {
        const type = getSoldierType(soldier);
        if (soldierTypes[type] !== undefined) soldierTypes[type]++;
    }
    const totalXP = soldiers.reduce((sum, s) => sum + getSoldierXP(s), 0);
    const avgLevel = soldiers.length ? (soldiers.reduce((sum, s) => sum + getSoldierLevel(s), 0) / soldiers.length).toFixed(1) : "0.0";

    const body = [
        "§d§lServer-Übersicht",
        `§7Online-Spieler: §f${players.length}`,
        `§7Teams: §f${teamCount}`,
        `§7Beanspruchte Chunks: §f${claimCount}`,
        `§7Dorfbewohner: §f${villagers}`,
        `§7Soldaten: §f${soldiers.length}`,
        `§7Monster: §f${monsters}`,
        "",
        "§d§lSoldaten",
        `§7Infanterie: §f${soldierTypes.infantry}`,
        `§7Bogenschützen: §f${soldierTypes.archer}`,
        `§7Kavallerie: §f${soldierTypes.cavalry}`,
        `§7Soldaten-XP: §f${totalXP}`,
        `§7Durchschnittslevel: §f${avgLevel}`,
        "",
        `§7Deine Dimension: §f${formatDimension(player)}`,
        "§8Siedler Logic – Live-Daten über alle Dimensionen"
    ].join("\n");
    showSubMenu(player, "§dServer-Statistiken", body, true);
}

function showSubMenu(player, title, body, back = true) {
    const form = new ActionFormData().title(title).body(body);
    if (back) form.button("§e← Zurück");
    form.show(player).then((response) => {
        if (!response.canceled && response.selection === 0) system.run(() => showMainMenu(player));
    }).catch((error) => console.error(`[PlayerStats] SubMenu: ${error}`));
}

system.beforeEvents.startup.subscribe((event) => {
    event.customCommandRegistry.registerCommand({
        name: "siedler:stats",
        description: "Öffnet das Siedler-Spieler-Dashboard.",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false
    }, (origin) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => showMainMenu(player));
        return { status: CustomCommandStatus.Success };
    });
});

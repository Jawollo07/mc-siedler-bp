import { world, system, CommandPermissionLevel, CustomCommandStatus } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { getClaimAt, countVillagersInTeamClaims, countTeamClaims, getClaims } from "../claims/utils.js";
import { getTeams } from "../teams/index.js";

function playerOnly(origin) {
    const player = origin?.sourceEntity;
    return player?.typeId === "minecraft:player" ? player : null;
}

function formatPosition(location) {
    return `${Math.floor(location.x)}, ${Math.floor(location.y)}, ${Math.floor(location.z)}`;
}

function getPlayerTeam(player) {
    const teams = getTeams();
    for (const [name, data] of Object.entries(teams)) {
        if (Array.isArray(data?.players) && data.players.includes(player.name)) return { name, data };
    }
    return null;
}

function getTeamClaimCount(teamName) {
    return countTeamClaims(teamName, getClaims());
}

function formatDimension(player) {
    return player.dimension.id.replace("minecraft:", "");
}

function buildOverview(player) {
    const team = getPlayerTeam(player);
    const claim = getClaimAt(player.location);
    const claims = team ? getTeamClaimCount(team.name) : 0;
    const villagers = team ? countVillagersInTeamClaims(team.name) : 0;
    const members = team?.data?.players?.length ?? 0;
    const taxAmount = team ? villagers : 0;
    if (taxAmount < 0) {
        em = "Emerald"
    } else {
        em = "Emeralds"
    }
    return [
        `§f${player.name}`,
        `§7Position: §f${formatPosition(player.location)}`,
        `§7Dimension: §f${formatDimension(player)}`,
        "",
        "§6§lDein Status",
        `§7Team: ${team ? `§f${team.name}` : "§cKein Team"}`,
        `§7Aktueller Claim: ${claim ? `§a${claim.team}` : "§7Frei"}`,
        `§7Teammitglieder: §f${members}`,
        `§7Eigene Claims: §f${claims} Chunks`,
        `§7Dorfbewohner: §f${villagers}`,
        `§7Tägliche Steuer: §e${taxAmount} ${em}`
    ].join("\n");
}

function showMainMenu(player) {
    try {
        new ActionFormData()
            .title("§6Siedler – Hauptmenü")
            .body(buildOverview(player))
            .button("§e👤 Mein Profil")
            .button("§a🛡 Team")
            .button("§6🏠 Claims")
            .button("§b💰 Steuern & Wirtschaft")
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
                    case 4: showServerStats(player); break;
                    case 5: system.run(() => showMainMenu(player)); break;
                }
            })
            .catch((error) => console.error(`[PlayerStats] MainMenu: ${error}`));
    } catch (error) {
        console.error(`[PlayerStats] MainMenu error: ${error}`);
        try { player.sendMessage("§cDas Siedler-Menü konnte nicht geöffnet werden."); } catch {}
    }
}

function showProfile(player) {
    const team = getPlayerTeam(player);
    const body = [
        `§6Spieler: §f${player.name}`,
        `§7Position: §f${formatPosition(player.location)}`,
        `§7Dimension: §f${formatDimension(player)}`,
        `§7Online-Spieler: §f${world.getAllPlayers().length}`,
        "",
        team ? `§7Team: §f${team.name}` : "§7Team: §cKeinem Team zugeordnet",
        team ? `§7Teammitglieder: §f${team.data.players?.length ?? 0}` : "",
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
    const villagers = countVillagersInTeamClaims(team.name);
    const claims = getTeamClaimCount(team.name);
    const body = [
        `§7Name: §f${team.name}`,
        `§7Mitglieder: §f${team.data.players?.length ?? 0}`,
        `§7Claims: §f${claims} Chunks`,
        `§7Dorfbewohner: §f${villagers}`,
        `§7Farbe: ${team.data.color || "§fKeine"}`
    ].join("\n");
    showSubMenu(player, "§aTeam", body, true);
}

function showClaims(player) {
    const team = getPlayerTeam(player);
    const claim = getClaimAt(player.location);
    const claims = team ? getTeamClaimCount(team.name) : 0;
    const body = [
        "§6Aktueller Standort",
        `§7Chunk: §f${Math.floor(player.location.x / 16)}, ${Math.floor(player.location.z / 16)}`,
        `§7Claim: ${claim ? `§a${claim.team}` : "§7Frei"}`,
        "",
        "§6Deine Team-Claims",
        team ? `§7Team: §f${team.name}` : "§7Kein Team",
        team ? `§7Beanspruchte Chunks: §f${claims}` : "",
        team ? `§7Maximal: §f4 Chunks` : ""
    ].filter(Boolean).join("\n");
    showSubMenu(player, "§6Claims", body, true);
}

function showTaxes(player) {
    const team = getPlayerTeam(player);
    if (!team) {
        showSubMenu(player, "§bSteuern & Wirtschaft", "§cOhne Team gibt es keine Team-Steuern.", true);
        return;
    }
    const villagers = countVillagersInTeamClaims(team.name);
    const amount = villagers;
    const body = [
        `§7Team: §f${team.name}`,
        `§7Dorfbewohner: §f${villagers}`,
        `§7Tägliche Steuer: §e${amount} Emeralds`,
        "§7Berechnung: §f1 Emerald pro Dorfbewohner",
        `§7Steuerkiste: ${team.data.taxChest ? "§aEingerichtet" : "§cNicht eingerichtet"}`,
        "",
        "§8Die Steuer wird automatisch am Tagesbeginn ausgezahlt."
    ].join("\n");
    showSubMenu(player, "§bSteuern & Wirtschaft", body, true);
}

function showServerStats(player) {
    const players = world.getAllPlayers();
    const teams = getTeams();
    const claims = getClaims();
    const teamCount = Object.keys(teams).length;
    const claimCount = Object.keys(claims).length;
    const villagerCount = player.dimension.getEntities({ type: "minecraft:villager" }).length;
    const body = [
        `§7Online-Spieler: §f${players.length}`,
        `§7Teams: §f${teamCount}`,
        `§7Beanspruchte Chunks: §f${claimCount}`,
        `§7Dorfbewohner in deiner Dimension: §f${villagerCount}`,
        `§7Deine Dimension: §f${formatDimension(player)}`,
        "",
        "§8Siedler Logic"
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
        description: "Öffnet das Siedler-Spielermenü.",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false
    }, (origin) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => showMainMenu(player));
        return { status: CustomCommandStatus.Success };
    });
});
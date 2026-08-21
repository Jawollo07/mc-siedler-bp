import { world, system, CommandPermissionLevel, CustomCommandStatus } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { getClaimAt, countVillagersInTeamClaims, countTeamClaims } from "../claims/utils.js";
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
        if (Array.isArray(data?.players) && data.players.includes(player.name)) {
            return { name, data };
        }
    }
    return null;
}

function getClaimStats(player) {
    const claim = getClaimAt(player.location);
    const team = getPlayerTeam(player);
    const claims = world.getDynamicProperty("claims");
    let totalChunks = 0;

    if (team && typeof claims === "string") {
        try {
            totalChunks = countTeamClaims(team.name, JSON.parse(claims));
        } catch {}
    }

    return { claim, team, totalChunks };
}

function showPlayerStats(player) {
    try {
        const { claim, team, totalChunks } = getClaimStats(player);
        const villagerCount = team ? countVillagersInTeamClaims(team.name) : 0;
        const teamMembers = team && Array.isArray(team.data.players) ? team.data.players.length : 0;
        const taxAmount = team && Number.isFinite(Number(team.data.taxAmount))
            ? Math.max(0, Math.floor(Number(team.data.taxAmount)))
            : villagerCount;
        const taxChest = team?.data?.taxChest ? "§aEingerichtet" : "§cNicht eingerichtet";

        const claimText = claim
            ? `§a${claim.team}§r`
            : "§7Kein Claim";

        const body = [
            `§6Spieler: §f${player.name}`,
            `§7Position: §f${formatPosition(player.location)}`,
            "",
            "§e── Aktueller Claim ──",
            `§7Status: ${claimText}`,
            claim ? `§7Chunk: §f${Math.floor(player.location.x / 16)}, ${Math.floor(player.location.z / 16)}` : "",
            "",
            "§e── Team ──",
            team ? `§7Team: §f${team.name}` : "§7Team: §cKeinem Team zugeordnet",
            team ? `§7Mitglieder: §f${teamMembers}` : "",
            team ? `§7Claims: §f${totalChunks} Chunks` : "",
            team ? `§7Dorfbewohner: §f${villagerCount}` : "",
            "",
            "§e── Steuern ──",
            team ? `§7Tägliche Steuer: §e${taxAmount} Emeralds` : "§7Keine Team-Steuer",
            team ? `§7Steuerkiste: ${taxChest}` : "",
            "",
            "§e── Server-Statistik ──",
            `§7Online: §f${world.getAllPlayers().length}`,
            `§7Dimension: §f${player.dimension.id.replace("minecraft:", "")}`
        ].filter(Boolean).join("\n");

        new ActionFormData()
            .title("§6Siedler – Spielerinfo")
            .body(body)
            .button("§aAktualisieren")
            .button("§cSchließen")
            .show(player)
            .then((response) => {
                if (!response.canceled && response.selection === 0) {
                    system.run(() => showPlayerStats(player));
                }
            })
            .catch((error) => console.error(`[PlayerStats] show error: ${error}`));
    } catch (error) {
        console.error(`[PlayerStats] Fehler: ${error}`);
        try { player.sendMessage("§cDie Spielerinformationen konnten nicht geöffnet werden."); } catch {}
    }
}

system.beforeEvents.startup.subscribe((event) => {
    event.customCommandRegistry.registerCommand({
        name: "siedler:stats",
        description: "Zeigt deine Spieler-, Team-, Claim- und Steuerstatistiken.",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false
    }, (origin) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => showPlayerStats(player));
        return { status: CustomCommandStatus.Success };
    });
});
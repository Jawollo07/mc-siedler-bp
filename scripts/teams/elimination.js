import {
    world,
    system,
    CommandPermissionLevel,
    CustomCommandParamType,
    CustomCommandStatus
} from "@minecraft/server";
import { getClaimAt } from "../claims/utils.js";
import { getTeams } from "./index.js";
import { createLogger } from "../core/logger.js";

const logger = createLogger("Teams:Elimination");

// The block that acts as a team's elimination/core block.
// Change this single value if the Siedler map uses another block.
export const ELIMINATION_BLOCK_TYPE = "minecraft:beacon";

const ELIMINATED_TEAMS_PROPERTY = "siedler:eliminated_teams";
const ELIMINATED_PLAYERS_PROPERTY = "siedler:eliminated_players";

function readStringArray(propertyId) {
    try {
        const raw = world.getDynamicProperty(propertyId);
        if (typeof raw !== "string" || !raw.length) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(value => typeof value === "string") : [];
    } catch (error) {
        logger.warn(`Ungültige Eliminationsdaten in ${propertyId}: ${error}`);
        return [];
    }
}

function writeStringArray(propertyId, values) {
    try {
        world.setDynamicProperty(propertyId, JSON.stringify([...new Set(values)]));
        return true;
    } catch (error) {
        logger.exception(`Eliminationsdaten konnten nicht gespeichert werden: ${propertyId}`, error);
        return false;
    }
}

function getEliminatedTeams() {
    return readStringArray(ELIMINATED_TEAMS_PROPERTY);
}

function getEliminatedPlayers() {
    return readStringArray(ELIMINATED_PLAYERS_PROPERTY);
}

function isTeamEliminated(teamName) {
    return !!teamName && getEliminatedTeams().includes(teamName);
}

function markTeamEliminated(teamName) {
    if (!teamName || isTeamEliminated(teamName)) return false;

    const teams = getTeams();
    const team = teams[teamName];
    if (!team) return false;

    const eliminatedTeams = getEliminatedTeams();
    eliminatedTeams.push(teamName);

    if (!writeStringArray(ELIMINATED_TEAMS_PROPERTY, eliminatedTeams)) return false;

    const color = team.color || "§f";
    world.sendMessage(`§c§l☠ TEAM AUS! §r${color}${teamName}§r §cist ausgeschieden!`);
    logger.warn(`Team ausgeschieden: ${teamName}`);
    return true;
}

export function clearTeamElimination(teamName) {
    const teams = getTeams();
    const team = teams[teamName];
    if (!team) return { success: false, reason: "unknown_team" };

    const eliminatedTeams = getEliminatedTeams().filter(name => name !== teamName);
    const teamPlayerIds = Array.isArray(team.players) ? team.players : [];
    const eliminatedPlayers = getEliminatedPlayers().filter(id => !teamPlayerIds.includes(id));

    if (!writeStringArray(ELIMINATED_TEAMS_PROPERTY, eliminatedTeams)
        || !writeStringArray(ELIMINATED_PLAYERS_PROPERTY, eliminatedPlayers)) {
        return { success: false, reason: "storage_error" };
    }

    for (const player of world.getPlayers()) {
        if (!teamPlayerIds.includes(player.id)) continue;

        try {
            player.runCommand("gamemode survival");
            player.sendMessage(`§aDie Ausscheidung deines Teams ${team.color || "§f"}${teamName}§a wurde aufgehoben.`);
        } catch (error) {
            logger.exception(`Spielermodus konnte nicht zurückgesetzt werden: ${player.name}`, error);
        }
    }

    logger.info(`Ausscheidung aufgehoben: ${teamName}`);
    return { success: true };
}

function markPlayerEliminated(player) {
    if (!player?.id) return false;

    const eliminatedPlayers = getEliminatedPlayers();
    if (eliminatedPlayers.includes(player.id)) return true;

    eliminatedPlayers.push(player.id);
    return writeStringArray(ELIMINATED_PLAYERS_PROPERTY, eliminatedPlayers);
}

function setSpectator(player, reason = "Team ausgeschieden") {
    if (!player?.isValid) return false;

    try {
        player.runCommand("gamemode spectator");
        logger.info(`Spieler permanent auf Spectator gesetzt: ${player.name} (${player.id}) – ${reason}`);
        return true;
    } catch (error) {
        logger.exception(`Spectator-Modus konnte nicht gesetzt werden: ${player.name}`, error);
        return false;
    }
}

function getBrokenBlockType(event) {
    return event?.brokenBlockPermutation?.type?.id
        ?? event?.block?.typeId
        ?? null;
}

function handleEliminationBlockBreak(event) {
    const player = event?.player;
    const blockType = getBrokenBlockType(event);

    if (!player?.isValid || blockType !== ELIMINATION_BLOCK_TYPE || !event?.block?.location) return;

    const claim = getClaimAt(event.block.location);
    const teamName = claim?.team ?? null;

    if (!teamName) {
        logger.warn(`Eliminationsblock außerhalb eines Claims abgebaut: ${blockType} @ ${Math.floor(event.block.location.x)},${Math.floor(event.block.location.y)},${Math.floor(event.block.location.z)}`);
        return;
    }

    if (!getTeams()[teamName]) {
        logger.warn(`Eliminationsblock gehört zu unbekanntem Claim-Team: ${teamName}`);
        return;
    }

    if (isTeamEliminated(teamName)) return;

    markTeamEliminated(teamName);
}

function getPlayerTeamName(player) {
    if (!player?.id) return null;
    const teams = getTeams();

    for (const [teamName, team] of Object.entries(teams)) {
        if (Array.isArray(team?.players) && team.players.includes(player.id)) {
            return teamName;
        }
    }

    return null;
}

function handlePlayerDeath(event) {
    const player = event?.deadEntity;
    if (player?.typeId !== "minecraft:player" || !player.id) return;

    const teamName = getPlayerTeamName(player);
    if (!teamName || !isTeamEliminated(teamName)) return;

    if (!markPlayerEliminated(player)) return;

    // Delay by one tick because the dead player entity is transitioning into
    // the respawn state. The spawn event below also reapplies the mode.
    system.runTimeout(() => {
        const currentPlayer = world.getPlayers().find(candidate => candidate.id === player.id);
        if (currentPlayer) setSpectator(currentPlayer, `Team ${teamName} ausgeschieden`);
    }, 1);

    logger.info(`Ausgeschiedener Spieler gestorben: ${player.name} (${player.id}), Team=${teamName}`);
}

function handlePlayerSpawn(event) {
    const player = event?.player;
    if (!player?.isValid || !player.id) return;

    if (!getEliminatedPlayers().includes(player.id)) return;

    system.runTimeout(() => {
        const currentPlayer = world.getPlayers().find(candidate => candidate.id === player.id);
        if (currentPlayer) setSpectator(currentPlayer, "permanente Eliminierung");
    }, 1);
}

function enforcePermanentSpectator() {
    const eliminatedPlayers = getEliminatedPlayers();
    if (!eliminatedPlayers.length) return;

    for (const player of world.getPlayers()) {
        if (!player?.isValid || !eliminatedPlayers.includes(player.id)) continue;
        setSpectator(player, "permanente Eliminierung");
    }
}

export function registerEliminationSystem() {
    const breakEvent = world.afterEvents?.playerBreakBlock;
    if (breakEvent && typeof breakEvent.subscribe === "function") {
        breakEvent.subscribe(handleEliminationBlockBreak);
    } else {
        logger.warn("playerBreakBlock-API nicht verfügbar; Team-Eliminierung durch Blockabbau deaktiviert.");
    }

    const deathEvent = world.afterEvents?.entityDie;
    if (deathEvent && typeof deathEvent.subscribe === "function") {
        deathEvent.subscribe(handlePlayerDeath);
    } else {
        logger.warn("entityDie-API nicht verfügbar; permanente Spieler-Eliminierung deaktiviert.");
    }

    const spawnEvent = world.afterEvents?.playerSpawn;
    if (spawnEvent && typeof spawnEvent.subscribe === "function") {
        spawnEvent.subscribe(handlePlayerSpawn);
    } else {
        logger.warn("playerSpawn-API nicht verfügbar; Spectator-Wiederherstellung deaktiviert.");
    }

    // Guarantees that an eliminated player cannot leave spectator mode again,
    // including after commands or other systems change the game mode.
    system.runInterval(enforcePermanentSpectator, 20);

    system.beforeEvents.startup.subscribe((event) => {
        event.customCommandRegistry.registerCommand({
            name: "siedler:team_ausscheidung_aufheben",
            description: "Hebt die Ausscheidung eines Teams auf.",
            permissionLevel: CommandPermissionLevel.GameDirectors,
            cheatsRequired: false,
            mandatoryParameters: [
                { type: CustomCommandParamType.String, name: "team" }
            ]
        }, (origin, team) => {
            const player = origin?.sourceEntity;
            if (player?.typeId !== "minecraft:player") {
                return { status: CustomCommandStatus.Failure };
            }

            const teamName = String(team ?? "").trim();
            system.run(() => {
                const result = clearTeamElimination(teamName);

                if (!result.success) {
                    player.sendMessage(result.reason === "unknown_team"
                        ? `§cDas Team "${teamName}" existiert nicht.`
                        : "§cDie Ausscheidung konnte nicht aufgehoben werden.");
                    return;
                }

                player.sendMessage(`§aDie Ausscheidung von Team "${teamName}" wurde aufgehoben.`);
            });

            return { status: CustomCommandStatus.Success };
        });
    });

    logger.success(`Team-Eliminierung geladen – Eliminationsblock: ${ELIMINATION_BLOCK_TYPE}`);
}

registerEliminationSystem();

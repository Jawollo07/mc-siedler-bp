import {
    system,
    world,
    CommandPermissionLevel,
    CustomCommandParamType,
    CustomCommandStatus
} from "@minecraft/server";
import { showTeamMenu } from "./ui.js";

const OP_PERMISSION = CommandPermissionLevel.GameDirectors;

/**
 * Loads all teams from world dynamic properties.
 *
 * Existing teams are automatically migrated so that every team has a
 * persistent numeric taxBonus property. Older teams without taxBonus are
 * initialized with 0 Emeralds/day.
 *
 * Team structure:
 * {
 *     TeamName: {
 *         color: "§c",
 *         players: ["player-id"],
 *         taxChest: null,
 *         taxBonus: 0,
 *         coords: null
 *     }
 * }
 */
export function getTeams() {
    const rawData = world.getDynamicProperty("teams");

    if (typeof rawData !== "string" || !rawData.length) {
        return {};
    }

    try {
        const parsed = JSON.parse(rawData);

        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return {};
        }

        let migrated = false;

        for (const teamData of Object.values(parsed)) {
            if (!teamData || typeof teamData !== "object" || Array.isArray(teamData)) {
                continue;
            }

            if (!Object.prototype.hasOwnProperty.call(teamData, "taxBonus")) {
                teamData.taxBonus = 0;
                migrated = true;
            } else {
                const numericBonus = Number(teamData.taxBonus);
                if (!Number.isFinite(numericBonus) || numericBonus < 0) {
                    teamData.taxBonus = 0;
                    migrated = true;
                } else if (teamData.taxBonus !== Math.floor(numericBonus)) {
                    teamData.taxBonus = Math.floor(numericBonus);
                    migrated = true;
                }
            }

            const normalizedCoords = normalizeCoordinates(teamData.coords);
            const coordsChanged = normalizedCoords
                ? !teamData.coords
                    || teamData.coords.x !== normalizedCoords.x
                    || teamData.coords.y !== normalizedCoords.y
                    || teamData.coords.z !== normalizedCoords.z
                : teamData.coords !== null;

            if (coordsChanged) {
                teamData.coords = normalizedCoords;
                migrated = true;
            }
        }

        // Persist the migration once so existing teams also receive the field
        // in the world dynamic property, not only in the returned object.
        if (migrated) {
            try {
                world.setDynamicProperty("teams", JSON.stringify(parsed));
            } catch (error) {
                console.error(`[Teams] TaxBonus-Migration konnte nicht gespeichert werden: ${error}`);
            }
        }

        return parsed;
    } catch (error) {
        console.error(`[Teams] Ungültige Team-Daten: ${error}`);
        return {};
    }
}

/**
 * Saves all teams to world dynamic properties.
 */
export function saveTeams(teams) {
    try {
        world.setDynamicProperty("teams", JSON.stringify(teams));
        return true;
    } catch (error) {
        console.error(`[Teams] Fehler beim Speichern der Teams: ${error}`);
        return false;
    }
}

/**
 * Returns the saved coordinates of a team.
 *
 * @param {string} teamName
 * @returns {{x: number, y: number, z: number}|null}
 */
export function getTeamCoordinates(teamName) {
    const coordinates = getTeams()[teamName]?.coords;
    const normalized = normalizeCoordinates(coordinates);

    return normalized ? { ...normalized } : null;
}

/**
 * Saves integer coordinates for a team.
 *
 * @param {string} teamName
 * @param {{x: number, y: number, z: number}} coordinates
 * @returns {boolean}
 */
export function setTeamCoordinates(teamName, coordinates) {
    const normalized = normalizeCoordinates(coordinates);
    if (!normalized) {
        return false;
    }

    const teams = getTeams();
    if (!teams[teamName]) {
        return false;
    }

    teams[teamName].coords = normalized;
    return saveTeams(teams);
}

function normalizeCoordinates(coordinates) {
    if (!coordinates || typeof coordinates !== "object") {
        return null;
    }

    const values = [coordinates.x, coordinates.y, coordinates.z].map(Number);
    if (!values.every(Number.isFinite)) {
        return null;
    }

    return {
        x: Math.floor(values[0]),
        y: Math.floor(values[1]),
        z: Math.floor(values[2])
    };
}

/**
 * Returns the team name of a player.
 *
 * Team membership is stored using player.id, not player.name.
 * This makes the membership independent of the player's display name.
 *
 * @param {Player} player
 * @returns {string|null}
 */
export function getPlayerTeam(player) {
    if (!player?.id) {
        return null;
    }

    const teams = getTeams();

    for (const [teamName, teamData] of Object.entries(teams)) {
        if (!Array.isArray(teamData?.players)) {
            continue;
        }

        if (teamData.players.includes(player.id)) {
            return teamName;
        }
    }

    return null;
}

/**
 * Returns the team name of a registered soldier.
 *
 * Soldiers inherit the team of their owner.
 *
 * @param {object} soldier
 * @returns {string|null}
 */
export function getSoldierTeam(soldier) {
    if (!soldier) {
        return null;
    }

    const ownerId =
        soldier.ownerId ??
        getSoldierOwnerId(soldier.entity);

    if (!ownerId) {
        return null;
    }

    try {
        const owner = world.getPlayers().find(
            player => player.id === ownerId
        );

        return owner ? getPlayerTeam(owner) : null;
    } catch {
        return null;
    }
}

/**
 * Returns the stored owner ID of a soldier entity.
 */
function getSoldierOwnerId(entity) {
    if (!entity?.isValid) {
        return null;
    }

    try {
        const ownerId = entity.getDynamicProperty("soldier:ownerId");
        return typeof ownerId === "string" && ownerId.length
            ? ownerId
            : null;
    } catch {
        return null;
    }
}

/**
 * Returns whether two teams are different.
 *
 * This is intentionally kept simple for now. A future diplomacy system
 * can replace this with explicit ally/neutral/enemy relationships.
 */
export function areTeamsHostile(teamA, teamB) {
    if (!teamA || !teamB) {
        return false;
    }

    return teamA !== teamB;
}

function playerOnly(origin) {
    const player = origin?.sourceEntity;
    return player?.typeId === "minecraft:player" ? player : null;
}

function runPlayerCommand(player, command) {
    try {
        return player.runCommand(command);
    } catch (error) {
        console.error(`[Teams] Befehl fehlgeschlagen: ${command}: ${error}`);
        player.sendMessage(`§cBefehl fehlgeschlagen: ${error}`);
        return null;
    }
}

function registerTeamCommands(registry) {
    registry.registerCommand({
        name: "siedler:team",
        description: "Öffnet das Team-Management UI.",
        permissionLevel: OP_PERMISSION,
        cheatsRequired: false
    }, (origin) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        system.run(() => showTeamMenu(player));

        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({
        name: "siedler:team_create",
        description: "Erstellt ein neues Team.",
        permissionLevel: OP_PERMISSION,
        cheatsRequired: false,
        mandatoryParameters: [
            { type: CustomCommandParamType.String, name: "name" }
        ],
        optionalParameters: [
            { type: CustomCommandParamType.String, name: "farbe" }
        ]
    }, (origin, name, farbe) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        const teamName = String(name ?? "").trim();
        const color = String(farbe ?? "§f").trim() || "§f";

        if (!teamName) {
            player.sendMessage("§cDer Teamname darf nicht leer sein.");
            return { status: CustomCommandStatus.Failure };
        }

        system.run(() => {
            const teams = getTeams();

            if (teams[teamName]) {
                player.sendMessage(
                    `§cDas Team "${teamName}" existiert bereits!`
                );
                return;
            }

            teams[teamName] = {
                color,
                players: [],
                taxChest: null,
                taxBonus: 0,
                coords: null
            };

            player.sendMessage(
                saveTeams(teams)
                    ? `§aTeam "${color}${teamName}§a" wurde erstellt.`
                    : "§cDas Team konnte nicht gespeichert werden."
            );
        });

        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({
        name: "siedler:team_add",
        description: "Fügt einen Spieler zu einem Team hinzu.",
        permissionLevel: OP_PERMISSION,
        cheatsRequired: false,
        mandatoryParameters: [
            { type: CustomCommandParamType.String, name: "spieler" },
            { type: CustomCommandParamType.String, name: "team" }
        ]
    }, (origin, spieler, team) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        const targetName = String(spieler ?? "").trim();
        const teamName = String(team ?? "").trim();

        system.run(() => {
            const teams = getTeams();
            const teamData = teams[teamName];

            if (!teamData) {
                player.sendMessage(
                    `§cDas Team "${teamName}" existiert nicht.`
                );
                return;
            }

            const targetPlayer = world.getPlayers().find(
                target => target.name === targetName
            );

            if (!targetPlayer) {
                player.sendMessage(
                    `§cDer Spieler "${targetName}" ist nicht online.`
                );
                return;
            }

            const targetId = targetPlayer.id;

            // A player can only belong to one team.
            for (const other of Object.values(teams)) {
                other.players = Array.isArray(other.players)
                    ? other.players.filter(id => id !== targetId)
                    : [];
            }

            teamData.players = Array.isArray(teamData.players)
                ? teamData.players
                : [];

            if (!teamData.players.includes(targetId)) {
                teamData.players.push(targetId);
            }

            if (!saveTeams(teams)) {
                player.sendMessage(
                    "§cDie Teamänderung konnte nicht gespeichert werden."
                );
                return;
            }

            player.sendMessage(
                `§a${targetPlayer.name} wurde zu Team "${teamData.color || "§f"}${teamName}§a" hinzugefügt.`
            );

            targetPlayer.sendMessage(
                `§aDu wurdest dem Team "${teamData.color || "§f"}${teamName}§a" hinzugefügt.`
            );
        });

        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({
        name: "siedler:team_remove",
        description: "Entfernt einen Spieler aus einem Team.",
        permissionLevel: OP_PERMISSION,
        cheatsRequired: false,
        mandatoryParameters: [
            { type: CustomCommandParamType.String, name: "spieler" },
            { type: CustomCommandParamType.String, name: "team" }
        ]
    }, (origin, spieler, team) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        const targetName = String(spieler ?? "").trim();
        const teamName = String(team ?? "").trim();

        system.run(() => {
            const teams = getTeams();
            const teamData = teams[teamName];

            if (!teamData) {
                player.sendMessage(
                    `§cDas Team "${teamName}" existiert nicht.`
                );
                return;
            }

            const targetPlayer = world.getPlayers().find(
                target => target.name === targetName
            );

            if (!targetPlayer) {
                player.sendMessage(
                    `§cDer Spieler "${targetName}" ist nicht online.`
                );
                return;
            }

            teamData.players = Array.isArray(teamData.players)
                ? teamData.players.filter(id => id !== targetPlayer.id)
                : [];

            if (!saveTeams(teams)) {
                player.sendMessage(
                    "§cDie Teamänderung konnte nicht gespeichert werden."
                );
                return;
            }

            player.sendMessage(
                `§e${targetPlayer.name} wurde aus Team "${teamData.color || "§f"}${teamName}§e" entfernt.`
            );

            targetPlayer.sendMessage(
                `§eDu wurdest aus Team "${teamData.color || "§f"}${teamName}§e" entfernt.`
            );
        });

        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({
        name: "siedler:team_delete",
        description: "Löscht ein gesamtes Team.",
        permissionLevel: OP_PERMISSION,
        cheatsRequired: false,
        mandatoryParameters: [
            { type: CustomCommandParamType.String, name: "team" }
        ]
    }, (origin, team) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        const teamName = String(team ?? "").trim();

        system.run(() => {
            const teams = getTeams();

            if (!teams[teamName]) {
                player.sendMessage(
                    `§cDas Team "${teamName}" existiert nicht.`
                );
                return;
            }

            const color = teams[teamName].color || "§f";
            delete teams[teamName];

            player.sendMessage(
                saveTeams(teams)
                    ? `§eTeam "${color}${teamName}§e" wurde gelöscht.`
                    : "§cDas Team konnte nicht gespeichert werden."
            );
        });

        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({
        name: "siedler:team_list",
        description: "Zeigt alle registrierten Teams.",
        permissionLevel: OP_PERMISSION,
        cheatsRequired: false
    }, (origin) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        system.run(() => {
            const teams = getTeams();
            const names = Object.keys(teams);

            if (!names.length) {
                player.sendMessage(
                    "§7Es sind aktuell keine Teams registriert."
                );
                return;
            }

            player.sendMessage("§6--- Registrierte Teams ---");

            for (const name of names) {
                const data = teams[name];
                const members = Array.isArray(data.players)
                    ? data.players
                    : [];

                const memberNames = members.map(id => {
                    const onlinePlayer = world.getPlayers().find(
                        online => online.id === id
                    );

                    return onlinePlayer?.name ?? `§7[offline:${id}]§r`;
                });

                player.sendMessage(
                    `${data.color || "§f"}${name}§r: ${
                        memberNames.length
                            ? memberNames.join(", ")
                            : "§7Keine Spieler§r"
                    }`
                );
            }
        });

        return { status: CustomCommandStatus.Success };
    });
    registry.registerCommand({
        name: "siedler:set_team_coords",
        description: "Speichert die Koordinaten eines Teams.",
        permissionLevel: OP_PERMISSION,
        cheatsRequired: false,
        mandatoryParameters: [
            { type: CustomCommandParamType.String, name: "team" },
            { type: CustomCommandParamType.Float, name: "x" },
            { type: CustomCommandParamType.Float, name: "y" },
            { type: CustomCommandParamType.Float, name: "z" }
        ]
    }, (origin, team, x, y, z) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        const teamName = String(team ?? "").trim();
        const coords = [x, y, z].map(Number);

        if (!coords.every(Number.isFinite)) {
            player.sendMessage("§cUngültige Koordinaten.");
            return { status: CustomCommandStatus.Failure };
        }

        system.run(() => {
            if (!setTeamCoordinates(teamName, { x: coords[0], y: coords[1], z: coords[2] })) {
                player.sendMessage(`§cDie Koordinaten für Team "${teamName}" konnten nicht gespeichert werden.`);
                return;
            }

            player.sendMessage(`§aKoordinaten für Team "${teamName}" wurden auf (${coords[0]}, ${coords[1]}, ${coords[2]}) gesetzt.`);
        });

        return { status: CustomCommandStatus.Success };
    });
}

world.afterEvents.playerSpawn?.subscribe?.((event) => {
    if (!event.initialSpawn) return;

    const player = event.player;

    const teamName = getPlayerTeam(player);

    if (!teamName) {
        return;
    }

    const teamData = getTeams()[teamName];

    player.sendMessage(
        `§aWillkommen zurück! Du bist im Team ${(teamData?.color || "§f")}${teamName}§a.`
    );
});

system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;
    registerTeamCommands(registry);
});

import {
    system,
    world,
    CommandPermissionLevel,
    CustomCommandParamType,
    CustomCommandStatus
} from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";

const OP_PERMISSION = CommandPermissionLevel.GameDirectors;

/**
 * Loads all teams from world dynamic properties.
 *
 * Team structure:
 * {
 *     TeamName: {
 *         color: "§c",
 *         players: ["player-id"],
 *         taxChest: null
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

        return parsed &&
            typeof parsed === "object" &&
            !Array.isArray(parsed)
            ? parsed
            : {};
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
                taxChest: null
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
}

async function showCreateTeamForm(player) {
    try {
        const form = new ModalFormData();
        form.title("Team erstellen");
        form.textField("Teamname", "MeinTeam", { defaultValue: "" });
        form.textField(
            "Farbe (optional, z.B. §c)",
            "§f",
            { defaultValue: "§f" }
        );

        const response = await form.show(player);
        if (response.canceled) return;

        const values = response.formValues ?? [];
        const name = String(values[0] ?? "").trim();
        const color = String(values[1] ?? "§f").trim() || "§f";

        if (!name) {
            player.sendMessage("§cKein Teamname angegeben.");
            return;
        }

        runPlayerCommand(
            player,
            `siedler:team_create ${JSON.stringify(name)} ${JSON.stringify(color)}`
        );
    } catch (error) {
        console.error(`[Teams] showCreateTeamForm error: ${error}`);
        player.sendMessage(`§cFehler beim Erstellen: ${error}`);
    }
}

async function showAddPlayerForm(player) {
    try {
        const form = new ModalFormData();
        form.title("Spieler zu Team hinzufügen");
        form.textField(
            "Spielername (exakt)",
            "SpielerName",
            { defaultValue: "" }
        );
        form.textField(
            "Teamname",
            "TeamName",
            { defaultValue: "" }
        );

        const response = await form.show(player);
        if (response.canceled) return;

        const values = response.formValues ?? [];
        const target = String(values[0] ?? "").trim();
        const team = String(values[1] ?? "").trim();

        if (!target || !team) {
            player.sendMessage("§cSpieler oder Team fehlt.");
            return;
        }

        runPlayerCommand(
            player,
            `siedler:team_add ${JSON.stringify(target)} ${JSON.stringify(team)}`
        );
    } catch (error) {
        console.error(`[Teams] showAddPlayerForm error: ${error}`);
        player.sendMessage(`§cFehler beim Hinzufügen: ${error}`);
    }
}

async function showRemovePlayerForm(player) {
    try {
        const form = new ModalFormData();
        form.title("Spieler aus Team entfernen");
        form.textField(
            "Spielername (exakt)",
            "SpielerName",
            { defaultValue: "" }
        );
        form.textField(
            "Teamname",
            "TeamName",
            { defaultValue: "" }
        );

        const response = await form.show(player);
        if (response.canceled) return;

        const values = response.formValues ?? [];
        const target = String(values[0] ?? "").trim();
        const team = String(values[1] ?? "").trim();

        if (!target || !team) {
            player.sendMessage("§cSpieler oder Team fehlt.");
            return;
        }

        runPlayerCommand(
            player,
            `siedler:team_remove ${JSON.stringify(target)} ${JSON.stringify(team)}`
        );
    } catch (error) {
        console.error(`[Teams] showRemovePlayerForm error: ${error}`);
        player.sendMessage(`§cFehler beim Entfernen: ${error}`);
    }
}

async function showDeleteTeamForm(player) {
    try {
        const teams = Object.keys(getTeams());

        if (!teams.length) {
            player.sendMessage(
                "§7Es sind keine Teams zum Löschen vorhanden."
            );
            return;
        }

        const menu = new ActionFormData();
        menu.title("Team löschen");
        menu.body("Wähle ein Team zum Löschen aus:");

        for (const teamName of teams) {
            const teamData = getTeams()[teamName];
            menu.button(
                (teamData?.color || "§f") + teamName
            );
        }

        const response = await menu.show(player);
        if (response.canceled) return;

        const teamName = teams[response.selection];

        if (teamName) {
            runPlayerCommand(
                player,
                `siedler:team_delete ${JSON.stringify(teamName)}`
            );
        }
    } catch (error) {
        console.error(`[Teams] showDeleteTeamForm error: ${error}`);
        player.sendMessage(`§cFehler beim Löschen: ${error}`);
    }
}

async function showTeamMenu(player) {
    try {
        const menu = new ActionFormData();
        menu.title("Team-Management");
        menu.body("Wähle eine Aktion:");
        menu.button("Team erstellen");
        menu.button("Spieler hinzufügen");
        menu.button("Spieler entfernen");
        menu.button("Team löschen");
        menu.button("Teams anzeigen");
        menu.button("Steuer setzen (Befehl)");

        const response = await menu.show(player);
        if (response.canceled) return;

        switch (response.selection) {
            case 0:
                await showCreateTeamForm(player);
                break;
            case 1:
                await showAddPlayerForm(player);
                break;
            case 2:
                await showRemovePlayerForm(player);
                break;
            case 3:
                await showDeleteTeamForm(player);
                break;
            case 4:
                runPlayerCommand(player, "siedler:team_list");
                break;
            case 5:
                player.sendMessage(
                    "§eVerwende /siedler:team_settax <team> <x> <y> <z> [amount]."
                );
                break;
        }
    } catch (error) {
        console.error(`[Teams] showTeamMenu error: ${error}`);
        player.sendMessage(`§cFehler beim Team-Menü: ${error}`);
    }
}

/**
 * Migrates an old name-based team membership to the player's ID.
 *
 * This runs when a player joins, so existing teams can be migrated
 * without requiring access to offline players.
 */
function migratePlayerMembership(player) {
    if (!player?.id || !player?.name) {
        return;
    }

    const teams = getTeams();
    let changed = false;

    for (const teamData of Object.values(teams)) {
        if (!Array.isArray(teamData?.players)) {
            continue;
        }

        if (!teamData.players.includes(player.name)) {
            continue;
        }

        teamData.players = teamData.players.filter(
            identifier => identifier !== player.name
        );

        if (!teamData.players.includes(player.id)) {
            teamData.players.push(player.id);
        }

        changed = true;
    }

    if (changed && !saveTeams(teams)) {
        console.error(
            `[Teams] Konnte Team-Mitgliedschaft von ${player.name} nicht migrieren.`
        );
    }
}

world.afterEvents.playerSpawn?.subscribe?.((event) => {
    if (!event.initialSpawn) return;

    const player = event.player;

    // Convert legacy name-based memberships when the player joins.
    migratePlayerMembership(player);

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

import {
    system,
    world,
    CommandPermissionLevel,
    CustomCommandParamType,
    CustomCommandStatus
} from "@minecraft/server";

export function getTeams() {
    const rawData = world.getDynamicProperty("teams");
    if (typeof rawData !== "string" || rawData.length === 0) return {};

    try {
        const parsed = JSON.parse(rawData);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
        console.error(`[Teams] Ungültige Team-Daten: ${error}`);
        return {};
    }
}

function saveTeams(teamsObject) {
    try {
        world.setDynamicProperty("teams", JSON.stringify(teamsObject));
        return true;
    } catch (error) {
        console.error(`[Teams] Fehler beim Speichern: ${error}`);
        return false;
    }
}

function getPlayer(origin) {
    const player = origin.sourceEntity;
    return player?.typeId === "minecraft:player" ? player : null;
}

world.afterEvents.playerSpawn.subscribe((event) => {
    if (!event.initialSpawn) return;

    const player = event.player;
    const teams = getTeams();

    for (const [teamName, data] of Object.entries(teams)) {
        if (Array.isArray(data.players) && data.players.includes(player.name)) {
            player.sendMessage(`§aWillkommen zurück! Du bist im Team ${(data.color || "§f")}${teamName}§a.`);
            break;
        }
    }
});

system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;

    registry.registerCommand({
        name: "team:create",
        description: "Erstellt ein neues Team mit einer optionalen Farbe.",
        permissionLevel: CommandPermissionLevel.Operator,
        cheatsRequired: false,
        mandatoryParameters: [{ type: CustomCommandParamType.String, name: "name" }],
        optionalParameters: [{ type: CustomCommandParamType.String, name: "farbe" }]
    }, (origin, args) => {
        const player = getPlayer(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        const teamName = String(args[0] ?? "").trim();
        const color = String(args[1] ?? "§f");
        if (!teamName) {
            player.sendMessage("§cDer Teamname darf nicht leer sein.");
            return { status: CustomCommandStatus.Failure };
        }

        system.run(() => {
            const teams = getTeams();
            if (teams[teamName]) {
                player.sendMessage(`§cDas Team "${teamName}" existiert bereits!`);
                return;
            }

            teams[teamName] = { color, players: [], taxChest: null, taxAmount: null };
            if (!saveTeams(teams)) {
                player.sendMessage("§cDas Team konnte nicht gespeichert werden.");
                return;
            }
            player.sendMessage(`§aTeam "${color}${teamName}§a" wurde erstellt.`);
        });

        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({
        name: "team:add",
        description: "Fügt einen Spieler zu einem Team hinzu (auch offline möglich).",
        permissionLevel: CommandPermissionLevel.Operator,
        cheatsRequired: false,
        mandatoryParameters: [
            { type: CustomCommandParamType.String, name: "spieler" },
            { type: CustomCommandParamType.String, name: "team" }
        ]
    }, (origin, args) => {
        const player = getPlayer(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        const targetName = String(args[0] ?? "");
        const teamName = String(args[1] ?? "");

        system.run(() => {
            const teams = getTeams();
            const team = teams[teamName];
            if (!team) {
                player.sendMessage(`§cDas Team "${teamName}" existiert nicht.`);
                return;
            }

            team.players = Array.isArray(team.players) ? team.players : [];
            if (team.players.includes(targetName)) {
                player.sendMessage(`§c${targetName} ist bereits in diesem Team.`);
                return;
            }

            for (const otherTeam of Object.values(teams)) {
                otherTeam.players = Array.isArray(otherTeam.players) ? otherTeam.players.filter((name) => name !== targetName) : [];
            }

            team.players.push(targetName);
            if (!saveTeams(teams)) {
                player.sendMessage("§cDie Teamänderung konnte nicht gespeichert werden.");
                return;
            }

            player.sendMessage(`§a${targetName} wurde zu Team "${team.color || "§f"}${teamName}§a" hinzugefügt.`);
            const onlinePlayer = world.getPlayers().find((p) => p.name === targetName);
            onlinePlayer?.sendMessage(`§aDu wurdest dem Team "${team.color || "§f"}${teamName}§a" hinzugefügt.`);
        });

        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({
        name: "team:remove",
        description: "Entfernt einen Spieler aus einem Team (auch offline möglich).",
        permissionLevel: CommandPermissionLevel.Operator,
        cheatsRequired: false,
        mandatoryParameters: [
            { type: CustomCommandParamType.String, name: "spieler" },
            { type: CustomCommandParamType.String, name: "team" }
        ]
    }, (origin, args) => {
        const player = getPlayer(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        const targetName = String(args[0] ?? "");
        const teamName = String(args[1] ?? "");

        system.run(() => {
            const teams = getTeams();
            const team = teams[teamName];
            if (!team) {
                player.sendMessage(`§cDas Team "${teamName}" existiert nicht.`);
                return;
            }

            team.players = Array.isArray(team.players) ? team.players : [];
            if (!team.players.includes(targetName)) {
                player.sendMessage(`§c${targetName} ist nicht in diesem Team.`);
                return;
            }

            team.players = team.players.filter((name) => name !== targetName);
            if (!saveTeams(teams)) {
                player.sendMessage("§cDie Teamänderung konnte nicht gespeichert werden.");
                return;
            }

            player.sendMessage(`§e${targetName} wurde aus Team "${team.color || "§f"}${teamName}§e" entfernt.`);
            world.getPlayers().find((p) => p.name === targetName)?.sendMessage(`§eDu wurdest aus dem Team "${team.color || "§f"}${teamName}§e" entfernt.`);
        });

        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({
        name: "team:delete",
        description: "Löscht ein gesamtes Team.",
        permissionLevel: CommandPermissionLevel.Operator,
        cheatsRequired: false,
        mandatoryParameters: [{ type: CustomCommandParamType.String, name: "team" }]
    }, (origin, args) => {
        const player = getPlayer(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        const teamName = String(args[0] ?? "");
        system.run(() => {
            const teams = getTeams();
            if (!teams[teamName]) {
                player.sendMessage(`§cDas Team "${teamName}" existiert nicht.`);
                return;
            }

            const color = teams[teamName].color || "§f";
            delete teams[teamName];
            if (!saveTeams(teams)) {
                player.sendMessage("§cDas Team konnte nicht gelöscht werden.");
                return;
            }
            player.sendMessage(`§eTeam "${color}${teamName}§e" wurde gelöscht.`);
        });

        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({
        name: "team:list",
        description: "Zeigt alle registrierten Teams und deren Spieler.",
        permissionLevel: CommandPermissionLevel.Operator,
        cheatsRequired: false
    }, (origin) => {
        const player = getPlayer(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        system.run(() => {
            const teams = getTeams();
            const teamKeys = Object.keys(teams);
            if (teamKeys.length === 0) {
                player.sendMessage("§7Es sind aktuell keine Teams registriert.");
                return;
            }

            player.sendMessage("§6--- Registrierte Teams ---");
            for (const teamName of teamKeys) {
                const data = teams[teamName];
                const members = Array.isArray(data.players) ? data.players : [];
                const memberList = members.length ? members.join(", ") : "§7Keine Spieler§r";
                const taxInfo = data.taxChest
                    ? `§7(Steuerkiste: ${data.taxChest.x} ${data.taxChest.y} ${data.taxChest.z})`
                    : "§8(keine Steuerkiste)";
                player.sendMessage(`${data.color || "§f"}${teamName}§r: ${memberList} ${taxInfo}`);
            }
        });

        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({
        name: "team:settax",
        description: "Setzt die Steuerkiste und optional den Betrag für ein Team.",
        permissionLevel: CommandPermissionLevel.Operator,
        cheatsRequired: false,
        mandatoryParameters: [
            { type: CustomCommandParamType.String, name: "team" },
            { type: CustomCommandParamType.Integer, name: "x" },
            { type: CustomCommandParamType.Integer, name: "y" },
            { type: CustomCommandParamType.Integer, name: "z" }
        ],
        optionalParameters: [{ type: CustomCommandParamType.Integer, name: "amount" }]
    }, (origin, args) => {
        const player = getPlayer(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        const teamName = String(args[0] ?? "");
        const x = args[1];
        const y = args[2];
        const z = args[3];
        const amount = args[4];

        system.run(() => {
            const teams = getTeams();
            const team = teams[teamName];
            if (!team) {
                player.sendMessage(`§cDas Team "${teamName}" existiert nicht.`);
                return;
            }

            team.taxChest = { x, y, z };
            if (amount !== undefined) {
                team.taxAmount = Math.max(0, Number(amount));
            }

            if (!saveTeams(teams)) {
                player.sendMessage("§cDie Steuerkonfiguration konnte nicht gespeichert werden.");
                return;
            }

            const color = team.color || "§f";
            const amountText = amount !== undefined ? ` §7(${Number(amount)} Emeralds)` : "";
            player.sendMessage(`§aSteuerkiste für Team "${color}${teamName}§a" gesetzt auf §e${x} ${y} ${z}${amountText}`);
        });

        return { status: CustomCommandStatus.Success };
    });
});

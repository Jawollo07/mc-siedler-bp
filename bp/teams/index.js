import { 
    system, 
    world, 
    CommandPermissionLevel, 
    CustomCommandParamType,
    CustomCommandStatus 
} from "@minecraft/server";

// Dynamische Property registrieren
world.beforeEvents.worldInitialize.subscribe((event) => {
    event.dynamicPropertiesDefinition.defineString("teams", 32767);
});

// Hilfsfunktionen
export function getTeams() {
    const rawData = world.getDynamicProperty("teams");
    return rawData ? JSON.parse(rawData) : {};
}

function saveTeams(teamsObject) {
    world.setDynamicProperty("teams", JSON.stringify(teamsObject));
}

// Beim Join: Spieler begrüßen, falls er in einem Team ist
world.afterEvents.playerSpawn.subscribe((event) => {
    if (!event.initialSpawn) return;

    const player = event.player;
    const teams = getTeams();

    for (const [teamName, data] of Object.entries(teams)) {
        if (data.players.includes(player.name)) {
            player.sendMessage(`§aWillkommen zurück! Du bist im Team \( {data.color} \){teamName}§a.`);
            break;
        }
    }
});

// Custom Commands
system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;

    // ==========================================
    // /team:create <Name> [Farbe]
    // ==========================================
    registry.registerCommand(
        {
            name: "team:create",
            description: "Erstellt ein neues Team mit einer optionalen Farbe.",
            permissionLevel: CommandPermissionLevel.Operator,
            cheatsRequired: false,
            mandatoryParameters: [
                { type: CustomCommandParamType.String, name: "name" }
            ],
            optionalParameters: [
                { type: CustomCommandParamType.String, name: "farbe" }
            ]
        },
        (origin, args) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };

            const teamName = args[0];
            const color = args[1] || "§f";

            system.run(() => {
                const teams = getTeams();
                if (teams[teamName]) {
                    player.sendMessage(`§cDas Team "${teamName}" existiert bereits!`);
                    return;
                }

                teams[teamName] = { 
                    color: color, 
                    players: [],
                    taxChest: null,
                    taxAmount: null
                };
                saveTeams(teams);
                player.sendMessage(`§aTeam "\( {color} \){teamName}§a" wurde erstellt.`);
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    // ==========================================
    // /team:add <Spieler> <Team>   ← funktioniert auch offline / vor dem ersten Join
    // ==========================================
    registry.registerCommand(
        {
            name: "team:add",
            description: "Fügt einen Spieler zu einem Team hinzu (auch offline möglich).",
            permissionLevel: CommandPermissionLevel.Operator,
            cheatsRequired: false,
            mandatoryParameters: [
                { type: CustomCommandParamType.String, name: "spieler" },
                { type: CustomCommandParamType.String, name: "team" }
            ]
        },
        (origin, args) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };

            const targetName = args[0];
            const teamName = args[1];

            system.run(() => {
                const teams = getTeams();
                if (!teams[teamName]) {
                    player.sendMessage(`§cDas Team "${teamName}" existiert nicht.`);
                    return;
                }

                // Schon im Ziel-Team?
                if (teams[teamName].players.includes(targetName)) {
                    player.sendMessage(`§c${targetName} ist bereits in diesem Team.`);
                    return;
                }

                // Aus allen anderen Teams entfernen
                for (const t of Object.values(teams)) {
                    t.players = t.players.filter(name => name !== targetName);
                }

                teams[teamName].players.push(targetName);
                saveTeams(teams);

                player.sendMessage(`§a\( {targetName} wurde zu Team " \){teams[teamName].color}${teamName}§a" hinzugefügt.`);

                // Falls der Spieler gerade online ist → sofort benachrichtigen
                const onlinePlayer = world.getPlayers().find(p => p.name === targetName);
                if (onlinePlayer) {
                    onlinePlayer.sendMessage(`§aDu wurdest dem Team "\( {teams[teamName].color} \){teamName}§a" hinzugefügt.`);
                }
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    // ==========================================
    // /team:remove <Spieler> <Team>   ← funktioniert auch offline
    // ==========================================
    registry.registerCommand(
        {
            name: "team:remove",
            description: "Entfernt einen Spieler aus einem Team (auch offline möglich).",
            permissionLevel: CommandPermissionLevel.Operator,
            cheatsRequired: false,
            mandatoryParameters: [
                { type: CustomCommandParamType.String, name: "spieler" },
                { type: CustomCommandParamType.String, name: "team" }
            ]
        },
        (origin, args) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };

            const targetName = args[0];
            const teamName = args[1];

            system.run(() => {
                const teams = getTeams();
                if (!teams[teamName]) {
                    player.sendMessage(`§cDas Team "${teamName}" existiert nicht.`);
                    return;
                }

                if (!teams[teamName].players.includes(targetName)) {
                    player.sendMessage(`§c${targetName} ist nicht in diesem Team.`);
                    return;
                }

                teams[teamName].players = teams[teamName].players.filter(name => name !== targetName);
                saveTeams(teams);

                player.sendMessage(`§e\( {targetName} wurde aus Team " \){teams[teamName].color}${teamName}§e" entfernt.`);

                // Falls online → benachrichtigen
                const onlinePlayer = world.getPlayers().find(p => p.name === targetName);
                if (onlinePlayer) {
                    onlinePlayer.sendMessage(`§eDu wurdest aus dem Team "\( {teams[teamName].color} \){teamName}§e" entfernt.`);
                }
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    // ==========================================
    // /team:delete <Team>
    // ==========================================
    registry.registerCommand(
        {
            name: "team:delete",
            description: "Löscht ein gesamtes Team.",
            permissionLevel: CommandPermissionLevel.Operator,
            cheatsRequired: false,
            mandatoryParameters: [
                { type: CustomCommandParamType.String, name: "team" }
            ]
        },
        (origin, args) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };

            const teamName = args[0];

            system.run(() => {
                const teams = getTeams();
                if (!teams[teamName]) {
                    player.sendMessage(`§cDas Team "${teamName}" existiert nicht.`);
                    return;
                }

                const color = teams[teamName].color;
                delete teams[teamName];
                saveTeams(teams);
                player.sendMessage(`§eTeam "\( {color} \){teamName}§e" wurde gelöscht.`);
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    // ==========================================
    // /team:list
    // ==========================================
    registry.registerCommand(
        {
            name: "team:list",
            description: "Zeigt alle registrierten Teams und deren Spieler.",
            permissionLevel: CommandPermissionLevel.Operator,
            cheatsRequired: false
        },
        (origin) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };

            system.run(() => {
                const teams = getTeams();
                const teamKeys = Object.keys(teams);

                if (teamKeys.length === 0) {
                    player.sendMessage("§7Es sind aktuell keine Teams registriert.");
                    return;
                }

                player.sendMessage("§6--- Registrierte Teams ---");
                for (const t of teamKeys) {
                    const tData = teams[t];

                    const memberList = tData.players.length > 0 
                        ? tData.players.join(", ") 
                        : "§7Keine Spieler§r";

                    const taxInfo = tData.taxChest 
                        ? `§7(Steuerkiste: ${tData.taxChest.x} ${tData.taxChest.y} ${tData.taxChest.z})` 
                        : "§8(keine Steuerkiste)";

                    player.sendMessage(`\( {tData.color} \){t}§r: ${memberList} ${taxInfo}`);
                }
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    // ==========================================
    // /team:settax <Team> <x> <y> <z> [amount]
    // ==========================================
    registry.registerCommand(
        {
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
            optionalParameters: [
                { type: CustomCommandParamType.Integer, name: "amount" }
            ]
        },
        (origin, args) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };

            const teamName = args[0];
            const x = args[1];
            const y = args[2];
            const z = args[3];
            const amount = args[4];

            system.run(() => {
                const teams = getTeams();
                if (!teams[teamName]) {
                    player.sendMessage(`§cDas Team "${teamName}" existiert nicht.`);
                    return;
                }

                teams[teamName].taxChest = { x, y, z };
                if (amount !== undefined) {
                    teams[teamName].taxAmount = amount;
                }

                saveTeams(teams);

                let msg = `§aSteuerkiste für Team "\( {teams[teamName].color} \){teamName}§a" gesetzt auf §e${x} ${y} ${z}`;
                if (amount !== undefined) {
                    msg += ` §7(${amount} Emeralds)`;
                }
                player.sendMessage(msg);
            });

            return { status: CustomCommandStatus.Success };
        }
    );
});
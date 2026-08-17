import { 
    system, 
    world, 
    CommandPermissionLevel, 
    CustomCommandParamType,
    CustomCommandStatus 
} from "@minecraft/server";

// 1. DYNAMIC PROPERTIES REGISTRIEREN (Beim Weltstart)
world.beforeEvents.worldInitialize.subscribe((event) => {
    event.dynamicPropertiesDefinition.defineString("teams", 32767);
});

// Hilfsfunktionen zum Laden und Speichern
function getTeams() {
    const rawData = world.getDynamicProperty("teams");
    return rawData ? JSON.parse(rawData) : {};
}

function saveTeams(teamsObject) {
    world.setDynamicProperty("teams", JSON.stringify(teamsObject));
}

// 2. NATIVE SLASH-BEFEHLE REGISTRIEREN
system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;

    // ==========================================
    // /team:create <Name> <Farbe>
    // ==========================================
    registry.registerCommand(
        {
            name: "team:create",
            description: "Erstellt ein neues Team mit einer optionalen Farbe.",
            permissionLevel: CommandPermissionLevel.Operator, // Nur für OPs
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
            if (!player || player.typeId !== "minecraft:player") return;

            // Parameter aus dem args-Array auslesen
            const teamName = args[0];
            const color = args[1] || "§f"; // Standardmäßig Weiß

            system.run(() => {
                const teams = getTeams();
                if (teams[teamName]) {
                    player.sendMessage(`§cDas Team "${teamName}" existiert bereits!`);
                    return;
                }

                teams[teamName] = { color: color, players: [] };
                saveTeams(teams);
                player.sendMessage(`§aTeam "${color}${teamName}§a" wurde erstellt.`);
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    // ==========================================
    // /team:add <Spieler> <Team>
    // ==========================================
    registry.registerCommand(
        {
            name: "team:add",
            description: "Fügt einen Spieler zu einem Team hinzu.",
            permissionLevel: CommandPermissionLevel.Operator,
            cheatsRequired: false,
            mandatoryParameters: [
                { type: CustomCommandParamType.String, name: "spieler" },
                { type: CustomCommandParamType.String, name: "team" }
            ]
        },
        (origin, args) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return;

            const playerName = args[0];
            const teamName = args[1];

            system.run(() => {
                const teams = getTeams();
                if (!teams[teamName]) {
                    player.sendMessage(`§cDas Team "${teamName}" existiert nicht.`);
                    return;
                }
                if (teams[teamName].players.includes(playerName)) {
                    player.sendMessage(`§c${playerName} ist bereits in diesem Team.`);
                    return;
                }

                teams[teamName].players.push(playerName);
                saveTeams(teams);
                player.sendMessage(`§a${playerName} wurde zu Team "${teams[teamName].color}${teamName}§a" hinzugefügt.`);
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
            if (!player || player.typeId !== "minecraft:player") return;

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
                player.sendMessage(`§eTeam "${color}${teamName}§e" wurde gelöscht.`);
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    // ==========================================
    // /team:remove <Spieler> <Team>
    // ==========================================
    registry.registerCommand(
        {
            name: "team:remove",
            description: "Entfernt einen Spieler aus einem Team.",
            permissionLevel: CommandPermissionLevel.Operator,
            cheatsRequired: false,
            mandatoryParameters: [
                { type: CustomCommandParamType.String, name: "spieler" },
                { type: CustomCommandParamType.String, name: "team" }
            ]
        },
        (origin, args) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return;

            const playerName = args[0];
            const teamName = args[1];

            system.run(() => {
                const teams = getTeams();
                if (!teams[teamName]) {
                    player.sendMessage(`§cDas Team "${teamName}" existiert nicht.`);
                    return;
                }
                if (!teams[teamName].players.includes(playerName)) {
                    player.sendMessage(`§c${playerName} ist nicht in diesem Team.`);
                    return;
                }

                teams[teamName].players = teams[teamName].players.filter(p => p !== playerName);
                saveTeams(teams);
                player.sendMessage(`§e${playerName} wurde aus Team "${teams[teamName].color}${teamName}§e" entfernt.`);
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
            if (!player || player.typeId !== "minecraft:player") return;

            system.run(() => {
                const teams = getTeams();
                const teamKeys = Object.keys(teams);

                if (teamKeys.length === 0) {
                    player.sendMessage("§iEs sind aktuell keine Teams registriert.");
                    return;
                }

                player.sendMessage("§6--- Registrierte Teams ---");
                for (const t of teamKeys) {
                    const tData = teams[t];
                    player.sendMessage(`${tData.color}${t}§r: ${tData.players.join(", ") || "§7Keine Spieler§r"}`);
                }
            });

            return { status: CustomCommandStatus.Success };
        }
    );
});

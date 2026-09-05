import {
    system,
    world,
    CommandPermissionLevel,
    CustomCommandParamType,
    CustomCommandStatus
} from "@minecraft/server";
import { getTeams, saveTeams } from "../teams/index.js";

const OP_PERMISSION = CommandPermissionLevel.GameDirectors;

system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;
    registerCommands(registry);
});

function registerCommands(registry) {
    registry.registerCommand({
            name: "siedler:team_tp",
            description: "Teleportiert einen Spieler zu seinem Team",
            permissionLevel: OP_PERMISSION,
            cheatsRequired: false,
            mandatoryParameters: [
                {
                    name: "player",
                    type: CustomCommandParamType.Entity
                }
            ]
        }, (origin, player) => {
            if (!player || player.typeId !== "minecraft:player") {
                return { status: CustomCommandStatus.Failure };
            }
    
            system.run(() => tpPlayerToTeam(player));
    
            return { status: CustomCommandStatus.Success };
    });
    registry.registerCommand({
        name: "siedler:starterkit",
        description: "Gibt dem Spieler ein Starterkit",
        permissionLevel: OP_PERMISSION,
        cheatsRequired: false,
        mandatoryParameters: [
            {
                name: "player",
                type: CustomCommandParamType.Entity
            }
        ]
    }, (origin, player) => {
        if (!player || player.typeId !== "minecraft:player") {
            return { status: CustomCommandStatus.Failure };
        }

        system.run(() => giveStarterKit(player));

        return { status: CustomCommandStatus.Success };
    });
    registry.registerCommand({
        name: "siedler:startgame",
        description: "Startet das Spiel.",
        permissionLevel: OP_PERMISSION,
        cheatsRequired: false
    }, (origin) => {
        if (!origin) return { status: CustomCommandStatus.Failure };

        system.run(() => {
            startGame();
        });

        return { status: CustomCommandStatus.Success };
    });
}

function startGame() {
    const teams = getTeams();
    for (const teamName in teams) {
        const teamData = teams[teamName];
        if (!teamData.players || !teamData.players.length) {
            console.warn(`[StartGame] Team "${teamName}" hat keine Spieler und wird übersprungen.`);
            continue;
        }
        if (!teamData.coords) {
            console.warn(`[StartGame] Team "${teamName}" hat keine Koordinaten und wird übersprungen.`);
            continue;
        }
        for (const playerId of teamData.players) {
            const player = world.getPlayerById(playerId);
            if (!player) {
                console.warn(`[StartGame] Spieler mit ID "${playerId}" nicht gefunden.`);
                continue;
            }
            player.teleport(teamData.coords, world.getDimension("overworld"));
            giveStarterKit(player);
        }
    }
    console.log("[StartGame] Spiel gestartet.");
    world.sendMessage("§aDas Spiel wurde gestartet! Alle Spieler wurden zu ihren Teams teleportiert und haben ein Starterkit erhalten.");
}

function tpPlayerToTeam(player) {
    const teams = getTeams();
    const teamName = Object.keys(teams).find(name => teams[name].players?.includes(player.id));
    if (!teamName) {
        player.sendMessage("§cDer Spieler ist in keinem Team.");
        return;
    }
    const coords = teams[teamName].coords;
    if (coords) {
        player.teleport(coords, world.getDimension("overworld"));
    } else {
        player.sendMessage(`§cDas Team "${teamName}" hat keine Koordinaten gespeichert.`);
    }
}
function giveStarterKit(player) {
    const inventory = player.getComponent("minecraft:inventory").container;
    const items = [
        // Werkzeuge
        { item: "minecraft:stone_pickaxe", count: 1 },
        { item: "minecraft:stone_axe", count: 1 },
        { item: "minecraft:stone_shovel", count: 1 },
        { item: "minecraft:stone_sword", count: 1 },

        // Nahrung
        { item: "minecraft:bread", count: 8 },

        // Grundressourcen
        { item: "minecraft:oak_log", count: 16 },
        { item: "minecraft:coal", count: 8 },
        { item: "minecraft:torch", count: 16 },

        // Landwirtschaft
        { item: "minecraft:wheat_seeds", count: 8 },

        // Nützliche Startressourcen
        { item: "minecraft:bucket", count: 1 },
        { item: "minecraft:leather", count: 4 },
        { item: "minecraft:iron_ingot", count: 3 },
        { item: "minecraft:villager_spawn_egg", count: 5 }
    ];

    for (const { item, count } of items) {
        inventory.addItem(item, count);
    }

    player.sendMessage("§aStarterkit erhalten!");
}

function playerOnly(origin) {
    const player = origin?.sourceEntity;
    return player?.typeId === "minecraft:player" ? player : null;
}
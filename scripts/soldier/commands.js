import { spawnSoldier } from "./spawn.js";
import {
    system,
    CustomCommandParamType,
    CustomCommandStatus,
    CommandPermissionLevel
} from "@minecraft/server";
import {
    commandMove,
    commandFollow,
    commandStay,
    commandAttack,
    commandDefend,
    commandPatrol,
    commandStop
} from "./soldier_commands.js";

system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;
    registerSoldierCommands(registry);
});

function playerOnly(origin) {
    try {
        const player = origin.sourceEntity;

        if (!player || player.typeId !== "minecraft:player") {
            return null;
        }

        return player;
    } catch {
        return null;
    }
}

function registerSoldierCommands(registry) {
    registry.registerCommand(
        {
            name: "siedler:move",
            description: "Bewegt den Soldaten zu einem Zielort",
            permissionLevel: CommandPermissionLevel.GameDirectors,
            cheatsRequired: false,
            mandatoryParameters: [
                { type: CustomCommandParamType.Vector3, name: "Target" }
            ]
        },
        commandMove
    );
    registry.registerCommand(
        {
            name: "siedler:follow",
            description: "Lässt den Soldaten einem Spieler folgen",
            permissionLevel: CommandPermissionLevel.GameDirectors,
            cheatsRequired: false
        },
        commandFollow
    );
    registry.registerCommand(
        {
            name: "siedler:stay",
            description: "Lässt den Soldaten an Ort und Stelle bleiben",
            permissionLevel: CommandPermissionLevel.GameDirectors,
            cheatsRequired: false
        },
        commandStay
    );
    registry.registerCommand(
        {
            name: "siedler:spawn_soldier",
            description: "Spawnt einen Soldaten",
            permissionLevel: CommandPermissionLevel.GameDirectors,
            cheatsRequired: false,
            mandatoryParameters: [
                { type: CustomCommandParamType.String, name: "Type" }
            ],
            optionalParameters: [
                { type: CustomCommandParamType.Integer, name: "Level" }
            ]
        },
        (origin, type, level) => {
            const player = playerOnly(origin);
            if (!player) {
                return { status: CustomCommandStatus.Failure };
            }

            const soldierType = String(type ?? "").trim();
            const soldierLevel = level ?? 1;

            // Command callbacks run in read-only mode, so defer actual work.
            system.run(() => {
                const dimension = player.dimension;
                const location = {
                    x: player.location.x + 2,
                    y: player.location.y,
                    z: player.location.z
                };

                spawnSoldier(
                    dimension,
                    location,
                    soldierType,
                    soldierLevel,
                    player
                );
            });

            return { status: CustomCommandStatus.Success };
        }
    );
}

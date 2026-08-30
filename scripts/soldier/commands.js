import { spawnSoldier } from "./spawn.js"; 
import {
    system,
    CustomCommandParamType,
    CustomCommandStatus,
    CommandPermissionLevel,   // or whatever you prefer
} from "@minecraft/server";

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
            name: "sidler:spawn_soldier",
            description: "Spawnt einen Soldaten",
            permissionLevel: CommandPermissionLevel.GameDirectors, // or .Admin / .Any
            cheatsRequired: false,
            mandatoryParameters: [
                { type: CustomCommandParamType.String, name: "Type" }
            ],
            optionalParameters: [
                { type: CustomCommandParamType.Integer, name: "Level" }
            ]
        },
        (origin, type, level) => {          // parameters come as separate arguments
            const player = playerOnly(origin);
            if (!player) {
                return { status: CustomCommandStatus.Failure };
            }

            const soldierType = String(type ?? "").trim();
            const soldierLevel = level ?? 1;   // default level if not provided
            // Command callbacks run in read-only mode → defer actual work
            system.run(() => {
                const dimension = player.dimension;
                const location = {
                    x: player.location.x + 2,
                    y: player.location.y,
                    z: player.location.z
                };

                spawnSoldier(dimension, location, soldierType, soldierLevel, player);
            });

            return { status: CustomCommandStatus.Success };
        }
    );
};
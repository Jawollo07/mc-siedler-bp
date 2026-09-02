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
} from "./command_manager.js";
import { SOLDIERS } from "./config.js";

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

function nearestOwnedSoldier(player) {
    let nearest = null;
    let nearestDistance = Infinity;

    for (const soldier of SOLDIERS.values()) {
        const entity = soldier?.entity;
        if (
            !entity?.isValid ||
            soldier.ownerId !== player.id ||
            entity.dimension.id !== player.dimension.id
        ) {
            continue;
        }

        const dx = entity.location.x - player.location.x;
        const dy = entity.location.y - player.location.y;
        const dz = entity.location.z - player.location.z;
        const distance = dx * dx + dy * dy + dz * dz;

        if (distance < nearestDistance) {
            nearest = soldier;
            nearestDistance = distance;
        }
    }

    return nearest;
}

function commandResult(success) {
    return {
        status: success
            ? CustomCommandStatus.Success
            : CustomCommandStatus.Failure
    };
}

function registerSoldierCommands(registry) {
    registry.registerCommand(
        {
            name: "siedler:move",
            description: "Bewegt den Soldaten zu einem Zielort",
            permissionLevel: CommandPermissionLevel.GameDirectors,
            cheatsRequired: false,
            mandatoryParameters: [
                { type: CustomCommandParamType.Location, name: "Target" }
            ]
        },
        (origin, target) => {
            const player = playerOnly(origin);
            if (!player) return commandResult(false);

            return commandResult(
                commandMove(nearestOwnedSoldier(player), target)
            );
        }
    );
    registry.registerCommand(
        {
            name: "siedler:follow",
            description: "Lässt den Soldaten einem Spieler folgen",
            permissionLevel: CommandPermissionLevel.GameDirectors,
            cheatsRequired: false
        },
        (origin) => {
            const player = playerOnly(origin);
            if (!player) return commandResult(false);

            return commandResult(
                commandFollow(nearestOwnedSoldier(player))
            );
        }
    );
    registry.registerCommand(
        {
            name: "siedler:stay",
            description: "Lässt den Soldaten an Ort und Stelle bleiben",
            permissionLevel: CommandPermissionLevel.GameDirectors,
            cheatsRequired: false
        },
        (origin) => {
            const player = playerOnly(origin);
            if (!player) return commandResult(false);

            return commandResult(
                commandStay(nearestOwnedSoldier(player))
            );
        }
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

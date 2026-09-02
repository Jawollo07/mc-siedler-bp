import {
    system,
    CustomCommandParamType,
    CustomCommandStatus,
    CommandPermissionLevel
} from "@minecraft/server";
import {
    commandAttack,
    commandDefend,
    commandPatrol,
    commandStop
} from "./command_manager.js";
import { SOLDIERS } from "./config.js";

system.beforeEvents.startup.subscribe((event) => {
    registerRemainingCommands(event.customCommandRegistry);
});

function playerOnly(origin) {
    try {
        const player = origin.sourceEntity;
        return player?.typeId === "minecraft:player" ? player : null;
    } catch {
        return null;
    }
}

function nearestOwnedSoldier(player) {
    let result = null;
    let best = Infinity;

    for (const soldier of SOLDIERS.values()) {
        const entity = soldier?.entity;
        if (!entity?.isValid || soldier.ownerId !== player.id) continue;
        if (entity.dimension.id !== player.dimension.id) continue;

        const dx = entity.location.x - player.location.x;
        const dy = entity.location.y - player.location.y;
        const dz = entity.location.z - player.location.z;
        const distance = dx * dx + dy * dy + dz * dz;
        if (distance < best) {
            best = distance;
            result = soldier;
        }
    }
    return result;
}

function nearestCandidate(soldier, radius = 32) {
    const entity = soldier?.entity;
    if (!entity?.isValid) return null;

    let result = null;
    let best = Infinity;
    const maxDistance = Math.max(1, Math.min(64, Number(radius) || 32));

    try {
        for (const candidate of entity.dimension.getEntities({
            location: entity.location,
            maxDistance
        })) {
            if (!candidate?.isValid || candidate.id === entity.id) continue;
            if (candidate.typeId === "minecraft:item" || candidate.typeId === "minecraft:xp_orb") continue;
            if (candidate.typeId === "minecraft:player" && candidate.id === soldier.ownerId) continue;

            const dx = candidate.location.x - entity.location.x;
            const dy = candidate.location.y - entity.location.y;
            const dz = candidate.location.z - entity.location.z;
            const distance = dx * dx + dy * dy + dz * dz;
            if (distance < best) {
                best = distance;
                result = candidate;
            }
        }
    } catch {}

    return result;
}

function result(success) {
    return {
        status: success
            ? CustomCommandStatus.Success
            : CustomCommandStatus.Failure
    };
}

function registerRemainingCommands(registry) {
    registry.registerCommand({
        name: "siedler:attack",
        description: "Greift den nächsten feindlichen Gegner an",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false,
        optionalParameters: [
            { type: CustomCommandParamType.Integer, name: "Radius" }
        ]
    }, (origin, radius) => {
        const player = playerOnly(origin);
        if (!player) return result(false);

        const soldier = nearestOwnedSoldier(player);
        const target = nearestCandidate(soldier, radius ?? 32);
        if (!target) return result(false);

        // commandAttack performs the authoritative friendly/enemy check.
        return result(commandAttack(soldier, target));
    });

    registry.registerCommand({
        name: "siedler:defend",
        description: "Verteidigt die aktuelle Position des Soldaten",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false,
        optionalParameters: [
            { type: CustomCommandParamType.Integer, name: "Radius" }
        ]
    }, (origin, radius) => {
        const player = playerOnly(origin);
        if (!player) return result(false);

        const soldier = nearestOwnedSoldier(player);
        const position = soldier?.entity?.location;
        if (!position) return result(false);

        return result(commandDefend(soldier, position, radius ?? 8));
    });

    registry.registerCommand({
        name: "siedler:patrol",
        description: "Patrouilliert zwischen aktueller Position und Ziel",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false,
        mandatoryParameters: [
            { type: CustomCommandParamType.Location, name: "Target" }
        ]
    }, (origin, target) => {
        const player = playerOnly(origin);
        if (!player || !target) return result(false);

        const soldier = nearestOwnedSoldier(player);
        const start = soldier?.entity?.location;
        if (!start) return result(false);

        return result(commandPatrol(soldier, [
            { x: start.x, y: start.y, z: start.z },
            { x: Number(target.x), y: Number(target.y), z: Number(target.z) }
        ]));
    });

    registry.registerCommand({
        name: "siedler:stop",
        description: "Stoppt den Soldaten",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false
    }, (origin) => {
        const player = playerOnly(origin);
        if (!player) return result(false);
        return result(commandStop(nearestOwnedSoldier(player)));
    });
}

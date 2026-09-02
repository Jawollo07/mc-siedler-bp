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
import {
    initializeSoldierGroups,
    getSoldierGroups,
    createSoldierGroup,
    addSoldierToGroup,
    removeSoldierFromGroup,
    deleteSoldierGroup,
    commandGroupMove,
    commandGroupFollow,
    commandGroupStay,
    commandGroupDefend,
    commandGroupStop,
    setGroupFormation
} from "./groups.js";
import { giveSoldierTool } from "./ui.js";

system.beforeEvents.startup.subscribe((event) => {
    registerSoldierCommands(event.customCommandRegistry);
});

function playerOnly(origin) {
    try {
        const player = origin.sourceEntity;
        return player?.typeId === "minecraft:player" ? player : null;
    } catch {
        return null;
    }
}

function result(success) {
    return {
        status: success ? CustomCommandStatus.Success : CustomCommandStatus.Failure
    };
}

function nearestOwnedSoldier(player) {
    let nearest = null;
    let distance = Infinity;

    for (const soldier of SOLDIERS.values()) {
        const entity = soldier?.entity;
        if (!entity?.isValid || soldier.ownerId !== player.id || entity.dimension.id !== player.dimension.id) continue;
        const dx = entity.location.x - player.location.x;
        const dy = entity.location.y - player.location.y;
        const dz = entity.location.z - player.location.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < distance) {
            distance = d2;
            nearest = soldier;
        }
    }
    return nearest;
}

function ownedSoldiersNear(player, radius = 8) {
    const soldiers = [];
    const r = Math.max(1, Math.min(32, Number(radius) || 8));
    const r2 = r * r;
    for (const soldier of SOLDIERS.values()) {
        const entity = soldier?.entity;
        if (!entity?.isValid || soldier.ownerId !== player.id || entity.dimension.id !== player.dimension.id) continue;
        const dx = entity.location.x - player.location.x;
        const dy = entity.location.y - player.location.y;
        const dz = entity.location.z - player.location.z;
        if (dx * dx + dy * dy + dz * dz <= r2) soldiers.push(soldier);
    }
    return soldiers;
}

function nearestCandidate(soldier, radius = 32) {
    const entity = soldier?.entity;
    if (!entity?.isValid) return null;
    let nearest = null;
    let distance = Infinity;
    const maxDistance = Math.max(1, Math.min(64, Number(radius) || 32));
    try {
        for (const candidate of entity.dimension.getEntities({ location: entity.location, maxDistance })) {
            if (!candidate?.isValid || candidate.id === entity.id) continue;
            if (candidate.typeId === "minecraft:item" || candidate.typeId === "minecraft:xp_orb") continue;
            if (candidate.typeId === "minecraft:player" && candidate.id === soldier.ownerId) continue;
            const dx = candidate.location.x - entity.location.x;
            const dy = candidate.location.y - entity.location.y;
            const dz = candidate.location.z - entity.location.z;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 < distance) {
                distance = d2;
                nearest = candidate;
            }
        }
    } catch {}
    return nearest;
}

function findGroup(ownerId, name) {
    initializeSoldierGroups();
    const wanted = String(name ?? "").trim().toLowerCase();
    return getSoldierGroups(ownerId).find(group => group.name.toLowerCase() === wanted) ?? null;
}

function registerSoldierCommands(registry) {
    registry.registerCommand({ name: "siedler:soldier_tool", description: "Gibt den Soldatenstab zur Soldatenverwaltung", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false }, origin => {
        const player = playerOnly(origin);
        if (!player) return result(false);
        system.run(() => giveSoldierTool(player));
        return result(true);
    });

    registry.registerCommand({ name: "siedler:move", description: "Bewegt den Soldaten zu einem Zielort", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false, mandatoryParameters: [{ type: CustomCommandParamType.Location, name: "Target" }] }, (origin, target) => {
        const player = playerOnly(origin);
        return player ? result(commandMove(nearestOwnedSoldier(player), target)) : result(false);
    });

    registry.registerCommand({ name: "siedler:follow", description: "Lässt den Soldaten einem Spieler folgen", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false }, origin => {
        const player = playerOnly(origin);
        return player ? result(commandFollow(nearestOwnedSoldier(player))) : result(false);
    });

    registry.registerCommand({ name: "siedler:stay", description: "Lässt den Soldaten an Ort und Stelle bleiben", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false }, origin => {
        const player = playerOnly(origin);
        return player ? result(commandStay(nearestOwnedSoldier(player))) : result(false);
    });

    registry.registerCommand({ name: "siedler:attack", description: "Greift den nächsten feindlichen Gegner an", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false, optionalParameters: [{ type: CustomCommandParamType.Integer, name: "Radius" }] }, (origin, radius) => {
        const player = playerOnly(origin); if (!player) return result(false);
        const soldier = nearestOwnedSoldier(player); const target = nearestCandidate(soldier, radius ?? 32);
        return result(!!target && commandAttack(soldier, target));
    });

    registry.registerCommand({ name: "siedler:defend", description: "Verteidigt die aktuelle Position des Soldaten", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false, optionalParameters: [{ type: CustomCommandParamType.Integer, name: "Radius" }] }, (origin, radius) => {
        const player = playerOnly(origin); if (!player) return result(false);
        const soldier = nearestOwnedSoldier(player); const position = soldier?.entity?.location;
        return result(!!position && commandDefend(soldier, position, radius ?? 8));
    });

    registry.registerCommand({ name: "siedler:patrol", description: "Patrouilliert zwischen aktueller Position und Ziel", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false, mandatoryParameters: [{ type: CustomCommandParamType.Location, name: "Target" }] }, (origin, target) => {
        const player = playerOnly(origin); if (!player || !target) return result(false);
        const soldier = nearestOwnedSoldier(player); const start = soldier?.entity?.location;
        return result(!!start && commandPatrol(soldier, [start, { x: Number(target.x), y: Number(target.y), z: Number(target.z) }]));
    });

    registry.registerCommand({ name: "siedler:stop", description: "Stoppt den Soldaten", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false }, origin => {
        const player = playerOnly(origin);
        return player ? result(commandStop(nearestOwnedSoldier(player))) : result(false);
    });

    registry.registerCommand({ name: "siedler:group_create", description: "Erstellt eine Gruppe aus eigenen Soldaten in der Nähe", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false, mandatoryParameters: [{ type: CustomCommandParamType.String, name: "Name" }], optionalParameters: [{ type: CustomCommandParamType.Integer, name: "Radius" }] }, (origin, name, radius) => {
        const player = playerOnly(origin);
        return player ? result(!!createSoldierGroup(player.id, name, ownedSoldiersNear(player, radius ?? 8))) : result(false);
    });

    registry.registerCommand({ name: "siedler:group_add", description: "Fügt den nächsten eigenen Soldaten einer Gruppe hinzu", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false, mandatoryParameters: [{ type: CustomCommandParamType.String, name: "Group" }] }, (origin, name) => {
        const player = playerOnly(origin); if (!player) return result(false); const group = findGroup(player.id, name);
        return result(!!group && addSoldierToGroup(group.id, player.id, nearestOwnedSoldier(player)));
    });

    registry.registerCommand({ name: "siedler:group_remove", description: "Entfernt den nächsten eigenen Soldaten aus einer Gruppe", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false, mandatoryParameters: [{ type: CustomCommandParamType.String, name: "Group" }] }, (origin, name) => {
        const player = playerOnly(origin); if (!player) return result(false); const group = findGroup(player.id, name);
        return result(!!group && removeSoldierFromGroup(group.id, player.id, nearestOwnedSoldier(player)));
    });

    registry.registerCommand({ name: "siedler:group_delete", description: "Löscht eine eigene Soldatengruppe", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false, mandatoryParameters: [{ type: CustomCommandParamType.String, name: "Group" }] }, (origin, name) => {
        const player = playerOnly(origin); if (!player) return result(false); const group = findGroup(player.id, name);
        return result(!!group && deleteSoldierGroup(group.id, player.id));
    });

    registry.registerCommand({ name: "siedler:group_move", description: "Bewegt eine Soldatengruppe in Formation", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false, mandatoryParameters: [{ type: CustomCommandParamType.String, name: "Group" }, { type: CustomCommandParamType.Location, name: "Target" }] }, (origin, name, target) => {
        const player = playerOnly(origin); if (!player) return result(false); const group = findGroup(player.id, name);
        return result(!!group && commandGroupMove(group.id, player.id, target));
    });

    registry.registerCommand({ name: "siedler:group_follow", description: "Lässt eine Gruppe dem Spieler in Formation folgen", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false, mandatoryParameters: [{ type: CustomCommandParamType.String, name: "Group" }] }, (origin, name) => {
        const player = playerOnly(origin); if (!player) return result(false); const group = findGroup(player.id, name);
        return result(!!group && commandGroupFollow(group.id, player.id));
    });

    registry.registerCommand({ name: "siedler:group_stay", description: "Lässt eine Gruppe an ihrer Position bleiben", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false, mandatoryParameters: [{ type: CustomCommandParamType.String, name: "Group" }] }, (origin, name) => {
        const player = playerOnly(origin); if (!player) return result(false); const group = findGroup(player.id, name);
        return result(!!group && commandGroupStay(group.id, player.id));
    });

    registry.registerCommand({ name: "siedler:group_defend", description: "Lässt eine Gruppe einen Bereich verteidigen", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false, mandatoryParameters: [{ type: CustomCommandParamType.String, name: "Group" }, { type: CustomCommandParamType.Location, name: "Target" }], optionalParameters: [{ type: CustomCommandParamType.Integer, name: "Radius" }] }, (origin, name, target, radius) => {
        const player = playerOnly(origin); if (!player) return result(false); const group = findGroup(player.id, name);
        return result(!!group && commandGroupDefend(group.id, player.id, target, radius ?? 8));
    });

    registry.registerCommand({ name: "siedler:group_stop", description: "Stoppt alle Soldaten einer Gruppe", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false, mandatoryParameters: [{ type: CustomCommandParamType.String, name: "Group" }] }, (origin, name) => {
        const player = playerOnly(origin); if (!player) return result(false); const group = findGroup(player.id, name);
        return result(!!group && commandGroupStop(group.id, player.id));
    });

    registry.registerCommand({ name: "siedler:group_formation", description: "Ändert die Formation einer Gruppe", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false, mandatoryParameters: [{ type: CustomCommandParamType.String, name: "Group" }, { type: CustomCommandParamType.String, name: "Formation" }], optionalParameters: [{ type: CustomCommandParamType.Integer, name: "Spacing" }] }, (origin, name, formation, spacing) => {
        const player = playerOnly(origin); if (!player) return result(false); const group = findGroup(player.id, name);
        return result(!!group && setGroupFormation(group.id, player.id, formation, spacing ?? 2));
    });

    registry.registerCommand({ name: "siedler:group_list", description: "Zeigt die eigenen Soldatengruppen", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false }, origin => {
        const player = playerOnly(origin); if (!player) return result(false); initializeSoldierGroups(); const list = getSoldierGroups(player.id);
        system.run(() => player.sendMessage(list.length ? `§6Gruppen: §f${list.map(g => `${g.name} (${g.soldierIds.length})`).join("§7, §f")}` : "§7Du hast keine Soldatengruppen."));
        return result(true);
    });

    registry.registerCommand({ name: "siedler:spawn_soldier", description: "Spawnt einen Soldaten", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false, mandatoryParameters: [{ type: CustomCommandParamType.String, name: "Type" }], optionalParameters: [{ type: CustomCommandParamType.Integer, name: "Level" }] }, (origin, type, level) => {
        const player = playerOnly(origin); if (!player) return result(false);
        system.run(() => spawnSoldier(player.dimension, { x: player.location.x + 2, y: player.location.y, z: player.location.z }, String(type ?? "").trim(), level ?? 1, player));
        return result(true);
    });
}

import {
    system,
    CustomCommandParamType,
    CustomCommandStatus,
    CommandPermissionLevel
} from "@minecraft/server";
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

system.beforeEvents.startup.subscribe((event) => {
    registerGroupCommands(event.customCommandRegistry);
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
    const result = [];
    const r = Math.max(1, Math.min(32, Number(radius) || 8));
    const r2 = r * r;

    for (const soldier of SOLDIERS.values()) {
        const entity = soldier?.entity;
        if (!entity?.isValid || soldier.ownerId !== player.id || entity.dimension.id !== player.dimension.id) continue;

        const dx = entity.location.x - player.location.x;
        const dy = entity.location.y - player.location.y;
        const dz = entity.location.z - player.location.z;
        if (dx * dx + dy * dy + dz * dz <= r2) result.push(soldier);
    }
    return result;
}

function findGroup(ownerId, name) {
    initializeSoldierGroups();
    const wanted = String(name ?? "").trim().toLowerCase();
    return getSoldierGroups(ownerId).find(group => group.name.toLowerCase() === wanted) ?? null;
}

function registerGroupCommands(registry) {
    registry.registerCommand({
        name: "siedler:group_create",
        description: "Erstellt eine Gruppe aus eigenen Soldaten in der Naehe",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false,
        mandatoryParameters: [{ type: CustomCommandParamType.String, name: "Name" }],
        optionalParameters: [{ type: CustomCommandParamType.Integer, name: "Radius" }]
    }, (origin, name, radius) => {
        const player = playerOnly(origin);
        if (!player) return result(false);
        return result(!!createSoldierGroup(player.id, name, ownedSoldiersNear(player, radius ?? 8)));
    });

    registry.registerCommand({
        name: "siedler:group_add",
        description: "Fuegt den naechsten eigenen Soldaten einer Gruppe hinzu",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false,
        mandatoryParameters: [{ type: CustomCommandParamType.String, name: "Group" }]
    }, (origin, name) => {
        const player = playerOnly(origin);
        if (!player) return result(false);
        const group = findGroup(player.id, name);
        return result(!!group && addSoldierToGroup(group.id, player.id, nearestOwnedSoldier(player)));
    });

    registry.registerCommand({
        name: "siedler:group_remove",
        description: "Entfernt den naechsten eigenen Soldaten aus einer Gruppe",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false,
        mandatoryParameters: [{ type: CustomCommandParamType.String, name: "Group" }]
    }, (origin, name) => {
        const player = playerOnly(origin);
        if (!player) return result(false);
        const group = findGroup(player.id, name);
        return result(!!group && removeSoldierFromGroup(group.id, player.id, nearestOwnedSoldier(player)));
    });

    registry.registerCommand({
        name: "siedler:group_delete",
        description: "Loescht eine eigene Soldatengruppe",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false,
        mandatoryParameters: [{ type: CustomCommandParamType.String, name: "Group" }]
    }, (origin, name) => {
        const player = playerOnly(origin);
        if (!player) return result(false);
        const group = findGroup(player.id, name);
        return result(!!group && deleteSoldierGroup(group.id, player.id));
    });

    registry.registerCommand({
        name: "siedler:group_move",
        description: "Bewegt eine Soldatengruppe in Formation",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false,
        mandatoryParameters: [
            { type: CustomCommandParamType.String, name: "Group" },
            { type: CustomCommandParamType.Location, name: "Target" }
        ]
    }, (origin, name, target) => {
        const player = playerOnly(origin);
        if (!player) return result(false);
        const group = findGroup(player.id, name);
        return result(!!group && commandGroupMove(group.id, player.id, target));
    });

    registry.registerCommand({
        name: "siedler:group_follow",
        description: "Laesst eine Gruppe dem Spieler in Formation folgen",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false,
        mandatoryParameters: [{ type: CustomCommandParamType.String, name: "Group" }]
    }, (origin, name) => {
        const player = playerOnly(origin);
        if (!player) return result(false);
        const group = findGroup(player.id, name);
        return result(!!group && commandGroupFollow(group.id, player.id));
    });

    registry.registerCommand({
        name: "siedler:group_stay",
        description: "Laesst eine Gruppe an ihrer Position bleiben",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false,
        mandatoryParameters: [{ type: CustomCommandParamType.String, name: "Group" }]
    }, (origin, name) => {
        const player = playerOnly(origin);
        if (!player) return result(false);
        const group = findGroup(player.id, name);
        return result(!!group && commandGroupStay(group.id, player.id));
    });

    registry.registerCommand({
        name: "siedler:group_defend",
        description: "Laesst eine Gruppe einen Bereich verteidigen",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false,
        mandatoryParameters: [
            { type: CustomCommandParamType.String, name: "Group" },
            { type: CustomCommandParamType.Location, name: "Target" }
        ],
        optionalParameters: [{ type: CustomCommandParamType.Integer, name: "Radius" }]
    }, (origin, name, target, radius) => {
        const player = playerOnly(origin);
        if (!player) return result(false);
        const group = findGroup(player.id, name);
        return result(!!group && commandGroupDefend(group.id, player.id, target, radius ?? 8));
    });

    registry.registerCommand({
        name: "siedler:group_stop",
        description: "Stoppt alle Soldaten einer Gruppe",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false,
        mandatoryParameters: [{ type: CustomCommandParamType.String, name: "Group" }]
    }, (origin, name) => {
        const player = playerOnly(origin);
        if (!player) return result(false);
        const group = findGroup(player.id, name);
        return result(!!group && commandGroupStop(group.id, player.id));
    });

    registry.registerCommand({
        name: "siedler:group_formation",
        description: "Aendert die Formation einer Gruppe",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false,
        mandatoryParameters: [
            { type: CustomCommandParamType.String, name: "Group" },
            { type: CustomCommandParamType.String, name: "Formation" }
        ],
        optionalParameters: [{ type: CustomCommandParamType.Integer, name: "Spacing" }]
    }, (origin, name, formation, spacing) => {
        const player = playerOnly(origin);
        if (!player) return result(false);
        const group = findGroup(player.id, name);
        return result(!!group && setGroupFormation(group.id, player.id, formation, spacing ?? 2));
    });

    registry.registerCommand({
        name: "siedler:group_list",
        description: "Zeigt die eigenen Soldatengruppen",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false
    }, (origin) => {
        const player = playerOnly(origin);
        if (!player) return result(false);

        initializeSoldierGroups();
        const list = getSoldierGroups(player.id);
        system.run(() => {
            player.sendMessage(list.length
                ? `§6Gruppen: §f${list.map(g => `${g.name} (${g.soldierIds.length})`).join("§7, §f")}`
                : "§7Du hast keine Soldatengruppen.");
        });
        return result(true);
    });
}

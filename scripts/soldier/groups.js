import { world } from "@minecraft/server";
import { SOLDIERS } from "./config.js";
import {
    commandMove,
    commandFollow,
    commandStay,
    commandDefend,
    commandStop
} from "./command_manager.js";

const GROUP_PROPERTY = "soldier:groups";
const GROUP_TAG_PREFIX = "soldier_group:";
const MAX_GROUP_SIZE = 32;
const DEFAULT_FORMATION_SPACING = 2.2;

let groups = new Map();
let initialized = false;

/**
 * Initializes and restores soldier groups from world/entity dynamic properties.
 */
export function initializeSoldierGroups() {
    if (initialized) return;
    initialized = true;

    loadGroups();
    discoverGroupMembers();
    saveGroups();
}

export function getSoldierGroups(ownerId = null) {
    initializeSoldierGroups();

    const result = [];
    for (const group of groups.values()) {
        if (ownerId == null || group.ownerId === ownerId) {
            result.push(group);
        }
    }
    return result;
}

export function getSoldierGroup(groupId, ownerId = null) {
    initializeSoldierGroups();
    const group = groups.get(String(groupId));
    if (!group) return null;
    if (ownerId != null && group.ownerId !== ownerId) return null;
    return group;
}

export function createSoldierGroup(ownerId, name, soldiers = []) {
    initializeSoldierGroups();

    if (!ownerId) return null;
    const cleanName = normalizeGroupName(name);
    if (!cleanName) return null;
    if (getGroupByName(ownerId, cleanName)) return null;

    const members = validOwnedSoldiers(ownerId, soldiers)
        .slice(0, MAX_GROUP_SIZE)
        .map(s => s.entity.id);

    const group = {
        id: makeGroupId(ownerId),
        ownerId,
        name: cleanName,
        formation: "line",
        spacing: DEFAULT_FORMATION_SPACING,
        soldierIds: members,
        createdAt: world.getAbsoluteTime()
    };

    groups.set(group.id, group);
    syncGroupMembers(group);
    saveGroups();
    return group;
}

export function deleteSoldierGroup(groupId, ownerId) {
    const group = getSoldierGroup(groupId, ownerId);
    if (!group) return false;

    for (const id of group.soldierIds) {
        const soldier = SOLDIERS.get(id);
        clearEntityGroup(soldier?.entity);
    }

    groups.delete(group.id);
    saveGroups();
    return true;
}

export function addSoldierToGroup(groupId, ownerId, soldier) {
    const group = getSoldierGroup(groupId, ownerId);
    if (!group || !soldier?.entity?.isValid) return false;
    if (soldier.ownerId !== ownerId) return false;
    if (group.soldierIds.includes(soldier.entity.id)) return true;
    if (group.soldierIds.length >= MAX_GROUP_SIZE) return false;

    removeSoldierFromAllGroups(soldier.entity.id, ownerId);
    group.soldierIds.push(soldier.entity.id);
    setEntityGroup(soldier.entity, group.id);
    saveGroups();
    return true;
}

export function removeSoldierFromGroup(groupId, ownerId, soldier) {
    const group = getSoldierGroup(groupId, ownerId);
    if (!group || !soldier?.entity?.isValid) return false;

    const index = group.soldierIds.indexOf(soldier.entity.id);
    if (index < 0) return false;

    group.soldierIds.splice(index, 1);
    clearEntityGroup(soldier.entity);
    saveGroups();
    return true;
}

export function commandGroupMove(groupId, ownerId, position) {
    const group = getSoldierGroup(groupId, ownerId);
    if (!group) return false;

    const members = getValidMembers(group);
    const offsets = getFormationOffsets(members.length, group.spacing, group.formation);

    members.forEach((soldier, index) => {
        const offset = offsets[index];
        commandMove(soldier, {
            x: Number(position.x) + offset.x,
            y: Number(position.y),
            z: Number(position.z) + offset.z
        });
    });

    cleanupGroup(group);
    saveGroups();
    return members.length > 0;
}

export function commandGroupFollow(groupId, ownerId) {
    const group = getSoldierGroup(groupId, ownerId);
    if (!group) return false;

    const members = getValidMembers(group);
    const offsets = getFormationOffsets(members.length, group.spacing, group.formation);

    members.forEach((soldier, index) => {
        const data = SOLDIERS.get(soldier.entity.id);
        if (!data) return;
        data.command = {
            type: "follow",
            issuedAt: world.getAbsoluteTime(),
            formationOffset: offsets[index]
        };
    });

    cleanupGroup(group);
    saveGroups();
    return members.length > 0;
}

export function commandGroupStay(groupId, ownerId) {
    const group = getSoldierGroup(groupId, ownerId);
    if (!group) return false;

    const members = getValidMembers(group);
    members.forEach(soldier => commandStay(soldier));
    cleanupGroup(group);
    saveGroups();
    return members.length > 0;
}

export function commandGroupDefend(groupId, ownerId, position, radius = 8) {
    const group = getSoldierGroup(groupId, ownerId);
    if (!group) return false;

    const members = getValidMembers(group);
    const offsets = getFormationOffsets(members.length, group.spacing, group.formation);

    members.forEach((soldier, index) => {
        const offset = offsets[index];
        commandDefend(soldier, {
            x: Number(position.x) + offset.x,
            y: Number(position.y),
            z: Number(position.z) + offset.z
        }, radius);
    });

    cleanupGroup(group);
    saveGroups();
    return members.length > 0;
}

export function commandGroupStop(groupId, ownerId) {
    const group = getSoldierGroup(groupId, ownerId);
    if (!group) return false;

    const members = getValidMembers(group);
    members.forEach(commandStop);
    cleanupGroup(group);
    saveGroups();
    return members.length > 0;
}

export function setGroupFormation(groupId, ownerId, formation, spacing = DEFAULT_FORMATION_SPACING) {
    const group = getSoldierGroup(groupId, ownerId);
    if (!group) return false;

    const allowed = ["line", "column", "wedge"];
    formation = String(formation ?? "line").toLowerCase();
    if (!allowed.includes(formation)) return false;

    spacing = Number(spacing);
    if (!Number.isFinite(spacing) || spacing < 1) spacing = DEFAULT_FORMATION_SPACING;

    group.formation = formation;
    group.spacing = Math.min(spacing, 8);
    saveGroups();
    return true;
}

function getGroupByName(ownerId, name) {
    for (const group of groups.values()) {
        if (group.ownerId === ownerId && group.name.toLowerCase() === name.toLowerCase()) {
            return group;
        }
    }
    return null;
}

function getValidMembers(group) {
    const result = [];
    for (const id of group.soldierIds) {
        const soldier = SOLDIERS.get(id);
        if (soldier?.entity?.isValid && soldier.ownerId === group.ownerId) {
            result.push(soldier);
        }
    }
    return result;
}

function validOwnedSoldiers(ownerId, soldiers) {
    return soldiers.filter(s =>
        s?.entity?.isValid && s.ownerId === ownerId
    );
}

function cleanupGroup(group) {
    group.soldierIds = getValidMembers(group).map(s => s.entity.id);
    syncGroupMembers(group);
}

function removeSoldierFromAllGroups(soldierId, ownerId) {
    for (const group of groups.values()) {
        if (group.ownerId !== ownerId) continue;
        group.soldierIds = group.soldierIds.filter(id => id !== soldierId);
    }
}

function syncGroupMembers(group) {
    for (const id of group.soldierIds) {
        const soldier = SOLDIERS.get(id);
        if (soldier?.entity?.isValid) setEntityGroup(soldier.entity, group.id);
    }
}

function setEntityGroup(entity, groupId) {
    if (!entity?.isValid) return;
    try {
        entity.setDynamicProperty("soldier:groupId", groupId);
        for (const tag of entity.getTags()) {
            if (tag.startsWith(GROUP_TAG_PREFIX)) entity.removeTag(tag);
        }
        entity.addTag(`${GROUP_TAG_PREFIX}${groupId}`);
    } catch {}
}

function clearEntityGroup(entity) {
    if (!entity?.isValid) return;
    try {
        entity.setDynamicProperty("soldier:groupId", undefined);
        for (const tag of entity.getTags()) {
            if (tag.startsWith(GROUP_TAG_PREFIX)) entity.removeTag(tag);
        }
    } catch {}
}

function discoverGroupMembers() {
    for (const group of groups.values()) group.soldierIds = [];

    for (const soldier of SOLDIERS.values()) {
        const entity = soldier?.entity;
        if (!entity?.isValid) continue;

        const groupId = getGroupId(entity);
        if (!groupId) continue;

        const group = groups.get(groupId);
        if (!group || group.ownerId !== soldier.ownerId) {
            clearEntityGroup(entity);
            continue;
        }

        if (group.soldierIds.length < MAX_GROUP_SIZE) {
            group.soldierIds.push(entity.id);
        }
    }
}

function getGroupId(entity) {
    try {
        const value = entity.getDynamicProperty("soldier:groupId");
        if (typeof value === "string" && value) return value;
    } catch {}

    try {
        return entity.getTags()
            .find(tag => tag.startsWith(GROUP_TAG_PREFIX))
            ?.slice(GROUP_TAG_PREFIX.length) ?? null;
    } catch {
        return null;
    }
}

function loadGroups() {
    groups = new Map();
    try {
        const raw = world.getDynamicProperty(GROUP_PROPERTY);
        if (typeof raw !== "string" || !raw) return;

        const data = JSON.parse(raw);
        if (!Array.isArray(data)) return;

        for (const group of data) {
            if (!group?.id || !group?.ownerId || !group?.name) continue;
            groups.set(String(group.id), {
                id: String(group.id),
                ownerId: String(group.ownerId),
                name: normalizeGroupName(group.name),
                formation: ["line", "column", "wedge"].includes(group.formation) ? group.formation : "line",
                spacing: Number.isFinite(Number(group.spacing)) ? Number(group.spacing) : DEFAULT_FORMATION_SPACING,
                soldierIds: Array.isArray(group.soldierIds) ? group.soldierIds.map(String) : [],
                createdAt: Number(group.createdAt) || world.getAbsoluteTime()
            });
        }
    } catch (error) {
        console.warn(`[Soldier Groups] Failed to load groups: ${error}`);
    }
}

function saveGroups() {
    try {
        world.setDynamicProperty(
            GROUP_PROPERTY,
            JSON.stringify([...groups.values()])
        );
    } catch (error) {
        console.warn(`[Soldier Groups] Failed to save groups: ${error}`);
    }
}

function normalizeGroupName(name) {
    return String(name ?? "").trim().replace(/\s+/g, " ").slice(0, 32);
}

function makeGroupId(ownerId) {
    let id;
    do {
        id = `${ownerId.slice(0, 8)}-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffff).toString(36)}`;
    } while (groups.has(id));
    return id;
}

function getFormationOffsets(count, spacing, formation) {
    const offsets = [];
    if (count <= 0) return offsets;

    if (formation === "column") {
        for (let i = 0; i < count; i++) {
            offsets.push({ x: 0, z: i * spacing });
        }
        return offsets;
    }

    if (formation === "wedge") {
        offsets.push({ x: 0, z: 0 });
        for (let i = 1; offsets.length < count; i++) {
            const row = Math.ceil(i / 2);
            const side = i % 2 === 0 ? 1 : -1;
            offsets.push({ x: side * row * spacing, z: row * spacing });
        }
        return offsets;
    }

    const columns = Math.min(6, Math.max(1, Math.ceil(Math.sqrt(count))));
    for (let i = 0; i < count; i++) {
        const row = Math.floor(i / columns);
        const column = i % columns;
        offsets.push({
            x: (column - (Math.min(columns, count) - 1) / 2) * spacing,
            z: row * spacing
        });
    }
    return offsets;
}

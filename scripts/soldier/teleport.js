import { system } from "@minecraft/server";
import { SOLDIERS } from "./config.js";
import { initializeSoldierGroups, getSoldierGroups } from "./groups.js";

const SELECTION_PROPERTY = "siedler:selected_soldier";
const MAX_DISTANCE_FROM_PLAYER = 48;

/**
 * Teleports an individual soldier and, for cavalry, its mount.
 */
export function teleportSoldierToPlayer(player, soldier, offset = { x: 0, z: 0 }) {
    if (!player?.isValid || !soldier?.entity?.isValid) return false;
    if (soldier.ownerId !== player.id) return false;

    const target = {
        x: player.location.x + Number(offset.x || 0),
        y: player.location.y,
        z: player.location.z + Number(offset.z || 0)
    };

    try {
        if (soldier.mount?.isValid) {
            soldier.mount.teleport(target, { dimension: player.dimension });
        }
        if (soldier.entity.isValid) {
            soldier.entity.teleport(target, { dimension: player.dimension });
        }
        return true;
    } catch (error) {
        system.run(() => player.sendMessage(`§cSoldat konnte nicht teleportiert werden: ${error}`));
        return false;
    }
}

function validOwnedSoldiers(player) {
    return [...SOLDIERS.values()].filter(s =>
        s?.entity?.isValid &&
        s.ownerId === player.id
    );
}

function formationOffsets(count, spacing = 3.5) {
    if (count <= 1) return [{ x: 0, z: 0 }];
    const columns = Math.min(6, Math.max(1, Math.ceil(Math.sqrt(count))));
    const rows = Math.ceil(count / columns);
    const result = [];

    for (let i = 0; i < count; i++) {
        const column = i % columns;
        const row = Math.floor(i / columns);
        result.push({
            x: (column - (columns - 1) / 2) * spacing,
            z: (row - (rows - 1) / 2) * spacing
        });
    }
    return result;
}

function selectedSoldierIds(player) {
    try {
        const raw = player.getDynamicProperty(SELECTION_PROPERTY);
        const ids = JSON.parse(typeof raw === "string" ? raw : "[]");
        return Array.isArray(ids) ? ids.map(String) : [];
    } catch {
        return [];
    }
}

function resolveSelected(player, soldiers) {
    const ids = new Set(selectedSoldierIds(player));
    return soldiers.filter(s => ids.has(String(s.entity.id)));
}

function findGroup(player, name) {
    initializeSoldierGroups();
    const wanted = String(name ?? "").trim().toLowerCase();
    if (!wanted) return null;
    return getSoldierGroups(player.id).find(g => g.name.toLowerCase() === wanted) ?? null;
}

function resolveGroup(player, name, soldiers) {
    const group = findGroup(player, name);
    if (!group) return [];
    const ids = new Set(group.soldierIds.map(String));
    return soldiers.filter(s => ids.has(String(s.entity.id)));
}

function nearestSoldier(player, soldiers) {
    let best = null;
    let bestDistance = Infinity;
    for (const soldier of soldiers) {
        const entity = soldier.entity;
        if (entity.dimension.id !== player.dimension.id) continue;
        const dx = entity.location.x - player.location.x;
        const dy = entity.location.y - player.location.y;
        const dz = entity.location.z - player.location.z;
        const distance = dx * dx + dy * dy + dz * dz;
        if (distance < bestDistance && distance <= MAX_DISTANCE_FROM_PLAYER * MAX_DISTANCE_FROM_PLAYER) {
            bestDistance = distance;
            best = soldier;
        }
    }
    return best;
}

function resolveIndividual(player, selector, soldiers) {
    const value = String(selector ?? "").trim();
    if (!value) return [];

    const normalized = value.toLowerCase();
    const directId = normalized.startsWith("soldier:") ? value.slice(8) : value;
    const byId = soldiers.find(s => String(s.entity.id) === directId);
    if (byId) return [byId];

    // Supports the entity's current name tag/name as an additional individual selector.
    const byName = soldiers.find(s => {
        try {
            return String(s.entity.nameTag ?? "").trim().toLowerCase() === normalized;
        } catch {
            return false;
        }
    });
    return byName ? [byName] : [];
}

/**
 * Resolves a TP selector:
 *   all / empty  -> all owned soldiers
 *   selected     -> soldiers currently selected with the Soldatenstab
 *   nearest      -> nearest owned soldier
 *   group:<name> -> all members of a group
 *   <group name> -> group by exact name
 *   soldier:<id> -> one soldier by entity id
 *   <name>       -> one soldier by name tag
 */
export function resolveTeleportSelection(player, selector = "") {
    const soldiers = validOwnedSoldiers(player);
    const value = String(selector ?? "").trim();
    const normalized = value.toLowerCase();

    if (!value || normalized === "all" || normalized === "*" || normalized === "soldiers") {
        return { soldiers, mode: "all" };
    }

    if (normalized === "selected" || normalized === "selection" || normalized === "staff") {
        return { soldiers: resolveSelected(player, soldiers), mode: "selected" };
    }

    if (normalized === "nearest" || normalized === "single") {
        const soldier = nearestSoldier(player, soldiers);
        return { soldiers: soldier ? [soldier] : [], mode: "single" };
    }

    if (normalized.startsWith("group:")) {
        return { soldiers: resolveGroup(player, value.slice(6), soldiers), mode: "group" };
    }

    const group = findGroup(player, value);
    if (group) {
        return { soldiers: resolveGroup(player, group.name, soldiers), mode: "group" };
    }

    const individual = resolveIndividual(player, value, soldiers);
    return { soldiers: individual, mode: "single" };
}

export function teleportSelectionToPlayer(player, soldiers, mode = "all") {
    if (!player?.isValid || !Array.isArray(soldiers) || !soldiers.length) return 0;

    if (mode === "single") {
        return teleportSoldierToPlayer(player, soldiers[0]) ? 1 : 0;
    }

    const spacing = mode === "group" ? 2.8 : soldiers.length > 16 ? 3 : 3.5;
    const offsets = formationOffsets(soldiers.length, spacing);
    let moved = 0;

    for (let i = 0; i < soldiers.length; i++) {
        if (teleportSoldierToPlayer(player, soldiers[i], offsets[i])) moved++;
    }
    return moved;
}

export function teleportBySelector(player, selector = "") {
    const selection = resolveTeleportSelection(player, selector);
    return {
        ...selection,
        moved: teleportSelectionToPlayer(player, selection.soldiers, selection.mode)
    };
}

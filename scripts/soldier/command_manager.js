import { world } from "@minecraft/server";
import { SOLDIERS, SOLDIER_CONFIG } from "./config.js";

export const SOLDIER_COMMANDS = Object.freeze({
    IDLE: "idle",
    FOLLOW: "follow",
    STAY: "stay",
    MOVE: "move",
    ATTACK: "attack",
    DEFEND: "defend",
    PATROL: "patrol",
    STOP: "stop"
});

export function setSoldierCommand(soldier, command, data = {}) {
    const soldierData = getSoldierData(soldier);
    if (!soldierData?.entity?.isValid) return false;

    command = normalizeCommand(command);
    if (!isValidCommand(command)) return false;

    soldierData.command = {
        type: command,
        issuedAt: world.getAbsoluteTime(),
        ...data
    };

    if (command === SOLDIER_COMMANDS.ATTACK) {
        soldierData.targetId = data.targetId ?? null;
    } else {
        soldierData.targetId = null;
    }

    return true;
}

export function getSoldierCommand(soldier) {
    return getSoldierData(soldier)?.command ?? null;
}

export function clearSoldierCommand(soldier) {
    const soldierData = getSoldierData(soldier);
    if (!soldierData) return false;

    soldierData.command = null;
    soldierData.targetId = null;
    soldierData.phase = SOLDIER_CONFIG.STATES.IDLE;
    return true;
}

export function hasCommand(soldier, command) {
    return getSoldierCommand(soldier)?.type === normalizeCommand(command);
}

export function commandMove(soldier, position) {
    if (!isValidPosition(position)) return false;
    return setSoldierCommand(soldier, SOLDIER_COMMANDS.MOVE, {
        position: copyPosition(position)
    });
}

export function commandFollow(soldier) {
    return setSoldierCommand(soldier, SOLDIER_COMMANDS.FOLLOW);
}

export function commandStay(soldier) {
    const data = getSoldierData(soldier);
    if (!data?.entity?.isValid) return false;

    return setSoldierCommand(soldier, SOLDIER_COMMANDS.STAY, {
        position: copyPosition(data.entity.location)
    });
}

export function commandAttack(soldier, target) {
    const data = getSoldierData(soldier);
    if (!data?.entity?.isValid || !target?.isValid) return false;

    return setSoldierCommand(soldier, SOLDIER_COMMANDS.ATTACK, {
        targetId: target.id
    });
}

export function commandDefend(soldier, position, radius = 8) {
    if (!isValidPosition(position)) return false;
    radius = Number(radius);
    if (!Number.isFinite(radius) || radius <= 0) radius = 8;

    return setSoldierCommand(soldier, SOLDIER_COMMANDS.DEFEND, {
        position: copyPosition(position),
        radius
    });
}

export function commandPatrol(soldier, positions) {
    if (!Array.isArray(positions)) return false;
    const valid = positions.filter(isValidPosition);
    if (valid.length < 2) return false;

    return setSoldierCommand(soldier, SOLDIER_COMMANDS.PATROL, {
        positions: valid.map(copyPosition),
        patrolIndex: 0
    });
}

export function commandStop(soldier) {
    return setSoldierCommand(soldier, SOLDIER_COMMANDS.STOP);
}

function getSoldierData(soldier) {
    if (!soldier) return null;
    if (typeof soldier === "string") return SOLDIERS.get(soldier) ?? null;
    if (soldier.entity) return soldier;
    if (soldier.id) return SOLDIERS.get(soldier.id) ?? null;
    return null;
}

function normalizeCommand(command) {
    return String(command ?? "").trim().toLowerCase();
}

function isValidCommand(command) {
    return Object.values(SOLDIER_COMMANDS).includes(command);
}

function isValidPosition(position) {
    return position &&
        Number.isFinite(Number(position.x)) &&
        Number.isFinite(Number(position.y)) &&
        Number.isFinite(Number(position.z));
}

function copyPosition(position) {
    return {
        x: Number(position.x),
        y: Number(position.y),
        z: Number(position.z)
    };
}

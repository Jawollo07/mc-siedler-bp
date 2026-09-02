import { world } from "@minecraft/server";

import { SOLDIERS, SOLDIER_CONFIG } from "./config.js";

/**
 * Available soldier commands.
 */
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

/**
 * Set a command for a soldier.
 *
 * @param {Entity|string} soldier Soldier entity or entity ID.
 * @param {string} command Command name.
 * @param {object} data Additional command data.
 * @returns {boolean}
 */
export function setSoldierCommand(soldier, command, data = {}) {
    const soldierData = getSoldierData(soldier);

    if (!soldierData) {
        return false;
    }

    command = normalizeCommand(command);

    if (!isValidCommand(command)) {
        console.warn(
            `[Soldier Command] Unknown command: ${command}`
        );

        return false;
    }

    const entity = soldierData.entity;

    if (!entity?.isValid) {
        return false;
    }

    soldierData.command = {
        type: command,
        issuedAt: world.getAbsoluteTime(),
        ...data
    };

    soldierData.targetId =
        command === SOLDIER_COMMANDS.ATTACK
            ? data.targetId ?? null
            : null;

    soldierData.phase =
        command === SOLDIER_COMMANDS.STOP
            ? SOLDIER_CONFIG.STATES.IDLE
            : command;

    saveCommand(entity, soldierData.command);

    debug(
        `${entity.id} received command "${command}"`
    );

    return true;
}

/**
 * Clear the current soldier command.
 *
 * @param {Entity|string} soldier
 * @returns {boolean}
 */
export function clearSoldierCommand(soldier) {
    const soldierData = getSoldierData(soldier);

    if (!soldierData) {
        return false;
    }

    soldierData.command = null;
    soldierData.targetId = null;
    soldierData.phase = SOLDIER_CONFIG.STATES.IDLE;

    if (soldierData.entity?.isValid) {
        saveCommand(soldierData.entity, null);
    }

    return true;
}

/**
 * Get the currently assigned command.
 *
 * @param {Entity|string} soldier
 * @returns {object|null}
 */
export function getSoldierCommand(soldier) {
    const soldierData = getSoldierData(soldier);

    if (!soldierData) {
        return null;
    }

    if (soldierData.command) {
        return soldierData.command;
    }

    if (soldierData.entity?.isValid) {
        const stored = loadCommand(soldierData.entity);

        if (stored) {
            soldierData.command = stored;
            return stored;
        }
    }

    return null;
}

/**
 * Check whether a soldier currently has a command.
 *
 * @param {Entity|string} soldier
 * @returns {boolean}
 */
export function hasSoldierCommand(soldier) {
    return getSoldierCommand(soldier) !== null;
}

/**
 * Check whether a soldier has a specific command.
 *
 * @param {Entity|string} soldier
 * @param {string} command
 * @returns {boolean}
 */
export function hasCommand(soldier, command) {
    const current = getSoldierCommand(soldier);

    if (!current) {
        return false;
    }

    return current.type === normalizeCommand(command);
}

/**
 * Set a movement destination.
 *
 * @param {Entity|string} soldier
 * @param {{x:number,y:number,z:number}} position
 * @returns {boolean}
 */
export function commandMove(soldier, position) {
    if (!isValidPosition(position)) {
        return false;
    }

    return setSoldierCommand(
        soldier,
        SOLDIER_COMMANDS.MOVE,
        {
            position: {
                x: position.x,
                y: position.y,
                z: position.z
            }
        }
    );
}

/**
 * Make a soldier follow its owner.
 *
 * @param {Entity|string} soldier
 * @returns {boolean}
 */
export function commandFollow(soldier) {
    return setSoldierCommand(
        soldier,
        SOLDIER_COMMANDS.FOLLOW
    );
}

/**
 * Make a soldier stay at its current position.
 *
 * @param {Entity|string} soldier
 * @returns {boolean}
 */
export function commandStay(soldier) {
    const soldierData = getSoldierData(soldier);

    if (!soldierData?.entity?.isValid) {
        return false;
    }

    return setSoldierCommand(
        soldierData,
        SOLDIER_COMMANDS.STAY,
        {
            position: {
                x: soldierData.entity.location.x,
                y: soldierData.entity.location.y,
                z: soldierData.entity.location.z
            }
        }
    );
}

/**
 * Make a soldier attack a specific entity.
 *
 * @param {Entity|string} soldier
 * @param {Entity|string} target
 * @returns {boolean}
 */
export function commandAttack(soldier, target) {
    const soldierData = getSoldierData(soldier);

    if (!soldierData?.entity?.isValid) {
        return false;
    }

    const targetEntity = resolveEntity(target);

    if (!targetEntity?.isValid) {
        return false;
    }

    return setSoldierCommand(
        soldierData,
        SOLDIER_COMMANDS.ATTACK,
        {
            targetId: targetEntity.id
        }
    );
}

/**
 * Make a soldier defend an area.
 *
 * @param {Entity|string} soldier
 * @param {{x:number,y:number,z:number}} position
 * @param {number} radius
 * @returns {boolean}
 */
export function commandDefend(
    soldier,
    position,
    radius = 8
) {
    if (!isValidPosition(position)) {
        return false;
    }

    radius = Number(radius);

    if (!Number.isFinite(radius) || radius <= 0) {
        radius = 8;
    }

    return setSoldierCommand(
        soldier,
        SOLDIER_COMMANDS.DEFEND,
        {
            position: {
                x: position.x,
                y: position.y,
                z: position.z
            },
            radius
        }
    );
}

/**
 * Make a soldier patrol between positions.
 *
 * @param {Entity|string} soldier
 * @param {Array<{x:number,y:number,z:number}>} positions
 * @returns {boolean}
 */
export function commandPatrol(
    soldier,
    positions
) {
    if (!Array.isArray(positions) || positions.length < 2) {
        return false;
    }

    const validPositions = positions.filter(
        isValidPosition
    );

    if (validPositions.length < 2) {
        return false;
    }

    return setSoldierCommand(
        soldier,
        SOLDIER_COMMANDS.PATROL,
        {
            positions: validPositions.map(position => ({
                x: position.x,
                y: position.y,
                z: position.z
            })),
            patrolIndex: 0
        }
    );
}

/**
 * Stop a soldier.
 *
 * @param {Entity|string} soldier
 * @returns {boolean}
 */
export function commandStop(soldier) {
    return setSoldierCommand(
        soldier,
        SOLDIER_COMMANDS.STOP
    );
}

/**
 * Get the internal soldier data.
 */
function getSoldierData(soldier) {
    if (!soldier) {
        return null;
    }

    if (typeof soldier === "string") {
        return SOLDIERS.get(soldier) ?? null;
    }

    if (soldier.entity) {
        return soldier;
    }

    if (soldier.id) {
        return SOLDIERS.get(soldier.id) ?? null;
    }

    return null;
}

/**
 * Resolve an entity from either an entity object or ID.
 */
function resolveEntity(target) {
    if (!target) {
        return null;
    }

    if (typeof target !== "string") {
        return target;
    }

    for (const player of world.getPlayers()) {
        if (player.id === target) {
            return player;
        }
    }

    for (const dimensionId of [
        "overworld",
        "nether",
        "the_end"
    ]) {
        try {
            const dimension =
                world.getDimension(dimensionId);

            const entity =
                dimension.getEntities().find(
                    candidate => candidate.id === target
                );

            if (entity) {
                return entity;
            }
        } catch {
            // Ignore unavailable dimensions.
        }
    }

    return null;
}

/**
 * Normalize command names.
 */
function normalizeCommand(command) {
    return String(command ?? "")
        .trim()
        .toLowerCase();
}

/**
 * Check whether a command is supported.
 */
function isValidCommand(command) {
    return Object.values(
        SOLDIER_COMMANDS
    ).includes(command);
}

/**
 * Validate a Minecraft position.
 */
function isValidPosition(position) {
    if (!position) {
        return false;
    }

    return (
        Number.isFinite(Number(position.x)) &&
        Number.isFinite(Number(position.y)) &&
        Number.isFinite(Number(position.z))
    );
}

/**
 * Persist the current command on the entity.
 *
 * This allows commands to survive script restarts.
 */
function saveCommand(entity, command) {
    try {
        entity.setDynamicProperty(
            "soldier:command",
            command
                ? JSON.stringify(command)
                : ""
        );
    } catch (error) {
        debug(
            `Failed to save command: ${error}`
        );
    }
}

/**
 * Load a persisted command.
 */
function loadCommand(entity) {
    try {
        const raw =
            entity.getDynamicProperty(
                "soldier:command"
            );

        if (
            typeof raw !== "string" ||
            !raw.length
        ) {
            return null;
        }

        const command =
            JSON.parse(raw);

        if (
            !command ||
            !isValidCommand(command.type)
        ) {
            return null;
        }

        return command;
    } catch {
        return null;
    }
}

/**
 * Debug logging.
 */
function debug(message) {
    if (SOLDIER_CONFIG.debug) {
        console.info(
            `[Soldier Command] ${message}`
        );
    }
}
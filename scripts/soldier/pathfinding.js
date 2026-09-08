import { system } from "@minecraft/server";
import { SOLDIERS, SOLDIER_CONFIG } from "./config.js";

const TICK_INTERVAL = 2;
const REPATH_TICKS = 10;
const STUCK_REPATH_TICKS = 8;
const WAYPOINT_REACHED = 0.72;
const SEARCH_RADIUS = 20;
const MAX_NODES = 1200;
const MAX_PATH_LENGTH = 64;
const DIAGONAL_COST = 1.4142;
const MAX_STEP_UP = 1;
const MAX_STEP_DOWN = 2;
const GOAL_REACHED_DISTANCE = 1.1;

let started = false;

/**
 * Local voxel A* navigator for the custom impulse based Soldier AI.
 *
 * Vanilla navigation is intentionally not used because the Soldier AI owns
 * acceleration, formations and combat movement. A* only supplies a safe local
 * waypoint plus jump/drop hints for the terrain layer.
 */
export function startSoldierPathfinding() {
    if (started) return;
    started = true;
    system.runInterval(updatePathfinding, TICK_INTERVAL);
    console.info("[Soldier Pathfinding] Extended local A* navigation enabled");
}

function updatePathfinding() {
    let index = 0;
    const slice = Math.floor(system.currentTick / TICK_INTERVAL) % 2;

    for (const [id, soldier] of SOLDIERS) {
        if ((index++ % 2) !== slice) continue;

        const entity = soldier?.entity;
        if (!entity?.isValid || !isMovementRelevant(soldier)) continue;

        const destination = getDestination(soldier);
        if (!destination) continue;

        const state = soldier.pathfinding ?? (soldier.pathfinding = {});
        const targetKey = positionKey(destination);
        if (state.destinationKey !== targetKey) resetPathState(state, targetKey);

        const start = getStartCell(entity);
        if (!start) continue;

        if (state.path?.length && state.index < state.path.length) advanceWaypoint(entity, state);

        const currentWaypoint = state.path?.[state.index];
        const direct = hasDirectRoute(entity, destination);
        const targetDistance = horizontalDistance(entity.location, destination);
        const pathInvalid = !!currentWaypoint && !isWalkable(entity.dimension, currentWaypoint.x, currentWaypoint.y, currentWaypoint.z);
        const timedRepath = system.currentTick - (state.lastPathTick ?? -Infinity) >= REPATH_TICKS;
        const stuck = isStuck(entity, state);
        const noUsablePath = !currentWaypoint && targetDistance > GOAL_REACHED_DISTANCE;
        const shouldSearch = timedRepath && (pathInvalid || noUsablePath || !direct || stuck);

        if (shouldSearch) {
            state.lastPathTick = system.currentTick;
            const goal = chooseGoalCell(entity, destination, start);
            const path = goal ? findPath(entity.dimension, start, goal) : [];
            state.path = path;
            state.index = 0;
            state.failed = path.length === 0;
        }

        const next = state.path?.[state.index] ?? destination;
        setDirection(soldier, entity, next);
        applyPathHints(soldier, entity, next);
        updateStuckState(entity, state);
    }
}

function isMovementRelevant(soldier) {
    if (!soldier) return false;
    const states = SOLDIER_CONFIG.STATES;
    if (soldier.phase === states.IDLE) return false;
    if (soldier.phase === states.ATTACK && !soldier.targetId) return false;
    return !!soldier.command || !!soldier.targetId || hasOwner(soldier.entity);
}

function hasOwner(entity) {
    try {
        const ownerId = entity?.getDynamicProperty?.("soldier:ownerId");
        return typeof ownerId === "string" && ownerId.length > 0;
    } catch {
        return false;
    }
}

function resetPathState(state, targetKey) {
    state.destinationKey = targetKey;
    state.path = null;
    state.index = 0;
    state.lastPathTick = -Infinity;
    state.failed = false;
    state.jumpRequired = false;
    state.dropRequired = false;
    state.verticalDelta = 0;
    state.lastPosition = null;
    state.lastProgressTick = system.currentTick;
}

function getDestination(soldier) {
    const entity = soldier.entity;
    const command = soldier.command;

    if (command?.position && isPosition(command.position)) return command.position;

    if (Array.isArray(command?.positions) && command.positions.length) {
        const patrolIndex = Math.max(0, Math.min(command.patrolIndex ?? 0, command.positions.length - 1));
        return command.positions[patrolIndex];
    }

    if (soldier.targetId) {
        try {
            const target = entity.dimension.getEntities({
                location: entity.location,
                maxDistance: SOLDIER_CONFIG.SEARCH_RADIUS + 12
            }).find(candidate => candidate.id === soldier.targetId);
            if (target?.isValid) return target.location;
        } catch {}
    }

    try {
        const ownerId = entity.getDynamicProperty("soldier:ownerId");
        if (typeof ownerId === "string" && ownerId.length) {
            const owner = entity.dimension.getEntities({
                location: entity.location,
                maxDistance: 128,
                families: ["player"]
            }).find(candidate => candidate.id === ownerId);
            if (owner?.isValid) return owner.location;
        }
    } catch {}

    return null;
}

function chooseGoalCell(entity, destination, start) {
    const dx = destination.x - entity.location.x;
    const dz = destination.z - entity.location.z;
    const distance = Math.hypot(dx, dz);

    const desired = distance <= SEARCH_RADIUS - 2
        ? {
            x: Math.floor(destination.x),
            y: Math.floor(destination.y),
            z: Math.floor(destination.z)
        }
        : (() => {
            const scale = (SEARCH_RADIUS - 2) / Math.max(distance, 0.01);
            return {
                x: Math.floor(entity.location.x + dx * scale),
                y: Math.floor(entity.location.y),
                z: Math.floor(entity.location.z + dz * scale)
            };
        })();

    return nearestWalkable(entity.dimension, desired, start);
}

function findPath(dimension, start, goal) {
    if (!isWalkable(dimension, start.x, start.y, start.z)) return [];
    if (!isWalkable(dimension, goal.x, goal.y, goal.z)) return [];

    const open = [{ ...start, g: 0, f: heuristic(start, goal) }];
    const cameFrom = new Map();
    const gScore = new Map([[cellKey(start), 0]]);
    const closed = new Set();
    let processed = 0;

    while (open.length && processed++ < MAX_NODES) {
        let bestIndex = 0;
        for (let i = 1; i < open.length; i++) {
            if (open[i].f < open[bestIndex].f) bestIndex = i;
        }

        const current = open.splice(bestIndex, 1)[0];
        const currentKey = cellKey(current);
        if (closed.has(currentKey)) continue;
        closed.add(currentKey);

        if (sameCell(current, goal)) return reconstructPath(cameFrom, current);

        for (const neighbor of neighbors(current)) {
            const key = cellKey(neighbor);
            if (closed.has(key) || !canTraverse(dimension, current, neighbor)) continue;

            const diagonal = current.x !== neighbor.x && current.z !== neighbor.z;
            const vertical = Math.abs(neighbor.y - current.y);
            const stepCost = (diagonal ? DIAGONAL_COST : 1) + vertical * 0.25;
            const terrainCost = getTerrainCost(dimension, neighbor);
            const tentative = current.g + stepCost + terrainCost;

            if (tentative >= (gScore.get(key) ?? Infinity)) continue;

            cameFrom.set(key, current);
            gScore.set(key, tentative);
            open.push({ ...neighbor, g: tentative, f: tentative + heuristic(neighbor, goal) });
        }
    }

    return [];
}

function neighbors(node) {
    const result = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
            if (dx === 0 && dz === 0) continue;
            const diagonal = dx !== 0 && dz !== 0;
            for (const dy of [0, 1, -1, -2]) {
                if (dy === -2 && (dx !== 0 || dz !== 0)) continue;
                if (diagonal && dy !== 0) continue;
                result.push({ x: node.x + dx, y: node.y + dy, z: node.z + dz });
            }
        }
    }
    return result;
}

function canTraverse(dimension, from, to) {
    const dy = to.y - from.y;
    if (dy > MAX_STEP_UP || dy < -MAX_STEP_DOWN) return false;

    const diagonal = from.x !== to.x && from.z !== to.z;
    if (diagonal) {
        const sideA = { x: to.x, y: from.y, z: from.z };
        const sideB = { x: from.x, y: from.y, z: to.z };
        if (!isWalkable(dimension, sideA.x, sideA.y, sideA.z)) return false;
        if (!isWalkable(dimension, sideB.x, sideB.y, sideB.z)) return false;
    }

    if (!isWalkable(dimension, to.x, to.y, to.z)) return false;

    if (dy > 0) {
        // The space above the destination must be clear so the unit can climb.
        if (!isPassable(safeBlock(dimension, to.x, from.y + 1, to.z))) return false;
    }

    if (dy < 0 && !hasSafeDrop(dimension, to)) return false;
    return true;
}

function hasSafeDrop(dimension, cell) {
    const floor = safeBlock(dimension, cell.x, cell.y - 1, cell.z);
    return isSupport(floor) && isWalkable(dimension, cell.x, cell.y, cell.z);
}

function isWalkable(dimension, x, y, z) {
    const feet = safeBlock(dimension, x, y, z);
    const head = safeBlock(dimension, x, y + 1, z);
    const floor = safeBlock(dimension, x, y - 1, z);
    if (!feet || !head || !floor) return false;
    return isPassable(feet) && isPassable(head) && isSupport(floor);
}

function nearestWalkable(dimension, desired, fallback) {
    if (isWalkable(dimension, desired.x, desired.y, desired.z)) return desired;

    for (let radius = 1; radius <= 4; radius++) {
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dz = -radius; dz <= radius; dz++) {
                for (const dy of [0, 1, -1, -2, 2]) {
                    const candidate = { x: desired.x + dx, y: desired.y + dy, z: desired.z + dz };
                    if (isWalkable(dimension, candidate.x, candidate.y, candidate.z)) return candidate;
                }
            }
        }
    }

    return fallback;
}

function getStartCell(entity) {
    const base = {
        x: Math.floor(entity.location.x),
        y: Math.floor(entity.location.y),
        z: Math.floor(entity.location.z)
    };
    return isWalkable(entity.dimension, base.x, base.y, base.z)
        ? base
        : nearestWalkable(entity.dimension, base, null);
}

function hasDirectRoute(entity, destination) {
    const dx = destination.x - entity.location.x;
    const dz = destination.z - entity.location.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 1.25) return true;

    const steps = Math.min(12, Math.ceil(distance / 1.25));
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const x = Math.floor(entity.location.x + dx * t);
        const z = Math.floor(entity.location.z + dz * t);
        const y = Math.floor(entity.location.y);
        if (!isWalkable(entity.dimension, x, y, z)) return false;
    }
    return true;
}

function advanceWaypoint(entity, state) {
    while (state.path?.[state.index] && horizontalDistance(entity.location, state.path[state.index]) <= WAYPOINT_REACHED) {
        state.index++;
    }

    if (state.path && state.index >= state.path.length) {
        state.path = null;
        state.index = 0;
    }
}

function setDirection(soldier, entity, waypoint) {
    const dx = waypoint.x - entity.location.x;
    const dz = waypoint.z - entity.location.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= 0.05) return;

    soldier.desiredDirection.x = dx / distance;
    soldier.desiredDirection.z = dz / distance;
}

function applyPathHints(soldier, entity, waypoint) {
    const state = soldier.pathfinding ?? (soldier.pathfinding = {});
    const dy = Number(waypoint.y) - Math.floor(entity.location.y);
    state.jumpRequired = dy > 0;
    state.dropRequired = dy < 0;
    state.verticalDelta = dy;
}

function isStuck(entity, state) {
    if (!state.lastPosition) return false;
    if (system.currentTick - (state.lastProgressTick ?? system.currentTick) < STUCK_REPATH_TICKS) return false;
    return horizontalDistance(entity.location, state.lastPosition) < 0.35;
}

function updateStuckState(entity, state) {
    if (!state.lastPosition) {
        state.lastPosition = { ...entity.location };
        state.lastProgressTick = system.currentTick;
        return;
    }

    if (horizontalDistance(entity.location, state.lastPosition) >= 0.35) {
        state.lastPosition = { ...entity.location };
        state.lastProgressTick = system.currentTick;
    }
}

function getTerrainCost(dimension, cell) {
    const floor = safeBlock(dimension, cell.x, cell.y - 1, cell.z);
    if (!floor) return 10;

    const id = String(floor.typeId ?? "");
    if (id.includes("soul_sand") || id.includes("soul_soil")) return 1.5;
    if (id.includes("mud")) return 0.7;
    if (id.includes("ice")) return 0.15;
    if (id.includes("slab") || id.includes("stairs")) return -0.1;
    return 0;
}

function isPassable(block) {
    if (!block) return false;
    try {
        if (block.isAir || block.isLiquid) return true;
        const id = String(block.typeId ?? "");
        if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") return true;
        if (id === "minecraft:water" || id === "minecraft:flowing_water") return true;
        if (id.includes("_door") || id.includes("_trapdoor")) return isOpenBlock(block);
        if (id.includes("_button") || id.includes("_lever") || id.includes("_pressure_plate")) return true;
        return id.includes("tall_grass") || id.includes("short_grass") || id.includes("flower") || id.includes("vine") || id.includes("snow_layer");
    } catch {
        return false;
    }
}

function isOpenBlock(block) {
    try {
        const permutation = block.permutation;
        for (const state of ["open_bit", "open"]) {
            try {
                const value = permutation?.getState?.(state);
                if (typeof value === "boolean") return value;
            } catch {}
        }
    } catch {}
    return false;
}

function isSupport(block) {
    if (!block) return false;
    try {
        if (block.isAir || block.isLiquid) return false;
        const id = String(block.typeId ?? "");
        if (id.includes("water") || id.includes("lava")) return false;
        return block.isSolid !== false;
    } catch {
        return true;
    }
}

function safeBlock(dimension, x, y, z) {
    try {
        return dimension.getBlock({ x, y, z });
    } catch {
        return null;
    }
}

function reconstructPath(cameFrom, current) {
    const result = [];
    let node = current;

    while (node) {
        result.push({ x: node.x + 0.5, y: node.y, z: node.z + 0.5 });
        node = cameFrom.get(cellKey(node));
        if (result.length > MAX_PATH_LENGTH) break;
    }

    result.reverse();
    if (result.length > 1) result.shift();
    return result;
}

function heuristic(a, b) {
    return Math.hypot(a.x - b.x, a.z - b.z) + Math.abs(a.y - b.y) * 0.9;
}

function sameCell(a, b) {
    return a.x === b.x && a.y === b.y && a.z === b.z;
}

function cellKey(cell) {
    return `${cell.x},${cell.y},${cell.z}`;
}

function positionKey(position) {
    return `${Math.floor(Number(position.x))},${Math.floor(Number(position.y))},${Math.floor(Number(position.z))}`;
}

function isPosition(position) {
    return position && Number.isFinite(Number(position.x)) && Number.isFinite(Number(position.y)) && Number.isFinite(Number(position.z));
}

function horizontalDistance(a, b) {
    return Math.hypot(a.x - b.x, a.z - b.z);
}

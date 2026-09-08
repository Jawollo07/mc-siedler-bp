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

        // Cavalry has its own mount-aware steering/charge controller. Running
        // the infantry waypoint solver against the rider entity can overwrite
        // the horse direction and make mounted units oscillate or stall.
        if (soldier?.type === "cavalry") continue;

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

        if (direct) {
            state.path = [];
            state.index = 0;
            state.jumpRequired = false;
            setDirection(soldier, entity.location, destination);
            continue;
        }

        if (timedRepath || stuck || pathInvalid || noUsablePath) {
            const path = findPath(entity, start, destination);
            state.path = path;
            state.index = 0;
            state.lastPathTick = system.currentTick;
            state.jumpRequired = false;
        }

        const waypoint = state.path?.[state.index];
        if (waypoint) {
            state.jumpRequired = Number(waypoint.y) > Math.floor(entity.location.y) ||
                Number(waypoint.y) - Number(entity.location.y) > 0.35;
            setDirection(soldier, entity.location, waypoint);
        } else {
            setDirection(soldier, entity.location, destination);
        }
    }
}

function isMovementRelevant(soldier) {
    return soldier.phase === SOLDIER_CONFIG.STATES.MOVE && !!getDestination(soldier);
}

function getDestination(soldier) {
    if (soldier.targetId) {
        try {
            const target = soldier.entity.dimension.getEntities({ location: soldier.entity.location, maxDistance: 40 }).find(e => e.id === soldier.targetId && e.isValid);
            if (target) return { ...target.location };
        } catch {}
    }
    const command = soldier.command;
    if (command?.position) return { ...command.position };
    if (Array.isArray(command?.positions) && command.positions.length) return { ...command.positions[command.patrolIndex ?? 0] };
    return null;
}

function setDirection(soldier, from, to) {
    const dx = Number(to.x) - Number(from.x);
    const dz = Number(to.z) - Number(from.z);
    const length = Math.hypot(dx, dz);
    if (length <= 0.01) return;
    soldier.desiredDirection ??= { x: 0, z: 0 };
    soldier.desiredDirection.x = dx / length;
    soldier.desiredDirection.z = dz / length;
}

function advanceWaypoint(entity, state) {
    const waypoint = state.path?.[state.index];
    if (!waypoint) return;
    if (horizontalDistance(entity.location, waypoint) <= WAYPOINT_REACHED) state.index++;
}

function resetPathState(state, key) {
    state.destinationKey = key;
    state.path = [];
    state.index = 0;
    state.lastPathTick = -Infinity;
    state.jumpRequired = false;
}

function findPath(entity, start, destination) {
    const goal = findGoalCell(entity, destination);
    if (!goal) return [];

    const open = [{ ...start, g: 0, f: heuristic(start, goal) }];
    const cameFrom = new Map();
    const bestG = new Map([[cellKey(start), 0]]);
    const closed = new Set();
    let nodes = 0;

    while (open.length && nodes++ < MAX_NODES) {
        open.sort((a, b) => a.f - b.f);
        const current = open.shift();
        const currentKey = cellKey(current);
        if (closed.has(currentKey)) continue;
        closed.add(currentKey);

        if (current.x === goal.x && current.y === goal.y && current.z === goal.z) return reconstruct(cameFrom, current);

        for (const next of neighbors(entity, current)) {
            const key = cellKey(next);
            if (closed.has(key)) continue;
            const stepCost = movementCost(entity.dimension, next);
            const g = current.g + stepCost;
            if (g >= (bestG.get(key) ?? Infinity)) continue;
            bestG.set(key, g);
            cameFrom.set(key, current);
            open.push({ ...next, g, f: g + heuristic(next, goal) });
        }
    }
    return [];
}

function neighbors(entity, cell) {
    const result = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
            if (dx === 0 && dz === 0) continue;
            if (dx !== 0 && dz !== 0 && (!isWalkable(entity.dimension, cell.x + dx, cell.y, cell.z) || !isWalkable(entity.dimension, cell.x, cell.y, cell.z + dz))) continue;
            for (let dy = -MAX_STEP_DOWN; dy <= MAX_STEP_UP; dy++) {
                const y = cell.y + dy;
                if (!isWalkable(entity.dimension, cell.x + dx, y, cell.z + dz)) continue;
                if (!hasSupport(entity.dimension, cell.x + dx, y - 1, cell.z + dz)) continue;
                if (dy < 0 && Math.abs(dy) > MAX_STEP_DOWN) continue;
                result.push({ x: cell.x + dx, y, z: cell.z + dz });
                break;
            }
        }
    }
    return result;
}

function findGoalCell(entity, destination) {
    const x = Math.floor(destination.x);
    const z = Math.floor(destination.z);
    const baseY = Math.floor(destination.y);
    for (let dy = 0; dy <= 2; dy++) {
        for (const y of [baseY + dy, baseY - dy]) {
            if (isWalkable(entity.dimension, x, y, z) && hasSupport(entity.dimension, x, y - 1, z)) return { x, y, z };
        }
    }
    return null;
}

function getStartCell(entity) {
    const x = Math.floor(entity.location.x);
    const z = Math.floor(entity.location.z);
    for (let dy = 1; dy >= -2; dy--) {
        const y = Math.floor(entity.location.y) + dy;
        if (isWalkable(entity.dimension, x, y, z) && hasSupport(entity.dimension, x, y - 1, z)) return { x, y, z };
    }
    return null;
}

function reconstruct(cameFrom, current) {
    const path = [];
    let node = current;
    while (node) {
        path.push({ x: node.x + 0.5, y: node.y, z: node.z + 0.5 });
        node = cameFrom.get(cellKey(node));
    }
    path.reverse();
    return path.slice(1, MAX_PATH_LENGTH + 1);
}

function hasDirectRoute(entity, destination) {
    const dx = destination.x - entity.location.x;
    const dz = destination.z - entity.location.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= GOAL_REACHED_DISTANCE) return true;
    const steps = Math.max(2, Math.ceil(distance * 2));
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const x = Math.floor(entity.location.x + dx * t);
        const z = Math.floor(entity.location.z + dz * t);
        const y = Math.floor(entity.location.y);
        if (!isWalkable(entity.dimension, x, y, z) || !isWalkable(entity.dimension, x, y + 1, z)) return false;
    }
    return true;
}

function isWalkable(dimension, x, y, z) {
    const feet = safeBlock(dimension, x, y, z);
    const head = safeBlock(dimension, x, y + 1, z);
    return isPassable(feet) && isPassable(head);
}

function hasSupport(dimension, x, y, z) {
    const block = safeBlock(dimension, x, y, z);
    return !!block && !isPassable(block) && !block.isLiquid;
}

function movementCost(dimension, cell) {
    const block = safeBlock(dimension, cell.x, cell.y - 1, cell.z);
    let cost = 1;
    if (block?.typeId?.includes("soul_sand")) cost += 2;
    if (block?.typeId?.includes("magma")) cost += 3;
    if (block?.typeId?.includes("ice")) cost += 0.25;
    if (block?.typeId?.includes("path")) cost -= 0.1;
    return cost + (cell.y % 1 !== 0 ? 0.1 : 0);
}

function safeBlock(dimension, x, y, z) {
    try { return dimension.getBlock({ x, y, z }); } catch { return null; }
}

function isPassable(block) {
    if (!block) return false;
    try {
        if (block.isAir || block.isLiquid) return true;
        const id = String(block.typeId ?? "");
        return id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air" || id === "minecraft:water" || id === "minecraft:flowing_water" || id.endsWith("_door") && block.permutation?.getState?.("open_bit") === true || id.endsWith("_trapdoor") && block.permutation?.getState?.("open_bit") === true;
    } catch { return false; }
}

function cellKey(cell) { return `${cell.x},${cell.y},${cell.z}`; }
function positionKey(position) { return `${Math.floor(position.x)},${Math.floor(position.y)},${Math.floor(position.z)}`; }
function heuristic(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z); }
function horizontalDistance(a, b) { return Math.hypot(b.x - a.x, b.z - a.z); }
function isStuck(entity, state) {
    const position = entity.location;
    const previous = state.lastPosition;
    state.lastPosition = { ...position };
    if (!previous) return false;
    return horizontalDistance(position, previous) < 0.08 && system.currentTick - (state.lastMoveTick ?? system.currentTick) > STUCK_REPATH_TICKS;
}

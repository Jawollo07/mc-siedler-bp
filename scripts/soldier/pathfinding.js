import { system } from "@minecraft/server";
import { SOLDIERS, SOLDIER_CONFIG } from "./config.js";

// Keep pathfinding deliberately cheap: every block lookup enters the Bedrock
// script engine and large synchronous A* searches can trigger the watchdog.
const TICK_INTERVAL = 4;
const REPATH_TICKS = 12;
const STUCK_REPATH_TICKS = 10;
const WAYPOINT_REACHED = 0.72;
const MAX_NODES = 180;
const MAX_PATH_LENGTH = 40;
const MAX_SEARCH_DISTANCE = 20;
const DIRECT_MAX_DISTANCE = 14;
const DIRECT_MAX_SAMPLES = 16;
const MAX_STEP_UP = 1;
const MAX_STEP_DOWN = 2;
const GOAL_REACHED_DISTANCE = 1.1;

let started = false;
let budgetTick = -1;
let budgetUsed = 0;

export function startSoldierPathfinding() {
    if (started) return;
    started = true;
    system.runInterval(updatePathfinding, TICK_INTERVAL);
    console.info("[Soldier Pathfinding] Watchdog-safe local navigation enabled");
}

function updatePathfinding() {
    if (budgetTick !== system.currentTick) {
        budgetTick = system.currentTick;
        budgetUsed = 0;
    }

    let index = 0;
    const slice = Math.floor(system.currentTick / TICK_INTERVAL) % 2;

    for (const [, soldier] of SOLDIERS) {
        if ((index++ % 2) !== slice) continue;
        if (soldier?.type === "cavalry") continue;

        const entity = soldier?.entity;
        if (!entity?.isValid || soldier.phase !== SOLDIER_CONFIG.STATES.MOVE) continue;

        const destination = getDestination(soldier);
        if (!destination || !validPosition(destination)) continue;

        const state = soldier.pathfinding ?? (soldier.pathfinding = {});
        const key = positionKey(destination);
        if (state.destinationKey !== key) resetPathState(state, key);

        if (state.path?.[state.index]) advanceWaypoint(entity, state);

        const waypoint = state.path?.[state.index];
        const distance = horizontalDistance(entity.location, destination);
        const timedRepath = system.currentTick - (state.lastPathTick ?? -Infinity) >= REPATH_TICKS;
        const stuck = isStuck(entity, state);
        const invalid = !!waypoint && !isWalkable(entity.dimension, waypoint.x, waypoint.y, waypoint.z);

        // Direct movement is checked less often and only for short distances.
        if (system.currentTick - (state.directRouteTick ?? -Infinity) >= 8) {
            state.directRoute = distance <= DIRECT_MAX_DISTANCE && hasDirectRoute(entity, destination);
            state.directRouteTick = system.currentTick;
        }

        if (state.directRoute) {
            state.path = [];
            state.index = 0;
            state.jumpRequired = false;
            setDirection(soldier, entity.location, destination);
            continue;
        }

        if ((timedRepath || stuck || invalid || !waypoint) && budgetUsed < MAX_NODES) {
            const path = findPath(entity, destination);
            state.path = path;
            state.index = 0;
            state.lastPathTick = system.currentTick;
            state.jumpRequired = false;
        }

        const next = state.path?.[state.index];
        setDirection(soldier, entity.location, next ?? destination);
        if (next) {
            state.jumpRequired = Number(next.y) > Math.floor(entity.location.y) ||
                Number(next.y) - Number(entity.location.y) > 0.35;
        }
    }
}

function getDestination(soldier) {
    if (soldier.targetId) {
        try {
            const entity = soldier.entity;
            if (!entity?.isValid) return null;
            const target = entity.dimension.getEntities({
                location: entity.location,
                maxDistance: 40
            }).find(e => e.id === soldier.targetId && e.isValid);
            if (target) return { ...target.location };
        } catch {}
    }

    const command = soldier.command;
    if (command?.position) return { ...command.position };
    if (Array.isArray(command?.positions) && command.positions.length) {
        return { ...command.positions[command.patrolIndex ?? 0] };
    }
    return null;
}

function findPath(entity, destination) {
    const start = getStartCell(entity);
    if (!start) return [];

    const goal = findGoalCell(entity, destination);
    if (!goal) return [];
    if (Math.abs(goal.x - start.x) > MAX_SEARCH_DISTANCE ||
        Math.abs(goal.z - start.z) > MAX_SEARCH_DISTANCE) return [];

    const open = [{ ...start, g: 0, f: heuristic(start, goal) }];
    const cameFrom = new Map();
    const bestG = new Map([[cellKey(start), 0]]);
    const closed = new Set();

    while (open.length && budgetUsed < MAX_NODES) {
        budgetUsed++;
        open.sort((a, b) => a.f - b.f);
        const current = open.shift();
        const currentKey = cellKey(current);
        if (closed.has(currentKey)) continue;
        closed.add(currentKey);

        if (current.x === goal.x && current.y === goal.y && current.z === goal.z) {
            return reconstruct(cameFrom, current);
        }

        for (const next of neighbors(entity, current)) {
            const key = cellKey(next);
            if (closed.has(key)) continue;
            const g = current.g + movementCost(entity.dimension, next);
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

            if (dx && dz &&
                (!isWalkable(entity.dimension, cell.x + dx, cell.y, cell.z) ||
                 !isWalkable(entity.dimension, cell.x, cell.y, cell.z + dz))) continue;

            for (let dy = -MAX_STEP_DOWN; dy <= MAX_STEP_UP; dy++) {
                const y = cell.y + dy;
                if (!isWalkable(entity.dimension, cell.x + dx, y, cell.z + dz)) continue;
                if (!hasSupport(entity.dimension, cell.x + dx, y - 1, cell.z + dz)) continue;
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
    const y0 = Math.floor(destination.y);
    for (let dy = 0; dy <= 2; dy++) {
        for (const y of [y0 + dy, y0 - dy]) {
            if (isWalkable(entity.dimension, x, y, z) && hasSupport(entity.dimension, x, y - 1, z)) {
                return { x, y, z };
            }
        }
    }
    return null;
}

function getStartCell(entity) {
    const x = Math.floor(entity.location.x);
    const z = Math.floor(entity.location.z);
    const y0 = Math.floor(entity.location.y);
    for (let dy = 1; dy >= -2; dy--) {
        const y = y0 + dy;
        if (isWalkable(entity.dimension, x, y, z) && hasSupport(entity.dimension, x, y - 1, z)) {
            return { x, y, z };
        }
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

    const steps = Math.min(DIRECT_MAX_SAMPLES, Math.max(2, Math.ceil(distance)));
    const y = Math.floor(entity.location.y);
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const x = Math.floor(entity.location.x + dx * t);
        const z = Math.floor(entity.location.z + dz * t);
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
    const id = String(block?.typeId ?? "");
    if (id.includes("soul_sand")) cost += 2;
    if (id.includes("magma")) cost += 3;
    if (id.includes("ice")) cost += 0.25;
    if (id.includes("path")) cost -= 0.1;
    return cost;
}

function safeBlock(dimension, x, y, z) {
    try { return dimension.getBlock({ x, y, z }); } catch { return null; }
}

function isPassable(block) {
    if (!block) return false;
    try {
        if (block.isAir || block.isLiquid) return true;
        const id = String(block.typeId ?? "");
        if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") return true;
        if (id === "minecraft:water" || id === "minecraft:flowing_water") return true;
        if (id.endsWith("_door")) return block.permutation?.getState?.("open_bit") === true;
        if (id.endsWith("_trapdoor")) return block.permutation?.getState?.("open_bit") === true;
    } catch {}
    return false;
}

function setDirection(soldier, from, to) {
    if (!to) return;
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
    if (waypoint && horizontalDistance(entity.location, waypoint) <= WAYPOINT_REACHED) state.index++;
}

function resetPathState(state, key) {
    state.destinationKey = key;
    state.path = [];
    state.index = 0;
    state.lastPathTick = -Infinity;
    state.lastPosition = null;
    state.lastMoveTick = system.currentTick;
    state.directRoute = false;
    state.directRouteTick = -Infinity;
    state.jumpRequired = false;
}

function isStuck(entity, state) {
    const position = entity.location;
    const previous = state.lastPosition;
    state.lastPosition = { ...position };
    if (!previous) return false;

    const moved = horizontalDistance(position, previous) >= 0.08;
    if (moved) state.lastMoveTick = system.currentTick;
    return !moved && system.currentTick - (state.lastMoveTick ?? system.currentTick) > STUCK_REPATH_TICKS;
}

function validPosition(position) {
    return Number.isFinite(Number(position?.x)) &&
        Number.isFinite(Number(position?.y)) &&
        Number.isFinite(Number(position?.z));
}

function cellKey(cell) { return `${cell.x},${cell.y},${cell.z}`; }
function positionKey(position) { return `${Math.floor(position.x)},${Math.floor(position.y)},${Math.floor(position.z)}`; }
function heuristic(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z); }
function horizontalDistance(a, b) { return Math.hypot(b.x - a.x, b.z - a.z); }

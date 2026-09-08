import { system } from "@minecraft/server";
import { SOLDIERS, SOLDIER_CONFIG } from "./config.js";

const TICK_INTERVAL = 2;
const REPATH_TICKS = 12;
const WAYPOINT_REACHED = 0.9;
const DIRECT_LOOK_AHEAD = 1.4;
const SEARCH_RADIUS = 18;
const MAX_NODES = 900;
const MAX_PATH_LENGTH = 48;
const DIAGONAL_COST = 1.4142;

let started = false;

/**
 * Lightweight voxel A* navigation for Siedler soldiers.
 *
 * The vanilla navigation component is not used as the soldiers are moved by
 * the custom impulse AI. Instead this module calculates a small local path
 * over walkable block cells and feeds the next waypoint back into the AI's
 * desiredDirection vector.
 */
export function startSoldierPathfinding() {
    if (started) return;
    started = true;
    system.runInterval(updatePathfinding, TICK_INTERVAL);
    console.info("[Soldier Pathfinding] Local A* navigation enabled");
}

function updatePathfinding() {
    let index = 0;
    for (const [id, soldier] of SOLDIERS) {
        if ((index++ % 2) !== ((Math.floor(system.currentTick / TICK_INTERVAL)) % 2)) continue;
        if (!isMoving(soldier)) continue;

        const entity = soldier.entity;
        if (!entity?.isValid) continue;

        const destination = getDestination(soldier);
        if (!destination) continue;

        const targetKey = `${Math.floor(destination.x)},${Math.floor(destination.y)},${Math.floor(destination.z)}`;
        const currentKey = cellKey(entity.location);
        const state = soldier.pathfinding ?? (soldier.pathfinding = {});

        if (state.destinationKey !== targetKey) {
            state.destinationKey = targetKey;
            state.path = null;
            state.index = 0;
            state.lastPathTick = -Infinity;
        }

        if (state.path?.length && state.index < state.path.length) {
            const waypoint = state.path[state.index];
            if (horizontalDistance(entity.location, waypoint) <= WAYPOINT_REACHED) {
                state.index++;
                if (state.index >= state.path.length) {
                    state.path = null;
                }
            }
        }

        const target = state.path?.[state.index];
        const directBlocked = !hasDirectRoute(entity, destination);
        const needsRepath = !state.path || state.index >= state.path.length ||
            (directBlocked && system.currentTick - (state.lastPathTick ?? -Infinity) >= REPATH_TICKS);

        if (needsRepath && system.currentTick - (state.lastPathTick ?? -Infinity) >= REPATH_TICKS) {
            state.lastPathTick = system.currentTick;
            const start = getStartCell(entity);
            const goal = chooseGoalCell(entity, destination);
            const path = findPath(entity.dimension, start, goal);
            state.path = path;
            state.index = 0;
        }

        const next = state.path?.[state.index] ?? destination;
        setDirection(soldier, entity, next);
    }
}

function isMoving(soldier) {
    if (!soldier || soldier.phase !== SOLDIER_CONFIG.STATES.MOVE) return false;
    const direction = soldier.desiredDirection;
    return !!direction && Math.hypot(direction.x, direction.z) > 0.01;
}

function getDestination(soldier) {
    const entity = soldier.entity;
    const command = soldier.command;

    if (command?.position && isPosition(command.position)) return command.position;
    if (Array.isArray(command?.positions) && command.positions.length) {
        const index = Math.min(command.patrolIndex ?? 0, command.positions.length - 1);
        return command.positions[index];
    }

    if (soldier.targetId) {
        try {
            const target = entity.dimension.getEntities({
                location: entity.location,
                maxDistance: SOLDIER_CONFIG.SEARCH_RADIUS + 8
            }).find(candidate => candidate.id === soldier.targetId);
            if (target?.isValid) return target.location;
        } catch {}
    }

    try {
        const ownerId = entity.getDynamicProperty("soldier:ownerId");
        if (ownerId) {
            const owner = entity.dimension.getPlayers?.().find?.(player => player.id === ownerId);
            if (owner?.isValid) return owner.location;
        }
    } catch {}

    return null;
}

function chooseGoalCell(entity, destination) {
    const start = getStartCell(entity);
    const dx = destination.x - entity.location.x;
    const dz = destination.z - entity.location.z;
    const distance = Math.hypot(dx, dz);

    if (distance <= SEARCH_RADIUS - 2) {
        return nearestWalkable(entity.dimension, {
            x: Math.floor(destination.x),
            y: Math.floor(destination.y),
            z: Math.floor(destination.z)
        }, start);
    }

    const scale = (SEARCH_RADIUS - 2) / Math.max(distance, 0.01);
    return nearestWalkable(entity.dimension, {
        x: Math.floor(entity.location.x + dx * scale),
        y: Math.floor(entity.location.y),
        z: Math.floor(entity.location.z + dz * scale)
    }, start);
}

function findPath(dimension, start, goal) {
    if (!isWalkable(dimension, start.x, start.y, start.z)) return [];
    if (!isWalkable(dimension, goal.x, goal.y, goal.z)) return [];

    const open = [{ x: start.x, y: start.y, z: start.z, g: 0, f: heuristic(start, goal) }];
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

        if (current.x === goal.x && current.y === goal.y && current.z === goal.z) {
            return reconstructPath(cameFrom, current);
        }

        for (const neighbor of neighbors(current)) {
            const key = cellKey(neighbor);
            if (closed.has(key) || !isWalkable(dimension, neighbor.x, neighbor.y, neighbor.z)) continue;

            const diagonal = neighbor.x !== current.x && neighbor.z !== current.z;
            const stepCost = diagonal ? DIAGONAL_COST : 1;
            const tentative = current.g + stepCost + Math.abs(neighbor.y - current.y) * 0.15;
            if (tentative >= (gScore.get(key) ?? Infinity)) continue;

            cameFrom.set(key, current);
            gScore.set(key, tentative);
            open.push({ ...neighbor, g: tentative, f: tentative + heuristic(neighbor, goal) });
        }
    }

    return [];
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
    if (result.length && result.length > 1) result.shift();
    return result;
}

function neighbors(node) {
    const result = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
            if (dx === 0 && dz === 0) continue;
            for (const dy of [0, 1, -1]) {
                // Diagonal movement may not cut through a solid corner.
                if (dx !== 0 && dz !== 0 && dy === 0) {
                    result.push({ x: node.x + dx, y: node.y, z: node.z + dz, diagonal: true });
                } else if (dx === 0 || dz === 0) {
                    result.push({ x: node.x + dx, y: node.y + dy, z: node.z + dz });
                }
            }
        }
    }
    return result;
}

function isWalkable(dimension, x, y, z) {
    const feet = safeBlock(dimension, x, y, z);
    const head = safeBlock(dimension, x, y + 1, z);
    const floor = safeBlock(dimension, x, y - 1, z);
    if (!feet || !head || !floor) return false;
    if (!isPassable(feet) || !isPassable(head)) return false;
    return isSupport(floor);
}

function nearestWalkable(dimension, desired, fallback) {
    if (isWalkable(dimension, desired.x, desired.y, desired.z)) return desired;
    for (let radius = 1; radius <= 3; radius++) {
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dz = -radius; dz <= radius; dz++) {
                for (const dy of [0, 1, -1]) {
                    const candidate = { x: desired.x + dx, y: desired.y + dy, z: desired.z + dz };
                    if (isWalkable(dimension, candidate.x, candidate.y, candidate.z)) return candidate;
                }
            }
        }
    }
    return fallback;
}

function getStartCell(entity) {
    const base = { x: Math.floor(entity.location.x), y: Math.floor(entity.location.y), z: Math.floor(entity.location.z) };
    if (isWalkable(entity.dimension, base.x, base.y, base.z)) return base;
    return nearestWalkable(entity.dimension, base, base);
}

function hasDirectRoute(entity, destination) {
    const dx = destination.x - entity.location.x;
    const dz = destination.z - entity.location.z;
    const distance = Math.hypot(dx, dz);
    if (distance < DIRECT_LOOK_AHEAD) return true;
    const steps = Math.min(8, Math.ceil(distance / 1.5));
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const x = Math.floor(entity.location.x + dx * t);
        const z = Math.floor(entity.location.z + dz * t);
        const y = Math.floor(entity.location.y);
        if (!isWalkable(entity.dimension, x, y, z)) return false;
    }
    return true;
}

function setDirection(soldier, entity, waypoint) {
    const dx = waypoint.x - entity.location.x;
    const dz = waypoint.z - entity.location.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= 0.05) return;
    soldier.desiredDirection.x = dx / distance;
    soldier.desiredDirection.z = dz / distance;
}

function isPassable(block) {
    try {
        if (block.isAir || block.isLiquid) return true;
        const id = String(block.typeId ?? "");
        return id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:water" || id === "minecraft:flowing_water" || id.includes("_door") || id.includes("_trapdoor");
    } catch {
        return false;
    }
}

function isSupport(block) {
    try {
        if (block.isLiquid || block.isAir) return false;
        return block.isSolid !== false;
    } catch {
        return true;
    }
}

function safeBlock(dimension, x, y, z) {
    try { return dimension.getBlock({ x, y, z }); } catch { return null; }
}

function heuristic(a, b) {
    return Math.hypot(a.x - b.x, a.z - b.z) + Math.abs(a.y - b.y) * 0.8;
}

function cellKey(cell) {
    return `${cell.x},${cell.y},${cell.z}`;
}

function isPosition(position) {
    return position && Number.isFinite(Number(position.x)) && Number.isFinite(Number(position.y)) && Number.isFinite(Number(position.z));
}

function horizontalDistance(a, b) {
    return Math.hypot(a.x - b.x, a.z - b.z);
}

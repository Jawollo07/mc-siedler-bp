import { system, world } from "@minecraft/server";
import { SOLDIERS, SOLDIER_CONFIG, SOLDIER_TYPES } from "./config.js";
import { getPlayerTeam, getSoldierTeam } from "../teams/index.js";
import { getTeamRelation, TEAM_RELATION } from "../teams/relations.js";
import { SOLDIER_COMMANDS, getSoldierCommand, clearSoldierCommand } from "./command_manager.js";

const SOLDIER_ID = "siedler:soldier";
const TICK_MS = 50;
const ARRIVAL_DISTANCE = 1.15;
const SOFT_ARRIVAL_DISTANCE = 2.2;
const MAX_HORIZONTAL_SPEED = 0.32;
const MOVEMENT_ACCELERATION = 0.055;
const MOVEMENT_BRAKE = 0.085;
const TURN_RESPONSE = 0.22;

// Combat timing is deliberately slower than the AI update rate.
// This creates a visible wind-up, impact and recovery instead of instant damage every interval.
const ATTACK_WINDUP = 320;
const ATTACK_RECOVERY = 260;
const ATTACK_ANIMATION_TICKS = 13;
const ATTACK_RANGE_PADDING = 0.18;
const COMBAT_STOP_PADDING = 0.18;
const HIT_LUNGE = 0.035;
const STRAFE_STRENGTH = 0.045;
const STRAFE_DURATION = 650;
const STRAFE_COOLDOWN = 1500;
let aiStarted = false;

export function startSoldierAI() {
    if (aiStarted) return;
    aiStarted = true;
    if (!SOLDIER_CONFIG.enabled) return;
    system.runTimeout(discoverSoldiers, 1);
    system.runInterval(discoverSoldiers, 40);
    system.runInterval(updateSoldiers, SOLDIER_CONFIG.AI_INTERVAL);
    console.info("[Soldier AI] Started");
}

function discoverSoldiers() {
    for (const dimension of getDimensions()) {
        try {
            for (const entity of dimension.getEntities({ type: SOLDIER_ID })) {
                if (!entity.isValid || SOLDIERS.has(entity.id)) continue;
                registerExistingSoldier(entity);
            }
        } catch (error) { debug(`Discovery failed: ${formatError(error)}`); }
    }
}

function registerExistingSoldier(entity) {
    const type = getDynamicString(entity, "soldier:type", getTaggedValue(entity, "soldier_type:") ?? "infantry");
    const level = getDynamicNumber(entity, "soldier:level", Number(getTaggedValue(entity, "soldier_level:")) || 1);
    const typeData = SOLDIER_TYPES[type] ?? SOLDIER_TYPES.infantry;
    const levelData = typeData.levels?.[level] ?? typeData.levels?.[1];
    SOLDIERS.set(entity.id, {
        entity, type, level,
        ownerId: getDynamicString(entity, "soldier:ownerId", null),
        phase: SOLDIER_CONFIG.STATES.IDLE, targetId: null,
        abilities: levelData?.abilities ?? [], abilityCooldowns: {},
        spawnLocation: { ...entity.location }, createdAt: world.getAbsoluteTime(),
        nextAttack: 0, nextTargetSearch: 0, nextMovement: 0, command: null,
        desiredDirection: { x: 0, z: 0 }, velocity: { x: 0, z: 0 },
        lastPosition: { ...entity.location },
        attack: null,
        strafe: { x: 0, z: 0, until: 0, next: 0 }
    });
    setCombatAnimation(entity, "idle");
}

function updateSoldiers() {
    for (const [id, soldier] of SOLDIERS) {
        try {
            if (!updateSoldier(soldier, Date.now())) SOLDIERS.delete(id);
        } catch (error) { debug(`Update failed for ${id}: ${formatError(error)}`); }
    }
}

function updateSoldier(soldier, now) {
    if (!isValid(soldier.entity)) return false;
    synchronize(soldier);
    const command = getSoldierCommand(soldier);
    if (command && executeCommand(soldier, command, now)) {
        applyNaturalMovement(soldier);
        return true;
    }
    const result = runAutonomousAI(soldier, now);
    applyNaturalMovement(soldier);
    return result;
}

function executeCommand(soldier, command, now) {
    const entity = soldier.entity;
    switch (command.type) {
        case SOLDIER_COMMANDS.STOP:
            soldier.targetId = null; cancelAttack(soldier); setState(soldier, SOLDIER_CONFIG.STATES.IDLE); clearSoldierCommand(soldier); stopMoving(soldier); return true;
        case SOLDIER_COMMANDS.STAY:
            soldier.targetId = null; cancelAttack(soldier); setState(soldier, SOLDIER_CONFIG.STATES.IDLE);
            if (command.position) setMovementTarget(soldier, command.position, now);
            return true;
        case SOLDIER_COMMANDS.MOVE:
            if (!command.position) { clearSoldierCommand(soldier); return false; }
            soldier.targetId = null; cancelAttack(soldier);
            if (distanceBetween(entity.location, command.position) <= ARRIVAL_DISTANCE) { setState(soldier, SOLDIER_CONFIG.STATES.IDLE); clearSoldierCommand(soldier); stopMoving(soldier); return true; }
            setState(soldier, SOLDIER_CONFIG.STATES.MOVE); setMovementTarget(soldier, command.position, now); return true;
        case SOLDIER_COMMANDS.FOLLOW: {
            const owner = getOwner(entity);
            if (!owner) return true;
            soldier.targetId = null; cancelAttack(soldier);
            if (distanceBetween(entity.location, owner.location) <= SOFT_ARRIVAL_DISTANCE) { setState(soldier, SOLDIER_CONFIG.STATES.IDLE); stopMoving(soldier); return true; }
            setState(soldier, SOLDIER_CONFIG.STATES.MOVE); setMovementTarget(soldier, owner.location, now); return true;
        }
        case SOLDIER_COMMANDS.ATTACK: {
            const target = findEntityById(entity, command.targetId);
            if (!target || !isValid(target) || isDead(target) || !isEnemy(soldier, target)) { clearSoldierCommand(soldier); return false; }
            soldier.targetId = target.id; return fightTarget(soldier, target, now);
        }
        case SOLDIER_COMMANDS.DEFEND: return defendPosition(soldier, command, now);
        case SOLDIER_COMMANDS.PATROL: return patrolPosition(soldier, command, now);
        case SOLDIER_COMMANDS.IDLE: cancelAttack(soldier); stopMoving(soldier); return false;
        default: clearSoldierCommand(soldier); return false;
    }
}

function runAutonomousAI(soldier, now) {
    if (soldier.targetId) {
        const current = findEntityById(soldier.entity, soldier.targetId);
        if (!current || !isEnemy(soldier, current)) soldier.targetId = null;
    }
    if (!soldier.targetId && now >= soldier.nextTargetSearch) {
        const target = findTarget(soldier);
        soldier.nextTargetSearch = now + ticksToMs(SOLDIER_CONFIG.TARGET_INTERVAL);
        if (target) soldier.targetId = target.id;
    }
    if (!soldier.targetId) {
        cancelAttack(soldier);
        setState(soldier, SOLDIER_CONFIG.STATES.IDLE);
        stopMoving(soldier);
        return true;
    }
    const target = findEntityById(soldier.entity, soldier.targetId);
    if (!target || !isEnemy(soldier, target) || isDead(target)) {
        soldier.targetId = null;
        cancelAttack(soldier);
        stopMoving(soldier);
        return true;
    }
    return fightTarget(soldier, target, now);
}

function fightTarget(soldier, target, now) {
    const entity = soldier.entity;
    const distance = distanceBetween(entity.location, target.location);
    const range = getDynamicNumber(entity, "soldier:attackRange", SOLDIER_CONFIG.DEFAULT_ATTACK_RANGE);
    const effectiveRange = range + ATTACK_RANGE_PADDING;

    // If an attack is already winding up, stay committed to it unless the target escaped.
    if (soldier.attack) {
        faceTargetSmoothly(entity, target.location);
        stopMoving(soldier);
        setState(soldier, SOLDIER_CONFIG.STATES.ATTACK);

        if (now >= soldier.attack.hitAt) {
            performAttackHit(soldier, target, now);
        }
        return true;
    }

    // Keep a small gap instead of repeatedly walking into the target's hitbox.
    if (distance > effectiveRange) {
        setState(soldier, SOLDIER_CONFIG.STATES.MOVE);
        setMovementTarget(soldier, getCombatApproachPosition(entity, target, range), now);
        return true;
    }

    // Attack only after a short wind-up. This makes every hit readable and gives the opponent a chance to react.
    stopMoving(soldier);
    faceTargetSmoothly(entity, target.location);

    if (now >= soldier.nextAttack) {
        beginAttack(soldier, target, now);
    } else {
        setState(soldier, SOLDIER_CONFIG.STATES.ATTACK);
        maybeStrafe(soldier, target, now);
    }
    return true;
}

function beginAttack(soldier, target, now) {
    const windup = ATTACK_WINDUP + randomInt(-45, 55);
    soldier.attack = {
        targetId: target.id,
        startedAt: now,
        hitAt: now + windup,
        recoveryUntil: now + windup + ATTACK_RECOVERY,
        hit: false
    };
    setState(soldier, SOLDIER_CONFIG.STATES.ATTACK);
    setCombatAnimation(soldier.entity, "attack");
    stopMoving(soldier);
    faceTargetSmoothly(soldier.entity, target.location);
    debug(`${soldier.entity.id} started attack on ${target.id}`);
}

function performAttackHit(soldier, target, now) {
    const attackData = soldier.attack;
    if (!attackData || attackData.hit) return;
    attackData.hit = true;

    if (!isValid(target) || isDead(target) || !isEnemy(soldier, target)) {
        finishAttack(soldier, now);
        return;
    }

    const entity = soldier.entity;
    const range = getDynamicNumber(entity, "soldier:attackRange", SOLDIER_CONFIG.DEFAULT_ATTACK_RANGE);
    const distance = distanceBetween(entity.location, target.location);

    // A missed swing is possible when the target moves away during the wind-up.
    if (distance > range + 0.45) {
        debug(`${entity.id} missed attack on ${target.id}`);
        finishAttack(soldier, now);
        return;
    }

    const damage = getDynamicNumber(entity, "soldier:damage", SOLDIER_CONFIG.DEFAULT_DAMAGE);
    try {
        target.applyDamage(damage);
        applyHitLunge(soldier, target);
        debug(`${entity.id} hit ${target.id} for ${damage}`);
    } catch (error) {
        debug(`Attack failed: ${formatError(error)}`);
        soldier.targetId = null;
    }

    finishAttack(soldier, now);
}

function finishAttack(soldier, now) {
    const attackData = soldier.attack;
    if (!attackData) return;
    soldier.nextAttack = now + getAttackCooldown(soldier);
    soldier.attack = null;
    soldier.strafe.until = now + ATTACK_RECOVERY;

    // Keep the attack pose alive until the client animation has completed.
    // The hit occurs around the middle of the 0.65 second animation.
    const entity = soldier.entity;
    system.runTimeout(() => {
        if (!isValid(entity) || soldier.attack) return;
        setCombatAnimation(entity, "idle");
    }, ATTACK_ANIMATION_TICKS);
}

function cancelAttack(soldier) {
    soldier.attack = null;
    if (isValid(soldier.entity)) setCombatAnimation(soldier.entity, "idle");
}

function setCombatAnimation(entity, state) {
    if (!isValid(entity) || typeof entity.setProperty !== "function") return;
    try {
        entity.setProperty("siedler:combat_state", state);
    } catch (error) {
        debug(`Combat animation state failed: ${formatError(error)}`);
    }
}

function applyHitLunge(soldier, target) {
    const entity = soldier.entity;
    const dx = target.location.x - entity.location.x;
    const dz = target.location.z - entity.location.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= 0.01) return;
    try {
        entity.applyImpulse({ x: (dx / distance) * HIT_LUNGE, y: 0, z: (dz / distance) * HIT_LUNGE });
    } catch {}
}

function maybeStrafe(soldier, target, now) {
    if (now < soldier.strafe.until) return;
    if (now < soldier.strafe.next) return;
    if (Math.random() > 0.22) {
        soldier.strafe.next = now + STRAFE_COOLDOWN;
        return;
    }

    const dx = target.location.x - soldier.entity.location.x;
    const dz = target.location.z - soldier.entity.location.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= 0.01) return;

    const side = Math.random() < 0.5 ? -1 : 1;
    soldier.strafe.x = (-dz / distance) * side;
    soldier.strafe.z = (dx / distance) * side;
    soldier.strafe.until = now + STRAFE_DURATION;
    soldier.strafe.next = now + STRAFE_COOLDOWN;
}

function getCombatApproachPosition(entity, target, range) {
    const dx = target.location.x - entity.location.x;
    const dz = target.location.z - entity.location.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= 0.01) return entity.location;

    const desiredDistance = Math.max(0.8, range - COMBAT_STOP_PADDING);
    return {
        x: target.location.x - (dx / distance) * desiredDistance,
        y: entity.location.y,
        z: target.location.z - (dz / distance) * desiredDistance
    };
}

function defendPosition(soldier, command, now) {
    const position = command.position;
    const radius = Number(command.radius ?? 8);
    if (!position) { clearSoldierCommand(soldier); return false; }
    if (distanceBetween(soldier.entity.location, position) > radius && now >= soldier.nextMovement) {
        cancelAttack(soldier);
        setState(soldier, SOLDIER_CONFIG.STATES.MOVE); setMovementTarget(soldier, position, now); return true;
    }
    const target = findTarget(soldier);
    if (target && distanceBetween(target.location, position) <= radius) return fightTarget(soldier, target, now);
    soldier.targetId = null; cancelAttack(soldier); setState(soldier, SOLDIER_CONFIG.STATES.IDLE); stopMoving(soldier); return true;
}

function patrolPosition(soldier, command, now) {
    const positions = command.positions;
    if (!Array.isArray(positions) || positions.length < 2) { clearSoldierCommand(soldier); return false; }
    const index = Math.min(command.patrolIndex ?? 0, positions.length - 1);
    const position = positions[index];
    if (distanceBetween(soldier.entity.location, position) <= ARRIVAL_DISTANCE) { command.patrolIndex = (index + 1) % positions.length; stopMoving(soldier); return true; }
    cancelAttack(soldier);
    setState(soldier, SOLDIER_CONFIG.STATES.MOVE); setMovementTarget(soldier, position, now); return true;
}

function setMovementTarget(soldier, position, now) {
    if (!isValidPosition(position)) return;
    const entity = soldier.entity;
    const dx = Number(position.x) - entity.location.x;
    const dz = Number(position.z) - entity.location.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= ARRIVAL_DISTANCE) { stopMoving(soldier); return; }
    soldier.desiredDirection.x = dx / distance;
    soldier.desiredDirection.z = dz / distance;
    soldier.nextMovement = now + ticksToMs(SOLDIER_CONFIG.MOVEMENT_INTERVAL);
}

function applyNaturalMovement(soldier) {
    const entity = soldier.entity;
    if (!isValid(entity)) return;
    const desired = soldier.desiredDirection;
    const velocity = soldier.velocity;
    const moving = Math.hypot(desired.x, desired.z) > 0.01 && soldier.phase === SOLDIER_CONFIG.STATES.MOVE;
    const targetSpeed = moving ? Math.min(MAX_HORIZONTAL_SPEED, getDynamicNumber(entity, "soldier:speed", SOLDIER_CONFIG.DEFAULT_SPEED)) : 0;
    const acceleration = moving ? MOVEMENT_ACCELERATION : MOVEMENT_BRAKE;
    velocity.x += (desired.x * targetSpeed - velocity.x) * acceleration;
    velocity.z += (desired.z * targetSpeed - velocity.z) * acceleration;

    // Small lateral movement during combat prevents soldiers from standing perfectly still in a pile.
    if (!moving && soldier.targetId && soldier.strafe?.until > Date.now()) {
        velocity.x += (soldier.strafe.x * STRAFE_STRENGTH - velocity.x) * 0.12;
        velocity.z += (soldier.strafe.z * STRAFE_STRENGTH - velocity.z) * 0.12;
    }

    const speed = Math.hypot(velocity.x, velocity.z);
    if (speed < 0.01) { velocity.x = 0; velocity.z = 0; }
    try {
        if (speed > 0.01) entity.applyImpulse({ x: velocity.x, y: 0.012, z: velocity.z });
        else if (moving) entity.applyImpulse({ x: desired.x * 0.012, y: 0.012, z: desired.z * 0.012 });
        if (moving) smoothLook(entity, desired);
    } catch (error) { debug(`Natural movement failed: ${formatError(error)}`); }
}

function stopMoving(soldier) {
    soldier.desiredDirection.x = 0;
    soldier.desiredDirection.z = 0;
    soldier.velocity.x *= 0.55;
    soldier.velocity.z *= 0.55;
}

function smoothLook(entity, direction) {
    const current = entity.getRotation?.() ?? { x: 0, y: 0 };
    const targetYaw = Math.atan2(-direction.x, direction.z) * 180 / Math.PI;
    const delta = normalizeAngle(targetYaw - current.y);
    entity.setRotation?.({ x: current.x * 0.7, y: current.y + delta * TURN_RESPONSE });
}

function faceTargetSmoothly(entity, location) {
    const dx = location.x - entity.location.x;
    const dz = location.z - entity.location.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 0.01) smoothLook(entity, { x: dx / distance, z: dz / distance });
}

function findTarget(soldier) {
    const entity = soldier.entity;
    if (!getSoldierTeam(soldier)) return null;
    let best = null, bestDistance = Infinity;
    try {
        for (const candidate of entity.dimension.getEntities({ location: entity.location, maxDistance: SOLDIER_CONFIG.SEARCH_RADIUS })) {
            if (!isValid(candidate) || candidate.id === entity.id || isDead(candidate) || !isEnemy(soldier, candidate)) continue;
            const distance = distanceSquared(entity.location, candidate.location);
            if (distance < bestDistance) { best = candidate; bestDistance = distance; }
        }
    } catch (error) { debug(`Target search failed: ${formatError(error)}`); }
    return best;
}

function isEnemy(soldier, target) {
    if (!isValid(target)) return false;
    const soldierTeam = getSoldierTeam(soldier);
    if (!soldierTeam) return false;
    if (target.typeId === "minecraft:player") {
        const targetTeam = getPlayerTeam(target);
        return !!targetTeam && getTeamRelation(soldierTeam, targetTeam) === TEAM_RELATION.HOSTILE;
    }
    if (target.typeId === SOLDIER_ID || target.hasTag?.("soldier")) {
        const targetSoldier = SOLDIERS.get(target.id);
        const targetTeam = targetSoldier ? getSoldierTeam(targetSoldier) : getSoldierTeamFromEntity(target);
        return !!targetTeam && getTeamRelation(soldierTeam, targetTeam) === TEAM_RELATION.HOSTILE;
    }
    return false;
}

function getSoldierTeamFromEntity(entity) {
    try {
        const ownerId = entity.getDynamicProperty("soldier:ownerId");
        if (!ownerId) return null;
        const player = world.getPlayers().find(player => player.id === ownerId);
        return player ? getPlayerTeam(player) : null;
    } catch { return null; }
}

function getOwner(entity) {
    try {
        const ownerId = entity.getDynamicProperty("soldier:ownerId");
        if (!ownerId) return null;
        return world.getPlayers().find(player => player.id === ownerId) ?? null;
    } catch { return null; }
}

function findEntityById(reference, id) {
    if (!id || !isValid(reference)) return null;
    try { return reference.dimension.getEntities({ location: reference.location, maxDistance: SOLDIER_CONFIG.SEARCH_RADIUS + 4 }).find(entity => entity.id === id) ?? null; }
    catch { return null; }
}

function getAttackCooldown(soldier) {
    switch (Number(soldier.level)) {
        case 3: return 700;
        case 2: return 800;
        default: return 1000;
    }
}

function setState(soldier, state) {
    if (soldier.phase !== state) {
        soldier.phase = state;
        debug(`${soldier.entity?.id ?? "unknown"} -> ${state}`);
    }
}

function synchronize(soldier) {
    if (!Number.isFinite(soldier.nextAttack)) soldier.nextAttack = 0;
    if (!Number.isFinite(soldier.nextTargetSearch)) soldier.nextTargetSearch = 0;
    if (!Number.isFinite(soldier.nextMovement)) soldier.nextMovement = 0;
    if (!soldier.phase) soldier.phase = SOLDIER_CONFIG.STATES.IDLE;
    if (!soldier.desiredDirection) soldier.desiredDirection = { x: 0, z: 0 };
    if (!soldier.velocity) soldier.velocity = { x: 0, z: 0 };
    if (!soldier.strafe) soldier.strafe = { x: 0, z: 0, until: 0, next: 0 };
    if (!Object.prototype.hasOwnProperty.call(soldier, "attack")) soldier.attack = null;
}

function isDead(entity) { try { const health = entity.getComponent("minecraft:health"); return health ? health.currentValue <= 0 : false; } catch { return true; } }
function isValid(entity) { try { return !!entity && entity.isValid === true; } catch { return false; } }
function isValidPosition(position) { return position && Number.isFinite(Number(position.x)) && Number.isFinite(Number(position.y)) && Number.isFinite(Number(position.z)); }
function getDynamicNumber(entity, property, fallback) { try { const value = Number(entity.getDynamicProperty(property)); return Number.isFinite(value) && value > 0 ? value : fallback; } catch { return fallback; } }
function getDynamicString(entity, property, fallback) { try { const value = entity.getDynamicProperty(property); return typeof value === "string" && value.length ? value : fallback; } catch { return fallback; } }
function getTaggedValue(entity, prefix) { try { return entity.getTags().find(tag => tag.startsWith(prefix))?.slice(prefix.length) ?? null; } catch { return null; } }
function distanceSquared(a, b) { const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z; return dx * dx + dy * dy + dz * dz; }
function distanceBetween(a, b) { return Math.sqrt(distanceSquared(a, b)); }
function ticksToMs(ticks) { return ticks * TICK_MS; }
function normalizeAngle(angle) { return ((angle + 180) % 360 + 360) % 360 - 180; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function getDimensions() { return [world.getDimension("overworld"), world.getDimension("nether"), world.getDimension("the_end")]; }
function formatError(error) { return error instanceof Error ? error.message : String(error); }
function debug(message) { if (SOLDIER_CONFIG.debug) console.info(`[Soldier AI] ${message}`); }

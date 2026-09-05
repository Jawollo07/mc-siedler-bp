import { SOLDIER_CONFIG, SOLDIERS } from "./config.js";
import { getPlayerTeam, getSoldierTeam } from "../teams/index.js";
import { getTeamRelation, TEAM_RELATION } from "../teams/relations.js";

const MAX_TARGET_DISTANCE = 28;
const CHARGE_START_DISTANCE = 7.5;
const CHARGE_MIN_DISTANCE = 3;
const CHARGE_HIT_DISTANCE = 2.35;
const PASS_MAX_DISTANCE = 7;
const CHARGE_COOLDOWN = 4200;
const CHARGE_TIMEOUT = 2200;
const CHARGE_DAMAGE_MULTIPLIER = 1.75;
const CHARGE_IMPULSE = 0.18;
const PASS_IMPULSE = 0.06;
const ATTACK_COOLDOWN = 800;
const TARGET_SWITCH_MARGIN = 3;
const STUCK_DISTANCE = 0.18;
const STUCK_TIME = 900;

export function runCavalryAI(soldier, now) {
    const entity = soldier.entity;
    if (!entity?.isValid) return false;
    const mount = getMount(soldier);
    if (!mount) { soldier.targetId = null; stopCavalry(soldier); return false; }
    soldier.mount = mount;
    const target = getCavalryTarget(soldier);
    if (!target) { soldier.targetId = null; stopCavalry(soldier); return true; }
    soldier.targetId = target.id;

    const distance = horizontalDistance(mount.location, target.location);
    let state = soldier.cavalryState ?? "approach";

    if (isStuck(soldier, mount, now)) {
        soldier.cavalryPassSide = soldier.cavalryPassSide === -1 ? 1 : -1;
        soldier.cavalryState = "pass";
        state = "pass";
    }

    if (state === "charge") {
        if (!isEnemy(soldier, target)) { soldier.cavalryState = "approach"; state = "approach"; }
        else if (distance <= CHARGE_HIT_DISTANCE) {
            performChargeHit(soldier, target, now);
            setStateMove(soldier); setPassDirection(soldier, mount, target); return true;
        } else if (now - (soldier.cavalryChargeStarted ?? now) > CHARGE_TIMEOUT) {
            soldier.cavalryState = "pass"; state = "pass";
        } else {
            setStateMove(soldier); setChargeDirection(soldier, mount, target); return true;
        }
    }

    if (state === "pass") {
        if (distance >= PASS_MAX_DISTANCE) soldier.cavalryState = "approach";
        else { setStateMove(soldier); setPassDirection(soldier, mount, target); return true; }
    }

    if (distance <= CHARGE_HIT_DISTANCE) {
        soldier.cavalryState = "pass"; setStateMove(soldier); setPassDirection(soldier, mount, target); return true;
    }

    if (distance >= CHARGE_MIN_DISTANCE && distance <= CHARGE_START_DISTANCE && now >= (soldier.cavalryNextCharge ?? 0)) {
        startCharge(soldier, target, now); return true;
    }

    soldier.cavalryState = "approach";
    setStateMove(soldier);
    setApproachDirection(soldier, mount, target, distance);
    return true;
}

export function runCavalryAttackCommand(soldier, target, now) {
    if (!target?.isValid || !isEnemy(soldier, target)) return false;
    soldier.targetId = target.id;
    return runCavalryAI(soldier, now);
}

function startCharge(soldier, target, now) {
    soldier.cavalryState = "charge";
    soldier.cavalryChargeTargetId = target.id;
    soldier.cavalryChargeStarted = now;
    soldier.cavalryNextCharge = now + CHARGE_COOLDOWN;
    setStateMove(soldier); setChargeDirection(soldier, soldier.mount, target);
}

function performChargeHit(soldier, target, now) {
    if ((soldier.cavalryLastHit ?? 0) + ATTACK_COOLDOWN > now) { soldier.cavalryState = "pass"; return; }
    const entity = soldier.entity;
    const damage = Number(entity.getDynamicProperty("soldier:damage") ?? 6);
    const chargedDamage = Math.max(1, Math.round(damage * CHARGE_DAMAGE_MULTIPLIER));
    try {
        target.applyDamage(chargedDamage);
        const dx = target.location.x - entity.location.x, dz = target.location.z - entity.location.z;
        const length = Math.hypot(dx, dz) || 1;
        target.applyImpulse?.({ x: dx / length * CHARGE_IMPULSE, y: 0.05, z: dz / length * CHARGE_IMPULSE });
        entity.applyImpulse?.({ x: -dx / length * PASS_IMPULSE, y: 0, z: -dz / length * PASS_IMPULSE });
    } catch (error) { console.warn(`[Cavalry AI] Charge attack failed: ${error}`); }
    soldier.cavalryLastHit = now;
    soldier.cavalryState = "pass";
}

function setApproachDirection(soldier, mount, target, distance) {
    const dir = normalized(target.location.x - mount.location.x, target.location.z - mount.location.z);
    if (!dir) return;
    const side = distance < 5.5 ? (soldier.cavalryPassSide ?? 1) * 0.12 : 0;
    setDirection(soldier, mount, dir.x - dir.z * side, dir.z + dir.x * side);
}
function setChargeDirection(soldier, mount, target) {
    if (!mount?.isValid) return;
    const dir = normalized(target.location.x - mount.location.x, target.location.z - mount.location.z);
    if (dir) setDirection(soldier, mount, dir.x, dir.z);
}
function setPassDirection(soldier, mount, target) {
    if (!mount?.isValid) return;
    const dir = normalized(target.location.x - mount.location.x, target.location.z - mount.location.z);
    if (!dir) return;
    const side = soldier.cavalryPassSide ?? 1;
    setDirection(soldier, mount, -dir.z * side + dir.x * 0.72, dir.x * side + dir.z * 0.72);
}
function setDirection(soldier, mount, x, z) {
    const dir = normalized(x, z); if (!dir) return;
    soldier.desiredDirection.x = dir.x; soldier.desiredDirection.z = dir.z;
    try { mount.setRotation?.({ x: 0, y: Math.atan2(-dir.x, dir.z) * 180 / Math.PI }); } catch {}
}
function setStateMove(soldier) {
    soldier.phase = SOLDIER_CONFIG.STATES.MOVE;
    if (!soldier.desiredDirection) soldier.desiredDirection = { x: 0, z: 0 };
    if (!soldier.velocity) soldier.velocity = { x: 0, z: 0 };
}
function stopCavalry(soldier) {
    soldier.cavalryState = "approach";
    if (soldier.desiredDirection) { soldier.desiredDirection.x = 0; soldier.desiredDirection.z = 0; }
    if (soldier.velocity) { soldier.velocity.x *= 0.35; soldier.velocity.z *= 0.35; }
    soldier.phase = SOLDIER_CONFIG.STATES.IDLE;
}
function getMount(soldier) {
    if (soldier.mount?.isValid && soldier.mount.hasTag?.("soldier_mount")) return soldier.mount;
    try {
        const entities = soldier.entity.dimension.getEntities({ location: soldier.entity.location, maxDistance: 5 });
        const owned = entities.find(e => { if (!e.isValid || !e.hasTag?.("soldier_mount")) return false; try { return e.getDynamicProperty("soldier:riderId") === soldier.entity.id; } catch { return false; } });
        if (owned) return owned;
        return entities.filter(e => e.isValid && e.hasTag?.("soldier_mount")).sort((a,b) => distanceSquared(a.location,soldier.entity.location)-distanceSquared(b.location,soldier.entity.location))[0] ?? null;
    } catch { return null; }
}
function getCavalryTarget(soldier) {
    let current = null;
    try { if (soldier.targetId) current = soldier.entity.dimension.getEntities({ location: soldier.entity.location, maxDistance: MAX_TARGET_DISTANCE }).find(e => e.id === soldier.targetId && !isMount(e) && !isDead(e) && isEnemy(soldier,e)) ?? null; } catch {}
    let best = null, bestScore = Infinity;
    try {
        for (const candidate of soldier.entity.dimension.getEntities({ location: soldier.entity.location, maxDistance: MAX_TARGET_DISTANCE })) {
            if (!candidate.isValid || candidate.id === soldier.entity.id || isMount(candidate) || isDead(candidate) || !isEnemy(soldier,candidate)) continue;
            const score = Math.sqrt(distanceSquared(candidate.location,soldier.entity.location)) + targetPriority(candidate);
            if (score < bestScore) { best = candidate; bestScore = score; }
        }
    } catch (error) { console.warn(`[Cavalry AI] Target search failed: ${error}`); }
    if (current && best && current.id !== best.id) {
        const currentDistance = Math.sqrt(distanceSquared(current.location,soldier.entity.location));
        if (bestScore + TARGET_SWITCH_MARGIN >= currentDistance) return current;
    }
    return current ?? best;
}
function targetPriority(e) { if (e.typeId === "minecraft:player") return -3; if (e.hasTag?.("soldier") || ["siedler:soldier","siedler:infantry","siedler:archer","siedler:cavalry"].includes(e.typeId)) return -2; return 0; }
function isMount(e) { try { return !!e?.hasTag?.("soldier_mount"); } catch { return false; } }
function isEnemy(soldier,target) {
    const team = getSoldierTeam(soldier); if (!team || !target?.isValid || isMount(target)) return false;
    if (target.typeId === "minecraft:player") { const t = getPlayerTeam(target); return !!t && getTeamRelation(team,t) === TEAM_RELATION.HOSTILE; }
    if (target.hasTag?.("soldier") || ["siedler:soldier","siedler:infantry","siedler:archer","siedler:cavalry"].includes(target.typeId)) { const s=SOLDIERS.get(target.id); const t=s?getSoldierTeam(s):null; return !!t && getTeamRelation(team,t)===TEAM_RELATION.HOSTILE; }
    return target.typeId?.startsWith("minecraft:") && !target.hasTag?.("villager");
}
function isDead(e) { try { return (e.getComponent("minecraft:health")?.currentValue ?? 1) <= 0; } catch { return false; } }
function isStuck(soldier,mount,now) {
    if (!soldier.cavalryLastPosition) { soldier.cavalryLastPosition={...mount.location}; soldier.cavalryLastPositionAt=now; return false; }
    const moved=Math.sqrt(distanceSquared(mount.location,soldier.cavalryLastPosition));
    if (moved>=STUCK_DISTANCE) { soldier.cavalryLastPosition={...mount.location}; soldier.cavalryLastPositionAt=now; return false; }
    return now-(soldier.cavalryLastPositionAt??now)>=STUCK_TIME && soldier.phase===SOLDIER_CONFIG.STATES.MOVE;
}
function normalized(x,z) { const l=Math.hypot(x,z); return l<=0.001?null:{x:x/l,z:z/l}; }
function horizontalDistance(a,b) { return Math.hypot(b.x-a.x,b.z-a.z); }
function distanceSquared(a,b) { const x=b.x-a.x,z=b.z-a.z; return x*x+z*z; }

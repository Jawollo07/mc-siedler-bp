import { system, world } from "@minecraft/server";
import { SOLDIERS, SOLDIER_TYPES } from "./config.js";
import { applyEquipment, setSoldierHealth } from "./spawn.js";

export const SOLDIER_LEVEL_CONFIG = Object.freeze({
    XP_PER_HIT: 5,
    XP_PER_KILL: 50,
    LEVEL_XP: Object.freeze({ 1: 0, 2: 100, 3: 300 })
});

const XP_PROPERTY = "soldier:xp";

export function getSoldierXP(entity) {
    if (!entity?.isValid) return 0;
    try {
        const value = Number(entity.getDynamicProperty(XP_PROPERTY));
        return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
    } catch { return 0; }
}

export function getSoldierProgress(soldier) {
    const entity = soldier?.entity ?? soldier;
    if (!entity?.isValid) return null;
    const type = soldier?.type ?? getType(entity);
    const typeData = SOLDIER_TYPES[type] ?? SOLDIER_TYPES.infantry;
    const maxLevel = getMaxLevel(typeData);
    const level = clampLevel(Number(soldier?.level ?? getLevel(entity)), maxLevel);
    const xp = getSoldierXP(entity);
    const nextXP = level < maxLevel ? xpForLevel(level + 1) : null;
    return { level, xp, nextXP, maxLevel, remainingXP: nextXP === null ? 0 : Math.max(0, nextXP - xp) };
}

export function initializeSoldierProgression(soldier) {
    const entity = soldier?.entity;
    if (!entity?.isValid) return;
    const typeData = SOLDIER_TYPES[soldier.type] ?? SOLDIER_TYPES.infantry;
    const maxLevel = getMaxLevel(typeData);
    const xp = getSoldierXP(entity);
    try { if (entity.getDynamicProperty(XP_PROPERTY) === undefined) saveXP(entity, 0); } catch {}
    const earnedLevel = getLevelForXP(xp, maxLevel);
    const storedLevel = clampLevel(Number(soldier.level ?? getLevel(entity)), maxLevel);
    if (earnedLevel > storedLevel) applySoldierLevel(soldier, earnedLevel, xp);
    else updateMetadata(entity, soldier.type, storedLevel, xp, typeData);
}

export function addSoldierXP(soldier, amount, reason = "unknown") {
    if (!soldier?.entity?.isValid) return null;
    const gained = Math.max(0, Math.floor(Number(amount) || 0));
    if (!gained) return getSoldierProgress(soldier);

    const entity = soldier.entity;
    const typeData = SOLDIER_TYPES[soldier.type] ?? SOLDIER_TYPES.infantry;
    const maxLevel = getMaxLevel(typeData);
    const oldXP = getSoldierXP(entity);
    const xp = oldXP + gained;
    const oldLevel = clampLevel(Number(soldier.level ?? getLevel(entity)), maxLevel);
    const newLevel = getLevelForXP(xp, maxLevel);
    saveXP(entity, xp);

    if (newLevel > oldLevel) {
        applySoldierLevel(soldier, newLevel, xp);
        console.debug(`[Soldier Level] ${entity.id} reached level ${newLevel} (${reason})`);
    } else {
        soldier.level = oldLevel;
        updateMetadata(entity, soldier.type, oldLevel, xp, typeData);
    }
    return getSoldierProgress(soldier);
}

function applySoldierLevel(soldier, level, xp) {
    const entity = soldier.entity;
    const typeData = SOLDIER_TYPES[soldier.type] ?? SOLDIER_TYPES.infantry;
    const levelData = typeData.levels?.[level];
    if (!levelData || !entity?.isValid) return;

    soldier.level = level;
    soldier.abilities = levelData.abilities ?? [];
    soldier.abilityCooldowns = {};
    entity.setDynamicProperty("soldier:level", level);
    entity.setDynamicProperty("soldier:damage", levelData.damage ?? 4);
    entity.setDynamicProperty("soldier:attackRange", levelData.attackRange ?? 1.5);
    entity.setDynamicProperty("soldier:speed", levelData.speed ?? 0.25);
    saveXP(entity, xp);
    updateMetadata(entity, soldier.type, level, xp, typeData);
    setSoldierHealth(entity, levelData.health);

    if (levelData.equipment) {
        system.runTimeout(() => {
            if (entity.isValid) applyEquipment(entity, levelData.equipment);
        }, 2);
    }

    if (soldier.ownerId) {
        try {
            const owner = world.getPlayers().find(p => p.id === soldier.ownerId);
            if (owner) system.run(() => owner.sendMessage(`§6⚔ §f${typeData.displayName} §eLv. ${level}§f wurde befördert! §7(${xp} XP)`));
        } catch {}
    }
}

function updateMetadata(entity, type, level, xp, typeData) {
    try {
        entity.nameTag = `§e${typeData.displayName} §7Lv. ${level} §8(${xp} XP)`;
        entity.addTag(`soldier_type:${type}`);
        entity.addTag(`soldier_level:${level}`);
        for (let i = 1; i <= getMaxLevel(typeData); i++) if (i !== level) entity.removeTag(`soldier_level:${i}`);
    } catch {}
}

function saveXP(entity, xp) {
    try { entity.setDynamicProperty(XP_PROPERTY, Math.max(0, Math.floor(Number(xp) || 0))); } catch (error) { console.warn(`[Soldier Level] XP save failed: ${error}`); }
}

function getLevelForXP(xp, maxLevel) {
    let level = 1;
    for (let i = 2; i <= maxLevel; i++) if (xp >= xpForLevel(i)) level = i;
    return level;
}
function xpForLevel(level) { return SOLDIER_LEVEL_CONFIG.LEVEL_XP[level] ?? Number.MAX_SAFE_INTEGER; }
function getMaxLevel(typeData) { return Math.max(1, ...Object.keys(typeData?.levels ?? {}).map(Number)); }
function clampLevel(level, maxLevel) { return Number.isFinite(level) ? Math.max(1, Math.min(maxLevel, Math.floor(level))) : 1; }
function getLevel(entity) { try { return Number(entity.getDynamicProperty("soldier:level")) || 1; } catch { return 1; } }
function getType(entity) { try { return String(entity.getDynamicProperty("soldier:type") ?? "infantry"); } catch { return "infantry"; } }

system.runInterval(() => {
    for (const soldier of SOLDIERS.values()) {
        try { initializeSoldierProgression(soldier); } catch (error) { console.debug(`[Soldier Level] sync failed: ${error}`); }
    }
}, 40);

world.afterEvents.entityHurt.subscribe(event => {
    try {
        const attacker = event.damageSource?.damagingEntity;
        if (!attacker || attacker.typeId !== "siedler:soldier") return;
        const soldier = SOLDIERS.get(attacker.id);
        if (!soldier) return;
        const health = event.hurtEntity?.getComponent?.("minecraft:health");
        if (health && Number(health.currentValue) <= 0) return;
        addSoldierXP(soldier, SOLDIER_LEVEL_CONFIG.XP_PER_HIT, "hit");
    } catch (error) { console.debug(`[Soldier Level] entityHurt failed: ${error}`); }
});

world.afterEvents.entityDie.subscribe(event => {
    try {
        const killer = event.damageSource?.damagingEntity;
        if (!killer || killer.typeId !== "siedler:soldier") return;
        const soldier = SOLDIERS.get(killer.id);
        if (soldier) addSoldierXP(soldier, SOLDIER_LEVEL_CONFIG.XP_PER_KILL, "kill");
    } catch (error) { console.debug(`[Soldier Level] entityDie failed: ${error}`); }
});

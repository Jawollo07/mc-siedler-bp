import { system, world } from "@minecraft/server";
import { SOLDIERS, SOLDIER_TYPES } from "./config.js";
import { applyEquipment, setSoldierHealth } from "./spawn.js";

export const SOLDIER_LEVEL_CONFIG = Object.freeze({
    HIT_XP_BY_DAMAGE: Object.freeze({
        LOW: Object.freeze({ minXP: 1, maxXP: 1 }),
        MEDIUM: Object.freeze({ minXP: 2, maxXP: 4 }),
        HIGH: Object.freeze({ minXP: 5, maxXP: 7 }),
        VERY_HIGH: Object.freeze({ minXP: 1, maxXP: 8 })
    }),
    KILL_XP: Object.freeze({
        NORMAL: Object.freeze({ minXP: 25, maxXP: 50 }),
        STRONG: Object.freeze({ minXP: 50, maxXP: 75 }),
        BOSS: Object.freeze({ minXP: 75, maxXP: 100 })
    }),
    LEVEL_XP: Object.freeze({ 1: 0, 2: 150, 3: 400, 4: 800, 5: 1400, 6: 2200, 7: 3500 })
});

const XP_PROPERTY = "soldier:xp";
const STRONG_ENEMIES = new Set(["minecraft:vindicator", "minecraft:evoker", "minecraft:ravager", "minecraft:warden", "minecraft:elder_guardian", "minecraft:piglin_brute"]);
const BOSS_ENEMIES = new Set(["minecraft:ender_dragon", "minecraft:wither"]);

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

export function getHitXP(damage) {
    const value = Math.max(0, Math.floor(Number(damage) || 0));
    if (value <= 0) return 0;
    const bracket = value <= 2
        ? SOLDIER_LEVEL_CONFIG.HIT_XP_BY_DAMAGE.LOW
        : value <= 5
            ? SOLDIER_LEVEL_CONFIG.HIT_XP_BY_DAMAGE.MEDIUM
            : value <= 10
                ? SOLDIER_LEVEL_CONFIG.HIT_XP_BY_DAMAGE.HIGH
                : SOLDIER_LEVEL_CONFIG.HIT_XP_BY_DAMAGE.VERY_HIGH;
    return randomInt(bracket.minXP, bracket.maxXP);
}

export function getEnemyStrength(entity) {
    if (!entity?.isValid) return "normal";
    try {
        const tags = new Set(entity.getTags?.() ?? []);
        if (tags.has("soldier_xp_boss") || tags.has("boss") || tags.has("very_strong")) return "boss";
        if (tags.has("soldier_xp_strong") || tags.has("strong")) return "strong";
    } catch {}
    if (BOSS_ENEMIES.has(entity.typeId)) return "boss";
    if (STRONG_ENEMIES.has(entity.typeId)) return "strong";
    try {
        const health = entity.getComponent?.("minecraft:health");
        const maxHealth = Number(health?.effectiveMax ?? health?.defaultValue ?? 0);
        if (maxHealth >= 150) return "boss";
        if (maxHealth >= 50) return "strong";
    } catch {}
    return "normal";
}

export function getKillXP(entity) {
    const strength = getEnemyStrength(entity);
    const reward = SOLDIER_LEVEL_CONFIG.KILL_XP[strength.toUpperCase()] ?? SOLDIER_LEVEL_CONFIG.KILL_XP.NORMAL;
    return randomInt(reward.minXP, reward.maxXP);
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
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

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
        const xp = getHitXP(event.damage);
        if (xp > 0) addSoldierXP(soldier, xp, `hit:${Math.floor(Number(event.damage) || 0)}dmg`);
    } catch (error) { console.debug(`[Soldier Level] entityHurt failed: ${error}`); }
});

world.afterEvents.entityDie.subscribe(event => {
    try {
        const killer = event.damageSource?.damagingEntity;
        if (!killer || killer.typeId !== "siedler:soldier") return;
        const soldier = SOLDIERS.get(killer.id);
        if (!soldier) return;
        const xp = getKillXP(event.deadEntity);
        if (xp > 0) addSoldierXP(soldier, xp, `kill:${getEnemyStrength(event.deadEntity)}`);
    } catch (error) { console.debug(`[Soldier Level] entityDie failed: ${error}`); }
});

import { world, system } from "@minecraft/server";
import { DEFAULT_CONFIG } from "./config.js";
import { getClaimAt } from "../claims/utils.js";

const clone = (value) => JSON.parse(JSON.stringify(value));
export let MONSTER_CONFIG = clone(DEFAULT_CONFIG);

world.beforeEvents.worldInitialize.subscribe((event) => {
    event.dynamicPropertiesDefinition.defineString("monster_config", 32767);
});

export function loadMonsterConfig() {
    try {
        const raw = world.getDynamicProperty("monster_config");
        MONSTER_CONFIG = raw ? mergeConfig(DEFAULT_CONFIG, JSON.parse(raw)) : clone(DEFAULT_CONFIG);
        console.info("§a[Monster] Zentrale config.js geladen");
    } catch (error) {
        console.warn(`[Monster] Ungültige gespeicherte Config, Standardwerte werden verwendet: ${error}`);
        MONSTER_CONFIG = clone(DEFAULT_CONFIG);
    }
}

export function saveMonsterConfig() {
    try {
        world.setDynamicProperty("monster_config", JSON.stringify(MONSTER_CONFIG));
        return true;
    } catch (error) {
        console.error(`[Monster] Config konnte nicht gespeichert werden: ${error}`);
        return false;
    }
}

function mergeConfig(base, override) {
    if (!override || typeof override !== "object" || Array.isArray(override)) return clone(base);
    const result = clone(base);
    for (const [key, value] of Object.entries(override)) {
        if (value && typeof value === "object" && !Array.isArray(value) && result[key] && typeof result[key] === "object" && !Array.isArray(result[key])) {
            result[key] = mergeConfig(result[key], value);
        } else if (value !== undefined) {
            result[key] = value;
        }
    }
    return result;
}

system.runTimeout(loadMonsterConfig, 20);

function getSpawnChance(typeId, inClaim) {
    const base = Math.min(1, Math.max(0, Number(MONSTER_CONFIG.spawnChances[typeId] ?? 1)));
    const section = inClaim ? MONSTER_CONFIG.claims : MONSTER_CONFIG;
    const rate = Math.min(1, Math.max(0, Number(section.spawnRate ?? MONSTER_CONFIG.globalSpawnRate)));
    const nightMultiplier = Math.max(0, Number(section.nightSpawnMultiplier ?? MONSTER_CONFIG.nightSpawnMultiplier));
    const time = world.getTimeOfDay();
    const night = time >= 13000 && time < 23000;
    return Math.min(1, Math.max(0, base * rate * (night ? nightMultiplier : 1)));
}

world.beforeEvents.entitySpawn.subscribe((event) => {
    if (!MONSTER_CONFIG.enabled) return;
    const entity = event.entity;
    const typeId = entity?.typeId;
    if (!typeId) return;
    const allowed = MONSTER_CONFIG.allowedMobs?.[typeId];
    if (allowed === undefined) return;
    if (!allowed) { event.cancel = true; return; }
    const claim = getClaimAt(entity.location);
    if (claim) {
        const claimConfig = MONSTER_CONFIG.claims;
        if (!claimConfig.enabled || claimConfig.allowMonsters === false || claimConfig.blockedMobs?.[typeId]) { event.cancel = true; return; }
    }
    if (Math.random() >= getSpawnChance(typeId, Boolean(claim))) event.cancel = true;
});

system.runInterval(() => {
    const weakness = MONSTER_CONFIG.weakness;
    if (!MONSTER_CONFIG.enabled || !weakness?.enabled) return;
    const duration = Math.max(1, Math.floor(Number(weakness.duration) || 220));
    const amplifier = Math.max(0, Math.min(255, Math.floor(Number(weakness.level) || 0)));
    for (const player of world.getAllPlayers()) {
        try { player.addEffect("weakness", duration, { amplifier, showParticles: false }); }
        catch (error) { if (MONSTER_CONFIG.debug) console.warn(`[Monster] Schwäche konnte nicht gesetzt werden: ${error}`); }
    }
}, 100);

import "./commands.js";

console.info("§a[Monster] Modul geladen – zentrale Config + Admin-Commands aktiv");

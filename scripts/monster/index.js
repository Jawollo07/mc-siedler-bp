import { world, system } from "@minecraft/server";
import { DEFAULT_CONFIG } from "./config.js";
import { getClaimAt } from "../claims/utils.js";
import { createLogger } from "../core/logger.js";

const logger = createLogger("Monster");
const clone = (value) => JSON.parse(JSON.stringify(value));
export let MONSTER_CONFIG = clone(DEFAULT_CONFIG);

export function loadMonsterConfig() {
    try {
        const raw = world.getDynamicProperty("monster_config");
        MONSTER_CONFIG = raw ? mergeConfig(DEFAULT_CONFIG, JSON.parse(raw)) : clone(DEFAULT_CONFIG);
        logger.success("Zentrale config.js geladen");
    } catch (error) {
        logger.exception("Ungültige gespeicherte Config, Standardwerte werden verwendet", error);
        MONSTER_CONFIG = clone(DEFAULT_CONFIG);
    }
}

export function saveMonsterConfig() {
    try {
        world.setDynamicProperty("monster_config", JSON.stringify(MONSTER_CONFIG));
        logger.debug("Monster-Konfiguration gespeichert");
        return true;
    } catch (error) {
        logger.exception("Config konnte nicht gespeichert werden", error);
        return false;
    }
}

function mergeConfig(base, override) {
    if (!override || typeof override !== "object" || Array.isArray(override)) return clone(base);
    const result = clone(base);
    for (const [key, value] of Object.entries(override)) {
        if (value && typeof value === "object" && !Array.isArray(value) && result[key] && typeof result[key] === "object" && !Array.isArray(result[key])) {
            result[key] = mergeConfig(result[key], value);
        } else if (value !== undefined) result[key] = value;
    }
    return result;
}

system.runTimeout(loadMonsterConfig, 20);

function getSpawnChance(typeId, inClaim) {
    const base = Math.min(1, Math.max(0, Number(MONSTER_CONFIG.spawnChances?.[typeId] ?? 1)));
    const section = inClaim ? (MONSTER_CONFIG.claims ?? {}) : MONSTER_CONFIG;
    const rate = Math.min(1, Math.max(0, Number(section.spawnRate ?? MONSTER_CONFIG.globalSpawnRate)));
    const nightMultiplier = Math.max(0, Number(section.nightSpawnMultiplier ?? MONSTER_CONFIG.nightSpawnMultiplier));
    const time = world.getTimeOfDay();
    const night = time >= 13000 && time < 23000;
    return Math.min(1, Math.max(0, base * rate * (night ? nightMultiplier : 1)));
}

function isAllTokenDied() {
    const values = [
        world.getDynamicProperty("#sym:allTokenDied"),
        world.getDynamicProperty("allTokenDied"),
        world.getDynamicProperty("sym:allTokenDied")
    ];
    return values.some((value) => value === true);
}

function disableAllMonsterSpawns() {
    const dimension = world.getDimension("overworld");
    for (const entity of dimension.getEntities({ type: "minecraft:monster" })) {
        try { entity.remove(); }
        catch (error) { if (MONSTER_CONFIG.debug) logger.warn(`Spawn-Blockierung konnte Entity nicht entfernen: ${error}`); }
    }
}

const entitySpawn = world.afterEvents?.entitySpawn;
if (entitySpawn && typeof entitySpawn.subscribe === "function") {
    entitySpawn.subscribe((event) => {
        const entity = event?.entity;
        if (!entity) return;
        const typeId = entity.typeId;

        if (typeId === "minecraft:villager" || typeId === "minecraft:villager_v2") {
            try { entity.addTag("villager"); }
            catch (error) { if (MONSTER_CONFIG.debug) logger.warn(`Villager-Tag konnte nicht gesetzt werden: ${error}`); }
        }

        if (!MONSTER_CONFIG.enabled) return;
        if (isAllTokenDied()) {
            try { disableAllMonsterSpawns(); }
            catch (error) { if (MONSTER_CONFIG.debug) logger.warn(`Spawn-Blockierung fehlgeschlagen: ${error}`); }
            return;
        }

        const disabled = MONSTER_CONFIG.disabledMobs?.[typeId];
        if (disabled === undefined) return;

        let shouldRemove = disabled;
        if (!shouldRemove) {
            try {
                const claim = getClaimAt(entity.location);
                if (claim) {
                    const claimConfig = MONSTER_CONFIG.claims ?? {};
                    if (claimConfig.enabled === false || claimConfig.allowMonsters === false || claimConfig.blockedMobs?.[typeId]) shouldRemove = true;
                    else if (Math.random() >= getSpawnChance(typeId, true)) shouldRemove = true;
                } else if (Math.random() >= getSpawnChance(typeId, false)) shouldRemove = true;
            } catch (error) {
                if (MONSTER_CONFIG.debug) logger.warn(`Spawn-Prüfung fehlgeschlagen für ${typeId}: ${error}`);
            }
        }

        if (!shouldRemove) return;
        try { entity.remove(); logger.debug(`Monster entfernt: type=${typeId}`); }
        catch (error) { if (MONSTER_CONFIG.debug) logger.warn(`Entity konnte nicht entfernt werden (${typeId}): ${error}`); }
    });
    logger.success("EntitySpawn-System geladen (API 2.x afterEvents)");
} else {
    logger.warn("EntitySpawn-API nicht verfügbar; normales Monster-Spawn-Filtering deaktiviert.");
}

system.runInterval(() => {
    const weakness = MONSTER_CONFIG.weakness;
    if (!MONSTER_CONFIG.enabled || !weakness?.enabled) return;
    const duration = Math.max(1, Math.floor(Number(weakness.duration) || 220));
    const amplifier = Math.max(0, Math.min(255, Math.floor(Number(weakness.level) || 0)));
    for (const player of world.getAllPlayers()) {
        try { player.addEffect("weakness", duration, { amplifier, showParticles: false }); }
        catch (error) { if (MONSTER_CONFIG.debug) logger.warn(`Schwäche konnte nicht gesetzt werden: ${error}`); }
    }
}, Math.max(1, Number(MONSTER_CONFIG.weakness?.interval) || 100));

logger.success("Modul geladen");

import { world, system } from "@minecraft/server";
import { DEFAULT_CONFIG } from "./config.js";
import { getClaimAt } from "../claims/utils.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));

function cloneConfig(config) {
    return {
        ...DEFAULT_CONFIG,
        ...config,
        allowedMobs: { ...DEFAULT_CONFIG.allowedMobs, ...(config?.allowedMobs ?? {}) },
        spawnChances: { ...DEFAULT_CONFIG.spawnChances, ...(config?.spawnChances ?? {}) },
        claims: {
            ...DEFAULT_CONFIG.claims,
            ...(config?.claims ?? {}),
            blockedMobs: { ...DEFAULT_CONFIG.claims.blockedMobs, ...(config?.claims?.blockedMobs ?? {}) }
        }
    };
}

export let MONSTER_CONFIG = cloneConfig(DEFAULT_CONFIG);

world.beforeEvents.worldInitialize.subscribe((event) => {
    event.dynamicPropertiesDefinition.defineString("monster_config", 32767);
});

export function loadMonsterConfig() {
    try {
        const raw = world.getDynamicProperty("monster_config");
        MONSTER_CONFIG = raw ? cloneConfig(JSON.parse(raw)) : cloneConfig(DEFAULT_CONFIG);
        console.info("§a[Monster] Config geladen");
    } catch (error) {
        console.warn(`[Monster] Ungültige Config, Standardwerte werden verwendet: ${error}`);
        MONSTER_CONFIG = cloneConfig(DEFAULT_CONFIG);
    }
}

export function saveMonsterConfig() {
    try {
        world.setDynamicProperty("monster_config", JSON.stringify(MONSTER_CONFIG));
        return true;
    } catch (error) {
        console.error(`[Monster] Fehler beim Speichern: ${error}`);
        return false;
    }
}

system.runTimeout(loadMonsterConfig, 20);

function getSpawnChance(typeId, inClaim) {
    const base = clamp(MONSTER_CONFIG.spawnChances[typeId] ?? 1, 0, 1);
    const config = inClaim ? MONSTER_CONFIG.claims : MONSTER_CONFIG;
    const rate = clamp(config.spawnRate ?? MONSTER_CONFIG.globalSpawnRate, 0, 1);
    const nightMultiplier = Math.max(0, Number(config.nightSpawnMultiplier ?? MONSTER_CONFIG.nightSpawnMultiplier) || 0);
    const time = world.getTimeOfDay();
    const night = time >= 13000 && time < 23000;
    return clamp(base * rate * (night ? nightMultiplier : 1), 0, 1);
}

world.beforeEvents.entitySpawn.subscribe((event) => {
    if (!MONSTER_CONFIG.enabled) return;

    const entity = event.entity;
    const typeId = entity?.typeId;
    if (!typeId) return;

    const allowed = MONSTER_CONFIG.allowedMobs?.[typeId];
    if (allowed === undefined) return;
    if (!allowed) {
        event.cancel = true;
        return;
    }

    const claim = getClaimAt(entity.location);
    if (claim) {
        const claimConfig = MONSTER_CONFIG.claims;
        if (!claimConfig.enabled || claimConfig.allowMonsters === false) {
            event.cancel = true;
            return;
        }
        if (claimConfig.blockedMobs?.[typeId]) {
            event.cancel = true;
            return;
        }
    }

    if (Math.random() >= getSpawnChance(typeId, !!claim)) {
        event.cancel = true;
    }
});

system.runInterval(() => {
    if (!MONSTER_CONFIG.giveWeakness) return;

    const duration = Math.max(1, Math.floor(Number(MONSTER_CONFIG.weaknessDuration) || 220));
    const amplifier = Math.max(0, Math.min(255, Math.floor(Number(MONSTER_CONFIG.weaknessLevel) || 0)));

    for (const player of world.getAllPlayers()) {
        try {
            player.addEffect("weakness", duration, { amplifier, showParticles: false });
        } catch (error) {
            if (MONSTER_CONFIG.debug) console.warn(`[Monster] Schwäche konnte nicht gesetzt werden: ${error}`);
        }
    }
}, 100);

console.info("§a[Monster] Modul geladen");

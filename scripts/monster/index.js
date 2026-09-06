import { world, system } from "@minecraft/server";
import { DEFAULT_CONFIG } from "./config.js";
import { getClaimAt } from "../claims/utils.js";

const clone = (value) => JSON.parse(JSON.stringify(value));
export let MONSTER_CONFIG = clone(DEFAULT_CONFIG);

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

/*
 * @minecraft/server 2.x / Scripting V2:
 * world.beforeEvents.entitySpawn is not available on the server build used by
 * this pack. The supported spawn signal is world.afterEvents.entitySpawn.
 *
 * Because an after-event cannot be cancelled, invalid spawns are removed on
 * the next writable callback. This keeps the Monster module from aborting the
 * whole pack when the old before-event API is absent.
 */
function disableAllMonsterSpawns() {
    const dimension = world.getDimension("overworld");
    for (const entity of dimension.getEntities({ type: "minecraft:monster" })) {
        try {
            entity.remove();
        } catch (error) {
            if (MONSTER_CONFIG.debug) {
                console.warn(`[Monster] Spawn blockiert, Entity konnte nicht entfernt werden: ${error}`);
            }
        }
    }
}
const entitySpawn = world.afterEvents?.entitySpawn;
if (entitySpawn && typeof entitySpawn.subscribe === "function") {
    entitySpawn.subscribe((event) => {
        const entity = event?.entity;
        if (!entity) return;

        const typeId = entity.typeId;
        if (typeId === "minecraft:villager" || typeId === "minecraft:villager_v2") {
            try {
                entity.addTag("villager");
            } catch (error) {
                if (MONSTER_CONFIG.debug) {
                    console.warn(`[Monster] Villager-Tag konnte nicht gesetzt werden: ${error}`);
                }
            }
        }

        if (!MONSTER_CONFIG.enabled) return;

        if (isAllTokenDied()) {
            try {
                disableAllMonsterSpawns();
            } catch (error) {
                if (MONSTER_CONFIG.debug) {
                    console.warn(`[Monster] Spawn blockiert, Entity konnte nicht entfernt werden: ${error}`);
                }
            }
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
                    if (
                        claimConfig.enabled === false ||
                        claimConfig.allowMonsters === false ||
                        claimConfig.blockedMobs?.[typeId]
                    ) {
                        shouldRemove = true;
                    } else if (Math.random() >= getSpawnChance(typeId, true)) {
                        shouldRemove = true;
                    }
                } else if (Math.random() >= getSpawnChance(typeId, false)) {
                    shouldRemove = true;
                }
            } catch (error) {
                if (MONSTER_CONFIG.debug) {
                    console.warn(`[Monster] Spawn-Prüfung fehlgeschlagen: ${error}`);
                }
            }
        }

        if (!shouldRemove) return;

        try {
            entity.remove();
        } catch (error) {
            if (MONSTER_CONFIG.debug) {
                console.warn(`[Monster] Entity konnte nicht entfernt werden (${typeId}): ${error}`);
            }
        }
    });

    console.info("§a[Monster] EntitySpawn-System geladen (API 2.x afterEvents)");
} else {
    console.warn("§e[Monster] EntitySpawn-API nicht verfügbar; normales Monster-Spawn-Filtering deaktiviert.");
}

/*
 * Monster-only Weakness:
 *
 * The old implementation continuously applied the vanilla Weakness effect to
 * players. That also affected PvP because vanilla Weakness changes a player's
 * melee damage against every target.
 *
 * Instead, the player remains visually/effect-wise normal and the configured
 * Weakness is simulated only when a player damages a non-player entity.
 * The original hit is cancelled and reapplied with the configured reduction.
 * This keeps player-vs-player damage completely untouched.
 */
const adjustedMonsterDamage = new Set();

function isMob(entity) {
    if (!entity) return false;
    try {
        return entity.typeId !== "minecraft:player";
    } catch {
        return false;
    }
}

function getWeaknessReduction(amplifier) {
    // Vanilla Weakness removes 4 attack damage per effect level.
    return Math.max(0, 4 * (amplifier + 1));
}

const entityHurtBefore = world.beforeEvents?.entityHurt;
if (entityHurtBefore && typeof entityHurtBefore.subscribe === "function") {
    entityHurtBefore.subscribe((event) => {
        const weakness = MONSTER_CONFIG.weakness;
        if (!MONSTER_CONFIG.enabled || !weakness?.enabled) return;

        const target = event?.hurtEntity;
        const attacker = event?.damageSource?.damagingEntity;
        if (!attacker || attacker.typeId !== "minecraft:player" || !isMob(target)) return;

        // applyDamage() below fires entityHurt again. Allow that single nested
        // event through so the adjusted damage is not cancelled recursively.
        if (adjustedMonsterDamage.has(attacker.id)) {
            adjustedMonsterDamage.delete(attacker.id);
            return;
        }

        const originalDamage = Number(event?.damage);
        if (!Number.isFinite(originalDamage) || originalDamage <= 0) return;

        const amplifier = Math.max(0, Math.min(255, Math.floor(Number(weakness.level) || 0)));
        const reduction = getWeaknessReduction(amplifier);
        const adjustedDamage = Math.max(0, originalDamage - reduction);

        event.cancel = true;

        if (adjustedDamage <= 0) return;

        try {
            adjustedMonsterDamage.add(attacker.id);
            target.applyDamage(adjustedDamage);
        } catch (error) {
            adjustedMonsterDamage.delete(attacker.id);
            if (MONSTER_CONFIG.debug) {
                console.warn(`[Monster] Monster-only Weakness konnte Schaden nicht neu anwenden: ${error}`);
            }
        }
    });

    console.info("§a[Monster] Monster-only Weakness geladen (PvP bleibt unverändert)");
} else {
    console.warn("§e[Monster] entityHurt-BeforeEvent nicht verfügbar; Monster-only Weakness deaktiviert.");
}

console.info("§a[Monster] Modul geladen");

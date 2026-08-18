import { world, system } from "@minecraft/server";
import { DEFAULT_CONFIG } from "./config.js";
import { getClaimAt } from "../claims/utils.js";

// Aktuelle Config (wird zur Laufzeit geändert)
export let MONSTER_CONFIG = { ...DEFAULT_CONFIG };

// Dynamic Property registrieren
world.beforeEvents.worldInitialize.subscribe((event) => {
    event.dynamicPropertiesDefinition.defineString("monster_config", 32767);
});

// Config laden
export function loadMonsterConfig() {
    try {
        const raw = world.getDynamicProperty("monster_config");
        if (raw) {
            const saved = JSON.parse(raw);
            MONSTER_CONFIG = { ...DEFAULT_CONFIG, ...saved };
            console.info("§a[Monster] Config aus Speicher geladen");
        }
    } catch (e) {
        console.warn("[Monster] Konnte Config nicht laden, nutze Standard");
        MONSTER_CONFIG = { ...DEFAULT_CONFIG };
    }
}

// Config speichern
export function saveMonsterConfig() {
    try {
        world.setDynamicProperty("monster_config", JSON.stringify(MONSTER_CONFIG));
        console.info("§a[Monster] Config gespeichert");
    } catch (e) {
        console.error("[Monster] Fehler beim Speichern:", e);
    }
}

// Beim Start laden
system.runTimeout(() => {
    loadMonsterConfig();
}, 20)

world.beforeEvents.entitySpawn.subscribe((event) => {
    if (!MONSTER_CONFIG.enabled) return;

    const entity = event.entity;
    if (!entity?.typeId) return;

    const typeId = entity.typeId;

    // Nur bekannte Monster behandeln
    if (!MONSTER_CONFIG.allowedMobs.hasOwnProperty(typeId)) return;

    // Global deaktiviert?
    if (MONSTER_CONFIG.allowedMobs[typeId] === false) {
        event.cancel = true;
        return;
    }

    // Prüfen ob der Spawn in einem Claim liegt
    const claim = getClaimAt(entity.location);
    const inClaim = !!claim;

    // ===== CLAIM-LOGIK =====
    if (inClaim) {
        const claimCfg = MONSTER_CONFIG.claims;

        // Monster in Claims komplett aus?
        if (!claimCfg.enabled || claimCfg.allowMonsters === false) {
            event.cancel = true;
            return;
        }

        // Speziell in Claims blockierte Monster
        if (claimCfg.blockedMobs?.[typeId]) {
            event.cancel = true;
            return;
        }

        // Claim-Spawnrate anwenden
        let chance = (MONSTER_CONFIG.spawnChances[typeId] ?? 1.0) * claimCfg.spawnRate;

        const time = world.getTimeOfDay();
        if (time > 13000 && time < 23000) {
            chance *= claimCfg.nightSpawnMultiplier;
        }

        if (Math.random() > chance) {
            event.cancel = true;
        }
        return;
    }

    // ===== NORMALE WELT (außerhalb Claims) =====
    let chance = (MONSTER_CONFIG.spawnChances[typeId] ?? 1.0) * MONSTER_CONFIG.globalSpawnRate;

    const time = world.getTimeOfDay();
    if (time > 13000 && time < 23000) {
        chance *= MONSTER_CONFIG.nightSpawnMultiplier;
    }

    if (Math.random() > chance) {
        event.cancel = true;
    }
});

// ============================================
// Permanent Schwäche
// ============================================
system.runInterval(() => {
    if (!MONSTER_CONFIG.giveWeakness) return;

    for (const player of world.getAllPlayers()) {
        try {
            player.addEffect("weakness", MONSTER_CONFIG.weaknessDuration, {
                amplifier: MONSTER_CONFIG.weaknessLevel,
                showParticles: false
            });
        } catch {}
    }
}, 100);

function dist(a, b) {
    return Math.sqrt(
        (a.x - b.x) ** 2 +
        (a.y - b.y) ** 2 +
        (a.z - b.z) ** 2
    );
}

console.info("§a[Monster] Modul geladen");
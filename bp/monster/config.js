export const DEFAULT_CONFIG = {
    enabled: true,

    // Globale Spawn-Einstellungen (außerhalb von Claims)
    globalSpawnRate: 0.7,
    nightSpawnMultiplier: 1.3,

    allowedMobs: {
        "minecraft:zombie": true,
        "minecraft:skeleton": true,
        "minecraft:creeper": true,
        "minecraft:spider": true,
        "minecraft:enderman": true,
        "minecraft:witch": false,
        "minecraft:phantom": false,
        "minecraft:drowned": true,
        "minecraft:husk": true,
        "minecraft:stray": true,
        "minecraft:slime": false,
        "minecraft:magma_cube": false
    },

    spawnChances: {
        "minecraft:zombie": 1.0,
        "minecraft:skeleton": 0.8,
        "minecraft:creeper": 0.6,
        "minecraft:spider": 0.9,
        "minecraft:enderman": 0.4,
        "minecraft:drowned": 0.7,
        "minecraft:husk": 0.8,
        "minecraft:stray": 0.7
    },

    // ========== CLAIM-SPEZIFISCHE CONFIG (gilt in ALLEN Claims) ==========
    claims: {
        enabled: true,                 // Monster-System in Claims aktiv?
        spawnRate: 0.25,               // Viel weniger Spawns in Claims
        nightSpawnMultiplier: 1.1,     // Leichter Nacht-Bonus in Claims
        allowMonsters: true,           // false = gar keine Monster in Claims

        // Optional: bestimmte Monster in Claims extra verbieten
        blockedMobs: {
            "minecraft:creeper": true,     // Creeper in Claims verboten
            "minecraft:phantom": true,
            "minecraft:witch": true
        }
    },

    // Schwäche
    giveWeakness: true,
    weaknessLevel: 1,
    weaknessDuration: 220,

    debug: false
};
// Zentrale Konfiguration für ALLE Monster-Systeme.
// Änderungen hier benötigen keinen Umbau der eigentlichen Logik.

export const DEFAULT_CONFIG = {
    enabled: true,
    debug: false,

    // Normale Monster-Spawns
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

    claims: {
        enabled: true,
        spawnRate: 0.25,
        nightSpawnMultiplier: 1.1,
        allowMonsters: true,
        blockedMobs: {
            "minecraft:creeper": true,
            "minecraft:phantom": true,
            "minecraft:witch": true
        }
    },

    weakness: {
        enabled: true,
        level: 1,
        duration: 220,
        interval: 100
    },
    token: {
        allTokenDied: false,
        mobType: "minecraft:zombie",
        mobTag: "token_monster",
        mobName: "§6Token-Mob",

        maxMobs: 4,

        spawn: {
            radius: 1,
            minDistance: 2,
            maxAttempts: 20
        },

        command: {
            name: "siedler:token",
            description: "Spawnt ein Monster-Token."
        }
    },
    // Gemeinsame Pillager-/Belagerungs-Konfiguration
    pillager: {
        enabled: true,
        intervalTicks: 2400,
        spawnChance: 0.22,
        minGroupSize: 4,
        maxGroupSize: 7,
        maxActiveSquads: 3,
        minDistance: 36,
        maxDistance: 64,
        despawnDistance: 112,
        lifetimeTicks: 24000,
        spawnOnlyAtNight: false,
        nightStart: 13000,
        nightEnd: 23000,

        ai: {
            thinkInterval: 10,
            attackRange: 3.2,
            rangedAttackRange: 18,
            attackCooldown: 25,
            moveStrength: 0.055,
            sprintStrength: 0.085,
            maxSpeed: 0.75,
            targetLostDistance: 96,
            regroupDistance: 20,
            formationRadius: 5
        },

        siege: {
            enabled: true,
            stagingRadius: 28,
            targetRadius: 48,
            noTargetTicks: 300,
            retreatAfterTicks: 1200,
            claimSearchRadiusChunks: 2,
            preferEnemyClaims: true,
            enemyClaimChance: 0.75
        },

        outpost: {
            enabled: true,
            spawnChance: 0.70,
            searchRadius: 160,
            spawnRadius: 12,
            spawnHeight: 1,
            preferOutpostOverRandom: true
        },

        composition: {
            includeVindicator: true,
            vindicatorChance: 0.30,
            includeRavager: true,
            ravagerChance: 0.08,
            captainChance: 0.35
        }
    }
};

// NOTE: `MONSTER_CONFIG` is provided dynamically by `index.js` to allow
// runtime updates and persisted dynamic properties. Do not export a
// separate `MONSTER_CONFIG` from this file.

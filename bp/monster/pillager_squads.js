import { system, world } from "@minecraft/server";

const CONFIG = {
    enabled: true,
    intervalTicks: 2400, // 2 Minuten
    spawnChance: 0.18,   // Chance pro Intervall
    minGroupSize: 3,
    maxGroupSize: 6,
    minDistance: 32,
    maxDistance: 56,
    despawnDistance: 96,
    maxActiveSquads: 3,
    lifetimeTicks: 24000, // 20 Minuten
    spawnOnlyAtNight: true,
    nightStart: 13000,
    nightEnd: 23000
};

const squads = new Map();
let nextSquadId = 1;

function isNight() {
    const time = world.getTimeOfDay();
    return time >= CONFIG.nightStart && time < CONFIG.nightEnd;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomSpawnPosition(player) {
    const angle = Math.random() * Math.PI * 2;
    const distance = randomInt(CONFIG.minDistance, CONFIG.maxDistance);

    return {
        x: Math.floor(player.location.x + Math.cos(angle) * distance) + 0.5,
        y: Math.floor(player.location.y),
        z: Math.floor(player.location.z + Math.sin(angle) * distance) + 0.5
    };
}

function findTargetPlayer(excludedId = null) {
    const players = world.getAllPlayers().filter((player) => player.id !== excludedId);
    if (players.length === 0) return null;
    return players[Math.floor(Math.random() * players.length)];
}

function spawnSquadForPlayer(target) {
    if (!target || squads.size >= CONFIG.maxActiveSquads) return false;

    const dimension = target.dimension;
    const location = randomSpawnPosition(target);
    const size = randomInt(CONFIG.minGroupSize, CONFIG.maxGroupSize);
    const entities = [];

    try {
        for (let i = 0; i < size; i++) {
            const offset = {
                x: (Math.random() - 0.5) * 5,
                y: 0,
                z: (Math.random() - 0.5) * 5
            };

            const pillager = dimension.spawnEntity("minecraft:pillager", {
                x: location.x + offset.x,
                y: location.y,
                z: location.z + offset.z
            });

            entities.push(pillager);
        }
    } catch (error) {
        console.warn(`[Pillager] Trupp konnte nicht vollständig gespawnt werden: ${error}`);
        for (const entity of entities) {
            try { entity.remove(); } catch {}
        }
        return false;
    }

    const id = nextSquadId++;
    squads.set(id, {
        entities,
        targetId: target.id,
        dimensionId: dimension.id,
        createdAt: world.getAbsoluteTime()
    });

    target.sendMessage(`§c⚔ Ein Pillager-Trupp wurde in deiner Nähe gesichtet! §7(${size} Gegner)`);
    console.info(`[Pillager] Trupp #${id} mit ${size} Pillagern gegen ${target.name} gespawnt.`);
    return true;
}

function cleanupSquads() {
    const now = world.getAbsoluteTime();

    for (const [id, squad] of squads) {
        const target = world.getAllPlayers().find((player) => player.id === squad.targetId);
        const alive = squad.entities.filter((entity) => {
            try {
                return entity.isValid;
            } catch {
                return false;
            }
        });

        const expired = now - squad.createdAt >= CONFIG.lifetimeTicks;
        const targetGone = !target;
        const tooFar = target && alive.length > 0 && alive.every((entity) => {
            try {
                if (entity.dimension.id !== target.dimension.id) return true;
                const dx = entity.location.x - target.location.x;
                const dz = entity.location.z - target.location.z;
                return Math.sqrt(dx * dx + dz * dz) > CONFIG.despawnDistance;
            } catch {
                return true;
            }
        });

        if (alive.length === 0 || expired || targetGone || tooFar) {
            for (const entity of alive) {
                try { entity.remove(); } catch {}
            }
            squads.delete(id);
        }
    }
}

system.runInterval(() => {
    if (!CONFIG.enabled) return;
    if (CONFIG.spawnOnlyAtNight && !isNight()) return;
    if (squads.size >= CONFIG.maxActiveSquads) return;
    if (Math.random() > CONFIG.spawnChance) return;

    const players = world.getAllPlayers();
    if (players.length === 0) return;

    const target = findTargetPlayer();
    if (target) spawnSquadForPlayer(target);
}, CONFIG.intervalTicks);

system.runInterval(cleanupSquads, 200);

console.info("§a[Pillager] Gegnerische Trupp-Spawns aktiviert.");

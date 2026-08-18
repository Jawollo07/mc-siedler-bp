import { system, world } from "@minecraft/server";

const CONFIG = {
    enabled: true,
    intervalTicks: 3600,
    chance: 0.35,
    searchRadius: 256,
    spawnRadius: 10,
    groupMin: 4,
    groupMax: 7,
    captainChance: 0.35,
    maxActiveRaids: 2,
    targetRadius: 96,
    onlyNight: true,
    nightStart: 13000,
    nightEnd: 23000,
    lifetimeTicks: 24000
};

const raids = new Map();
let nextRaidId = 1;

function isNight() {
    const time = world.getTimeOfDay();
    return time >= CONFIG.nightStart && time < CONFIG.nightEnd;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function distanceSq(a, b) {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return dx * dx + dz * dz;
}

function nearestPlayer(dimension, location) {
    const players = world.getAllPlayers().filter((player) => player.dimension.id === dimension.id);
    players.sort((a, b) => distanceSq(a.location, location) - distanceSq(b.location, location));
    return players[0] ?? null;
}

function parseLocateResult(result) {
    const text = String(result?.statusMessage ?? result?.message ?? "");
    const match = text.match(/(-?\d+)\s*[ ,]\s*(?:~|(-?\d+))\s*[ ,]\s*(-?\d+)/);
    if (!match) return null;
    const x = Number(match[1]);
    const z = Number(match[3] ?? match[2]);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    return { x: x + 0.5, y: 80, z: z + 0.5 };
}

function findOutpost(dimension) {
    try {
        const result = dimension.runCommand("locate structure minecraft:pillager_outpost");
        return parseLocateResult(result);
    } catch (error) {
        console.warn(`[Pillager-Outpost] Locate fehlgeschlagen: ${error}`);
        return null;
    }
}

function spawnRaid(dimension, outpost) {
    if (!outpost || raids.size >= CONFIG.maxActiveRaids) return false;

    const target = nearestPlayer(dimension, outpost);
    if (!target || distanceSq(target.location, outpost) > CONFIG.targetRadius ** 2) return false;

    const entities = [];
    const count = randomInt(CONFIG.groupMin, CONFIG.groupMax);

    try {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * CONFIG.spawnRadius;
            const entity = dimension.spawnEntity("minecraft:pillager", {
                x: outpost.x + Math.cos(angle) * radius,
                y: outpost.y,
                z: outpost.z + Math.sin(angle) * radius
            });
            entities.push(entity);
        }

        if (Math.random() < CONFIG.captainChance && entities.length) {
            const captain = entities[Math.floor(Math.random() * entities.length)];
            captain.nameTag = "§cAußenposten-Captain";
            captain.addEffect("strength", 1200, { amplifier: 0, showParticles: false });
        }
    } catch (error) {
        for (const entity of entities) { try { entity.remove(); } catch {} }
        console.warn(`[Pillager-Outpost] Spawn fehlgeschlagen: ${error}`);
        return false;
    }

    const id = nextRaidId++;
    raids.set(id, {
        entities,
        targetId: target.id,
        createdAt: world.getAbsoluteTime(),
        outpost
    });

    target.sendMessage("§4⚔ Ein Pillager-Trupp ist aus einem Außenposten aufgebrochen!");
    console.info(`[Pillager-Outpost] Raid #${id} gestartet bei ${outpost.x}, ${outpost.z}`);
    return true;
}

system.runInterval(() => {
    if (!CONFIG.enabled || raids.size >= CONFIG.maxActiveRaids) return;
    if (CONFIG.onlyNight && !isNight()) return;
    if (Math.random() > CONFIG.chance) return;

    for (const dimensionId of ["overworld"]) {
        const dimension = world.getDimension(dimensionId);
        const players = world.getAllPlayers().filter((player) => player.dimension.id === dimension.id);
        if (!players.length) continue;

        const player = players[Math.floor(Math.random() * players.length)];
        const outpost = findOutpost(dimension);
        if (outpost) spawnRaid(dimension, outpost);
        break;
    }
}, CONFIG.intervalTicks);

system.runInterval(() => {
    const now = world.getAbsoluteTime();

    for (const [id, raid] of raids) {
        const target = world.getAllPlayers().find((player) => player.id === raid.targetId);
        const alive = raid.entities.filter((entity) => {
            try { return entity.isValid; } catch { return false; }
        });

        const expired = now - raid.createdAt >= CONFIG.lifetimeTicks;
        const defeated = alive.length === 0;
        const targetGone = !target;

        if (expired || defeated || targetGone) {
            for (const entity of alive) { try { entity.remove(); } catch {} }
            raids.delete(id);
        }
    }
}, 200);

console.info("§a[Pillager-Outpost] Außenposten-Raids aktiviert.");

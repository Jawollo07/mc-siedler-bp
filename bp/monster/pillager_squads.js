import { system, world } from "@minecraft/server";
import { getClaims, getChunkCoords, getChunkKey } from "../claims/utils.js";
import { getTeams } from "../teams/index.js";

const CONFIG = {
    enabled: true,
    intervalTicks: 2400,
    spawnChance: 0.22,
    minGroupSize: 4,
    maxGroupSize: 7,
    minDistance: 36,
    maxDistance: 64,
    despawnDistance: 112,
    maxActiveSquads: 3,
    lifetimeTicks: 24000,
    spawnOnlyAtNight: true,
    nightStart: 13000,
    nightEnd: 23000,
    preferEnemyClaims: true,
    enemyClaimChance: 0.75,
    raidClaimRadiusChunks: 1,
    includeVindicator: true,
    vindicatorChance: 0.30,
    includeRavager: true,
    ravagerChance: 0.08,
    captainChance: 0.35
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

function distanceSq(a, b) {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return dx * dx + dz * dz;
}

function findTargetPlayer() {
    const players = world.getAllPlayers();
    if (!players.length) return null;

    const teams = getTeams();
    const claims = getClaims();
    const candidates = players.filter((player) => {
        const team = Object.values(teams).find((data) => Array.isArray(data?.players) && data.players.includes(player.name));
        const hasClaim = Object.values(claims).some((claim) => claim?.team === Object.keys(teams).find((name) => teams[name] === team));
        return !hasClaim || hasClaim;
    });

    return candidates[Math.floor(Math.random() * candidates.length)];
}

function findEnemyClaimTarget(player) {
    if (!CONFIG.preferEnemyClaims || Math.random() > CONFIG.enemyClaimChance) return null;

    const teams = getTeams();
    const claims = getClaims();
    const playerTeam = Object.keys(teams).find((teamName) => {
        const members = teams[teamName]?.players;
        return Array.isArray(members) && members.includes(player.name);
    });

    const enemyClaims = [];
    for (const [key, claim] of Object.entries(claims)) {
        if (!claim?.team || claim.team === playerTeam) continue;
        const separator = key.indexOf(",");
        if (separator < 0) continue;

        const chunkX = Number(key.slice(0, separator));
        const chunkZ = Number(key.slice(separator + 1));
        if (!Number.isInteger(chunkX) || !Number.isInteger(chunkZ)) continue;

        const center = {
            x: chunkX * 16 + 8,
            z: chunkZ * 16 + 8
        };

        if (Math.abs(getChunkCoords(player.location).x - chunkX) <= CONFIG.raidClaimRadiusChunks + 1 &&
            Math.abs(getChunkCoords(player.location).z - chunkZ) <= CONFIG.raidClaimRadiusChunks + 1) {
            enemyClaims.push(center);
        }
    }

    if (!enemyClaims.length) return null;
    return enemyClaims[Math.floor(Math.random() * enemyClaims.length)];
}

function randomSpawnPosition(player) {
    const enemyClaim = findEnemyClaimTarget(player);
    if (enemyClaim) {
        const angle = Math.random() * Math.PI * 2;
        const distance = randomInt(12, 28);
        return {
            x: enemyClaim.x + Math.cos(angle) * distance,
            y: Math.floor(player.location.y),
            z: enemyClaim.z + Math.sin(angle) * distance
        };
    }

    const angle = Math.random() * Math.PI * 2;
    const distance = randomInt(CONFIG.minDistance, CONFIG.maxDistance);
    return {
        x: Math.floor(player.location.x + Math.cos(angle) * distance) + 0.5,
        y: Math.floor(player.location.y),
        z: Math.floor(player.location.z + Math.sin(angle) * distance) + 0.5
    };
}

function createComposition() {
    const size = randomInt(CONFIG.minGroupSize, CONFIG.maxGroupSize);
    const types = Array(size).fill("minecraft:pillager");

    if (CONFIG.includeVindicator && Math.random() < CONFIG.vindicatorChance) {
        types[randomInt(0, types.length - 1)] = "minecraft:vindicator";
    }

    if (CONFIG.includeRavager && Math.random() < CONFIG.ravagerChance && types.length >= 5) {
        types[randomInt(0, types.length - 1)] = "minecraft:ravager";
    }

    return types;
}

function makeCaptain(entity) {
    try {
        entity.nameTag = "§cPillager-Captain";
        entity.addEffect("strength", 20 * 60, { amplifier: 0, showParticles: false });
    } catch {}
}

function spawnSquadForPlayer(target) {
    if (!target || squads.size >= CONFIG.maxActiveSquads) return false;

    const dimension = target.dimension;
    const location = randomSpawnPosition(target);
    const composition = createComposition();
    const entities = [];

    try {
        for (const typeId of composition) {
            const offset = {
                x: (Math.random() - 0.5) * 6,
                y: 0,
                z: (Math.random() - 0.5) * 6
            };

            const entity = dimension.spawnEntity(typeId, {
                x: location.x + offset.x,
                y: location.y,
                z: location.z + offset.z
            });
            entities.push(entity);
        }

        if (CONFIG.captainChance > Math.random()) {
            const captain = entities.find((entity) => entity.typeId === "minecraft:pillager");
            if (captain) makeCaptain(captain);
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
        createdAt: world.getAbsoluteTime(),
        spawnLocation: location
    });

    const compositionText = composition.map((type) => type.replace("minecraft:", "")).join(", ");
    target.sendMessage(`§c⚔ Ein feindlicher Trupp wurde gesichtet! §7${compositionText}`);
    console.info(`[Pillager] Trupp #${id} gegen ${target.name}: ${compositionText}`);
    return true;
}

function cleanupSquads() {
    const now = world.getAbsoluteTime();

    for (const [id, squad] of squads) {
        const target = world.getAllPlayers().find((player) => player.id === squad.targetId);
        const alive = squad.entities.filter((entity) => {
            try { return entity.isValid; } catch { return false; }
        });

        const expired = now - squad.createdAt >= CONFIG.lifetimeTicks;
        const targetGone = !target;
        const tooFar = target && alive.length > 0 && alive.every((entity) => {
            try {
                if (entity.dimension.id !== target.dimension.id) return true;
                return distanceSq(entity.location, target.location) > CONFIG.despawnDistance ** 2;
            } catch { return true; }
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
    if (!CONFIG.enabled || (CONFIG.spawnOnlyAtNight && !isNight())) return;
    if (squads.size >= CONFIG.maxActiveSquads || Math.random() > CONFIG.spawnChance) return;

    const target = findTargetPlayer();
    if (target) spawnSquadForPlayer(target);
}, CONFIG.intervalTicks);

system.runInterval(cleanupSquads, 200);

console.info("§a[Pillager] Gemischte feindliche Trupps aktiviert.");

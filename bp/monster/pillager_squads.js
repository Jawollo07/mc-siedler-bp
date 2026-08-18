import { system, world } from "@minecraft/server";
import { getClaims, getChunkCoords } from "../claims/utils.js";
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
    lifetimeTicks: 24000,
    maxActiveSquads: 3,
    spawnOnlyAtNight: true,
    nightStart: 13000,
    nightEnd: 23000,

    // Eigene Trupp-KI
    thinkInterval: 10,
    attackRange: 3.2,
    attackCooldown: 25,
    rangedAttackRange: 18,
    moveStrength: 0.055,
    sprintStrength: 0.085,
    maxSpeed: 0.75,
    targetLostDistance: 96,
    regroupDistance: 20,
    formationRadius: 5,

    // Belagerung
    siegeEnabled: true,
    siegeStagingRadius: 28,
    siegeTargetRadius: 48,
    siegeRetreatAfterTicks: 1200,
    siegeNoTargetTicks: 300,
    siegeClaimSearchRadius: 2,

    // Claims
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

function getPlayerTeam(player) {
    const teams = getTeams();
    return Object.keys(teams).find((name) => {
        const members = teams[name]?.players;
        return Array.isArray(members) && members.includes(player.name);
    }) ?? null;
}

function getEnemyClaimNearPlayer(player) {
    if (!CONFIG.preferEnemyClaims || Math.random() > CONFIG.enemyClaimChance) return null;

    const claims = getClaims();
    const playerTeam = getPlayerTeam(player);
    const playerChunk = getChunkCoords(player.location);
    const candidates = [];

    for (const [key, claim] of Object.entries(claims)) {
        if (!claim?.team || claim.team === playerTeam) continue;
        const separator = key.indexOf(",");
        if (separator < 0) continue;

        const chunkX = Number(key.slice(0, separator));
        const chunkZ = Number(key.slice(separator + 1));
        if (!Number.isInteger(chunkX) || !Number.isInteger(chunkZ)) continue;

        if (Math.abs(playerChunk.x - chunkX) <= CONFIG.raidClaimRadiusChunks + 1 &&
            Math.abs(playerChunk.z - chunkZ) <= CONFIG.raidClaimRadiusChunks + 1) {
            candidates.push({
                team: claim.team,
                x: chunkX * 16 + 8,
                z: chunkZ * 16 + 8
            });
        }
    }

    return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
}

function findClaimContaining(location) {
    const chunk = getChunkCoords(location);
    const claims = getClaims();
    const key = `${chunk.x},${chunk.z}`;
    const claim = claims[key];
    if (!claim?.team) return null;

    return {
        team: claim.team,
        x: chunk.x * 16 + 8,
        y: location.y,
        z: chunk.z * 16 + 8
    };
}

function findClaimPlayers(squad) {
    if (!squad.siegeClaim) return [];

    return world.getAllPlayers().filter((player) => {
        if (player.dimension.id !== squad.dimensionId) return false;
        const claim = findClaimContaining(player.location);
        return claim?.team === squad.siegeClaim.team;
    });
}

function randomSpawnPosition(player, claim) {
    if (claim) {
        const angle = Math.random() * Math.PI * 2;
        const distance = randomInt(18, CONFIG.siegeStagingRadius);
        return {
            x: claim.x + Math.cos(angle) * distance,
            y: Math.floor(player.location.y),
            z: claim.z + Math.sin(angle) * distance
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
        entity.addEffect("strength", 1200, { amplifier: 0, showParticles: false });
    } catch {}
}

function findTargetPlayer(squad, currentTarget) {
    const claimPlayers = findClaimPlayers(squad);
    if (claimPlayers.length) {
        return claimPlayers.sort((a, b) => distanceSq(a.location, squad.leaderLocation) - distanceSq(b.location, squad.leaderLocation))[0];
    }

    const players = world.getAllPlayers().filter((player) => {
        if (player.dimension.id !== squad.dimensionId) return false;
        if (currentTarget && player.id === currentTarget.id) return true;
        return distanceSq(player.location, squad.leaderLocation) <= CONFIG.targetLostDistance ** 2;
    });

    if (!players.length) return null;
    if (currentTarget && players.some((p) => p.id === currentTarget.id)) return currentTarget;
    return players.sort((a, b) => distanceSq(a.location, squad.leaderLocation) - distanceSq(b.location, squad.leaderLocation))[0];
}

function getSquadDestination(squad, target) {
    if (squad.phase === "staging" && squad.siegeClaim) {
        return squad.siegeClaim;
    }
    return target?.location ?? squad.leaderLocation;
}

function steerEntity(entity, destination, squad) {
    try {
        if (!entity.isValid || !destination || entity.dimension.id !== squad.dimensionId) return;

        const dx = destination.x - entity.location.x;
        const dz = destination.z - entity.location.z;
        const horizontalSq = dx * dx + dz * dz;
        if (horizontalSq < 0.01) return;

        const distance = Math.sqrt(horizontalSq);
        const isRanged = entity.typeId === "minecraft:pillager";

        if (squad.phase === "staging" && distance <= CONFIG.siegeStagingRadius) return;
        if (squad.phase === "assault" && isRanged && distance <= CONFIG.rangedAttackRange) return;
        if (squad.phase === "assault" && distance <= CONFIG.attackRange) return;

        let strength = distance > CONFIG.regroupDistance ? CONFIG.sprintStrength : CONFIG.moveStrength;
        if (squad.leaderLocation && distanceSq(entity.location, squad.leaderLocation) > CONFIG.formationRadius ** 2 && entity !== squad.leader) {
            strength *= 0.65;
        }

        entity.applyImpulse({
            x: (dx / distance) * strength,
            y: 0,
            z: (dz / distance) * strength
        });

        const velocity = entity.getVelocity?.();
        if (velocity && Math.hypot(velocity.x, velocity.z) > CONFIG.maxSpeed) {
            entity.applyImpulse({ x: -velocity.x * 0.08, y: 0, z: -velocity.z * 0.08 });
        }
    } catch {}
}

function performSquadAttack(squad, target) {
    if (!target) return;
    const now = world.getAbsoluteTime();
    if (now < squad.nextAttack) return;

    const attackers = squad.entities.filter((entity) => {
        try {
            return entity.isValid && entity.dimension.id === target.dimension.id &&
                distanceSq(entity.location, target.location) <= CONFIG.attackRange ** 2;
        } catch { return false; }
    });

    if (!attackers.length) return;
    const attacker = attackers[Math.floor(Math.random() * attackers.length)];

    try {
        const damage = attacker.typeId === "minecraft:ravager" ? 8 : attacker.typeId === "minecraft:vindicator" ? 7 : 5;
        target.applyDamage(damage);
        attacker.lookAt?.(target.location);
        squad.nextAttack = now + CONFIG.attackCooldown;
    } catch {}
}

function spawnSquadForPlayer(target) {
    if (!target || squads.size >= CONFIG.maxActiveSquads) return false;

    const siegeClaim = CONFIG.siegeEnabled ? getEnemyClaimNearPlayer(target) : null;
    const location = randomSpawnPosition(target, siegeClaim);
    const composition = createComposition();
    const entities = [];

    try {
        for (const typeId of composition) {
            const offset = { x: (Math.random() - 0.5) * 6, y: 0, z: (Math.random() - 0.5) * 6 };
            entities.push(target.dimension.spawnEntity(typeId, {
                x: location.x + offset.x,
                y: location.y,
                z: location.z + offset.z
            }));
        }

        if (Math.random() < CONFIG.captainChance) {
            const captain = entities.find((entity) => entity.typeId === "minecraft:pillager");
            if (captain) makeCaptain(captain);
        }
    } catch (error) {
        console.warn(`[Pillager] Trupp konnte nicht vollständig gespawnt werden: ${error}`);
        for (const entity of entities) { try { entity.remove(); } catch {} }
        return false;
    }

    const now = world.getAbsoluteTime();
    const id = nextSquadId++;
    const leader = entities[0];

    squads.set(id, {
        entities,
        targetId: target.id,
        dimensionId: target.dimension.id,
        createdAt: now,
        spawnLocation: { ...location },
        leader,
        leaderLocation: { ...location },
        nextAttack: 0,
        siegeClaim,
        phase: siegeClaim ? "staging" : "assault",
        phaseStartedAt: now,
        noTargetSince: null
    });

    if (siegeClaim) {
        target.sendMessage(`§4⚔ BELAGERUNG! §cEin feindlicher Trupp sammelt sich vor dem Gebiet von Team §e${siegeClaim.team}§c.`);
    } else {
        target.sendMessage(`§c⚔ Ein feindlicher Trupp wurde gesichtet! §7${composition.map((t) => t.replace("minecraft:", "")).join(", ")}`);
    }
    return true;
}

function updateSiegePhase(squad, target) {
    if (!squad.siegeClaim) {
        squad.phase = "assault";
        return;
    }

    const now = world.getAbsoluteTime();
    const claimPlayers = findClaimPlayers(squad);
    const claimCenter = squad.siegeClaim;

    if (squad.phase === "staging") {
        const leaderNearClaim = squad.leaderLocation && distanceSq(squad.leaderLocation, claimCenter) <= CONFIG.siegeStagingRadius ** 2;
        if (leaderNearClaim && now - squad.phaseStartedAt >= 100) {
            squad.phase = "assault";
            squad.phaseStartedAt = now;
            for (const player of world.getAllPlayers()) {
                if (player.dimension.id === squad.dimensionId && distanceSq(player.location, claimCenter) <= CONFIG.siegeTargetRadius ** 2) {
                    player.sendMessage(`§c⚔ Der feindliche Trupp stürmt das Gebiet von Team §e${squad.siegeClaim.team}§c!`);
                }
            }
        }
        return;
    }

    if (squad.phase === "assault") {
        if (claimPlayers.length > 0) {
            squad.noTargetSince = null;
            return;
        }

        squad.noTargetSince ??= now;
        if (now - squad.noTargetSince >= CONFIG.siegeNoTargetTicks || now - squad.phaseStartedAt >= CONFIG.siegeRetreatAfterTicks) {
            squad.phase = "retreat";
            squad.phaseStartedAt = now;
        }
        return;
    }

    if (squad.phase === "retreat") {
        // Rückzugspunkt liegt außerhalb des Claims in Richtung ursprünglicher Spawnposition.
        if (now - squad.phaseStartedAt >= CONFIG.siegeRetreatAfterTicks) {
            squad.forceDespawn = true;
        }
        if (target && distanceSq(squad.leaderLocation, squad.spawnLocation) < 12 ** 2) {
            squad.forceDespawn = true;
        }
    }
}

function runSquadAI(squad) {
    const alive = squad.entities.filter((entity) => {
        try { return entity.isValid; } catch { return false; }
    });
    squad.entities = alive;
    if (!alive.length) return;

    if (squad.leader?.isValid) squad.leaderLocation = { ...squad.leader.location };

    const currentTarget = world.getAllPlayers().find((player) => player.id === squad.targetId) ?? null;
    const target = findTargetPlayer(squad, currentTarget);
    updateSiegePhase(squad, target);

    if (squad.forceDespawn) return;

    if (!target) {
        if (squad.siegeClaim) {
            for (const entity of alive) steerEntity(entity, squad.spawnLocation, squad);
        }
        return;
    }

    squad.targetId = target.id;
    const destination = getSquadDestination(squad, target);
    for (const entity of alive) steerEntity(entity, destination, squad);

    if (squad.phase === "assault") {
        performSquadAttack(squad, target);
    }
}

function cleanupSquads() {
    const now = world.getAbsoluteTime();

    for (const [id, squad] of squads) {
        const target = world.getAllPlayers().find((player) => player.id === squad.targetId);
        const alive = squad.entities.filter((entity) => {
            try { return entity.isValid; } catch { return false; }
        });

        const expired = now - squad.createdAt >= CONFIG.lifetimeTicks;
        const targetGone = !target && !squad.siegeClaim;
        const tooFar = target && alive.length > 0 && alive.every((entity) => {
            try {
                return entity.dimension.id !== target.dimension.id || distanceSq(entity.location, target.location) > CONFIG.despawnDistance ** 2;
            } catch { return true; }
        });

        if (alive.length === 0 || expired || targetGone || tooFar || squad.forceDespawn) {
            for (const entity of alive) { try { entity.remove(); } catch {} }
            squads.delete(id);
        }
    }
}

system.runInterval(() => {
    if (!CONFIG.enabled || (CONFIG.spawnOnlyAtNight && !isNight())) return;
    if (squads.size >= CONFIG.maxActiveSquads || Math.random() > CONFIG.spawnChance) return;
    const players = world.getAllPlayers();
    if (!players.length) return;
    spawnSquadForPlayer(players[Math.floor(Math.random() * players.length)]);
}, CONFIG.intervalTicks);

system.runInterval(() => {
    for (const squad of squads.values()) runSquadAI(squad);
}, CONFIG.thinkInterval);

system.runInterval(cleanupSquads, 200);

console.info("§a[Pillager] Eigene Trupp-KI + Belagerungslogik aktiviert.");

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
    retargetDistance: 48,
    targetLostDistance: 96,
    regroupDistance: 20,
    formationRadius: 5,

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

function findEnemyClaimTarget(player) {
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
            candidates.push({ x: chunkX * 16 + 8, z: chunkZ * 16 + 8 });
        }
    }

    return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
}

function randomSpawnPosition(player) {
    const claim = findEnemyClaimTarget(player);
    if (claim) {
        const angle = Math.random() * Math.PI * 2;
        const distance = randomInt(12, 28);
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
    const players = world.getAllPlayers().filter((player) => {
        if (player.dimension.id !== squad.dimensionId) return false;
        if (currentTarget && player.id === currentTarget.id) return true;
        return distanceSq(player.location, squad.spawnLocation) <= CONFIG.targetLostDistance ** 2;
    });

    if (!players.length) return null;

    // Bevorzugt das bisherige Ziel, solange es noch in Reichweite ist.
    if (currentTarget && players.some((p) => p.id === currentTarget.id)) return currentTarget;

    // Nächstes erreichbares Spielerziel.
    return players.sort((a, b) => distanceSq(a.location, squad.leaderLocation) - distanceSq(b.location, squad.leaderLocation))[0];
}

function steerEntity(entity, target, squad) {
    try {
        if (!entity.isValid || !target?.isValid) return;
        if (entity.dimension.id !== target.dimension.id) return;

        const dx = target.location.x - entity.location.x;
        const dz = target.location.z - entity.location.z;
        const horizontalSq = dx * dx + dz * dz;
        if (horizontalSq < 0.01) return;

        const distance = Math.sqrt(horizontalSq);
        const isRanged = entity.typeId === "minecraft:pillager";

        // Im Nahkampf nicht weiter beschleunigen. Die Vanilla-KI übernimmt den Schlag.
        if (distance <= CONFIG.attackRange) {
            return;
        }

        // Fernkämpfer halten etwas Abstand, Nahkämpfer stürmen auf das Ziel zu.
        if (isRanged && distance <= CONFIG.rangedAttackRange) {
            return;
        }

        let strength = distance > CONFIG.regroupDistance ? CONFIG.sprintStrength : CONFIG.moveStrength;

        // Truppmitglieder bleiben in Formation und laufen nicht unendlich auseinander.
        if (squad.leaderLocation && distanceSq(entity.location, squad.leaderLocation) > CONFIG.formationRadius ** 2 && entity !== squad.leader) {
            strength *= 0.65;
        }

        const impulse = {
            x: (dx / distance) * strength,
            y: 0,
            z: (dz / distance) * strength
        };

        entity.applyImpulse(impulse);

        const velocity = entity.getVelocity?.();
        if (velocity && Math.hypot(velocity.x, velocity.z) > CONFIG.maxSpeed) {
            const speed = Math.hypot(velocity.x, velocity.z);
            entity.applyImpulse({
                x: -velocity.x * 0.08,
                y: 0,
                z: -velocity.z * 0.08
            });
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
        } catch {
            return false;
        }
    });

    if (!attackers.length) return;

    // Nur die KI löst den Angriff aus; Schaden wird auf einen klaren Cooldown begrenzt.
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

    const dimension = target.dimension;
    const location = randomSpawnPosition(target);
    const composition = createComposition();
    const entities = [];

    try {
        for (const typeId of composition) {
            const offset = { x: (Math.random() - 0.5) * 6, y: 0, z: (Math.random() - 0.5) * 6 };
            entities.push(dimension.spawnEntity(typeId, {
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

    const leader = entities[0];
    const id = nextSquadId++;
    squads.set(id, {
        entities,
        targetId: target.id,
        dimensionId: dimension.id,
        createdAt: world.getAbsoluteTime(),
        spawnLocation: { ...location },
        leader,
        leaderLocation: { ...location },
        nextAttack: 0
    });

    target.sendMessage(`§c⚔ Ein feindlicher Trupp wurde gesichtet! §7${composition.map((t) => t.replace("minecraft:", "")).join(", ")}`);
    return true;
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
    if (!target) return;

    squad.targetId = target.id;
    for (const entity of alive) steerEntity(entity, target, squad);
    performSquadAttack(squad, target);
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
                return entity.dimension.id !== target.dimension.id || distanceSq(entity.location, target.location) > CONFIG.despawnDistance ** 2;
            } catch { return true; }
        });

        if (alive.length === 0 || expired || targetGone || tooFar) {
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

console.info("§a[Pillager] Eigene Trupp-KI aktiviert.");

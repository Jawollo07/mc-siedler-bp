import { system, world } from "@minecraft/server";
import { getClaims, getChunkCoords } from "../claims/utils.js";
import { getTeams } from "../teams/index.js";
import { MONSTER_CONFIG } from "./index.js";

const CONFIG = MONSTER_CONFIG.pillager;
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
    return Object.keys(teams).find((name) => Array.isArray(teams[name]?.players) && teams[name].players.includes(player.name)) ?? null;
}

function getEnemyClaimNearPlayer(player) {
    const siege = CONFIG.siege;
    if (!siege.enabled || !siege.preferEnemyClaims || Math.random() > siege.enemyClaimChance) return null;

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

        if (Math.abs(playerChunk.x - chunkX) <= siege.claimSearchRadiusChunks + 1 && Math.abs(playerChunk.z - chunkZ) <= siege.claimSearchRadiusChunks + 1) {
            candidates.push({ team: claim.team, x: chunkX * 16 + 8, z: chunkZ * 16 + 8 });
        }
    }

    return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
}

function findClaimContaining(location) {
    const chunk = getChunkCoords(location);
    const claim = getClaims()[`${chunk.x},${chunk.z}`];
    return claim?.team ? { team: claim.team, x: chunk.x * 16 + 8, y: location.y, z: chunk.z * 16 + 8 } : null;
}

function findClaimPlayers(squad) {
    if (!squad.siegeClaim) return [];
    return world.getAllPlayers().filter((player) => player.dimension.id === squad.dimensionId && findClaimContaining(player.location)?.team === squad.siegeClaim.team);
}

function randomSpawnPosition(player, claim) {
    const base = claim ?? player.location;
    const min = claim ? 18 : CONFIG.minDistance;
    const max = claim ? CONFIG.siege.stagingRadius : CONFIG.maxDistance;
    const angle = Math.random() * Math.PI * 2;
    const distance = randomInt(min, max);
    return { x: Math.floor(base.x + Math.cos(angle) * distance) + 0.5, y: Math.floor(player.location.y), z: Math.floor(base.z + Math.sin(angle) * distance) + 0.5 };
}

function createComposition() {
    const c = CONFIG.composition;
    const types = Array(randomInt(CONFIG.minGroupSize, CONFIG.maxGroupSize)).fill("minecraft:pillager");
    if (c.includeVindicator && Math.random() < c.vindicatorChance) types[randomInt(0, types.length - 1)] = "minecraft:vindicator";
    if (c.includeRavager && Math.random() < c.ravagerChance && types.length >= 5) types[randomInt(0, types.length - 1)] = "minecraft:ravager";
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
    if (claimPlayers.length) return claimPlayers.sort((a, b) => distanceSq(a.location, squad.leaderLocation) - distanceSq(b.location, squad.leaderLocation))[0];

    const players = world.getAllPlayers().filter((player) => player.dimension.id === squad.dimensionId && (!currentTarget || player.id === currentTarget.id || distanceSq(player.location, squad.leaderLocation) <= CONFIG.ai.targetLostDistance ** 2));
    if (!players.length) return null;
    if (currentTarget && players.some((p) => p.id === currentTarget.id)) return currentTarget;
    return players.sort((a, b) => distanceSq(a.location, squad.leaderLocation) - distanceSq(b.location, squad.leaderLocation))[0];
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
        if (squad.phase === "staging" && distance <= CONFIG.siege.stagingRadius) return;
        if (squad.phase === "assault" && isRanged && distance <= CONFIG.ai.rangedAttackRange) return;
        if (squad.phase === "assault" && distance <= CONFIG.ai.attackRange) return;

        let strength = distance > CONFIG.ai.regroupDistance ? CONFIG.ai.sprintStrength : CONFIG.ai.moveStrength;
        if (distanceSq(entity.location, squad.leaderLocation) > CONFIG.ai.formationRadius ** 2 && entity !== squad.leader) strength *= 0.65;
        entity.applyImpulse({ x: (dx / distance) * strength, y: 0, z: (dz / distance) * strength });
    } catch {}
}

function performSquadAttack(squad, target) {
    if (!target || world.getAbsoluteTime() < squad.nextAttack) return;
    const attackers = squad.entities.filter((entity) => { try { return entity.isValid && entity.dimension.id === target.dimension.id && distanceSq(entity.location, target.location) <= CONFIG.ai.attackRange ** 2; } catch { return false; } });
    if (!attackers.length) return;
    const attacker = attackers[Math.floor(Math.random() * attackers.length)];
    try {
        target.applyDamage(attacker.typeId === "minecraft:ravager" ? 8 : attacker.typeId === "minecraft:vindicator" ? 7 : 5);
        attacker.lookAt?.(target.location);
        squad.nextAttack = world.getAbsoluteTime() + CONFIG.ai.attackCooldown;
    } catch {}
}

function spawnSquadForPlayer(target) {
    if (!target || squads.size >= CONFIG.maxActiveSquads) return false;
    const siegeClaim = CONFIG.siege.enabled ? getEnemyClaimNearPlayer(target) : null;
    const location = randomSpawnPosition(target, siegeClaim);
    const composition = createComposition();
    const entities = [];

    try {
        for (const typeId of composition) {
            const offset = { x: (Math.random() - 0.5) * 6, y: 0, z: (Math.random() - 0.5) * 6 };
            entities.push(target.dimension.spawnEntity(typeId, { x: location.x + offset.x, y: location.y, z: location.z + offset.z }));
        }
        if (Math.random() < CONFIG.composition.captainChance) {
            const captain = entities.find((entity) => entity.typeId === "minecraft:pillager");
            if (captain) makeCaptain(captain);
        }
    } catch (error) {
        console.warn(`[Pillager] Trupp konnte nicht vollständig gespawnt werden: ${error}`);
        for (const entity of entities) { try { entity.remove(); } catch {} }
        return false;
    }

    const now = world.getAbsoluteTime();
    squads.set(nextSquadId++, {
        entities,
        targetId: target.id,
        dimensionId: target.dimension.id,
        createdAt: now,
        spawnLocation: { ...location },
        leader: entities[0],
        leaderLocation: { ...location },
        nextAttack: 0,
        siegeClaim,
        phase: siegeClaim ? "staging" : "assault",
        phaseStartedAt: now,
        noTargetSince: null,
        forceDespawn: false
    });
    target.sendMessage(siegeClaim ? `§4⚔ BELAGERUNG! §cEin feindlicher Trupp sammelt sich vor dem Gebiet von Team §e${siegeClaim.team}§c.` : `§c⚔ Ein feindlicher Trupp wurde gesichtet! §7${composition.map((t) => t.replace("minecraft:", "")).join(", ")}`);
    return true;
}

function updateSiegePhase(squad) {
    if (!squad.siegeClaim) { squad.phase = "assault"; return; }
    const now = world.getAbsoluteTime();
    const claimPlayers = findClaimPlayers(squad);
    const center = squad.siegeClaim;

    if (squad.phase === "staging") {
        if (distanceSq(squad.leaderLocation, center) <= CONFIG.siege.stagingRadius ** 2 && now - squad.phaseStartedAt >= 100) {
            squad.phase = "assault";
            squad.phaseStartedAt = now;
            for (const player of world.getAllPlayers()) if (player.dimension.id === squad.dimensionId && distanceSq(player.location, center) <= CONFIG.siege.targetRadius ** 2) player.sendMessage(`§c⚔ Der feindliche Trupp stürmt das Gebiet von Team §e${squad.siegeClaim.team}§c!`);
        }
        return;
    }

    if (squad.phase === "assault") {
        if (claimPlayers.length) { squad.noTargetSince = null; return; }
        squad.noTargetSince ??= now;
        if (now - squad.noTargetSince >= CONFIG.siege.noTargetTicks || now - squad.phaseStartedAt >= CONFIG.siege.retreatAfterTicks) {
            squad.phase = "retreat";
            squad.phaseStartedAt = now;
        }
        return;
    }

    if (squad.phase === "retreat" && now - squad.phaseStartedAt >= CONFIG.siege.retreatAfterTicks) squad.forceDespawn = true;
}

function runSquadAI(squad) {
    squad.entities = squad.entities.filter((entity) => { try { return entity.isValid; } catch { return false; } });
    if (!squad.entities.length) return;
    if (squad.leader?.isValid) squad.leaderLocation = { ...squad.leader.location };
    const currentTarget = world.getAllPlayers().find((player) => player.id === squad.targetId) ?? null;
    const target = findTargetPlayer(squad, currentTarget);
    updateSiegePhase(squad);
    if (squad.forceDespawn) return;

    const destination = squad.phase === "staging" && squad.siegeClaim ? squad.siegeClaim : target?.location ?? squad.spawnLocation;
    for (const entity of squad.entities) steerEntity(entity, destination, squad);
    if (target) {
        squad.targetId = target.id;
        if (squad.phase === "assault") performSquadAttack(squad, target);
    }
}

function cleanupSquads() {
    const now = world.getAbsoluteTime();
    for (const [id, squad] of squads) {
        const target = world.getAllPlayers().find((player) => player.id === squad.targetId);
        const alive = squad.entities.filter((entity) => { try { return entity.isValid; } catch { return false; } });
        const expired = now - squad.createdAt >= CONFIG.lifetimeTicks;
        const targetGone = !target && !squad.siegeClaim;
        const tooFar = target && alive.length > 0 && alive.every((entity) => { try { return entity.dimension.id !== target.dimension.id || distanceSq(entity.location, target.location) > CONFIG.despawnDistance ** 2; } catch { return true; } });
        if (!alive.length || expired || targetGone || tooFar || squad.forceDespawn) {
            for (const entity of alive) { try { entity.remove(); } catch {} }
            squads.delete(id);
        }
    }
}

system.runInterval(() => {
    if (!CONFIG.enabled || (CONFIG.spawnOnlyAtNight && !isNight())) return;
    if (squads.size >= CONFIG.maxActiveSquads || Math.random() > CONFIG.spawnChance) return;
    const players = world.getAllPlayers();
    if (players.length) spawnSquadForPlayer(players[Math.floor(Math.random() * players.length)]);
}, CONFIG.intervalTicks);

system.runInterval(() => { for (const squad of squads.values()) runSquadAI(squad); }, CONFIG.ai.thinkInterval);
system.runInterval(cleanupSquads, 200);

console.info("§a[Pillager] Trupp-KI verwendet jetzt ausschließlich monster/config.js.");

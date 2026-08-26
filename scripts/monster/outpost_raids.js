import { system, world } from "@minecraft/server";
import { MONSTER_CONFIG } from "./index.js";

const raids = new Map();
let nextRaidId = 1;
const cfg = () => MONSTER_CONFIG.pillager.outpost;

function isNight() {
    const c = MONSTER_CONFIG.pillager;
    const time = world.getTimeOfDay();
    return time >= c.nightStart && time < c.nightEnd;
}

function distanceSq(a, b) {
    return (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
}

function nearestPlayer(dimension, location) {
    return world.getAllPlayers()
        .filter((player) => player.dimension.id === dimension.id)
        .sort((a, b) => distanceSq(a.location, location) - distanceSq(b.location, location))[0] ?? null;
}

function parseLocateResult(result) {
    const text = String(result?.statusMessage ?? result?.message ?? "");
    const match = text.match(/(-?\d+)\s*[ ,]\s*(?:~|(-?\d+))\s*[ ,]\s*(-?\d+)/);
    if (!match) return null;
    const x = Number(match[1]);
    const z = Number(match[3] ?? match[2]);
    return Number.isFinite(x) && Number.isFinite(z) ? { x: x + 0.5, y: 80, z: z + 0.5 } : null;
}

function findOutpost(dimension) {
    try {
        const result = dimension.runCommand("locate structure minecraft:pillager_outpost");
        return parseLocateResult(result);
    } catch (error) {
        if (MONSTER_CONFIG.debug) console.warn(`[Pillager-Outpost] Locate fehlgeschlagen: ${error}`);
        return null;
    }
}

function spawnRaid(dimension, outpost) {
    const c = MONSTER_CONFIG.pillager;
    const o = cfg();
    if (!outpost || raids.size >= 2) return false;

    const target = nearestPlayer(dimension, outpost);
    if (!target || distanceSq(target.location, outpost) > 96 ** 2) return false;

    const entities = [];
    const count = Math.floor(Math.random() * (c.maxGroupSize - c.minGroupSize + 1)) + c.minGroupSize;

    try {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * o.spawnRadius;
            entities.push(dimension.spawnEntity("minecraft:pillager", {
                x: outpost.x + Math.cos(angle) * radius,
                y: outpost.y + o.spawnHeight,
                z: outpost.z + Math.sin(angle) * radius
            }));
        }

        if (Math.random() < c.composition.captainChance && entities.length) {
            const captain = entities[Math.floor(Math.random() * entities.length)];
            captain.nameTag = "§cAußenposten-Captain";
            captain.addEffect("strength", 1200, { amplifier: 0, showParticles: false });
        }
    } catch (error) {
        for (const entity of entities) { try { entity.remove(); } catch {} }
        if (MONSTER_CONFIG.debug) console.warn(`[Pillager-Outpost] Spawn fehlgeschlagen: ${error}`);
        return false;
    }

    const id = nextRaidId++;
    raids.set(id, { entities, targetId: target.id, createdAt: world.getAbsoluteTime(), outpost });
    target.sendMessage("§4⚔ Ein Pillager-Trupp ist aus einem Außenposten aufgebrochen!");
    return true;
}

system.runInterval(() => {
    const c = MONSTER_CONFIG.pillager;
    const o = cfg();
    if (!MONSTER_CONFIG.enabled || !c.enabled || !o.enabled) return;
    if (o.preferOutpostOverRandom === false) return;
    if (raids.size >= 2 || (c.spawnOnlyAtNight && !isNight()) || Math.random() > o.spawnChance) return;

    const dimension = world.getDimension("overworld");
    if (!world.getAllPlayers().some((p) => p.dimension.id === dimension.id)) return;
    const outpost = findOutpost(dimension);
    if (outpost) spawnRaid(dimension, outpost);
}, 3600);

system.runInterval(() => {
    const now = world.getAbsoluteTime();
    const lifetime = MONSTER_CONFIG.pillager.lifetimeTicks;

    for (const [id, raid] of raids) {
        const target = world.getAllPlayers().find((player) => player.id === raid.targetId);
        const alive = raid.entities.filter((entity) => { try { return entity.isValid; } catch { return false; } });
        if (!target || !alive.length || now - raid.createdAt >= lifetime) {
            for (const entity of alive) { try { entity.remove(); } catch {} }
            raids.delete(id);
        }
    }
}, 200);

console.info("§a[Pillager-Outpost] Modul geladen");

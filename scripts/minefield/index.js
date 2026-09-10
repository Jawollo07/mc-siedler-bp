import { system, world } from "@minecraft/server";
import { createLogger } from "../core/logger.js";

const logger = createLogger("Minefield");

const ITEM_ID = "siedler:mine";
const STORAGE_KEY = "minefield:mines";
const SCAN_INTERVAL = 5;
const ARM_DELAY_TICKS = 20;
const REARM_TICKS = 20 * 15;
const DETONATION_DELAY_TICKS = 20;
const CHAIN_RADIUS = 3.25;
const EXPLOSION_RADIUS = 4;
const MAX_MINES = 2000;

let mines = [];
let loaded = false;
let saving = false;

function distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
}

function load() {
    if (loaded) return;
    loaded = true;
    try {
        const raw = world.getDynamicProperty(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(String(raw));
        if (!Array.isArray(parsed)) return;
        mines = parsed.filter(m => m && typeof m.x === "number" && typeof m.y === "number" && typeof m.z === "number" && typeof m.dimension === "string")
            .slice(0, MAX_MINES).map(m => ({
                x: Math.floor(m.x) + 0.5,
                y: Math.floor(m.y) + 0.05,
                z: Math.floor(m.z) + 0.5,
                dimension: m.dimension,
                armed: m.armed !== false,
                armAt: Number(m.armAt) || 0,
                rearmAt: Number(m.rearmAt) || 0,
                detonating: false
            }));
        logger.info(`Loaded ${mines.length} persistent mines.`);
    } catch (error) {
        logger.error("Failed to load persistent mines", error);
        mines = [];
    }
}

function save() {
    if (saving) return;
    saving = true;
    try {
        world.setDynamicProperty(STORAGE_KEY, JSON.stringify(mines.map(m => ({
            x: m.x, y: m.y, z: m.z, dimension: m.dimension, armed: m.armed, armAt: m.armAt, rearmAt: m.rearmAt
        }))));
    } catch (error) {
        logger.error("Failed to save mines", error);
    } finally {
        saving = false;
    }
}

function getTargetBlock(player) {
    try {
        return player.getBlockFromViewDirection({ maxDistance: 6, includeLiquidBlocks: false })?.block ?? null;
    } catch {
        return null;
    }
}

function consumeSelectedMine(player) {
    try {
        const container = player.getComponent("minecraft:inventory")?.container;
        const slot = player.selectedSlotIndex;
        const stack = container?.getItem(slot);
        if (!stack || stack.typeId !== ITEM_ID) return false;
        if (stack.amount <= 1) container.setItem(slot, undefined);
        else {
            stack.amount--;
            container.setItem(slot, stack);
        }
        return true;
    } catch (error) {
        logger.warn("Could not consume mine item", error);
        return false;
    }
}

function hasMineAt(location, dimensionId) {
    return mines.some(m => !m.detonating && m.dimension === dimensionId && distanceSquared(m, location) < 0.55 * 0.55);
}

function placeMine(player) {
    const block = getTargetBlock(player);
    if (!block) {
        player.sendMessage("§c[Mine] Richte den Blick auf einen Block, um eine Mine zu platzieren.");
        return;
    }

    const location = {
        x: Math.floor(block.location.x),
        y: Math.floor(block.location.y) + 1,
        z: Math.floor(block.location.z)
    };

    if (hasMineAt({ ...location, y: location.y + 0.05 }, player.dimension.id)) {
        player.sendMessage("§e[Mine] Hier liegt bereits eine Mine.");
        return;
    }

    if (mines.length >= MAX_MINES) {
        player.sendMessage(`§c[Mine] Das Limit von ${MAX_MINES} Minen ist erreicht.`);
        return;
    }

    if (!consumeSelectedMine(player)) return;

    mines.push({
        x: location.x + 0.5,
        y: location.y + 0.05,
        z: location.z + 0.5,
        dimension: player.dimension.id,
        armed: false,
        armAt: system.currentTick + ARM_DELAY_TICKS,
        rearmAt: 0,
        detonating: false
    });

    save();
    player.playSound("random.click", { volume: 0.7, pitch: 0.7 });
    player.sendMessage("§7[Mine] Mine platziert. §8Sie wird gleich scharf.");
}

function triggerWarning(mine) {
    try {
        const dimension = world.getDimension(mine.dimension);
        dimension.spawnParticle("minecraft:basic_smoke_particle", mine);
        for (const player of dimension.getPlayers({ location: mine, maxDistance: 6 })) {
            player.playSound("note.pling", { volume: 0.9, pitch: 1.8 });
            player.sendMessage("§c⚠ MINE! §7Explosion in §e1 Sekunde§7!");
        }
    } catch (error) {
        logger.warn("Mine warning effect failed", error);
    }
}

function scheduleDetonation(index) {
    const mine = mines[index];
    if (!mine || mine.detonating) return;
    mine.detonating = true;
    mine.armed = false;
    triggerWarning(mine);
    save();
    system.runTimeout(() => detonate(index), DETONATION_DELAY_TICKS);
}

function detonate(index) {
    const mine = mines[index];
    if (!mine) return;

    try {
        const dimension = world.getDimension(mine.dimension);
        const nearby = [];

        for (let i = 0; i < mines.length; i++) {
            if (i === index) continue;
            const other = mines[i];
            if (!other || other.detonating || !other.armed || other.dimension !== mine.dimension) continue;
            if (distanceSquared(other, mine) <= CHAIN_RADIUS * CHAIN_RADIUS) nearby.push(i);
        }

        // Kein Blockschaden, aber die Explosion darf Feuer erzeugen.
        dimension.createExplosion(mine, EXPLOSION_RADIUS, {
            breaksBlocks: false,
            causesFire: true
        });

        mine.detonating = false;
        mine.armed = false;
        mine.rearmAt = system.currentTick + REARM_TICKS;

        for (const otherIndex of nearby) scheduleDetonation(otherIndex);
        save();
    } catch (error) {
        logger.error("Mine detonation failed", error);
        mine.detonating = false;
        mine.armed = false;
        mine.rearmAt = system.currentTick + REARM_TICKS;
        save();
    }
}

function scan() {
    load();
    const now = system.currentTick;
    let changed = false;

    for (const mine of mines) {
        if (!mine) continue;
        if (!mine.armed && !mine.detonating && mine.armAt > 0 && now >= mine.armAt && mine.rearmAt === 0) {
            mine.armed = true;
            mine.armAt = 0;
            changed = true;
        }
        if (!mine.armed && !mine.detonating && mine.rearmAt > 0 && now >= mine.rearmAt) {
            mine.armed = true;
            mine.rearmAt = 0;
            changed = true;
        }
    }

    for (const player of world.getAllPlayers()) {
        if (!player?.isValid) continue;
        for (let i = 0; i < mines.length; i++) {
            const mine = mines[i];
            if (!mine || !mine.armed || mine.detonating || mine.dimension !== player.dimension.id) continue;
            if (distanceSquared(mine, player.location) <= 0.75 * 0.75) {
                scheduleDetonation(i);
                changed = true;
            }
        }
    }

    if (changed) save();
}

try {
    world.afterEvents.itemUse.subscribe(event => {
        const player = event.source;
        if (!player || player.typeId !== "minecraft:player" || event.itemStack?.typeId !== ITEM_ID) return;
        placeMine(player);
    });
} catch (error) {
    logger.error("Could not register itemUse for minefield", error);
}

load();
system.runInterval(scan, SCAN_INTERVAL);
logger.info("Minefield system loaded: no block damage, fire-enabled explosions, chain reaction and automatic rearming.");

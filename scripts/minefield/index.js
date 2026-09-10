import {
    system,
    world,
    CommandPermissionLevel,
    CustomCommandParamType,
    CustomCommandStatus
} from "@minecraft/server";
import { createLogger } from "../core/logger.js";
import { getPlayerTeam } from "../teams/index.js";
import { getTeamRelation, TEAM_RELATION } from "../teams/relations.js";

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
const CONTROL_RADIUS = 8;

// 0 = nur feindliche Teams, 1 = Feinde + neutrale Teams, 2 = jeder Spieler.
const TRIGGER_MODE = Object.freeze({ HOSTILE: 0, HOSTILE_NEUTRAL: 1, EVERYONE: 2 });

let mines = [];
let loaded = false;
let saving = false;

function distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
}

function createMineId() {
    return `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function load() {
    if (loaded) return;
    loaded = true;
    try {
        const raw = world.getDynamicProperty(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(String(raw));
        if (!Array.isArray(parsed)) return;
        mines = parsed
            .filter(m => m && typeof m.x === "number" && typeof m.y === "number" && typeof m.z === "number" && typeof m.dimension === "string")
            .slice(0, MAX_MINES)
            .map(m => ({
                id: typeof m.id === "string" ? m.id : createMineId(),
                x: Math.floor(m.x) + 0.5,
                y: Math.floor(m.y) + 0.05,
                z: Math.floor(m.z) + 0.5,
                dimension: m.dimension,
                ownerId: typeof m.ownerId === "string" ? m.ownerId : null,
                ownerTeam: typeof m.ownerTeam === "string" ? m.ownerTeam : null,
                triggerMode: Number.isInteger(m.triggerMode) && m.triggerMode >= 0 && m.triggerMode <= 2 ? m.triggerMode : TRIGGER_MODE.HOSTILE,
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
            id: m.id,
            x: m.x,
            y: m.y,
            z: m.z,
            dimension: m.dimension,
            ownerId: m.ownerId,
            ownerTeam: m.ownerTeam,
            triggerMode: m.triggerMode,
            armed: m.armed,
            armAt: m.armAt,
            rearmAt: m.rearmAt
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

    const ownerTeam = getPlayerTeam(player);
    mines.push({
        id: createMineId(),
        x: location.x + 0.5,
        y: location.y + 0.05,
        z: location.z + 0.5,
        dimension: player.dimension.id,
        ownerId: player.id ?? null,
        ownerTeam,
        triggerMode: TRIGGER_MODE.HOSTILE,
        armed: false,
        armAt: system.currentTick + ARM_DELAY_TICKS,
        rearmAt: 0,
        detonating: false
    });

    save();
    player.playSound("random.click", { volume: 0.7, pitch: 0.7 });
    player.sendMessage(`§7[Mine] Mine platziert${ownerTeam ? ` für Team §f${ownerTeam}` : ""}. §8Sie wird gleich scharf.`);
}

function canManageMine(player, mine) {
    if (!player?.isValid || !mine) return false;
    if (player.commandPermissionLevel >= CommandPermissionLevel.GameDirectors) return true;
    if (!mine.ownerTeam) return false;
    return getPlayerTeam(player) === mine.ownerTeam;
}

function canTriggerMine(player, mine) {
    if (!mine || !player) return false;
    if (!mine.ownerTeam) return true;

    const playerTeam = getPlayerTeam(player);
    if (playerTeam && playerTeam === mine.ownerTeam) return false;

    // Fremde Spieler ohne Team gelten als feindlich gegenüber einem Team.
    if (!playerTeam) return true;

    const relation = getTeamRelation(mine.ownerTeam, playerTeam);
    if (relation === TEAM_RELATION.FRIENDLY) return false;
    if (mine.triggerMode === TRIGGER_MODE.EVERYONE) return true;
    if (mine.triggerMode === TRIGGER_MODE.HOSTILE_NEUTRAL) return relation === TEAM_RELATION.HOSTILE || relation === TEAM_RELATION.NEUTRAL;
    return relation === TEAM_RELATION.HOSTILE;
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
    const mineId = mine.id;
    system.runTimeout(() => detonateById(mineId), DETONATION_DELAY_TICKS);
}

function detonateById(mineId) {
    const index = mines.findIndex(m => m.id === mineId);
    if (index < 0) return;
    detonate(index);
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

        // Kein Blockschaden, aber Feuer ist ausdrücklich aktiviert.
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

function findControlledMines(player, radius = CONTROL_RADIUS) {
    return mines
        .map((mine, index) => ({ mine, index }))
        .filter(({ mine }) => mine.dimension === player.dimension.id && distanceSquared(mine, player.location) <= radius * radius && canManageMine(player, mine))
        .sort((a, b) => distanceSquared(a.mine, player.location) - distanceSquared(b.mine, player.location));
}

function formatMode(mode) {
    if (mode === TRIGGER_MODE.EVERYONE) return "§cAlle Spieler";
    if (mode === TRIGGER_MODE.HOSTILE_NEUTRAL) return "§eFeinde + Neutral";
    return "§cNur Feinde";
}

function formatMine(mine) {
    const status = mine.detonating ? "§cZündung" : mine.armed ? "§aScharf" : mine.rearmAt > 0 ? "§eDeaktiviert" : "§7Wird scharf";
    return `${status} §7| §f${mine.x.toFixed(0)}, ${mine.y.toFixed(0)}, ${mine.z.toFixed(0)} §7| ${formatMode(mine.triggerMode)}`;
}

function listMines(player) {
    const controlled = findControlledMines(player, 64);
    if (!controlled.length) {
        player.sendMessage("§7[Mine] Keine eigenen/Team-Minen in 64 Blöcken gefunden.");
        return;
    }
    player.sendMessage(`§6--- Deine Team-Minen (${controlled.length}) ---`);
    for (const { mine } of controlled.slice(0, 30)) player.sendMessage(`§7${mine.id} §8→ ${formatMine(mine)}`);
    if (controlled.length > 30) player.sendMessage(`§8... und ${controlled.length - 30} weitere.`);
}

function controlNearest(player, action) {
    const controlled = findControlledMines(player);
    const entry = controlled[0];
    if (!entry) {
        player.sendMessage("§c[Mine] Keine kontrollierbare Mine in der Nähe (8 Blöcke).");
        return;
    }
    const { mine } = entry;
    if (action === "arm") {
        mine.armed = true;
        mine.armAt = 0;
        mine.rearmAt = 0;
        mine.detonating = false;
        player.sendMessage(`§a[Mine] ${mine.id} wurde scharf geschaltet.`);
    } else if (action === "disarm") {
        mine.armed = false;
        mine.armAt = 0;
        mine.rearmAt = 0;
        mine.detonating = false;
        player.sendMessage(`§e[Mine] ${mine.id} wurde entschärft.`);
    } else if (action === "remove") {
        mines.splice(entry.index, 1);
        player.sendMessage(`§a[Mine] ${mine.id} wurde entfernt.`);
    }
    save();
}

function setNearestMode(player, mode) {
    const controlled = findControlledMines(player);
    const entry = controlled[0];
    if (!entry) {
        player.sendMessage("§c[Mine] Keine kontrollierbare Mine in der Nähe (8 Blöcke).");
        return;
    }
    entry.mine.triggerMode = mode;
    save();
    player.sendMessage(`§a[Mine] ${entry.mine.id}: Auslösemodus auf ${formatMode(mode)} §agesetzt.`);
}

function clearTeamMines(player) {
    const before = mines.length;
    const removed = mines.filter(m => canManageMine(player, m) && m.dimension === player.dimension.id).length;
    if (!removed) {
        player.sendMessage("§7[Mine] Keine kontrollierbaren Minen in dieser Dimension.");
        return;
    }
    mines = mines.filter(m => !(canManageMine(player, m) && m.dimension === player.dimension.id));
    save();
    player.sendMessage(`§a[Mine] ${before - mines.length} kontrollierbare Mine(n) entfernt.`);
}

function registerCommands(registry) {
    const playerOnly = origin => origin?.sourceEntity?.typeId === "minecraft:player" ? origin.sourceEntity : null;
    const register = (name, description, parameters, handler) => {
        registry.registerCommand({
            name,
            description,
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false,
            ...(parameters?.length ? { mandatoryParameters: parameters } : {})
        }, (origin, ...args) => {
            const player = playerOnly(origin);
            if (!player) return { status: CustomCommandStatus.Failure };
            system.run(() => handler(player, ...args));
            return { status: CustomCommandStatus.Success };
        });
    };

    register("siedler:mine_list", "Listet kontrollierbare Minen in der Nähe auf.", [], listMines);
    register("siedler:mine_arm", "Schaltet die nächste eigene/Team-Mine scharf.", [], player => controlNearest(player, "arm"));
    register("siedler:mine_disarm", "Entschärft die nächste eigene/Team-Mine.", [], player => controlNearest(player, "disarm"));
    register("siedler:mine_remove", "Entfernt die nächste eigene/Team-Mine.", [], player => controlNearest(player, "remove"));
    register("siedler:mine_clear", "Entfernt alle eigenen/Team-Minen in der Dimension.", [], clearTeamMines);
    register("siedler:mine_mode", "Setzt den Auslösemodus der nächsten eigenen/Team-Mine.", [{ type: CustomCommandParamType.Integer, name: "modus" }], (player, mode) => {
        const numeric = Number(mode);
        if (![0, 1, 2].includes(numeric)) {
            player.sendMessage("§c[Mine] Modus: 0=Nur Feinde, 1=Feinde+Neutral, 2=Alle.");
            return;
        }
        setNearestMode(player, numeric);
    });

    register("siedler:mine_status", "Zeigt den Minenfeld-Status an.", [], player => {
        const own = findControlledMines(player, 128).length;
        player.sendMessage(`§6[Mine] §fGesamt: §e${mines.length}/${MAX_MINES} §7| Kontrollierbar: §e${own} §7| Reichweite: §e${CONTROL_RADIUS}`);
    });
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
            if (distanceSquared(mine, player.location) <= 0.75 * 0.75 && canTriggerMine(player, mine)) {
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

    system.beforeEvents.startup.subscribe(event => registerCommands(event.customCommandRegistry));
} catch (error) {
    logger.error("Could not initialize minefield events", error);
}

load();
system.runInterval(scan, SCAN_INTERVAL);
logger.success("Minefield system loaded: control commands, team diplomacy integration, no block damage, fire-enabled explosions, chain reaction and automatic rearming.");

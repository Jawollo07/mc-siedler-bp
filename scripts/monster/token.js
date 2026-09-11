import { system, world, CustomCommandStatus } from "@minecraft/server";
import { MONSTER_CONFIG } from "./index.js";
import { getTeams, saveTeams } from "../teams/index.js";
import { addTokenTaxBonus, TAX_BONUS_CONFIG } from "../taxes/config.js";

function getConfig() { return MONSTER_CONFIG?.token ?? null; }
function isPlayer(entity) { return entity?.typeId === "minecraft:player"; }
function getDimensions() { return ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"].map(id => { try { return world.getDimension(id); } catch { return null; } }).filter(Boolean); }
function getTokenMobs() {
    const config = getConfig(); if (!config) return [];
    const result = [];
    for (const dimension of getDimensions()) { try { result.push(...dimension.getEntities({ tags: [config.mobTag] })); } catch {} }
    return result;
}
function getKillingPlayer(source) { return source ? [source.damagingEntity, source.sourceEntity, source.entity, source.source].find(isPlayer) ?? null : null; }
function getTeamEntry(player) { return Object.entries(getTeams()).find(([, data]) => Array.isArray(data?.players) && data.players.includes(player.id)) ?? null; }
function addMonsterTokenTaxBonus(player) {
    const entry = getTeamEntry(player); if (!entry) return;
    const [teamName, teamData] = entry;
    const reward = Math.max(0, Math.floor(Number(getConfig()?.reward?.taxBonus ?? TAX_BONUS_CONFIG.TOKEN_REWARD) || 0));
    const before = Number(teamData.taxBonus) || 0;
    const after = addTokenTaxBonus(teamData, reward);
    if (!saveTeams(getTeams())) return;
    const gained = after - before;
    player.sendMessage(gained > 0 ? `§6[Token] §a+${gained} Emeralds TaxBonus für Team ${teamData.color || "§f"}${teamName}§a! §7Gesamt: ${after}/${TAX_BONUS_CONFIG.MAX_BONUS}` : `§6[Token] §eTaxBonus von Team ${teamData.color || "§f"}${teamName}§e ist bereits voll.`);
}
function isValidSpawnLocation(dimension, location) {
    try {
        const x = Math.floor(location.x), y = Math.floor(location.y), z = Math.floor(location.z);
        const floor = dimension.getBlock({ x, y: y - 1, z }), feet = dimension.getBlock({ x, y, z }), head = dimension.getBlock({ x, y: y + 1, z });
        if (!floor || !feet || !head) return false;
        if (getConfig()?.spawn?.requireSolidFloor && (floor.isAir || floor.isLiquid)) return false;
        return !feet.isLiquid && !head.isLiquid && feet.typeId === "minecraft:air" && head.typeId === "minecraft:air";
    } catch { return false; }
}
function findSpawnPosition(dimension, center) {
    const spawn = getConfig()?.spawn ?? {};
    const radius = Math.max(1, Number(spawn.radius) || 8), minDistance = Math.min(radius, Math.max(0, Number(spawn.minDistance) || 0)), attempts = Math.max(1, Math.floor(Number(spawn.maxAttempts) || 30));
    for (let i = 0; i < attempts; i++) {
        const angle = Math.random() * Math.PI * 2, distance = minDistance + Math.random() * Math.max(0, radius - minDistance);
        const pos = { x: Math.floor(center.x + Math.cos(angle) * distance) + 0.5, y: Math.floor(center.y), z: Math.floor(center.z + Math.sin(angle) * distance) + 0.5 };
        if (isValidSpawnLocation(dimension, pos)) return pos;
    }
    return null;
}
function setTokenRoundComplete(value) { try { world.setDynamicProperty("allTokenDied", Boolean(value)); } catch {} }
function spawnTokenMob(player, silent = false) {
    if (!player || !getConfig()) return null;
    const config = getConfig(), current = getTokenMobs(), max = Math.max(1, Math.floor(Number(config.maxMobs) || 1));
    if (current.length >= max) return null;
    const position = findSpawnPosition(player.dimension, player.location);
    if (!position) { if (!silent) player.sendMessage("§cKein sicherer Spawnplatz für den Token gefunden."); return null; }
    try {
        setTokenRoundComplete(false);
        const entity = player.dimension.spawnEntity(config.mobType, position);
        entity.addTag(config.mobTag); entity.nameTag = config.mobName;
        if (!silent) player.sendMessage(`§aToken-Mob gespawnt! §7(${current.length + 1}/${max})`);
        return entity;
    } catch (error) { console.error(`[Token] Spawn fehlgeschlagen: ${error}`); return null; }
}
function disableAllMonsters() { for (const dimension of getDimensions()) { try { for (const monster of dimension.getEntities({ type: "minecraft:monster" })) { try { monster.remove(); } catch {} } } catch {} } }
function handleAllTokenMobsDefeated(killer = null) { setTokenRoundComplete(true); if (killer) killer.sendMessage("§6§lAlle Token-Mobs wurden besiegt! §7Die Token-Runde ist abgeschlossen."); disableAllMonsters(); }
function isAutoSpawnEnabled() { try { return world.getDynamicProperty("token_auto_spawn") === true; } catch { return Boolean(getConfig()?.autoSpawn?.enabled); } }
function setAutoSpawnEnabled(value) { try { world.setDynamicProperty("token_auto_spawn", Boolean(value)); return true; } catch { return false; } }
function autoSpawnTick() {
    if (!isAutoSpawnEnabled() || !getConfig()) return;
    const config = getConfig(); if (getTokenMobs().length >= Math.max(1, Math.floor(Number(config.maxMobs) || 1))) return;
    const players = world.getAllPlayers(); if (!players.length) return;
    const player = config.autoSpawn?.spawnForRandomOnlinePlayer === false ? players[0] : players[Math.floor(Math.random() * players.length)];
    spawnTokenMob(player, true);
}

system.beforeEvents.startup.subscribe((event) => {
    const config = getConfig(); if (!config) return;
    event.customCommandRegistry.registerCommand({ name: config.command.name, description: config.command.description, permissionLevel: 0, cheatsRequired: false }, (origin) => {
        const player = origin.sourceEntity; if (!isPlayer(player)) return { status: CustomCommandStatus.Failure };
        system.run(() => spawnTokenMob(player)); return { status: CustomCommandStatus.Success };
    });
    event.customCommandRegistry.registerCommand({ name: config.command.autoName, description: config.command.autoDescription, permissionLevel: 0, cheatsRequired: false }, (origin) => {
        const player = origin.sourceEntity; if (!isPlayer(player)) return { status: CustomCommandStatus.Failure };
        const enabled = !isAutoSpawnEnabled(); if (!setAutoSpawnEnabled(enabled)) return { status: CustomCommandStatus.Failure };
        player.sendMessage(enabled ? "§6[Token] §aAutomatisches Token-Spawning aktiviert." : "§6[Token] §cAutomatisches Token-Spawning deaktiviert.");
        return { status: CustomCommandStatus.Success };
    });
});

// Prüft alle 100 Ticks; tatsächlich gespawnt wird entsprechend intervalTicks.
system.runInterval(() => {
    if (!isAutoSpawnEnabled() || !getConfig()) return;
    const interval = Math.max(100, Math.floor(Number(getConfig().autoSpawn?.intervalTicks) || 24000));
    if (system.currentTick % interval !== 0) return;
    autoSpawnTick();
}, 100);

world.afterEvents.entityDie.subscribe((event) => {
    const config = getConfig(), dead = event.deadEntity; if (!config || !dead) return;
    try { if (!dead.hasTag(config.mobTag)) return; } catch { return; }
    const killer = getKillingPlayer(event.damageSource); if (killer) addMonsterTokenTaxBonus(killer);
    system.run(() => { if (getTokenMobs().length === 0) handleAllTokenMobsDefeated(killer); });
});

console.info("[Token] Token-System mit manuellem und automatischem Spawn geladen.");

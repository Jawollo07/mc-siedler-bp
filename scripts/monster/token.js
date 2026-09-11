import { system, world, CustomCommandStatus } from "@minecraft/server";
import { MONSTER_CONFIG } from "./index.js";
import { getTeams, saveTeams } from "../teams/index.js";
import { addTokenTaxBonus, TAX_BONUS_CONFIG } from "../taxes/config.js";

const OVERWORLD_ID = "minecraft:overworld";

function getConfig() {
    return MONSTER_CONFIG?.token ?? null;
}

function hasConfig() {
    if (!getConfig()) {
        console.error("[Token] MONSTER_CONFIG.token ist nicht verfügbar. Das Token-System wurde deaktiviert.");
        return false;
    }
    return true;
}

function getDimensions() {
    const ids = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];
    return ids.map((id) => {
        try { return world.getDimension(id); } catch { return null; }
    }).filter(Boolean);
}

function getTokenMobs() {
    const config = getConfig();
    if (!config) return [];
    const result = [];
    for (const dimension of getDimensions()) {
        try { result.push(...dimension.getEntities({ tags: [config.mobTag] })); }
        catch (error) { if (config.debug) console.warn(`[Token] Token-Mobs konnten nicht abgefragt werden: ${error}`); }
    }
    return result;
}

function isPlayer(entity) {
    return entity?.typeId === "minecraft:player";
}

function getKillingPlayer(damageSource) {
    if (!damageSource) return null;
    return [
        damageSource.damagingEntity,
        damageSource.sourceEntity,
        damageSource.entity,
        damageSource.source
    ].find(isPlayer) ?? null;
}

function getTeamEntry(player) {
    const teams = getTeams();
    return Object.entries(teams).find(([, data]) =>
        Array.isArray(data?.players) && data.players.includes(player.id)
    ) ?? null;
}

function addMonsterTokenTaxBonus(player) {
    const entry = getTeamEntry(player);
    if (!entry) {
        player.sendMessage("§7[Token] Du bist keinem Team zugeordnet. Es wurde kein TaxBonus vergeben.");
        return;
    }

    const [teamName, teamData] = entry;
    const reward = Math.max(0, Math.floor(Number(getConfig()?.reward?.taxBonus ?? TAX_BONUS_CONFIG.TOKEN_REWARD) || 0));
    const before = Number(teamData.taxBonus) || 0;
    const after = addTokenTaxBonus(teamData, reward);

    if (!saveTeams(getTeams())) {
        player.sendMessage("§c[Token] Der TaxBonus konnte nicht gespeichert werden.");
        return;
    }

    const gained = after - before;
    if (gained > 0) {
        player.sendMessage(
            `§6[Token] §a+${gained} Emeralds TaxBonus für Team ${teamData.color || "§f"}${teamName}§a! §7Gespeichert: ${after}/${TAX_BONUS_CONFIG.MAX_BONUS}`
        );
    } else {
        player.sendMessage(
            `§6[Token] §eDer TaxBonus von Team ${teamData.color || "§f"}${teamName}§e ist bereits voll (${TAX_BONUS_CONFIG.MAX_BONUS}).`
        );
    }
}

function isValidSpawnLocation(dimension, location) {
    try {
        const floor = dimension.getBlock({ x: Math.floor(location.x), y: Math.floor(location.y) - 1, z: Math.floor(location.z) });
        const feet = dimension.getBlock({ x: Math.floor(location.x), y: Math.floor(location.y), z: Math.floor(location.z) });
        const head = dimension.getBlock({ x: Math.floor(location.x), y: Math.floor(location.y) + 1, z: Math.floor(location.z) });
        if (!floor || !feet || !head) return false;
        if (getConfig()?.spawn?.requireSolidFloor && (floor.isAir || floor.isLiquid)) return false;
        if (feet.isLiquid || head.isLiquid) return false;
        if (feet.typeId !== "minecraft:air" || head.typeId !== "minecraft:air") return false;
        return true;
    } catch {
        return false;
    }
}

function findSpawnPosition(dimension, center) {
    const spawn = getConfig()?.spawn ?? {};
    const radius = Math.max(1, Number(spawn.radius) || 8);
    const minDistance = Math.min(radius, Math.max(0, Number(spawn.minDistance) || 0));
    const maxAttempts = Math.max(1, Math.floor(Number(spawn.maxAttempts) || 30));

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = minDistance + Math.random() * Math.max(0, radius - minDistance);
        const x = Math.floor(center.x + Math.cos(angle) * distance) + 0.5;
        const z = Math.floor(center.z + Math.sin(angle) * distance) + 0.5;
        const y = Math.floor(center.y);
        const position = { x, y, z };
        if (isValidSpawnLocation(dimension, position)) return position;
    }
    return null;
}

function setTokenRoundComplete(value) {
    try { world.setDynamicProperty("allTokenDied", Boolean(value)); }
    catch (error) { console.error(`[Token] Rundenstatus konnte nicht gespeichert werden: ${error}`); }
}

function spawnTokenMob(player) {
    if (!player || !hasConfig()) return null;
    const config = getConfig();
    const currentMobs = getTokenMobs();

    if (currentMobs.length >= Math.max(1, Math.floor(Number(config.maxMobs) || 1))) {
        player.sendMessage(`§cEs existieren bereits die maximalen §e${config.maxMobs} §cToken-Mobs.`);
        return null;
    }

    const position = findSpawnPosition(player.dimension, player.location);
    if (!position) {
        player.sendMessage("§cKein sicherer Spawnplatz für den Token gefunden.");
        return null;
    }

    try {
        // Ein neuer Token startet immer eine neue Monster-Runde.
        setTokenRoundComplete(false);
        const entity = player.dimension.spawnEntity(config.mobType, position);
        entity.addTag(config.mobTag);
        entity.nameTag = config.mobName;
        player.sendMessage(`§aToken-Mob gespawnt! §7(${currentMobs.length + 1}/${config.maxMobs})`);
        console.info(`[Token] ${player.name} hat einen Token-Mob gespawnt.`);
        return entity;
    } catch (error) {
        console.error(`[Token] Fehler beim Spawnen des Token-Mobs: ${error}`);
        player.sendMessage("§cDer Token-Mob konnte nicht gespawnt werden.");
        return null;
    }
}

function disableAllMonsters() {
    for (const dimension of getDimensions()) {
        try {
            for (const monster of dimension.getEntities({ type: "minecraft:monster" })) {
                try { monster.remove(); } catch (error) {
                    if (getConfig()?.debug) console.warn(`[Token] Monster konnte nicht entfernt werden: ${error}`);
                }
            }
        } catch (error) {
            if (getConfig()?.debug) console.warn(`[Token] Monster-Abfrage fehlgeschlagen: ${error}`);
        }
    }
}

function handleAllTokenMobsDefeated(killer = null) {
    setTokenRoundComplete(true);
    if (killer) killer.sendMessage("§6§lAlle Token-Mobs wurden besiegt! §7Monster-Spawns sind bis zur nächsten Token-Runde deaktiviert.");
    disableAllMonsters();
}

system.beforeEvents.startup.subscribe((event) => {
    if (!hasConfig()) return;
    const config = getConfig();
    event.customCommandRegistry.registerCommand(
        {
            name: config.command.name,
            description: config.command.description,
            permissionLevel: 0,
            cheatsRequired: false
        },
        (origin) => {
            const player = origin.sourceEntity;
            if (!isPlayer(player)) return { status: CustomCommandStatus.Failure };
            system.run(() => spawnTokenMob(player));
            return { status: CustomCommandStatus.Success };
        }
    );
});

world.afterEvents.entityDie.subscribe((event) => {
    if (!hasConfig()) return;
    const deadEntity = event.deadEntity;
    if (!deadEntity) return;

    const config = getConfig();
    try {
        if (!deadEntity.isValid || !deadEntity.hasTag(config.mobTag)) return;
    } catch {
        return;
    }

    const killer = getKillingPlayer(event.damageSource);
    if (killer) addMonsterTokenTaxBonus(killer);

    system.run(() => {
        if (getTokenMobs().length === 0) handleAllTokenMobsDefeated(killer);
    });
});

console.info("§a[Token] Verbessertes Token-Mob-System geladen.");

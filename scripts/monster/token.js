import { system, world, CustomCommandStatus } from "@minecraft/server";
import { MONSTER_CONFIG } from "./index.js";
import { getTeams, saveTeams } from "../teams/index.js";
import { addTokenTaxBonus, TAX_BONUS_CONFIG } from "../taxes/config.js";

const CONFIG = MONSTER_CONFIG?.token ?? null;
const OVERWORLD_ID = "minecraft:overworld";

function hasConfig() {
    if (!CONFIG) {
        console.error("[Token] MONSTER_CONFIG.token ist nicht verfügbar. Das Token-System wurde deaktiviert.");
        return false;
    }
    return true;
}

function getOverworld() {
    return world.getDimension(OVERWORLD_ID);
}

function getTokenMobs() {
    if (!hasConfig()) return [];
    try {
        return getOverworld().getEntities({ tags: [CONFIG.mobTag] });
    } catch (error) {
        console.error(`[Token] Token-Mobs konnten nicht abgefragt werden: ${error}`);
        return [];
    }
}

function isPlayer(entity) {
    return entity?.typeId === "minecraft:player";
}

function getKillingPlayer(damageSource) {
    if (!damageSource) return null;
    const candidates = [
        damageSource.damagingEntity,
        damageSource.sourceEntity,
        damageSource.entity,
        damageSource.source
    ];
    return candidates.find(isPlayer) ?? null;
}

function addMonsterTokenTaxBonus(player) {
    if (!player) return;

    const teams = getTeams();
    const teamEntry = Object.entries(teams).find(([, data]) =>
        Array.isArray(data?.players) && data.players.includes(player.id)
    );

    if (!teamEntry) {
        player.sendMessage("§7[Token] Du bist keinem Team zugeordnet. Es wurde kein TaxBonus vergeben.");
        return;
    }

    const [teamName, teamData] = teamEntry;
    const before = Number(teamData.taxBonus) || 0;
    const after = addTokenTaxBonus(teamData, TAX_BONUS_CONFIG.TOKEN_REWARD);

    if (!saveTeams(teams)) {
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

    console.info(`[Token] Team "${teamName}" erhielt ${gained} TaxBonus durch einen besiegten Token.`);
}

function isValidSpawnLocation(dimension, location) {
    try {
        const block = dimension.getBlock({
            x: Math.floor(location.x),
            y: Math.floor(location.y),
            z: Math.floor(location.z)
        });
        if (!block) return false;
        return block.typeId !== "minecraft:water" && block.typeId !== "minecraft:lava";
    } catch {
        return false;
    }
}

function findSpawnPosition(dimension, center) {
    const { radius, minDistance, maxAttempts } = CONFIG.spawn;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = minDistance + Math.random() * Math.max(0, radius - minDistance);
        const position = {
            x: Math.floor(center.x + Math.cos(angle) * distance) + 0.5,
            y: Math.floor(center.y),
            z: Math.floor(center.z + Math.sin(angle) * distance) + 0.5
        };
        if (isValidSpawnLocation(dimension, position)) return position;
    }

    return { x: center.x + 1, y: center.y, z: center.z + 1 };
}

function spawnTokenMob(player) {
    if (!player || !hasConfig()) return null;
    const dimension = player.dimension;
    const currentMobs = dimension.getEntities({ tags: [CONFIG.mobTag] });

    if (currentMobs.length >= CONFIG.maxMobs) {
        player.sendMessage(`§cEs existieren bereits die maximalen §e${CONFIG.maxMobs} §cToken-Mobs.`);
        return null;
    }

    try {
        const entity = dimension.spawnEntity(CONFIG.mobType, findSpawnPosition(dimension, player.location));
        entity.addTag(CONFIG.mobTag);
        entity.nameTag = CONFIG.mobName;
        player.sendMessage(`§aToken-Mob gespawnt! §7(${currentMobs.length + 1}/${CONFIG.maxMobs})`);
        console.info(`[Token] ${player.name} hat einen Token-Mob gespawnt.`);
        return entity;
    } catch (error) {
        console.error(`[Token] Fehler beim Spawnen des Token-Mobs: ${error}`);
        player.sendMessage("§cDer Token-Mob konnte nicht gespawnt werden.");
        return null;
    }
}

function handleAllTokenMobsDefeated(killer = null) {
    if (killer) killer.sendMessage("§6§lAlle Token-Mobs wurden besiegt!");
    disableAllMonsters();
}

function disableAllMonsters() {
    for (const monster of getOverworld().getEntities({ type: "minecraft:monster" })) {
        try { monster.remove(); } catch (error) {
            if (CONFIG?.debug) console.warn(`[Token] Monster konnte nicht entfernt werden: ${error}`);
        }
    }
}

system.beforeEvents.startup.subscribe((event) => {
    if (!hasConfig()) return;
    event.customCommandRegistry.registerCommand(
        {
            name: CONFIG.command.name,
            description: CONFIG.command.description,
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

    try {
        if (!deadEntity.isValid || !deadEntity.hasTag(CONFIG.mobTag)) return;
    } catch {
        return;
    }

    const killer = getKillingPlayer(event.damageSource);

    // Every player-killed token grants its killer's team a TaxBonus.
    if (killer) addMonsterTokenTaxBonus(killer);

    system.run(() => {
        const remainingMobs = getTokenMobs();
        if (remainingMobs.length === 0) handleAllTokenMobsDefeated(killer);
    });
});

console.info("§a[Token] Token-Mob-System geladen.");

import { system, world, CustomCommandStatus } from "@minecraft/server";
import { MONSTER_CONFIG } from "./index.js";

const OVERWORLD_ID = "minecraft:overworld";
const CONFIG = () => MONSTER_CONFIG.token ?? {};

function getOverworld() {
    return world.getDimension(OVERWORLD_ID);
}

function getTokenMobs(dimension = getOverworld()) {
    try {
        return dimension.getEntities({ tags: [CONFIG().mobTag ?? "token_monster"] });
    } catch (error) {
        console.error(`[Token] Token-Mobs konnten nicht abgefragt werden: ${error}`);
        return [];
    }
}

function isPlayer(entity) {
    return entity?.typeId === "minecraft:player";
}

function getKillingPlayer(damageSource) {
    const candidates = [
        damageSource?.damagingEntity,
        damageSource?.sourceEntity,
        damageSource?.entity,
        damageSource?.source
    ];
    return candidates.find(isPlayer) ?? null;
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
    const spawn = CONFIG().spawn ?? {};
    const radius = Math.max(1, Number(spawn.radius) || 8);
    const minDistance = Math.max(1, Math.min(radius, Number(spawn.minDistance) || 2));
    const maxAttempts = Math.max(1, Math.floor(Number(spawn.maxAttempts) || 20));

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
    if (!player) return null;

    const cfg = CONFIG();
    const dimension = player.dimension;
    const mobTag = cfg.mobTag ?? "token_monster";
    const mobType = cfg.mobType ?? "minecraft:zombie";
    const mobName = cfg.mobName ?? "§6Token-Mob";
    const maxMobs = Math.max(1, Math.floor(Number(cfg.maxMobs) || 4));
    const currentMobs = getTokenMobs(dimension);

    if (currentMobs.length >= maxMobs) {
        player.sendMessage(`§cEs existieren bereits die maximalen §e${maxMobs} §cToken-Mobs.`);
        return null;
    }

    try {
        const entity = dimension.spawnEntity(mobType, findSpawnPosition(dimension, player.location));
        entity.addTag(mobTag);
        entity.nameTag = mobName;
        player.sendMessage(`§aToken-Mob gespawnt! §7(${currentMobs.length + 1}/${maxMobs})`);
        console.info(`§a[Token] ${player.name} hat einen Token-Mob gespawnt.`);
        return entity;
    } catch (error) {
        console.error(`[Token] Fehler beim Spawnen des Token-Mobs: ${error}`);
        player.sendMessage("§cDer Token-Mob konnte nicht gespawnt werden.");
        return null;
    }
}

function handleAllTokenMobsDefeated(killer = null) {
    console.info("§6[Token] Alle Token-Mobs wurden von einem Spieler besiegt!");
    if (killer) killer.sendMessage("§6§lAlle Token-Mobs wurden besiegt!");

    // Nicht alle normalen Monster entfernen: nur Token-Mobs sind Teil dieses Systems.
    // Falls später eine Belohnung/Folgeaktion benötigt wird, kommt sie hier hinein.
}

// WICHTIG: /token statt ChatSend-API.
// Der verwendete @minecraft/server-2.9.0-Build stellt world.*.chatSend nicht bereit.
// Der Custom Command funktioniert unabhängig davon.
const startup = system.beforeEvents?.startup;
if (startup && typeof startup.subscribe === "function") {
    startup.subscribe((event) => {
        const registry = event.customCommandRegistry;
        const commandName = CONFIG().command?.name ?? "siedler:token";

        if (!registry || typeof registry.registerCommand !== "function") {
            console.error("[Token] CustomCommandRegistry nicht verfügbar; /token konnte nicht registriert werden.");
            return;
        }

        try {
            registry.registerCommand({
                name: commandName,
                description: CONFIG().command?.description ?? "Spawnt einen Token-Mob.",
                permissionLevel: 0,
                cheatsRequired: false
            }, (origin) => {
                const player = origin?.sourceEntity;
                if (!isPlayer(player)) return { status: CustomCommandStatus.Failure };

                system.run(() => spawnTokenMob(player));
                return { status: CustomCommandStatus.Success };
            });

            console.info(`§a[Token] Command /${commandName} registriert.`);
        } catch (error) {
            console.error(`[Token] Command /${commandName} konnte nicht registriert werden: ${error}`);
        }
    });
} else {
    console.error("[Token] startup-API nicht verfügbar; Token-Command konnte nicht registriert werden.");
}

const entityDie = world.afterEvents?.entityDie;
if (entityDie && typeof entityDie.subscribe === "function") {
    entityDie.subscribe((event) => {
        const deadEntity = event?.deadEntity;
        if (!deadEntity) return;

        const cfg = CONFIG();
        const mobTag = cfg.mobTag ?? "token_monster";
        if (!deadEntity.hasTag(mobTag)) return;

        const killer = getKillingPlayer(event.damageSource);
        if (!killer) {
            console.info("[Token] Token-Mob wurde nicht von einem Spieler getötet; keine Token-Runde abgeschlossen.");
            return;
        }

        system.run(() => {
            const remainingMobs = getTokenMobs(deadEntity.dimension);
            console.info(`[Token] Verbleibende Token-Mobs: ${remainingMobs.length}`);
            if (remainingMobs.length === 0) handleAllTokenMobsDefeated(killer);
        });
    });
} else {
    console.warn("§e[Token] entityDie-API nicht verfügbar; Token-Kill-Erkennung deaktiviert.");
}

console.info("§a[Token] Token-Mob-System geladen.");

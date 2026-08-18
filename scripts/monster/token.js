import { system, world, CustomCommandParamType, CustomCommandStatus } from "@minecraft/server";

const CONFIG = {
    mobType: "minecraft:zombie",
    mobTag: "token_monster",
    mobName: "§6Token-Mob",

    maxMobs: 4,

    spawn: {
        radius: 5,
        minDistance: 2,
        maxAttempts: 20
    },

    command: {
        name: "siedler:token",
        description: "Spawnt einen Token-Mob."
    }
};

const OVERWORLD_ID = "minecraft:overworld";

/**
 * Gibt die Overworld zurück.
 */
function getOverworld() {
    return world.getDimension(OVERWORLD_ID);
}

/**
 * Gibt alle aktuell existierenden Token-Mobs zurück.
 */
function getTokenMobs() {
    try {
        return getOverworld().getEntities({
            tags: [CONFIG.mobTag]
        });
    } catch (error) {
        console.error(
            `[Token] Token-Mobs konnten nicht abgefragt werden: ${error}`
        );

        return [];
    }
}

/**
 * Prüft, ob das Entity ein Spieler ist.
 */
function isPlayer(entity) {
    if (!entity) {
        return false;
    }

    return entity.typeId === "minecraft:player";
}

/**
 * Ermittelt den Spieler, der den Schaden verursacht hat.
 */
function getKillingPlayer(damageSource) {
    if (!damageSource) {
        return null;
    }

    const candidates = [
        damageSource.damagingEntity,
        damageSource.sourceEntity,
        damageSource.entity,
        damageSource.source
    ];

    for (const entity of candidates) {
        if (isPlayer(entity)) {
            return entity;
        }
    }

    return null;
}

/**
 * Prüft, ob ein Block/Standort grundsätzlich brauchbar ist.
 */
function isValidSpawnLocation(dimension, location) {
    try {
        const block = dimension.getBlock({
            x: Math.floor(location.x),
            y: Math.floor(location.y),
            z: Math.floor(location.z)
        });

        if (!block) {
            return false;
        }

        // Kein Spawn in Flüssigkeiten.
        if (
            block.typeId === "minecraft:water" ||
            block.typeId === "minecraft:lava"
        ) {
            return false;
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * Erzeugt eine zufällige Spawnposition rund um den Spieler.
 */
function findSpawnPosition(dimension, center) {
    const {
        radius,
        minDistance,
        maxAttempts
    } = CONFIG.spawn;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const angle = Math.random() * Math.PI * 2;

        const distance =
            minDistance +
            Math.random() * Math.max(0, radius - minDistance);

        const x = Math.floor(
            center.x + Math.cos(angle) * distance
        ) + 0.5;

        const z = Math.floor(
            center.z + Math.sin(angle) * distance
        ) + 0.5;

        const y = Math.floor(center.y);

        const position = {
            x,
            y,
            z
        };

        if (isValidSpawnLocation(dimension, position)) {
            return position;
        }
    }

    // Fallback direkt neben dem Spieler.
    return {
        x: center.x + 1,
        y: center.y,
        z: center.z + 1
    };
}

/**
 * Spawnt einen Token-Mob.
 */
function spawnTokenMob(player) {
    if (!player) {
        return null;
    }

    const dimension = player.dimension;

    const currentMobs = dimension.getEntities({
        tags: [CONFIG.mobTag]
    });

    if (currentMobs.length >= CONFIG.maxMobs) {
        player.sendMessage(
            `§cEs existieren bereits die maximalen §e${CONFIG.maxMobs} §cToken-Mobs.`
        );

        return null;
    }

    const spawnPosition = findSpawnPosition(
        dimension,
        player.location
    );

    try {
        const entity = dimension.spawnEntity(
            CONFIG.mobType,
            spawnPosition
        );

        entity.addTag(CONFIG.mobTag);
        entity.nameTag = CONFIG.mobName;

        player.sendMessage(
            `§aToken-Mob gespawnt! §7(${currentMobs.length + 1}/${CONFIG.maxMobs})`
        );

        console.info(
            `[Token] ${player.name} hat einen Token-Mob gespawnt.`
        );

        return entity;
    } catch (error) {
        console.error(
            `[Token] Fehler beim Spawnen des Token-Mobs: ${error}`
        );

        player.sendMessage(
            "§cDer Token-Mob konnte nicht gespawnt werden."
        );

        return null;
    }
}

/**
 * Wird aufgerufen, wenn alle Token-Mobs von Spielern getötet wurden.
 */
function handleAllTokenMobsDefeated(killer = null) {
    console.info(
        "[Token] Alle Token-Mobs wurden von Spielern besiegt!"
    );

    if (killer) {
        killer.sendMessage(
            "§6§lAlle Token-Mobs wurden besiegt!"
        );
    }
    disableAllMonsters();
}
function disableAllMonsters() {
    const dimension = getOverworld();
    
    const allMonsters = dimension.getEntities({
        type: "minecraft:monster"
    });

    for (const monster of allMonsters) {
        try {
            monster.remove();
        } catch (error) {
            console.warn(
                `[Token] Monster konnte nicht entfernt werden (${monster.typeId}): ${error}`
            );
        }
    }

    console.info(
        "[Token] Alle Monster wurden entfernt."
    );
}
/**
 * Registriert den Token-Custom-Command.
 */
system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;

    registry.registerCommand(
        {
            name: CONFIG.command.name,
            description: CONFIG.command.description,
            permissionLevel: 0,
            cheatsRequired: false
        },
        (origin) => {
            const player = origin.sourceEntity;

            if (!isPlayer(player)) {
                return {
                    status: CustomCommandStatus.Failure
                };
            }

            system.run(() => {
                spawnTokenMob(player);
            });

            return {
                status: CustomCommandStatus.Success
            };
        }
    );

    console.info(
        `§a[Token] Command /${CONFIG.command.name} registriert.`
    );
});

/**
 * Erkennt den Tod eines Token-Mobs.
 */
world.afterEvents.entityDie.subscribe((event) => {
    const deadEntity = event.deadEntity;

    if (!deadEntity) {
        return;
    }

    // Nur unsere Token-Mobs behandeln.
    if (!deadEntity.hasTag(CONFIG.mobTag)) {
        return;
    }

    const damageSource = event.damageSource;
    const killer = getKillingPlayer(damageSource);

    console.info(
        `[Token] ${killer.name} hat einen Token-Mob getötet.`
    );

    /*
     * entityDie wird verarbeitet, bevor garantiert ist,
     * dass getEntities() bereits ohne das tote Entity arbeitet.
     *
     * Deshalb einen Tick warten.
     */
    system.run(() => {
        const remainingMobs = getTokenMobs();

        console.info(
            `[Token] Verbleibende Token-Mobs: ${remainingMobs.length}`
        );

        if (remainingMobs.length === 0) {
            handleAllTokenMobsDefeated(killer);
        }
    });
});

console.info(
    "§a[Token] Token-Mob-System geladen."
);
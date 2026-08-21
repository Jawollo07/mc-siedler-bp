import {
    system,
    world,
    CustomCommandParamType,
    CustomCommandStatus,
    CommandPermissionLevel
} from "@minecraft/server";

import {
    MONSTER_CONFIG,
    saveMonsterConfig,
    loadMonsterConfig
} from "./index.js";

const SQUAD_TAG = "monster_squad";
const OP_PERMISSION = CommandPermissionLevel.GameDirectors;

/* =========================================================
 * Hilfsfunktionen
 * ========================================================= */

function playerOnly(origin) {
    try {
        const player = origin.sourceEntity;

        if (!player) {
            return null;
        }

        if (player.typeId !== "minecraft:player") {
            return null;
        }

        return player;
    } catch {
        return null;
    }
}

function reply(player, message) {
    try {
        player.sendMessage(`§8[§cMonster§8]§r ${message}`);
    } catch {}
}

function spawnEntity(dimension, typeId, location) {
    const entity = dimension.spawnEntity(typeId, location);

    try {
        entity.addTag(SQUAD_TAG);
    } catch {}

    return entity;
}

/* =========================================================
 * Config-Helper
 * ========================================================= */

function setConfigByPath(path, value) {
    try {
        if (!path || typeof path !== "string") return false;

        const parts = path.split(".");
        let obj = MONSTER_CONFIG;

        for (let i = 0; i < parts.length - 1; i++) {
            const key = parts[i];
            if (obj[key] === undefined || obj[key] === null || typeof obj[key] !== "object") {
                obj[key] = {};
            }
            obj = obj[key];
        }

        const last = parts[parts.length - 1];
        const previous = obj.hasOwnProperty(last) ? obj[last] : undefined;
        obj[last] = value;
        return previous;
    } catch (error) {
        console.warn(`[Monster] setConfigByPath failed: ${error}`);
        return false;
    }
}

function getConfigByPath(path) {
    try {
        if (!path || typeof path !== "string") return undefined;
        const parts = path.split(".");
        let obj = MONSTER_CONFIG;

        for (const part of parts) {
            if (obj === undefined || obj === null) return undefined;
            obj = obj[part];
        }

        return obj;
    } catch (error) {
        console.warn(`[Monster] getConfigByPath failed: ${error}`);
        return undefined;
    }
}

/* =========================================================
 * Pillager-Trupp spawnen
 * ========================================================= */

function spawnSquad(player, count = null) {
    const cfg = MONSTER_CONFIG.pillager;

    const amount = Math.max(
        1,
        Math.min(
            32,
            Number.isFinite(count)
                ? Math.floor(count)
                : Math.floor(
                    Math.random() *
                    (cfg.maxGroupSize - cfg.minGroupSize + 1)
                ) + cfg.minGroupSize
        )
    );

    let spawned = 0;

    for (let i = 0; i < amount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 3 + Math.random() * 6;

        const location = {
            x: player.location.x + Math.cos(angle) * distance,
            y: player.location.y,
            z: player.location.z + Math.sin(angle) * distance
        };

        try {
            spawnEntity(
                player.dimension,
                "minecraft:pillager",
                location
            );

            spawned++;
        } catch (error) {
            console.warn(
                `[Monster] Pillager konnte nicht gespawnt werden: ${error}`
            );
        }
    }

    return spawned;
}

/* =========================================================
 * Markierte Monster entfernen
 * ========================================================= */

function clearMonsterEntities(dimension) {
    let removed = 0;

    const monsterTypes = [
        "minecraft:pillager",
        "minecraft:vindicator",
        "minecraft:ravager"
    ];

    for (const typeId of monsterTypes) {
        try {
            const entities = dimension.getEntities({
                type: typeId
            });

            for (const entity of entities) {
                try {
                    if (entity.hasTag(SQUAD_TAG)) {
                        entity.remove();
                        removed++;
                    }
                } catch {}
            }
        } catch {}
    }

    return removed;
}

/* =========================================================
 * Status
 * ========================================================= */

function showStatus(player) {
    const config = MONSTER_CONFIG;
    const pillager = config.pillager;

    reply(
        player,
        `§7System: ${
            config.enabled
                ? "§aAKTIV"
                : "§cDEAKTIV"
        }`
    );

    reply(
        player,
        `§7Pillager: ${
            pillager.enabled
                ? "§aAN"
                : "§cAUS"
        }`
    );

    reply(
        player,
        `§7Spawnchance: §e${pillager.spawnChance}`
    );

    reply(
        player,
        `§7Truppgröße: §e${pillager.minGroupSize}-${pillager.maxGroupSize}`
    );

    reply(
        player,
        `§7Max. aktive Trupps: §e${pillager.maxActiveSquads}`
    );

    reply(
        player,
        `§7Outpost: ${
            pillager.outpost?.enabled
                ? "§aAN"
                : "§cAUS"
        }`
    );

    reply(
        player,
        `§7Belagerung: ${
            pillager.siege?.enabled
                ? "§aAN"
                : "§cAUS"
        }`
    );
}

/* =========================================================
 * Custom Commands
 * ========================================================= */

system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;

    /* -----------------------------------------------------
     * /siedler:monster_status
     * ----------------------------------------------------- */

    registry.registerCommand(
        {
            name: "siedler:monster_status",
            description: "Zeigt den aktuellen Monster-System-Status.",
            permissionLevel: OP_PERMISSION,
            cheatsRequired: false
        },
        (origin) => {
            const player = playerOnly(origin);

            if (!player) {
                return {
                    status: CustomCommandStatus.Failure
                };
            }

            system.run(() => {
                showStatus(player);
            });

            return {
                status: CustomCommandStatus.Success
            };
        }
    );

    /* -----------------------------------------------------
     * /siedler:monster_set <path> <value>
     * -----------------------------------------------------
     */

    registry.registerCommand(
        {
            name: "siedler:monster_set",
            description: "Setzt einen Konfigurationswert (Pfad z.B. pillager.spawnChance).",
            permissionLevel: OP_PERMISSION,
            cheatsRequired: false,

            mandatoryParameters: [
                {
                    type: CustomCommandParamType.String,
                    name: "path"
                },
                {
                    type: CustomCommandParamType.String,
                    name: "value"
                }
            ]
        },
        (origin, args) => {
            const player = playerOnly(origin);

            if (!player) {
                return {
                    status: CustomCommandStatus.Failure
                };
            }

            const path = String(args[0] ?? "").trim();
            const raw = args[1] === undefined ? "" : String(args[1]);

            if (!path) {
                reply(player, "§cUngültiger Pfad.");

                return {
                    status: CustomCommandStatus.Failure
                };
            }

            let value;
            if (raw === "true") value = true;
            else if (raw === "false") value = false;
            else if (!isNaN(Number(raw)) && raw.trim() !== "") value = Number(raw);
            else if ((raw.startsWith("{") && raw.endsWith("}")) || (raw.startsWith("[") && raw.endsWith("]"))) {
                try {
                    value = JSON.parse(raw);
                } catch {
                    value = raw;
                }
            } else {
                value = raw;
            }

            system.run(() => {
                try {
                    const previous = setConfigByPath(path, value);

                    if (previous === false) {
                        reply(player, "§cKonfigurationswert konnte nicht gesetzt werden.");
                        return;
                    }

                    const saved = saveMonsterConfig();

                    const prevText = JSON.stringify(previous === undefined ? null : previous);
                    const newText = JSON.stringify(value);

                    reply(
                        player,
                        saved
                            ? `§aKonfiguration gesetzt: ${path} = ${newText} (vorher: ${prevText})`
                            : `§aKonfiguration gesetzt: ${path} = ${newText} (vorher: ${prevText}), §cSpeichern fehlgeschlagen.`
                    );
                } catch (error) {
                    console.warn(`[Monster] Fehler beim Setzen der Config: ${error}`);

                    reply(player, "§cFehler beim Setzen der Konfiguration.");
                }
            });

            return {
                status: CustomCommandStatus.Success
            };
        }
    );

    /* -----------------------------------------------------
     * /siedler:monster_get <path>
     * -----------------------------------------------------
     */

    registry.registerCommand(
        {
            name: "siedler:monster_get",
            description: "Gibt einen Konfigurationswert zurück (Pfad z.B. pillager.spawnChance).",
            permissionLevel: OP_PERMISSION,
            cheatsRequired: false,

            mandatoryParameters: [
                {
                    type: CustomCommandParamType.String,
                    name: "path"
                }
            ]
        },
        (origin, args) => {
            const player = playerOnly(origin);

            if (!player) {
                return {
                    status: CustomCommandStatus.Failure
                };
            }

            const path = String(args[0] ?? "").trim();

            if (!path) {
                reply(player, "§cUngültiger Pfad.");

                return {
                    status: CustomCommandStatus.Failure
                };
            }

            try {
                const value = getConfigByPath(path);
                reply(player, `§7${path}: §e${JSON.stringify(value)}`);
            } catch (error) {
                console.warn(`[Monster] Fehler beim Lesen der Config: ${error}`);
                reply(player, "§cFehler beim Lesen der Konfiguration.");
            }

            return {
                status: CustomCommandStatus.Success
            };
        }
    );

    /* -----------------------------------------------------
     * /siedler:monster_enable
     * ----------------------------------------------------- */

    registry.registerCommand(
        {
            name: "siedler:monster_enable",
            description: "Aktiviert das Monster-System.",
            permissionLevel: OP_PERMISSION,
            cheatsRequired: false
        },
        (origin) => {
            const player = playerOnly(origin);

            if (!player) {
                return {
                    status: CustomCommandStatus.Failure
                };
            }

            system.run(() => {
                MONSTER_CONFIG.enabled = true;

                const saved = saveMonsterConfig();

                reply(
                    player,
                    saved
                        ? "§aMonster-System aktiviert."
                        : "§aMonster-System aktiviert, §cSpeichern fehlgeschlagen."
                );
            });

            return {
                status: CustomCommandStatus.Success
            };
        }
    );

    /* -----------------------------------------------------
     * /siedler:monster_disable
     * ----------------------------------------------------- */

    registry.registerCommand(
        {
            name: "siedler:monster_disable",
            description: "Deaktiviert das Monster-System.",
            permissionLevel: OP_PERMISSION,
            cheatsRequired: false
        },
        (origin) => {
            const player = playerOnly(origin);

            if (!player) {
                return {
                    status: CustomCommandStatus.Failure
                };
            }

            system.run(() => {
                MONSTER_CONFIG.enabled = false;

                const saved = saveMonsterConfig();

                reply(
                    player,
                    saved
                        ? "§cMonster-System deaktiviert."
                        : "§cMonster-System deaktiviert, §cSpeichern fehlgeschlagen."
                );
            });

            return {
                status: CustomCommandStatus.Success
            };
        }
    );

    /* -----------------------------------------------------
     * /siedler:monster_pillager <on|off>
     * ----------------------------------------------------- */

    registry.registerCommand(
        {
            name: "siedler:monster_pillager",
            description: "Aktiviert oder deaktiviert Pillager.",
            permissionLevel: OP_PERMISSION,
            cheatsRequired: false,

            mandatoryParameters: [
                {
                    type: CustomCommandParamType.String,
                    name: "status"
                }
            ]
        },
        (origin, args) => {
            const player = playerOnly(origin);

            if (!player) {
                return {
                    status: CustomCommandStatus.Failure
                };
            }

            const value = String(args[0] ?? "").toLowerCase();

            if (value !== "on" && value !== "off") {
                reply(
                    player,
                    "§cVerwendung: /siedler:monster_pillager <on|off>"
                );

                return {
                    status: CustomCommandStatus.Failure
                };
            }

            system.run(() => {
                MONSTER_CONFIG.pillager.enabled = value === "on";

                const saved = saveMonsterConfig();

                reply(
                    player,
                    `Pillager: ${
                        MONSTER_CONFIG.pillager.enabled
                            ? "§aAN"
                            : "§cAUS"
                    }`
                );

                if (!saved) {
                    reply(
                        player,
                        "§cDie Änderung konnte nicht gespeichert werden."
                    );
                }
            });

            return {
                status: CustomCommandStatus.Success
            };
        }
    );

    /* -----------------------------------------------------
     * /siedler:monster_outpost <on|off>
     * ----------------------------------------------------- */

    registry.registerCommand(
        {
            name: "siedler:monster_outpost",
            description: "Aktiviert oder deaktiviert Outpost-Raids.",
            permissionLevel: OP_PERMISSION,
            cheatsRequired: false,

            mandatoryParameters: [
                {
                    type: CustomCommandParamType.String,
                    name: "status"
                }
            ]
        },
        (origin, args) => {
            const player = playerOnly(origin);

            if (!player) {
                return {
                    status: CustomCommandStatus.Failure
                };
            }

            const value = String(args[0] ?? "").toLowerCase();

            if (value !== "on" && value !== "off") {
                reply(
                    player,
                    "§cVerwendung: /siedler:monster_outpost <on|off>"
                );

                return {
                    status: CustomCommandStatus.Failure
                };
            }

            system.run(() => {
                if (!MONSTER_CONFIG.pillager.outpost) {
                    MONSTER_CONFIG.pillager.outpost = {};
                }

                MONSTER_CONFIG.pillager.outpost.enabled =
                    value === "on";

                const saved = saveMonsterConfig();

                reply(
                    player,
                    `Outpost-Raids: ${
                        MONSTER_CONFIG.pillager.outpost.enabled
                            ? "§aAN"
                            : "§cAUS"
                    }`
                );

                if (!saved) {
                    reply(
                        player,
                        "§cDie Änderung konnte nicht gespeichert werden."
                    );
                }
            });

            return {
                status: CustomCommandStatus.Success
            };
        }
    );

    /* -----------------------------------------------------
     * /siedler:monster_siege <on|off>
     * ----------------------------------------------------- */

    registry.registerCommand(
        {
            name: "siedler:monster_siege",
            description: "Aktiviert oder deaktiviert Belagerungen.",
            permissionLevel: OP_PERMISSION,
            cheatsRequired: false,

            mandatoryParameters: [
                {
                    type: CustomCommandParamType.String,
                    name: "status"
                }
            ]
        },
        (origin, args) => {
            const player = playerOnly(origin);

            if (!player) {
                return {
                    status: CustomCommandStatus.Failure
                };
            }

            const value = String(args[0] ?? "").toLowerCase();

            if (value !== "on" && value !== "off") {
                reply(
                    player,
                    "§cVerwendung: /siedler:monster_siege <on|off>"
                );

                return {
                    status: CustomCommandStatus.Failure
                };
            }

            system.run(() => {
                if (!MONSTER_CONFIG.pillager.siege) {
                    MONSTER_CONFIG.pillager.siege = {};
                }

                MONSTER_CONFIG.pillager.siege.enabled =
                    value === "on";

                const saved = saveMonsterConfig();

                reply(
                    player,
                    `Belagerungen: ${
                        MONSTER_CONFIG.pillager.siege.enabled
                            ? "§aAN"
                            : "§cAUS"
                    }`
                );

                if (!saved) {
                    reply(
                        player,
                        "§cDie Änderung konnte nicht gespeichert werden."
                    );
                }
            });

            return {
                status: CustomCommandStatus.Success
            };
        }
    );

    /* -----------------------------------------------------
     * /siedler:monster_spawn [anzahl]
     * ----------------------------------------------------- */

    registry.registerCommand(
        {
            name: "siedler:monster_spawn",
            description: "Spawnt einen Pillager-Trupp.",
            permissionLevel: OP_PERMISSION,
            cheatsRequired: false,

            optionalParameters: [
                {
                    type: CustomCommandParamType.Integer,
                    name: "anzahl"
                }
            ]
        },
        (origin, args) => {
            const player = playerOnly(origin);

            if (!player) {
                return {
                    status: CustomCommandStatus.Failure
                };
            }

            const amount =
                args[0] === undefined
                    ? null
                    : Number(args[0]);

            if (
                amount !== null &&
                (!Number.isFinite(amount) ||
                    amount < 1 ||
                    amount > 32)
            ) {
                reply(
                    player,
                    "§cDie Anzahl muss zwischen 1 und 32 liegen."
                );

                return {
                    status: CustomCommandStatus.Failure
                };
            }

            system.run(() => {
                const spawned = spawnSquad(
                    player,
                    amount
                );

                reply(
                    player,
                    `§a${spawned} Pillager gespawnt.`
                );
            });

            return {
                status: CustomCommandStatus.Success
            };
        }
    );

    /* -----------------------------------------------------
     * /siedler:monster_clear
     * ----------------------------------------------------- */

    registry.registerCommand(
        {
            name: "siedler:monster_clear",
            description: "Entfernt alle markierten Monster.",
            permissionLevel: OP_PERMISSION,
            cheatsRequired: false
        },
        (origin) => {
            const player = playerOnly(origin);

            if (!player) {
                return {
                    status: CustomCommandStatus.Failure
                };
            }

            system.run(() => {
                const removed =
                    clearMonsterEntities(
                        player.dimension
                    );

                reply(
                    player,
                    `§a${removed} markierte Monster entfernt.`
                );
            });

            return {
                status: CustomCommandStatus.Success
            };
        }
    );

    /* -----------------------------------------------------
     * /siedler:monster_reload
     * ----------------------------------------------------- */

    registry.registerCommand(
        {
            name: "siedler:monster_reload",
            description: "Lädt die Monster-Konfiguration neu.",
            permissionLevel: OP_PERMISSION,
            cheatsRequired: false
        },
        (origin) => {
            const player = playerOnly(origin);

            if (!player) {
                return {
                    status: CustomCommandStatus.Failure
                };
            }

            system.run(() => {
                try {
                    loadMonsterConfig();

                    reply(
                        player,
                        "§aMonster-Konfiguration neu geladen."
                    );
                } catch (error) {
                    console.warn(
                        `[Monster] Fehler beim Laden der Config: ${error}`
                    );

                    reply(
                        player,
                        "§cMonster-Konfiguration konnte nicht geladen werden."
                    );
                }
            });

            return {
                status: CustomCommandStatus.Success
            };
        }
    );

    /* -----------------------------------------------------
     * /siedler:monster_save
     * ----------------------------------------------------- */

    registry.registerCommand(
        {
            name: "siedler:monster_save",
            description: "Speichert die Monster-Konfiguration.",
            permissionLevel: OP_PERMISSION,
            cheatsRequired: false
        },
        (origin) => {
            const player = playerOnly(origin);

            if (!player) {
                return {
                    status: CustomCommandStatus.Failure
                };
            }

            system.run(() => {
                try {
                    const saved = saveMonsterConfig();

                    reply(
                        player,
                        saved
                            ? "§aMonster-Konfiguration gespeichert."
                            : "§cMonster-Konfiguration konnte nicht gespeichert werden."
                    );
                } catch (error) {
                    console.warn(
                        `[Monster] Fehler beim Speichern der Config: ${error}`
                    );

                    reply(
                        player,
                        "§cFehler beim Speichern der Monster-Konfiguration."
                    );
                }
            });

            return {
                status: CustomCommandStatus.Success
            };
        }
    );

    console.info(
        "[Monster] Custom Commands erfolgreich registriert."
    );
});
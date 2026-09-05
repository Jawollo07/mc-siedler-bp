import {
    system,
    world,
    CommandPermissionLevel,
    CustomCommandParamType,
    CustomCommandStatus
} from "@minecraft/server";

const HOMES_KEY = "homes";
const DEATH_POINTS_KEY = "death_points";
const TPA_TIMEOUT = 60_000;
const MAX_HOME_DISTANCE = 30_000_000;

const homes = new Map();
const deathPoints = new Map();
const tpaRequests = new Map(); // targetId -> Map(senderId, request)
const lastMessagedPlayer = new Map(); // playerId -> playerId
const godMode = new Set();
const flyMode = new Set();

function readObject(key) {
    const raw = world.getDynamicProperty(key);
    if (typeof raw !== "string" || !raw) return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
        console.error(`[Essentials] Ungültige Dynamic Property ${key}: ${error}`);
        return {};
    }
}

function writeObject(key, value) {
    try {
        world.setDynamicProperty(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`[Essentials] Fehler beim Speichern von ${key}: ${error}`);
        return false;
    }
}

function loadPersistentState() {
    homes.clear();
    deathPoints.clear();

    for (const [id, value] of Object.entries(readObject(HOMES_KEY))) {
        if (isValidLocation(value)) homes.set(id, value);
    }
    for (const [id, value] of Object.entries(readObject(DEATH_POINTS_KEY))) {
        if (isValidLocation(value)) deathPoints.set(id, value);
    }
}

function saveHomes() {
    return writeObject(HOMES_KEY, Object.fromEntries(homes));
}

function saveDeaths() {
    return writeObject(DEATH_POINTS_KEY, Object.fromEntries(deathPoints));
}

function isValidLocation(value) {
    return value &&
        Number.isFinite(Number(value.x)) &&
        Number.isFinite(Number(value.y)) &&
        Number.isFinite(Number(value.z)) &&
        typeof value.dimension === "string";
}

function playerFrom(origin) {
    const player = origin?.sourceEntity;
    return player?.typeId === "minecraft:player" && player.isValid ? player : null;
}

function findPlayer(identifier) {
    const value = String(identifier ?? "").trim();
    if (!value) return null;

    const players = world.getPlayers();
    const exactId = players.find(player => player.id === value);
    if (exactId) return exactId;

    const exactName = players.find(player => player.name.toLowerCase() === value.toLowerCase());
    if (exactName) return exactName;

    const prefixMatches = players.filter(player => player.name.toLowerCase().startsWith(value.toLowerCase()));
    return prefixMatches.length === 1 ? prefixMatches[0] : null;
}

function targetOrSelf(player, identifier) {
    return identifier ? findPlayer(identifier) : player;
}

function sendCommandError(player, message) {
    try { player.sendMessage(`§c${message}`); } catch {}
}

function getHome(player) {
    return homes.get(player.id) ?? null;
}

function removePlayerRequests(playerId) {
    tpaRequests.delete(playerId);
    for (const [targetId, requests] of tpaRequests) {
        requests.delete(playerId);
        if (requests.size === 0) tpaRequests.delete(targetId);
    }
    lastMessagedPlayer.delete(playerId);
    for (const [id, targetId] of lastMessagedPlayer) {
        if (targetId === playerId) lastMessagedPlayer.delete(id);
    }
}

function queueTpaRequest(sender, target) {
    let requests = tpaRequests.get(target.id);
    if (!requests) {
        requests = new Map();
        tpaRequests.set(target.id, requests);
    }

    requests.set(sender.id, {
        from: sender.id,
        target: target.id,
        expiresAt: Date.now() + TPA_TIMEOUT
    });
}

function getLatestTpaRequest(target) {
    const requests = tpaRequests.get(target.id);
    if (!requests) return null;

    const now = Date.now();
    for (const [senderId, request] of requests) {
        if (request.expiresAt <= now) requests.delete(senderId);
    }
    if (requests.size === 0) {
        tpaRequests.delete(target.id);
        return null;
    }

    return [...requests.values()].sort((a, b) => b.expiresAt - a.expiresAt)[0] ?? null;
}

function removeTpaRequest(targetId, senderId) {
    const requests = tpaRequests.get(targetId);
    if (!requests) return;
    requests.delete(senderId);
    if (requests.size === 0) tpaRequests.delete(targetId);
}

function registerPlayerCommand(registry, name, description, callback, mandatoryParameters = [], optionalParameters = []) {
    registry.registerCommand({
        name,
        description,
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
        ...(mandatoryParameters.length ? { mandatoryParameters } : {}),
        ...(optionalParameters.length ? { optionalParameters } : {})
    }, callback);
}

function registerAdminTargetCommand(registry, name, description, action) {
    registry.registerCommand({
        name,
        description,
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false,
        optionalParameters: [{ type: CustomCommandParamType.String, name: "spieler" }]
    }, (origin, args) => {
        const admin = playerFrom(origin);
        if (!admin) return { status: CustomCommandStatus.Failure };

        const target = targetOrSelf(admin, args?.[0]);
        if (!target) {
            sendCommandError(admin, `Spieler "${args?.[0] ?? ""}" nicht gefunden.`);
            return { status: CustomCommandStatus.Failure };
        }

        system.run(() => action(admin, target));
        return { status: CustomCommandStatus.Success };
    });
}

function registerAdminPlayerCommand(registry, name, description, action) {
    registry.registerCommand({
        name,
        description,
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false,
        mandatoryParameters: [{ type: CustomCommandParamType.String, name: "spieler" }]
    }, (origin, args) => {
        const admin = playerFrom(origin);
        if (!admin) return { status: CustomCommandStatus.Failure };

        const target = findPlayer(args?.[0]);
        if (!target) {
            sendCommandError(admin, `Spieler "${args?.[0] ?? ""}" nicht gefunden.`);
            return { status: CustomCommandStatus.Failure };
        }

        system.run(() => action(admin, target));
        return { status: CustomCommandStatus.Success };
    });
}

system.runTimeout(loadPersistentState, 1);

world.afterEvents.entityDie?.subscribe?.((event) => {
    const player = event.deadEntity;
    if (player?.typeId !== "minecraft:player" || !player.isValid) return;

    deathPoints.set(player.id, {
        x: player.location.x,
        y: player.location.y,
        z: player.location.z,
        dimension: player.dimension.id,
        savedAt: Date.now()
    });
    saveDeaths();
});

world.afterEvents.playerLeave?.subscribe?.((event) => {
    if (event?.playerId) removePlayerRequests(event.playerId);
});

system.runInterval(() => {
    const now = Date.now();
    for (const [targetId, requests] of tpaRequests) {
        for (const [senderId, request] of requests) {
            if (request.expiresAt <= now) requests.delete(senderId);
        }
        if (requests.size === 0) tpaRequests.delete(targetId);
    }

    // Online targets can disappear without playerLeave being available on every API build.
    for (const [id, target] of lastMessagedPlayer) {
        if (!target || !world.getPlayers().some(player => player.id === target)) lastMessagedPlayer.delete(id);
    }
}, 20);

world.afterEvents.playerSpawn?.subscribe?.((event) => {
    if (!event?.initialSpawn) return;
    const player = event.player;
    system.run(() => {
        try {
            if (godMode.has(player.id)) {
                player.addEffect("resistance", 999999, { amplifier: 255, showParticles: false });
                player.addEffect("fire_resistance", 999999, { amplifier: 0, showParticles: false });
            }
        } catch {}
    });
});

world.afterEvents.playerSpawn?.subscribe?.((event) => {
    if (!event?.initialSpawn) return;
    const player = event.player;
    system.run(() => {
        try { player.sendMessage("§6[Siedler] §7Essentials bereit. Nutze §f/siedler:stats §7für das Dashboard."); } catch {}
    });
});

world.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;

    registerPlayerCommand(registry, "siedler:spawn", "Teleportiert dich zum Weltspawn.", (origin) => {
        const player = playerFrom(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        system.run(() => {
            try {
                const spawn = world.getDefaultSpawnLocation();
                player.teleport(spawn, { dimension: world.getDimension("overworld") });
                player.sendMessage("§aDu wurdest zum Spawn teleportiert.");
            } catch (error) {
                console.error(`[Essentials] Spawn-Teleport: ${error}`);
                sendCommandError(player, "Der Spawn konnte nicht erreicht werden.");
            }
        });
        return { status: CustomCommandStatus.Success };
    });

    registerPlayerCommand(registry, "siedler:sethome", "Setzt dein Zuhause.", (origin) => {
        const player = playerFrom(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        system.run(() => {
            const location = player.location;
            if (Math.abs(location.x) > MAX_HOME_DISTANCE || Math.abs(location.z) > MAX_HOME_DISTANCE) {
                sendCommandError(player, "Diese Position ist zu weit vom Weltzentrum entfernt.");
                return;
            }

            homes.set(player.id, {
                x: Math.floor(location.x) + 0.5,
                y: Math.floor(location.y),
                z: Math.floor(location.z) + 0.5,
                dimension: player.dimension.id,
                savedAt: Date.now()
            });

            player.sendMessage(saveHomes() ? "§aZuhause gesetzt." : "§cZuhause konnte nicht gespeichert werden.");
        });
        return { status: CustomCommandStatus.Success };
    });

    registerPlayerCommand(registry, "siedler:home", "Teleportiert dich nach Hause.", (origin) => {
        const player = playerFrom(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        system.run(() => {
            const home = getHome(player);
            if (!home) {
                sendCommandError(player, "Du hast noch kein Zuhause. Nutze /siedler:sethome.");
                return;
            }

            try {
                const dimension = world.getDimension(home.dimension || "minecraft:overworld");
                player.teleport({ x: home.x, y: home.y, z: home.z }, { dimension });
                player.sendMessage("§aWillkommen zu Hause.");
            } catch (error) {
                console.error(`[Essentials] Home-Teleport: ${error}`);
                sendCommandError(player, "Die Dimension deines Homes existiert nicht mehr.");
            }
        });
        return { status: CustomCommandStatus.Success };
    });

    registerPlayerCommand(registry, "siedler:delhome", "Löscht dein Zuhause.", (origin) => {
        const player = playerFrom(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        system.run(() => {
            if (!homes.delete(player.id)) {
                sendCommandError(player, "Du hast kein Zuhause.");
                return;
            }
            player.sendMessage(saveHomes() ? "§eZuhause gelöscht." : "§cÄnderung konnte nicht gespeichert werden.");
        });
        return { status: CustomCommandStatus.Success };
    });

    const playerParameter = [{ type: CustomCommandParamType.String, name: "spieler" }];

    registerPlayerCommand(registry, "siedler:tpa", "Sendet eine Teleport-Anfrage.", (origin, args) => {
        const player = playerFrom(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        const target = findPlayer(args?.[0]);
        if (!target) {
            sendCommandError(player, `Spieler "${args?.[0] ?? ""}" ist nicht online oder nicht eindeutig.`);
            return { status: CustomCommandStatus.Failure };
        }
        if (target.id === player.id) {
            sendCommandError(player, "Du kannst dir selbst keine Anfrage senden.");
            return { status: CustomCommandStatus.Failure };
        }

        system.run(() => {
            queueTpaRequest(player, target);
            player.sendMessage(`§aTeleport-Anfrage an ${target.name} gesendet. §7(60 Sekunden)`);
            target.sendMessage(`§e${player.name} möchte sich zu dir teleportieren.`);
            target.sendMessage("§7Nutze /siedler:tpaccept oder /siedler:tpdeny.");
        });
        return { status: CustomCommandStatus.Success };
    }, playerParameter);

    registerPlayerCommand(registry, "siedler:tpahere", "Fordert einen Spieler auf, sich zu dir zu teleportieren.", (origin, args) => {
        const player = playerFrom(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        const target = findPlayer(args?.[0]);
        if (!target) {
            sendCommandError(player, `Spieler "${args?.[0] ?? ""}" ist nicht online oder nicht eindeutig.`);
            return { status: CustomCommandStatus.Failure };
        }
        if (target.id === player.id) {
            sendCommandError(player, "Du kannst dir selbst keine Anfrage senden.");
            return { status: CustomCommandStatus.Failure };
        }

        system.run(() => {
            queueTpaRequest(target, player);
            player.sendMessage(`§aTeleport-Anfrage an ${target.name} gesendet.`);
            target.sendMessage(`§e${player.name} möchte, dass du dich zu ihm teleportierst.`);
            target.sendMessage("§7Nutze /siedler:tpaccept oder /siedler:tpdeny.");
        });
        return { status: CustomCommandStatus.Success };
    }, playerParameter);

    registerPlayerCommand(registry, "siedler:tpaccept", "Nimmt die letzte Teleport-Anfrage an.", (origin) => {
        const player = playerFrom(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        system.run(() => {
            const request = getLatestTpaRequest(player);
            if (!request) {
                sendCommandError(player, "Keine offene Teleport-Anfrage.");
                return;
            }

            const sender = findPlayer(request.from);
            if (!sender) {
                removeTpaRequest(player.id, request.from);
                sendCommandError(player, "Der anfragende Spieler ist nicht mehr online.");
                return;
            }

            try {
                sender.teleport(player.location, { dimension: player.dimension });
                sender.sendMessage(`§aDu wurdest zu ${player.name} teleportiert.`);
                player.sendMessage(`§a${sender.name} wurde zu dir teleportiert.`);
            } catch (error) {
                console.error(`[Essentials] TPA-Accept: ${error}`);
                sendCommandError(player, "Die Teleportation ist fehlgeschlagen.");
            }
            removeTpaRequest(player.id, request.from);
        });
        return { status: CustomCommandStatus.Success };
    });

    registerPlayerCommand(registry, "siedler:tpdeny", "Lehnt die letzte Teleport-Anfrage ab.", (origin) => {
        const player = playerFrom(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        system.run(() => {
            const request = getLatestTpaRequest(player);
            if (!request) {
                sendCommandError(player, "Keine offene Teleport-Anfrage.");
                return;
            }

            const sender = findPlayer(request.from);
            if (sender) sender.sendMessage(`§c${player.name} hat deine Teleport-Anfrage abgelehnt.`);
            removeTpaRequest(player.id, request.from);
            player.sendMessage("§eTeleport-Anfrage abgelehnt.");
        });
        return { status: CustomCommandStatus.Success };
    });

    registerPlayerCommand(registry, "siedler:msg", "Sendet eine private Nachricht.", (origin, args) => {
        const player = playerFrom(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        const target = findPlayer(args?.[0]);
        if (!target) {
            sendCommandError(player, `Spieler "${args?.[0] ?? ""}" ist nicht online oder nicht eindeutig.`);
            return { status: CustomCommandStatus.Failure };
        }

        const message = String(args?.[1] ?? "").trim();
        if (!message) {
            sendCommandError(player, "Die Nachricht darf nicht leer sein.");
            return { status: CustomCommandStatus.Failure };
        }

        system.run(() => {
            lastMessagedPlayer.set(player.id, target.id);
            lastMessagedPlayer.set(target.id, player.id);
            player.sendMessage(`§7[Ich → ${target.name}] §f${message}`);
            target.sendMessage(`§7[${player.name} → Mir] §f${message}`);
        });
        return { status: CustomCommandStatus.Success };
    }, [
        { type: CustomCommandParamType.String, name: "spieler" },
        { type: CustomCommandParamType.String, name: "nachricht" }
    ]);

    registerPlayerCommand(registry, "siedler:reply", "Antwortet dem letzten privaten Gesprächspartner.", (origin, args) => {
        const player = playerFrom(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        const targetId = lastMessagedPlayer.get(player.id);
        const target = findPlayer(targetId);
        const message = String(args?.[0] ?? "").trim();
        if (!target) {
            sendCommandError(player, "Kein erreichbarer Gesprächspartner vorhanden.");
            return { status: CustomCommandStatus.Failure };
        }
        if (!message) {
            sendCommandError(player, "Die Nachricht darf nicht leer sein.");
            return { status: CustomCommandStatus.Failure };
        }

        system.run(() => {
            lastMessagedPlayer.set(player.id, target.id);
            lastMessagedPlayer.set(target.id, player.id);
            player.sendMessage(`§7[Ich → ${target.name}] §f${message}`);
            target.sendMessage(`§7[${player.name} → Mir] §f${message}`);
        });
        return { status: CustomCommandStatus.Success };
    }, [{ type: CustomCommandParamType.String, name: "nachricht" }]);

    registerPlayerCommand(registry, "siedler:back", "Teleportiert dich zum letzten Todespunkt.", (origin) => {
        const player = playerFrom(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        system.run(() => {
            const death = deathPoints.get(player.id);
            if (!death) {
                sendCommandError(player, "Kein Todespunkt gespeichert.");
                return;
            }

            try {
                const dimension = world.getDimension(death.dimension || "minecraft:overworld");
                player.teleport({ x: death.x, y: death.y, z: death.z }, { dimension });
                player.sendMessage("§aZum letzten Todespunkt teleportiert.");
            } catch (error) {
                console.error(`[Essentials] Back-Teleport: ${error}`);
                sendCommandError(player, "Die Dimension des Todespunkts existiert nicht mehr.");
            }
        });
        return { status: CustomCommandStatus.Success };
    });

    registerAdminTargetCommand(registry, "siedler:admin_heal", "Heilt dich oder einen Spieler.", (admin, target) => {
        try {
            target.addEffect("instant_health", 1, { amplifier: 10, showParticles: false });
            target.addEffect("saturation", 1, { amplifier: 10, showParticles: false });
            target.sendMessage("§aDu wurdest geheilt.");
            if (target !== admin) admin.sendMessage(`§a${target.name} wurde geheilt.`);
        } catch (error) {
            console.error(`[Essentials] Heal: ${error}`);
            sendCommandError(admin, "Spieler konnte nicht geheilt werden.");
        }
    });

    registerAdminTargetCommand(registry, "siedler:admin_feed", "Füllt den Hunger eines Spielers.", (admin, target) => {
        try {
            target.addEffect("saturation", 1, { amplifier: 10, showParticles: false });
            target.sendMessage("§aHunger gefüllt.");
            if (target !== admin) admin.sendMessage(`§a${target.name} wurde gefüttert.`);
        } catch (error) {
            console.error(`[Essentials] Feed: ${error}`);
            sendCommandError(admin, "Spieler konnte nicht gefüttert werden.");
        }
    });

    registerAdminTargetCommand(registry, "siedler:admin_god", "Schaltet Godmode für dich oder einen Spieler um.", (admin, target) => {
        try {
            if (godMode.has(target.id)) {
                godMode.delete(target.id);
                target.removeEffect("resistance");
                target.removeEffect("fire_resistance");
                target.sendMessage("§eGodmode §cdeaktiviert§e.");
                if (target !== admin) admin.sendMessage(`§eGodmode für ${target.name} §cdeaktiviert§e.`);
            } else {
                godMode.add(target.id);
                target.addEffect("resistance", 999999, { amplifier: 255, showParticles: false });
                target.addEffect("fire_resistance", 999999, { amplifier: 0, showParticles: false });
                target.sendMessage("§eGodmode §aaktiviert§e.");
                if (target !== admin) admin.sendMessage(`§eGodmode für ${target.name} §aaktiviert§e.`);
            }
        } catch (error) {
            console.error(`[Essentials] Godmode: ${error}`);
            sendCommandError(admin, "Godmode konnte nicht geändert werden.");
        }
    });

    registerAdminTargetCommand(registry, "siedler:admin_fly", "Schaltet Flugmodus für dich oder einen Spieler um.", (admin, target) => {
        try {
            const enabled = flyMode.has(target.id);
            target.runCommand(`ability @s mayfly ${enabled ? "false" : "true"}`);
            if (enabled) {
                flyMode.delete(target.id);
                target.sendMessage("§eFlugmodus §cdeaktiviert§e.");
                if (target !== admin) admin.sendMessage(`§eFlugmodus für ${target.name} §cdeaktiviert§e.`);
            } else {
                flyMode.add(target.id);
                target.sendMessage("§eFlugmodus §aaktiviert§e.");
                if (target !== admin) admin.sendMessage(`§eFlugmodus für ${target.name} §aaktiviert§e.`);
            }
        } catch (error) {
            console.error(`[Essentials] Fly: ${error}`);
            sendCommandError(admin, "Der Flugmodus konnte nicht geändert werden.");
        }
    });

    registerAdminPlayerCommand(registry, "siedler:admin_kill", "Tötet einen Spieler.", (admin, target) => {
        try {
            target.kill();
            admin.sendMessage(`§c${target.name} wurde getötet.`);
        } catch (error) {
            console.error(`[Essentials] Kill: ${error}`);
            sendCommandError(admin, "Spieler konnte nicht getötet werden.");
        }
    });

    registerAdminPlayerCommand(registry, "siedler:admin_clear", "Leert das Inventar eines Spielers.", (admin, target) => {
        try {
            target.runCommand("clear @s");
            admin.sendMessage(`§aInventar von ${target.name} geleert.`);
        } catch (error) {
            console.error(`[Essentials] Clear: ${error}`);
            sendCommandError(admin, "Inventar konnte nicht geleert werden.");
        }
    });

    registry.registerCommand({ name: "siedler:admin_day", description: "Setzt die Zeit auf Tag.", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false }, () => {
        system.run(() => world.setTimeOfDay(1000));
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "siedler:admin_night", description: "Setzt die Zeit auf Nacht.", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false }, () => {
        system.run(() => world.setTimeOfDay(13000));
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "siedler:admin_sun", description: "Setzt klares Wetter.", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false }, () => {
        system.run(() => world.setWeather("Clear"));
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "siedler:admin_rain", description: "Setzt Regen.", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false }, () => {
        system.run(() => world.setWeather("Rain"));
        return { status: CustomCommandStatus.Success };
    });
});

console.info("[Siedler Logic] Essentials geladen.");

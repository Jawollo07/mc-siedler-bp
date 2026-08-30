import {
    system,
    world,
    CommandPermissionLevel,
    CustomCommandParamType,
    CustomCommandStatus
} from "@minecraft/server";

const homesKey = "homes";
const deathsKey = "death_points";
const homes = new Map();
const deathPoints = new Map();
const tpaRequests = new Map();
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
    try { world.setDynamicProperty(key, JSON.stringify(value)); return true; }
    catch (error) { console.error(`[Essentials] Fehler beim Speichern von ${key}: ${error}`); return false; }
}

function loadPersistentState() {
    homes.clear(); deathPoints.clear();
    for (const [name, value] of Object.entries(readObject(homesKey))) homes.set(name, value);
    for (const [name, value] of Object.entries(readObject(deathsKey))) deathPoints.set(name, value);
}
function saveHomes() { return writeObject(homesKey, Object.fromEntries(homes)); }
function saveDeaths() { return writeObject(deathsKey, Object.fromEntries(deathPoints)); }
function playerFrom(origin) { const player = origin?.sourceEntity; return player?.typeId === "minecraft:player" ? player : null; }
function findPlayer(name) { return world.getPlayers().find((player) => player.id === String(name ?? "")) ?? null; }
function targetOrSelf(player, name) { return name ? findPlayer(name) : player; }

system.runTimeout(loadPersistentState, 1);
world.afterEvents.entityDie?.subscribe?.((event) => {
    const player = event.deadEntity;
    if (player?.typeId !== "minecraft:player") return;
    deathPoints.set(player.id, { x: player.location.x, y: player.location.y, z: player.location.z, dimension: player.dimension.id, savedAt: Date.now() });
    saveDeaths();
});

system.runInterval(() => {
    const now = Date.now();
    for (const [targetName, request] of tpaRequests) if (request.expiresAt <= now) tpaRequests.delete(targetName);
}, 20);

system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;

    registry.registerCommand({ name: "siedler:spawn", description: "Teleportiert dich zum Weltspawn.", permissionLevel: CommandPermissionLevel.Any, cheatsRequired: false }, (origin) => {
        const player = playerFrom(origin); if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => { const spawn = world.getDefaultSpawnLocation(); player.teleport(spawn, { dimension: world.getDimension("overworld") }); player.sendMessage("§aDu wurdest zum Spawn teleportiert."); });
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "siedler:sethome", description: "Setzt dein Zuhause.", permissionLevel: CommandPermissionLevel.Any, cheatsRequired: false }, (origin) => {
        const player = playerFrom(origin); if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => { homes.set(player.id, { x: Math.floor(player.location.x) + 0.5, y: Math.floor(player.location.y), z: Math.floor(player.location.z) + 0.5, dimension: player.dimension.id }); player.sendMessage(saveHomes() ? "§aZuhause gesetzt!" : "§cZuhause konnte nicht gespeichert werden."); });
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "siedler:home", description: "Teleportiert dich nach Hause.", permissionLevel: CommandPermissionLevel.Any, cheatsRequired: false }, (origin) => {
        const player = playerFrom(origin); if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => { const home = homes.get(player.id); if (!home) { player.sendMessage("§cDu hast noch kein Zuhause. Nutze /siedler:sethome."); return; } try { const dimension = world.getDimension(home.dimension || "overworld"); player.teleport({ x: home.x, y: home.y, z: home.z }, { dimension }); player.sendMessage("§aWillkommen zu Hause!"); } catch { player.sendMessage("§cDie Dimension deines Homes existiert nicht mehr."); } });
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "siedler:delhome", description: "Löscht dein Zuhause.", permissionLevel: CommandPermissionLevel.Any, cheatsRequired: false }, (origin) => {
        const player = playerFrom(origin); if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => { if (!homes.delete(player.id)) { player.sendMessage("§cDu hast kein Zuhause."); return; } player.sendMessage(saveHomes() ? "§eZuhause gelöscht." : "§cÄnderung konnte nicht gespeichert werden."); });
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "siedler:tpa", description: "Sendet eine Teleport-Anfrage.", permissionLevel: CommandPermissionLevel.Any, cheatsRequired: false, mandatoryParameters: [{ type: CustomCommandParamType.String, name: "spieler" }] }, (origin, args) => {
        const player = playerFrom(origin); if (!player) return { status: CustomCommandStatus.Failure };
        const target = findPlayer(args[0]); if (!target) { player.sendMessage(`§cSpieler "${args[0]}" ist nicht online.`); return { status: CustomCommandStatus.Failure }; }
        if (target.id === player.id) { player.sendMessage("§cDu kannst dir selbst keine Anfrage senden."); return { status: CustomCommandStatus.Failure }; }
        system.run(() => { tpaRequests.set(target.id, { from: player.id, expiresAt: Date.now() + 60000 }); player.sendMessage(`§aTeleport-Anfrage an ${target.name} gesendet.`); target.sendMessage(`§e${player.name} möchte sich zu dir teleportieren.`); target.sendMessage("§7Nutze /siedler:tpaccept oder /siedler:tpdeny. Die Anfrage läuft nach 60 Sekunden ab."); });
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "siedler:tpaccept", description: "Nimmt eine Teleport-Anfrage an.", permissionLevel: CommandPermissionLevel.Any, cheatsRequired: false }, (origin) => {
        const player = playerFrom(origin); if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => { const request = tpaRequests.get(player.id); if (!request || request.expiresAt <= Date.now()) { tpaRequests.delete(player.id); player.sendMessage("§cKeine offene Teleport-Anfrage."); return; } const sender = findPlayer(request.from); if (!sender) { tpaRequests.delete(player.id); player.sendMessage("§cDer anfragende Spieler ist nicht mehr online."); return; } sender.teleport(player.location, { dimension: player.dimension }); sender.sendMessage(`§aDu wurdest zu ${player.name} teleportiert.`); player.sendMessage(`§a${sender.name} wurde zu dir teleportiert.`); tpaRequests.delete(player.id); });
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "siedler:tpdeny", description: "Lehnt eine Teleport-Anfrage ab.", permissionLevel: CommandPermissionLevel.Any, cheatsRequired: false }, (origin) => {
        const player = playerFrom(origin); if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => { const request = tpaRequests.get(player.id); if (!request) { player.sendMessage("§cKeine offene Teleport-Anfrage."); return; } findPlayer(request.from)?.sendMessage(`§c${player.name} hat deine Teleport-Anfrage abgelehnt.`); tpaRequests.delete(player.id); player.sendMessage("§eTeleport-Anfrage abgelehnt."); });
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "siedler:msg", description: "Sendet eine private Nachricht.", permissionLevel: CommandPermissionLevel.Any, cheatsRequired: false, mandatoryParameters: [{ type: CustomCommandParamType.String, name: "spieler" }, { type: CustomCommandParamType.String, name: "nachricht" }] }, (origin, args) => {
        const player = playerFrom(origin); if (!player) return { status: CustomCommandStatus.Failure };
        const target = findPlayer(args[0]); if (!target) { player.sendMessage(`§cSpieler "${args[0]}" ist nicht online.`); return { status: CustomCommandStatus.Failure }; }
        const message = String(args[1] ?? "").trim(); if (!message) { player.sendMessage("§cDie Nachricht darf nicht leer sein."); return { status: CustomCommandStatus.Failure }; }
        system.run(() => { player.sendMessage(`§7[Ich → ${target.name}] §f${message}`); target.sendMessage(`§7[${player.name} → Mir] §f${message}`); });
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "siedler:back", description: "Teleportiert dich zum letzten Todespunkt.", permissionLevel: CommandPermissionLevel.Any, cheatsRequired: false }, (origin) => {
        const player = playerFrom(origin); if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => { const death = deathPoints.get(player.id); if (!death) { player.sendMessage("§cKein Todespunkt gespeichert."); return; } try { const dimension = world.getDimension(death.dimension || "overworld"); player.teleport({ x: death.x, y: death.y, z: death.z }, { dimension }); player.sendMessage("§aZum letzten Todespunkt teleportiert."); } catch { player.sendMessage("§cDie Dimension des Todespunkts existiert nicht mehr."); } });
        return { status: CustomCommandStatus.Success };
    });

    const registerAdminTargetCommand = (name, description, action) => {
        registry.registerCommand({ name, description, permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false, optionalParameters: [{ type: CustomCommandParamType.String, name: "spieler" }] }, (origin, args) => {
            const player = playerFrom(origin); if (!player) return { status: CustomCommandStatus.Failure }; const target = targetOrSelf(player, args[0]); if (!target) { player.sendMessage(`§cSpieler "${args[0]}" nicht gefunden.`); return { status: CustomCommandStatus.Failure }; } system.run(() => action(player, target)); return { status: CustomCommandStatus.Success };
        });
    };

    registerAdminTargetCommand("siedler:admin_heal", "Heilt dich oder einen Spieler.", (admin, target) => { target.addEffect("instant_health", 1, { amplifier: 10, showParticles: false }); target.addEffect("saturation", 1, { amplifier: 10, showParticles: false }); target.sendMessage("§aDu wurdest geheilt."); if (target !== admin) admin.sendMessage(`§a${target.name} wurde geheilt.`); });
    registerAdminTargetCommand("siedler:admin_feed", "Füllt den Hunger.", (admin, target) => { target.addEffect("saturation", 1, { amplifier: 10, showParticles: false }); target.sendMessage("§aHunger gefüllt."); if (target !== admin) admin.sendMessage(`§a${target.name} wurde gefüttert.`); });

    registry.registerCommand({ name: "siedler:admin_god", description: "Schaltet Godmode um.", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false }, (origin) => {
        const player = playerFrom(origin); if (!player) return { status: CustomCommandStatus.Failure }; system.run(() => { if (godMode.has(player.id)) { godMode.delete(player.id); player.removeEffect("resistance"); player.removeEffect("fire_resistance"); player.sendMessage("§eGodmode §cdeaktiviert§e."); } else { godMode.add(player.id); player.addEffect("resistance", 999999, { amplifier: 255, showParticles: false }); player.addEffect("fire_resistance", 999999, { amplifier: 0, showParticles: false }); player.sendMessage("§eGodmode §aaktiviert§e."); } });
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "siedler:admin_fly", description: "Schaltet Flugmodus um.", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false }, (origin) => {
        const player = playerFrom(origin); if (!player) return { status: CustomCommandStatus.Failure }; system.run(() => { const enabled = flyMode.has(player.id); try { player.runCommand(`ability @s mayfly ${enabled ? "false" : "true"}`); if (enabled) { flyMode.delete(player.id); player.sendMessage("§eFlugmodus §cdeaktiviert§e."); } else { flyMode.add(player.id); player.sendMessage("§eFlugmodus §aaktiviert§e."); } } catch { player.sendMessage("§cDer Flugmodus konnte nicht geändert werden."); } });
        return { status: CustomCommandStatus.Success };
    });

    const registerAdminPlayerCommand = (name, description, action) => {
        registry.registerCommand({ name, description, permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false, mandatoryParameters: [{ type: CustomCommandParamType.String, name: "spieler" }] }, (origin, args) => {
            const player = playerFrom(origin); if (!player) return { status: CustomCommandStatus.Failure }; const target = findPlayer(args[0]); if (!target) { player.sendMessage(`§cSpieler "${args[0]}" nicht gefunden.`); return { status: CustomCommandStatus.Failure }; } system.run(() => action(player, target)); return { status: CustomCommandStatus.Success };
        });
    };

    registerAdminPlayerCommand("siedler:admin_kill", "Tötet einen Spieler.", (admin, target) => { try { target.kill(); admin.sendMessage(`§c${target.name} wurde getötet.`); } catch { admin.sendMessage("§cSpieler konnte nicht getötet werden."); } });
    registerAdminPlayerCommand("siedler:admin_clear", "Leert das Inventar eines Spielers.", (admin, target) => { try { target.runCommand("clear @s"); admin.sendMessage(`§aInventar von ${target.name} geleert.`); } catch { admin.sendMessage("§cInventar konnte nicht geleert werden."); } });

    registry.registerCommand({ name: "siedler:admin_day", description: "Setzt die Zeit auf Tag.", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false }, () => { system.run(() => world.setTimeOfDay(1000)); return { status: CustomCommandStatus.Success }; });
    registry.registerCommand({ name: "siedler:admin_night", description: "Setzt die Zeit auf Nacht.", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false }, () => { system.run(() => world.setTimeOfDay(13000)); return { status: CustomCommandStatus.Success }; });
    registry.registerCommand({ name: "siedler:admin_sun", description: "Setzt klares Wetter.", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false }, () => { system.run(() => world.setWeather("Clear")); return { status: CustomCommandStatus.Success }; });
    registry.registerCommand({ name: "siedler:admin_rain", description: "Setzt Regen.", permissionLevel: CommandPermissionLevel.GameDirectors, cheatsRequired: false }, () => { system.run(() => world.setWeather("Rain")); return { status: CustomCommandStatus.Success }; });
});

console.info("§a[Siedler Logic] Essentials geladen.");

import {
    system,
    world,
    CommandPermissionLevel,
    CustomCommandParamType,
    CustomCommandStatus
} from "@minecraft/server";
import { createLogger } from "../core/logger.js";
import {
    TPA_TIMEOUT,
    MAX_HOME_DISTANCE,
    homes,
    deathPoints,
    tpaRequests,
    lastMessagedPlayer,
    getHome,
    queueTpaRequest,
    getLatestTpaRequest,
    removeTpaRequest,
    removePlayerRequests
} from "./state.js";
import { loadPersistentState, saveHomes, saveDeaths } from "./storage.js";
import { playerFrom, findPlayer, sendCommandError } from "./players.js";

const logger = createLogger("Essentials:Teleport");

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

export function registerTeleportCommands(registry) {
    const playerParameter = [{ type: CustomCommandParamType.String, name: "spieler" }];

    registerPlayerCommand(registry, "siedler:spawn", "Teleportiert dich zum Weltspawn.", (origin) => {
        const player = playerFrom(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => {
            try {
                const spawn = world.getDefaultSpawnLocation();
                player.teleport(spawn, { dimension: world.getDimension("overworld") });
                logger.info(`${player.name} teleportiert sich zum Weltspawn.`);
                player.sendMessage("§aDu wurdest zum Spawn teleportiert.");
            } catch (error) {
                logger.exception(`Spawn-Teleport fehlgeschlagen für ${player.name}`, error);
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
                logger.warn(`${player.name} konnte keinen Home setzen: Position außerhalb des Limits.`);
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
            const saved = saveHomes();
            logger.info(`Home gesetzt: ${player.name} @ ${Math.floor(location.x)},${Math.floor(location.y)},${Math.floor(location.z)} (${player.dimension.id}), gespeichert=${saved}.`);
            player.sendMessage(saved ? "§aZuhause gesetzt." : "§cZuhause konnte nicht gespeichert werden.");
        });
        return { status: CustomCommandStatus.Success };
    });

    registerPlayerCommand(registry, "siedler:home", "Teleportiert dich nach Hause.", (origin) => {
        const player = playerFrom(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => {
            const home = getHome(player);
            if (!home) {
                logger.debug(`${player.name} wollte /home verwenden, hat aber keinen Home.`);
                sendCommandError(player, "Du hast noch kein Zuhause. Nutze /siedler:sethome.");
                return;
            }
            try {
                const dimension = world.getDimension(home.dimension || "minecraft:overworld");
                player.teleport({ x: home.x, y: home.y, z: home.z }, { dimension });
                logger.info(`${player.name} teleportiert zu Home @ ${home.x},${home.y},${home.z} (${home.dimension}).`);
                player.sendMessage("§aWillkommen zu Hause.");
            } catch (error) {
                logger.exception(`Home-Teleport fehlgeschlagen für ${player.name}`, error);
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
                logger.debug(`${player.name} wollte einen nicht vorhandenen Home löschen.`);
                sendCommandError(player, "Du hast kein Zuhause.");
                return;
            }
            const saved = saveHomes();
            logger.info(`Home gelöscht: ${player.name}, gespeichert=${saved}.`);
            player.sendMessage(saved ? "§eZuhause gelöscht." : "§cÄnderung konnte nicht gespeichert werden.");
        });
        return { status: CustomCommandStatus.Success };
    });

    registerPlayerCommand(registry, "siedler:tpa", "Sendet eine Teleport-Anfrage.", (origin, args) => {
        const player = playerFrom(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        const target = findPlayer(args?.[0]);
        if (!target) {
            logger.warn(`TPA abgelehnt: ${player.name} -> "${args?.[0] ?? ""}" nicht gefunden/eindeutig.`);
            sendCommandError(player, `Spieler "${args?.[0] ?? ""}" ist nicht online oder nicht eindeutig.`);
            return { status: CustomCommandStatus.Failure };
        }
        if (target.id === player.id) {
            sendCommandError(player, "Du kannst dir selbst keine Anfrage senden.");
            return { status: CustomCommandStatus.Failure };
        }
        system.run(() => {
            queueTpaRequest(player, target);
            logger.info(`TPA erstellt: ${player.name} -> ${target.name}, Ablauf in ${TPA_TIMEOUT / 1000}s.`);
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
            logger.warn(`TPAHere abgelehnt: ${player.name} -> "${args?.[0] ?? ""}" nicht gefunden/eindeutig.`);
            sendCommandError(player, `Spieler "${args?.[0] ?? ""}" ist nicht online oder nicht eindeutig.`);
            return { status: CustomCommandStatus.Failure };
        }
        if (target.id === player.id) {
            sendCommandError(player, "Du kannst dir selbst keine Anfrage senden.");
            return { status: CustomCommandStatus.Failure };
        }
        system.run(() => {
            queueTpaRequest(target, player);
            logger.info(`TPAHere erstellt: ${target.name} -> ${player.name}, Ablauf in ${TPA_TIMEOUT / 1000}s.`);
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
                logger.debug(`${player.name}: keine TPA zum Akzeptieren.`);
                sendCommandError(player, "Keine offene Teleport-Anfrage.");
                return;
            }
            const sender = findPlayer(request.from);
            if (!sender) {
                removeTpaRequest(player.id, request.from);
                logger.warn(`TPA verworfen: Anfragender ${request.from} ist nicht mehr online.`);
                sendCommandError(player, "Der anfragende Spieler ist nicht mehr online.");
                return;
            }
            try {
                sender.teleport(player.location, { dimension: player.dimension });
                logger.info(`TPA akzeptiert: ${sender.name} -> ${player.name}.`);
                sender.sendMessage(`§aDu wurdest zu ${player.name} teleportiert.`);
                player.sendMessage(`§a${sender.name} wurde zu dir teleportiert.`);
            } catch (error) {
                logger.exception(`TPA-Accept fehlgeschlagen: ${sender.name} -> ${player.name}`, error);
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
                logger.debug(`${player.name}: keine TPA zum Ablehnen.`);
                sendCommandError(player, "Keine offene Teleport-Anfrage.");
                return;
            }
            const sender = findPlayer(request.from);
            if (sender) sender.sendMessage(`§c${player.name} hat deine Teleport-Anfrage abgelehnt.`);
            logger.info(`TPA abgelehnt: ${request.from} -> ${player.name}.`);
            removeTpaRequest(player.id, request.from);
            player.sendMessage("§eTeleport-Anfrage abgelehnt.");
        });
        return { status: CustomCommandStatus.Success };
    });

    registerPlayerCommand(registry, "siedler:back", "Teleportiert dich zum letzten Todespunkt.", (origin) => {
        const player = playerFrom(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => {
            const death = deathPoints.get(player.id);
            if (!death) {
                logger.debug(`${player.name} wollte /back nutzen, aber kein Todespunkt vorhanden.`);
                sendCommandError(player, "Kein Todespunkt gespeichert.");
                return;
            }
            try {
                const dimension = world.getDimension(death.dimension || "minecraft:overworld");
                player.teleport({ x: death.x, y: death.y, z: death.z }, { dimension });
                logger.info(`${player.name} teleportiert zum Todespunkt @ ${death.x},${death.y},${death.z} (${death.dimension}).`);
                player.sendMessage("§aZum letzten Todespunkt teleportiert.");
            } catch (error) {
                logger.exception(`Back-Teleport fehlgeschlagen für ${player.name}`, error);
                sendCommandError(player, "Die Dimension des Todespunkts existiert nicht mehr.");
            }
        });
        return { status: CustomCommandStatus.Success };
    });
}

export function registerTeleportEvents() {
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
        const saved = saveDeaths();
        logger.info(`Todespunkt gespeichert: ${player.name} @ ${Math.floor(player.location.x)},${Math.floor(player.location.y)},${Math.floor(player.location.z)} (${player.dimension.id}), gespeichert=${saved}.`);
    });

    world.afterEvents.playerLeave?.subscribe?.((event) => {
        if (!event?.playerId) return;
        const removed = removePlayerRequests(event.playerId);
        logger.debug(`Spieler verlassen: ${event.playerId}; ${removed} TPA-Referenzen bereinigt.`);
    });

    system.runInterval(() => {
        const now = Date.now();
        let expired = 0;
        for (const [targetId, requests] of tpaRequests) {
            for (const [senderId, request] of requests) {
                if (request.expiresAt <= now) {
                    requests.delete(senderId);
                    expired++;
                }
            }
            if (requests.size === 0) tpaRequests.delete(targetId);
        }
        for (const [id, target] of lastMessagedPlayer) {
            if (!target || !world.getPlayers().some(player => player.id === target)) lastMessagedPlayer.delete(id);
        }
        if (expired > 0) logger.debug(`${expired} TPA-Anfragen abgelaufen.`);
    }, 20);
}

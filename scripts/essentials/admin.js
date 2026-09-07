import {
    system,
    world,
    CommandPermissionLevel,
    CustomCommandParamType,
    CustomCommandStatus
} from "@minecraft/server";
import { createLogger } from "../core/logger.js";
import { godMode, flyMode } from "./state.js";
import { playerFrom, findPlayer, targetOrSelf, sendCommandError } from "./players.js";

const logger = createLogger("Essentials:Admin");

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
            logger.warn(`Admin ${admin.name}: Ziel "${args?.[0] ?? ""}" nicht gefunden.`);
            sendCommandError(admin, `Spieler "${args?.[0] ?? ""}" nicht gefunden.`);
            return { status: CustomCommandStatus.Failure };
        }

        logger.debug(`Admin-Aktion ${name}: ${admin.name} -> ${target.name}.`);
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
            logger.warn(`Admin ${admin.name}: Ziel "${args?.[0] ?? ""}" nicht gefunden.`);
            sendCommandError(admin, `Spieler "${args?.[0] ?? ""}" nicht gefunden.`);
            return { status: CustomCommandStatus.Failure };
        }

        logger.debug(`Admin-Aktion ${name}: ${admin.name} -> ${target.name}.`);
        system.run(() => action(admin, target));
        return { status: CustomCommandStatus.Success };
    });
}

export function registerAdminCommands(registry) {
    registerAdminTargetCommand(registry, "siedler:admin_heal", "Heilt dich oder einen Spieler.", (admin, target) => {
        try {
            target.addEffect("instant_health", 1, { amplifier: 10, showParticles: false });
            target.addEffect("saturation", 1, { amplifier: 10, showParticles: false });
            logger.info(`Heal: ${admin.name} -> ${target.name}.`);
            target.sendMessage("§aDu wurdest geheilt.");
            if (target !== admin) admin.sendMessage(`§a${target.name} wurde geheilt.`);
        } catch (error) {
            logger.exception(`Heal fehlgeschlagen: ${admin.name} -> ${target.name}`, error);
            sendCommandError(admin, "Spieler konnte nicht geheilt werden.");
        }
    });

    registerAdminTargetCommand(registry, "siedler:admin_feed", "Füllt den Hunger eines Spielers.", (admin, target) => {
        try {
            target.addEffect("saturation", 1, { amplifier: 10, showParticles: false });
            logger.info(`Feed: ${admin.name} -> ${target.name}.`);
            target.sendMessage("§aHunger gefüllt.");
            if (target !== admin) admin.sendMessage(`§a${target.name} wurde gefüttert.`);
        } catch (error) {
            logger.exception(`Feed fehlgeschlagen: ${admin.name} -> ${target.name}`, error);
            sendCommandError(admin, "Spieler konnte nicht gefüttert werden.");
        }
    });

    registerAdminTargetCommand(registry, "siedler:admin_god", "Schaltet Godmode für dich oder einen Spieler um.", (admin, target) => {
        try {
            if (godMode.has(target.id)) {
                godMode.delete(target.id);
                target.removeEffect("resistance");
                target.removeEffect("fire_resistance");
                logger.info(`Godmode deaktiviert: ${admin.name} -> ${target.name}.`);
                target.sendMessage("§eGodmode §cdeaktiviert§e.");
                if (target !== admin) admin.sendMessage(`§eGodmode für ${target.name} §cdeaktiviert§e.`);
            } else {
                godMode.add(target.id);
                target.addEffect("resistance", 999999, { amplifier: 255, showParticles: false });
                target.addEffect("fire_resistance", 999999, { amplifier: 0, showParticles: false });
                logger.info(`Godmode aktiviert: ${admin.name} -> ${target.name}.`);
                target.sendMessage("§eGodmode §aaktiviert§e.");
                if (target !== admin) admin.sendMessage(`§eGodmode für ${target.name} §aaktiviert§e.`);
            }
        } catch (error) {
            logger.exception(`Godmode fehlgeschlagen: ${admin.name} -> ${target.name}`, error);
            sendCommandError(admin, "Godmode konnte nicht geändert werden.");
        }
    });

    registerAdminTargetCommand(registry, "siedler:admin_fly", "Schaltet Flugmodus für dich oder einen Spieler um.", (admin, target) => {
        try {
            const enabled = flyMode.has(target.id);
            target.runCommand(`ability @s mayfly ${enabled ? "false" : "true"}`);
            if (enabled) {
                flyMode.delete(target.id);
                logger.info(`Flugmodus deaktiviert: ${admin.name} -> ${target.name}.`);
                target.sendMessage("§eFlugmodus §cdeaktiviert§e.");
                if (target !== admin) admin.sendMessage(`§eFlugmodus für ${target.name} §cdeaktiviert§e.`);
            } else {
                flyMode.add(target.id);
                logger.info(`Flugmodus aktiviert: ${admin.name} -> ${target.name}.`);
                target.sendMessage("§eFlugmodus §aaktiviert§e.");
                if (target !== admin) admin.sendMessage(`§eFlugmodus für ${target.name} §aaktiviert§e.`);
            }
        } catch (error) {
            logger.exception(`Fly fehlgeschlagen: ${admin.name} -> ${target.name}`, error);
            sendCommandError(admin, "Der Flugmodus konnte nicht geändert werden.");
        }
    });

    registerAdminPlayerCommand(registry, "siedler:admin_kill", "Tötet einen Spieler.", (admin, target) => {
        try {
            target.kill();
            logger.info(`Kill: ${admin.name} -> ${target.name}.`);
            admin.sendMessage(`§c${target.name} wurde getötet.`);
        } catch (error) {
            logger.exception(`Kill fehlgeschlagen: ${admin.name} -> ${target.name}`, error);
            sendCommandError(admin, "Spieler konnte nicht getötet werden.");
        }
    });

    registerAdminPlayerCommand(registry, "siedler:admin_clear", "Leert das Inventar eines Spielers.", (admin, target) => {
        try {
            target.runCommand("clear @s");
            logger.info(`Clear: ${admin.name} -> ${target.name}.`);
            admin.sendMessage(`§aInventar von ${target.name} geleert.`);
        } catch (error) {
            logger.exception(`Clear fehlgeschlagen: ${admin.name} -> ${target.name}`, error);
            sendCommandError(admin, "Inventar konnte nicht geleert werden.");
        }
    });

    const simpleAdminCommands = [
        ["siedler:admin_day", "Setzt die Zeit auf Tag.", () => world.setTimeOfDay(1000), "Tag"],
        ["siedler:admin_night", "Setzt die Zeit auf Nacht.", () => world.setTimeOfDay(13000), "Nacht"],
        ["siedler:admin_sun", "Setzt klares Wetter.", () => world.setWeather("Clear"), "Klares Wetter"],
        ["siedler:admin_rain", "Setzt Regen.", () => world.setWeather("Rain"), "Regen"]
    ];

    for (const [name, description, action, label] of simpleAdminCommands) {
        registry.registerCommand({
            name,
            description,
            permissionLevel: CommandPermissionLevel.GameDirectors,
            cheatsRequired: false
        }, () => {
            system.run(() => {
                try {
                    action();
                    logger.info(`Admin-Weltaktion: ${label}.`);
                } catch (error) {
                    logger.exception(`Admin-Weltaktion fehlgeschlagen: ${label}`, error);
                }
            });
            return { status: CustomCommandStatus.Success };
        });
    }
}

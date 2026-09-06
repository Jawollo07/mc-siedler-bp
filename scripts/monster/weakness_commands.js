import {
    system,
    CustomCommandParamType,
    CustomCommandStatus,
    CommandPermissionLevel
} from "@minecraft/server";

import {
    MONSTER_CONFIG,
    saveMonsterConfig
} from "./index.js";

const OP_PERMISSION = CommandPermissionLevel.GameDirectors;

function playerOnly(origin) {
    try {
        const player = origin.sourceEntity;
        return player?.typeId === "minecraft:player" ? player : null;
    } catch {
        return null;
    }
}

function reply(player, message) {
    try {
        player.sendMessage(`§8[§cMonster§8]§r ${message}`);
    } catch {}
}

function saveAndReply(player, message) {
    const saved = saveMonsterConfig();
    reply(player, saved ? message : `${message} §cSpeichern fehlgeschlagen.`);
}

function registerCommand(registry, definition, handler) {
    registry.registerCommand(
        {
            permissionLevel: OP_PERMISSION,
            cheatsRequired: false,
            ...definition
        },
        handler
    );
}

system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;

    registerCommand(
        registry,
        {
            name: "siedler:weakness_status",
            description: "Zeigt den Status der permanenten Weakness."
        },
        (origin) => {
            const player = playerOnly(origin);
            if (!player) return { status: CustomCommandStatus.Failure };

            const cfg = MONSTER_CONFIG.weakness ?? {};
            reply(player, `§7Weakness: ${cfg.enabled ? "§aAN" : "§cAUS"}`);
            reply(player, `§7Level/Amplifier: §e${Number(cfg.level) || 0}`);
            reply(player, `§7Dauer: §e${Number(cfg.duration) || 0} Ticks`);
            reply(player, `§7Erneuerung: §e${Number(cfg.interval) || 0} Ticks`);
            reply(player, "§7Gilt für §eMobs §7und §ePvP§7.");

            return { status: CustomCommandStatus.Success };
        }
    );

    registerCommand(
        registry,
        {
            name: "siedler:weakness_on",
            description: "Aktiviert die permanente Weakness für Spieler."
        },
        (origin) => {
            const player = playerOnly(origin);
            if (!player) return { status: CustomCommandStatus.Failure };

            system.run(() => {
                if (!MONSTER_CONFIG.weakness) MONSTER_CONFIG.weakness = {};
                MONSTER_CONFIG.weakness.enabled = true;
                saveAndReply(player, "§aPermanente Weakness aktiviert (Mobs + PvP).");
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    registerCommand(
        registry,
        {
            name: "siedler:weakness_off",
            description: "Deaktiviert die permanente Weakness für Spieler."
        },
        (origin) => {
            const player = playerOnly(origin);
            if (!player) return { status: CustomCommandStatus.Failure };

            system.run(() => {
                if (!MONSTER_CONFIG.weakness) MONSTER_CONFIG.weakness = {};
                MONSTER_CONFIG.weakness.enabled = false;
                saveAndReply(player, "§cPermanente Weakness deaktiviert.");
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    registerCommand(
        registry,
        {
            name: "siedler:weakness_level",
            description: "Setzt den Weakness-Amplifier (0-255).",
            mandatoryParameters: [
                { type: CustomCommandParamType.Integer, name: "level" }
            ]
        },
        (origin, args) => {
            const player = playerOnly(origin);
            if (!player) return { status: CustomCommandStatus.Failure };

            const level = Math.max(0, Math.min(255, Number(args[0])));
            if (!Number.isFinite(level)) {
                reply(player, "§cLevel muss eine Zahl zwischen 0 und 255 sein.");
                return { status: CustomCommandStatus.Failure };
            }

            system.run(() => {
                if (!MONSTER_CONFIG.weakness) MONSTER_CONFIG.weakness = {};
                MONSTER_CONFIG.weakness.level = Math.floor(level);
                saveAndReply(player, `§aWeakness-Amplifier auf §e${Math.floor(level)} §agesetzt.`);
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    registerCommand(
        registry,
        {
            name: "siedler:weakness_duration",
            description: "Setzt die Weakness-Dauer in Ticks.",
            mandatoryParameters: [
                { type: CustomCommandParamType.Integer, name: "ticks" }
            ]
        },
        (origin, args) => {
            const player = playerOnly(origin);
            if (!player) return { status: CustomCommandStatus.Failure };

            const ticks = Math.max(1, Math.min(72000, Number(args[0])));
            if (!Number.isFinite(ticks)) {
                reply(player, "§cDauer muss eine Zahl zwischen 1 und 72000 sein.");
                return { status: CustomCommandStatus.Failure };
            }

            system.run(() => {
                if (!MONSTER_CONFIG.weakness) MONSTER_CONFIG.weakness = {};
                MONSTER_CONFIG.weakness.duration = Math.floor(ticks);
                saveAndReply(player, `§aWeakness-Dauer auf §e${Math.floor(ticks)} §aTicks gesetzt.`);
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    registerCommand(
        registry,
        {
            name: "siedler:weakness_interval",
            description: "Setzt das Erneuerungsintervall der Weakness in Ticks.",
            mandatoryParameters: [
                { type: CustomCommandParamType.Integer, name: "ticks" }
            ]
        },
        (origin, args) => {
            const player = playerOnly(origin);
            if (!player) return { status: CustomCommandStatus.Failure };

            const ticks = Math.max(1, Math.min(72000, Number(args[0])));
            if (!Number.isFinite(ticks)) {
                reply(player, "§cIntervall muss eine Zahl zwischen 1 und 72000 sein.");
                return { status: CustomCommandStatus.Failure };
            }

            system.run(() => {
                if (!MONSTER_CONFIG.weakness) MONSTER_CONFIG.weakness = {};
                MONSTER_CONFIG.weakness.interval = Math.floor(ticks);
                saveAndReply(player, `§aWeakness-Erneuerung auf §e${Math.floor(ticks)} §aTicks gesetzt.`);
            });

            return { status: CustomCommandStatus.Success };
        }
    );
});

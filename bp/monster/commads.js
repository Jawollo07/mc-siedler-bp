import { 
    system, 
    world, 
    CommandPermissionLevel, 
    CustomCommandParamType,
    CustomCommandStatus 
} from "@minecraft/server";

import { MONSTER_CONFIG, saveMonsterConfig, loadMonsterConfig } from "./index.js";
import { DEFAULT_CONFIG } from "./config.js";

system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;

    // ==========================================
    // /monster:set <key> <value>
    // ==========================================
    registry.registerCommand(
        {
            name: "monster:set",
            description: "Setzt eine Monster-Config Einstellung.",
            permissionLevel: CommandPermissionLevel.Operator,
            cheatsRequired: false,
            mandatoryParameters: [
                { type: CustomCommandParamType.String, name: "key" },
                { type: CustomCommandParamType.String, name: "value" }
            ]
        },
        (origin, args) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };

            const key = args[0];
            let value = args[1];

            system.run(() => {
                // Boolean
                if (value === "true") value = true;
                else if (value === "false") value = false;
                // Number
                else if (!isNaN(Number(value))) value = Number(value);

                if (!(key in MONSTER_CONFIG)) {
                    player.sendMessage(`§cUnbekannter Key: ${key}`);
                    player.sendMessage("§7Nutze /monster:list um alle Keys zu sehen.");
                    return;
                }

                // Verschachtelte Objekte nicht direkt überschreiben
                if (typeof MONSTER_CONFIG[key] === "object") {
                    player.sendMessage(`§c"${key}" ist ein Objekt. Nutze /monster:mob oder /monster:chance`);
                    return;
                }

                MONSTER_CONFIG[key] = value;
                saveMonsterConfig();
                player.sendMessage(`§a${key} §7wurde auf §e${value} §7gesetzt.`);
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    // ==========================================
    // /monster:mob <type> <true|false>
    // ==========================================
    registry.registerCommand(
        {
            name: "monster:mob",
            description: "Aktiviert/Deaktiviert ein Monster.",
            permissionLevel: CommandPermissionLevel.Operator,
            cheatsRequired: false,
            mandatoryParameters: [
                { type: CustomCommandParamType.String, name: "type" },
                { type: CustomCommandParamType.String, name: "enabled" }
            ]
        },
        (origin, args) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };

            const type = args[0].startsWith("minecraft:") ? args[0] : `minecraft:${args[0]}`;
            const enabled = args[1] === "true";

            system.run(() => {
                MONSTER_CONFIG.allowedMobs[type] = enabled;
                saveMonsterConfig();
                player.sendMessage(`§a${type} §7ist jetzt §e${enabled ? "erlaubt" : "blockiert"}§7.`);
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    // ==========================================
    // /monster:chance <type> <zahl>
    // ==========================================
    registry.registerCommand(
        {
            name: "monster:chance",
            description: "Setzt die Spawn-Chance eines Monsters.",
            permissionLevel: CommandPermissionLevel.Operator,
            cheatsRequired: false,
            mandatoryParameters: [
                { type: CustomCommandParamType.String, name: "type" },
                { type: CustomCommandParamType.Float, name: "chance" }
            ]
        },
        (origin, args) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };

            const type = args[0].startsWith("minecraft:") ? args[0] : `minecraft:${args[0]}`;
            const chance = args[1];

            system.run(() => {
                MONSTER_CONFIG.spawnChances[type] = chance;
                saveMonsterConfig();
                player.sendMessage(`§aSpawn-Chance von ${type} §7auf §e${chance} §7gesetzt.`);
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    // ==========================================
    // /monster:list
    // ==========================================
    registry.registerCommand(
        {
            name: "monster:list",
            description: "Zeigt die aktuelle Monster-Config.",
            permissionLevel: CommandPermissionLevel.Operator,
            cheatsRequired: false
        },
        (origin) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };

            system.run(() => {
                player.sendMessage("§6--- Monster Config ---");
                player.sendMessage(`§7enabled: §e${MONSTER_CONFIG.enabled}`);
                player.sendMessage(`§7globalSpawnRate: §e${MONSTER_CONFIG.globalSpawnRate}`);
                player.sendMessage(`§7nightSpawnMultiplier: §e${MONSTER_CONFIG.nightSpawnMultiplier}`);
                player.sendMessage(`§7maxMonstersNearPlayer: §e${MONSTER_CONFIG.maxMonstersNearPlayer}`);
                player.sendMessage(`§7claimSpawnMultiplier: §e${MONSTER_CONFIG.claimSpawnMultiplier}`);
                player.sendMessage(`§7giveWeakness: §e${MONSTER_CONFIG.giveWeakness}`);
                player.sendMessage(`§7weaknessLevel: §e${MONSTER_CONFIG.weaknessLevel}`);
                player.sendMessage("§7Nutze /monster:set <key> <value>");
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    // ==========================================
    // /monster:reset
    // ==========================================
    registry.registerCommand(
        {
            name: "monster:reset",
            description: "Setzt die Monster-Config auf Standard zurück.",
            permissionLevel: CommandPermissionLevel.Operator,
            cheatsRequired: false
        },
        (origin) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };

            system.run(() => {
                // Alle Keys zurücksetzen
                for (const key of Object.keys(DEFAULT_CONFIG)) {
                    MONSTER_CONFIG[key] = DEFAULT_CONFIG[key];
                }
                // Objekte neu kopieren
                MONSTER_CONFIG.allowedMobs = { ...DEFAULT_CONFIG.allowedMobs };
                MONSTER_CONFIG.spawnChances = { ...DEFAULT_CONFIG.spawnChances };

                saveMonsterConfig();
                player.sendMessage("§aMonster-Config wurde zurückgesetzt.");
            });

            return { status: CustomCommandStatus.Success };
        }
    );
});
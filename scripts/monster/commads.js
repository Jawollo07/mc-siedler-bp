import {
    system,
    CommandPermissionLevel,
    CustomCommandParamType,
    CustomCommandStatus
} from "@minecraft/server";
import { MONSTER_CONFIG, saveMonsterConfig, loadMonsterConfig } from "./index.js";
import { DEFAULT_CONFIG } from "./config.js";

// In @minecraft/server 2.x ist "Operator" kein Enum-Wert mehr.
// GameDirectors = 1 entspricht der OP-Ebene und funktioniert auch auf Dedicated Servern.
const OP_PERMISSION = 1;

const playerOnly = (origin) => {
    const player = origin.sourceEntity;
    return player?.typeId === "minecraft:player" ? player : null;
};

const mobId = (value) => String(value ?? "").startsWith("minecraft:")
    ? String(value)
    : `minecraft:${value}`;

const clamp01 = (value) => Math.min(1, Math.max(0, Number(value)));

system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;

    registry.registerCommand({ name: "monster:set", description: "Setzt eine einfache Monster-Config Einstellung.", permissionLevel: OP_PERMISSION, cheatsRequired: false, mandatoryParameters: [{ type: CustomCommandParamType.String, name: "key" }, { type: CustomCommandParamType.String, name: "value" }] }, (origin, args) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        const key = String(args[0] ?? "");
        const raw = String(args[1] ?? "");
        system.run(() => {
            if (!(key in MONSTER_CONFIG) || typeof MONSTER_CONFIG[key] === "object") {
                player.sendMessage(`§cUnbekannter oder verschachtelter Key: ${key}`);
                player.sendMessage("§7Nutze /monster:mob oder /monster:chance für verschachtelte Werte.");
                return;
            }
            let value;
            if (raw === "true" || raw === "false") value = raw === "true";
            else if (raw !== "" && Number.isFinite(Number(raw))) value = Number(raw);
            else value = raw;
            if (typeof MONSTER_CONFIG[key] === "number") {
                if (!Number.isFinite(value)) { player.sendMessage("§cDer Wert muss eine Zahl sein."); return; }
                if (["globalSpawnRate", "nightSpawnMultiplier"].includes(key)) value = Math.max(0, Number(value));
                if (key === "weaknessLevel") value = Math.max(0, Math.min(255, Math.floor(Number(value))));
                if (key === "weaknessDuration") value = Math.max(1, Math.floor(Number(value)));
            }
            MONSTER_CONFIG[key] = value;
            player.sendMessage(saveMonsterConfig() ? `§a${key} §7wurde auf §e${value} §7gesetzt.` : "§cDie Config konnte nicht gespeichert werden.");
        });
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "monster:mob", description: "Aktiviert oder deaktiviert ein Monster.", permissionLevel: OP_PERMISSION, cheatsRequired: false, mandatoryParameters: [{ type: CustomCommandParamType.String, name: "type" }, { type: CustomCommandParamType.String, name: "enabled" }] }, (origin, args) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        const type = mobId(args[0]);
        const raw = String(args[1] ?? "").toLowerCase();
        if (raw !== "true" && raw !== "false") { player.sendMessage("§cNutze true oder false."); return { status: CustomCommandStatus.Failure }; }
        system.run(() => {
            MONSTER_CONFIG.allowedMobs[type] = raw === "true";
            player.sendMessage(saveMonsterConfig() ? `§a${type} §7ist jetzt §e${raw === "true" ? "erlaubt" : "blockiert"}§7.` : "§cDie Config konnte nicht gespeichert werden.");
        });
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "monster:chance", description: "Setzt die Spawn-Chance eines Monsters von 0 bis 1.", permissionLevel: OP_PERMISSION, cheatsRequired: false, mandatoryParameters: [{ type: CustomCommandParamType.String, name: "type" }, { type: CustomCommandParamType.Float, name: "chance" }] }, (origin, args) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        const chance = Number(args[1]);
        if (!Number.isFinite(chance) || chance < 0 || chance > 1) { player.sendMessage("§cDie Spawn-Chance muss zwischen 0 und 1 liegen."); return { status: CustomCommandStatus.Failure }; }
        const type = mobId(args[0]);
        system.run(() => {
            MONSTER_CONFIG.spawnChances[type] = clamp01(chance);
            player.sendMessage(saveMonsterConfig() ? `§aSpawn-Chance von ${type} §7auf §e${chance} §7gesetzt.` : "§cDie Config konnte nicht gespeichert werden.");
        });
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "monster:list", description: "Zeigt die aktuelle Monster-Config.", permissionLevel: OP_PERMISSION, cheatsRequired: false }, (origin) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => {
            player.sendMessage("§6--- Monster Config ---");
            player.sendMessage(`§7enabled: §e${MONSTER_CONFIG.enabled}`);
            player.sendMessage(`§7globalSpawnRate: §e${MONSTER_CONFIG.globalSpawnRate}`);
            player.sendMessage(`§7nightSpawnMultiplier: §e${MONSTER_CONFIG.nightSpawnMultiplier}`);
            player.sendMessage(`§7claimSpawnRate: §e${MONSTER_CONFIG.claims?.spawnRate}`);
            player.sendMessage(`§7giveWeakness: §e${MONSTER_CONFIG.giveWeakness}`);
            player.sendMessage(`§7weaknessLevel: §e${MONSTER_CONFIG.weaknessLevel}`);
            player.sendMessage(`§7weaknessDuration: §e${MONSTER_CONFIG.weaknessDuration}`);
            player.sendMessage("§7/monster:set <key> <value>");
            player.sendMessage("§7/monster:mob <mob> <true|false>");
            player.sendMessage("§7/monster:chance <mob> <0-1>");
        });
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "monster:reset", description: "Setzt die Monster-Config auf Standard zurück.", permissionLevel: OP_PERMISSION, cheatsRequired: false }, (origin) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => {
            Object.assign(MONSTER_CONFIG, {
                ...DEFAULT_CONFIG,
                allowedMobs: { ...DEFAULT_CONFIG.allowedMobs },
                spawnChances: { ...DEFAULT_CONFIG.spawnChances },
                claims: { ...DEFAULT_CONFIG.claims, blockedMobs: { ...DEFAULT_CONFIG.claims.blockedMobs } }
            });
            if (saveMonsterConfig()) { loadMonsterConfig(); player.sendMessage("§aMonster-Config wurde zurückgesetzt."); }
            else player.sendMessage("§cDie Monster-Config konnte nicht gespeichert werden.");
        });
        return { status: CustomCommandStatus.Success };
    });
});

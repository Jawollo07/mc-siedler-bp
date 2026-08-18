import { system, world } from "@minecraft/server";
import { MONSTER_CONFIG, saveMonsterConfig, loadMonsterConfig } from "./index.js";

const PREFIX = "§8[§cMonster§8]§r ";
const ADMIN_TAGS = ["monster.admin", "admin"];
const SQUAD_TAG = "monster_squad";

function isAdmin(player) {
    return ADMIN_TAGS.some((tag) => {
        try { return player.hasTag(tag); } catch { return false; }
    });
}

function reply(player, message) {
    player.sendMessage(`${PREFIX}${message}`);
}

function spawnEntity(dimension, typeId, location) {
    const entity = dimension.spawnEntity(typeId, location);
    try { entity.addTag(SQUAD_TAG); } catch {}
    return entity;
}

function spawnSquad(player, count = null) {
    const cfg = MONSTER_CONFIG.pillager;
    const amount = Math.max(
        1,
        Math.min(
            32,
            Number.isFinite(count)
                ? Math.floor(count)
                : Math.floor(Math.random() * (cfg.maxGroupSize - cfg.minGroupSize + 1)) + cfg.minGroupSize
        )
    );

    let spawned = 0;
    for (let i = 0; i < amount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 3 + Math.random() * 6;
        spawnEntity(player.dimension, "minecraft:pillager", {
            x: player.location.x + Math.cos(angle) * distance,
            y: player.location.y,
            z: player.location.z + Math.sin(angle) * distance
        });
        spawned++;
    }
    return spawned;
}

function clearMonsterEntities(dimension) {
    let removed = 0;
    for (const typeId of ["minecraft:pillager", "minecraft:vindicator", "minecraft:ravager"]) {
        for (const entity of dimension.getEntities({ type: typeId })) {
            try {
                if (entity.hasTag(SQUAD_TAG)) {
                    entity.remove();
                    removed++;
                }
            } catch {}
        }
    }
    return removed;
}

function help(player) {
    reply(player, "§eMonster Admin Commands:");
    reply(player, "§f!monster status §7| §f!monster enable §7| §f!monster disable");
    reply(player, "§f!monster pillager on|off §7| §f!monster outpost on|off §7| §f!monster siege on|off");
    reply(player, "§f!monster spawn [1-32] §7| §f!monster clear");
    reply(player, "§f!monster reload §7| §f!monster save");
}

function status(player) {
    const c = MONSTER_CONFIG;
    const p = c.pillager;
    reply(player, `§7System: ${c.enabled ? "§aAKTIV" : "§cDEAKTIV"} §7| Pillager: ${p.enabled ? "§aAN" : "§cAUS"}`);
    reply(player, `§7Spawnchance: §e${p.spawnChance} §7| Truppgröße: §e${p.minGroupSize}-${p.maxGroupSize} §7| Max: §e${p.maxActiveSquads}`);
    reply(player, `§7Outpost: ${p.outpost?.enabled ? "§aAN" : "§cAUS"} §7| Belagerung: ${p.siege?.enabled ? "§aAN" : "§cAUS"}`);
}

function handleCommand(player, raw) {
    const args = raw.trim().split(/\s+/);
    if ((args.shift() ?? "").toLowerCase() !== "!monster") return false;

    if (!isAdmin(player)) {
        reply(player, "§cKeine Berechtigung. Benötigt Tag §emonster.admin§c oder §eadmin§c.");
        return true;
    }

    const sub = (args.shift() ?? "help").toLowerCase();
    const c = MONSTER_CONFIG;
    const p = c.pillager;

    switch (sub) {
        case "help": help(player); break;
        case "status": status(player); break;
        case "enable": c.enabled = true; saveMonsterConfig(); reply(player, "§aMonster-System aktiviert."); break;
        case "disable": c.enabled = false; saveMonsterConfig(); reply(player, "§cMonster-System deaktiviert."); break;
        case "pillager": {
            const v = args.shift()?.toLowerCase();
            if (!["on", "off"].includes(v)) { reply(player, "§c!monster pillager on|off"); break; }
            p.enabled = v === "on";
            saveMonsterConfig();
            reply(player, `Pillager: ${p.enabled ? "§aAN" : "§cAUS"}`);
            break;
        }
        case "outpost": {
            const v = args.shift()?.toLowerCase();
            if (!["on", "off"].includes(v)) { reply(player, "§c!monster outpost on|off"); break; }
            p.outpost.enabled = v === "on";
            saveMonsterConfig();
            reply(player, `Outpost-Raids: ${p.outpost.enabled ? "§aAN" : "§cAUS"}`);
            break;
        }
        case "siege": {
            const v = args.shift()?.toLowerCase();
            if (!["on", "off"].includes(v)) { reply(player, "§c!monster siege on|off"); break; }
            p.siege.enabled = v === "on";
            saveMonsterConfig();
            reply(player, `Belagerungen: ${p.siege.enabled ? "§aAN" : "§cAUS"}`);
            break;
        }
        case "spawn": {
            const n = args[0] === undefined ? null : Number(args[0]);
            if (n !== null && (!Number.isFinite(n) || n < 1 || n > 32)) {
                reply(player, "§cAnzahl muss zwischen 1 und 32 liegen.");
                break;
            }
            reply(player, `§a${spawnSquad(player, n)} Pillager gespawnt.`);
            break;
        }
        case "clear":
            reply(player, `§a${clearMonsterEntities(player.dimension)} markierte Monster entfernt.`);
            break;
        case "reload":
            loadMonsterConfig();
            reply(player, "§aMonster-Config neu geladen.");
            break;
        case "save":
            reply(player, saveMonsterConfig() ? "§aMonster-Config gespeichert." : "§cSpeichern fehlgeschlagen.");
            break;
        default:
            reply(player, `§cUnbekannter Befehl: §e${sub}`);
            help(player);
    }
    return true;
}

// Scripting V2 / @minecraft/server 2.9.0 stellt chatSend auf dem betroffenen
// Server-Build nicht bereit. Das Modul darf deshalb NICHT beim Import abstürzen.
const chatSend = world.beforeEvents?.chatSend;
if (chatSend && typeof chatSend.subscribe === "function") {
    chatSend.subscribe((event) => {
        const message = event.message?.trim();
        if (!message?.toLowerCase().startsWith("!monster")) return;
        event.cancel = true;
        system.run(() => handleCommand(event.sender, message));
    });
    console.info("§a[Monster] Chat-Admin-Commands geladen.");
} else {
    console.warn("§e[Monster] ChatSend-API nicht verfügbar; !monster Chat-Commands deaktiviert. Das Modul und Token-System laufen trotzdem weiter.");
}

console.info("§a[Monster] Admin-Commands geladen.");

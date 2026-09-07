import {
    system,
    world,
    CommandPermissionLevel,
    CustomCommandParamType,
    CustomCommandStatus
} from "@minecraft/server";
import { ANTI_AFK_CONFIG } from "./config.js";

const players = new Map();
let runtimeEnabled = ANTI_AFK_CONFIG.enabled;
let runtimeKickEnabled = ANTI_AFK_CONFIG.kickEnabled;
let runtimeKickAfterMs = ANTI_AFK_CONFIG.kickAfterMs;

function now() { return Date.now(); }

function playerIsValid(player) {
    return player?.typeId === "minecraft:player" && player.isValid;
}

function distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
}

function stateFor(player) {
    let state = players.get(player.id);
    if (!state) {
        state = {
            lastActivity: now(),
            lastPosition: { ...player.location },
            afk: false,
            warned: false,
            manualAfk: false
        };
        players.set(player.id, state);
    }
    return state;
}

function markActivity(player, reason = "activity") {
    if (!playerIsValid(player)) return;

    const state = stateFor(player);
    state.lastActivity = now();
    state.lastPosition = { ...player.location };
    state.warned = false;
    state.lastReason = reason;

    if (state.afk) {
        state.afk = false;
        state.manualAfk = false;
        try { player.sendMessage(ANTI_AFK_CONFIG.messages.noLongerAfk); } catch {}
    }
}

function setManualAfk(player) {
    if (!playerIsValid(player)) return;
    const state = stateFor(player);
    state.manualAfk = true;
    state.afk = true;
    state.lastActivity = now();
    state.warned = true;
    try { player.sendMessage(ANTI_AFK_CONFIG.messages.manuallyAfk); } catch {}
}

function setManualActive(player) {
    if (!playerIsValid(player)) return;
    const state = stateFor(player);
    state.manualAfk = false;
    markActivity(player, "manual-active");
    try { player.sendMessage(ANTI_AFK_CONFIG.messages.manuallyActive); } catch {}
}

function markAfk(player, state) {
    if (state.afk) return;
    state.afk = true;
    state.manualAfk = false;
    try { player.sendMessage(ANTI_AFK_CONFIG.messages.markedAfk); } catch {}
}

function kickPlayer(player) {
    if (!playerIsValid(player)) return;

    // Do not use player.runCommand("kick ...") here: the reason contains spaces
    // and is parsed as multiple command parameters by Bedrock.
    try {
        player.runCommand("kick @s");
    } catch (error) {
        console.warn(`[Anti-AFK] Kick failed for ${player.name}: ${error}`);
    }
}

function playerFrom(origin) {
    const player = origin?.sourceEntity;
    return playerIsValid(player) ? player : null;
}

function registerPlayerCommand(registry, name, description, callback) {
    registry.registerCommand({
        name,
        description,
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false
    }, callback);
}

function adminCommand(registry, name, description, callback) {
    registry.registerCommand({
        name,
        description,
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false
    }, (origin) => {
        const player = playerFrom(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => callback(player));
        return { status: CustomCommandStatus.Success };
    });
}

function tick() {
    if (!runtimeEnabled) return;

    const onlineIds = new Set();
    const current = now();

    for (const player of world.getPlayers()) {
        if (!playerIsValid(player)) continue;
        onlineIds.add(player.id);

        const state = stateFor(player);
        const position = player.location;

        if (distanceSquared(position, state.lastPosition) >= ANTI_AFK_CONFIG.movementThreshold ** 2) {
            state.lastPosition = { ...position };
            markActivity(player, "movement");
        }

        if (state.manualAfk) continue;

        const inactiveMs = current - state.lastActivity;

        if (runtimeKickEnabled && inactiveMs >= runtimeKickAfterMs) {
            kickPlayer(player);
            continue;
        }

        if (inactiveMs >= ANTI_AFK_CONFIG.afkAfterMs) {
            markAfk(player, state);
        } else if (inactiveMs >= ANTI_AFK_CONFIG.warningAfterMs && !state.warned) {
            state.warned = true;
            try { player.sendMessage(ANTI_AFK_CONFIG.messages.warning); } catch {}
        }
    }

    for (const id of players.keys()) {
        if (!onlineIds.has(id)) players.delete(id);
    }
}

world.afterEvents.playerSpawn?.subscribe?.((event) => {
    if (!event?.initialSpawn || !playerIsValid(event.player)) return;
    const player = event.player;
    players.set(player.id, {
        lastActivity: now(),
        lastPosition: { ...player.location },
        afk: false,
        warned: false,
        manualAfk: false
    });
});

world.afterEvents.playerLeave?.subscribe?.((event) => {
    if (event?.playerId) players.delete(event.playerId);
});

world.beforeEvents.chatSend?.subscribe?.((event) => markActivity(event.sender, "chat"));
world.afterEvents.playerBreakBlock?.subscribe?.((event) => markActivity(event.player, "break-block"));
world.afterEvents.playerPlaceBlock?.subscribe?.((event) => markActivity(event.player, "place-block"));
world.afterEvents.playerInteractWithBlock?.subscribe?.((event) => markActivity(event.player, "interact-block"));
world.afterEvents.playerInteractWithEntity?.subscribe?.((event) => markActivity(event.player, "interact-entity"));
world.afterEvents.entityHitEntity?.subscribe?.((event) => {
    const attacker = event.damagingEntity;
    if (attacker?.typeId === "minecraft:player") markActivity(attacker, "combat");
});

system.runInterval(tick, ANTI_AFK_CONFIG.checkIntervalTicks);

system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;

    registerPlayerCommand(registry, "siedler:afk", "Aktiviert oder beendet deinen AFK-Status.", (origin) => {
        const player = playerFrom(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        const state = stateFor(player);
        system.run(() => state.manualAfk ? setManualActive(player) : setManualAfk(player));
        return { status: CustomCommandStatus.Success };
    });

    registerPlayerCommand(registry, "siedler:afk_status", "Zeigt den Anti-AFK-Status.", (origin) => {
        const player = playerFrom(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => {
            const state = stateFor(player);
            const inactive = Math.max(0, Math.floor((now() - state.lastActivity) / 1000));
            player.sendMessage(`§6[Anti-AFK] §7System: ${runtimeEnabled ? "§aaktiv" : "§cdeaktiviert"} §7| Kick: ${runtimeKickEnabled ? "§aaktiv" : "§cdeaktiviert"}`);
            player.sendMessage(`§7Status: ${state.afk ? "§eAFK" : "§aaktiv"} §7| Inaktiv: §f${inactive}s`);
            player.sendMessage(`§7Kick nach: §f${Math.floor(runtimeKickAfterMs / 60000)} Min.`);
        });
        return { status: CustomCommandStatus.Success };
    });

    adminCommand(registry, "siedler:afk_on", "Aktiviert das Anti-AFK-System.", () => {
        runtimeEnabled = true;
    });

    adminCommand(registry, "siedler:afk_off", "Deaktiviert das Anti-AFK-System.", () => {
        runtimeEnabled = false;
        for (const player of world.getPlayers()) {
            const state = stateFor(player);
            state.afk = false;
            state.warned = false;
        }
    });

    adminCommand(registry, "siedler:afk_kick_on", "Aktiviert AFK-Kicks.", () => {
        runtimeKickEnabled = true;
    });

    adminCommand(registry, "siedler:afk_kick_off", "Deaktiviert AFK-Kicks.", () => {
        runtimeKickEnabled = false;
    });

    registry.registerCommand({
        name: "siedler:afk_kick_time",
        description: "Setzt die AFK-Kick-Zeit in Minuten.",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        cheatsRequired: false,
        mandatoryParameters: [{ type: CustomCommandParamType.Integer, name: "minuten" }]
    }, (origin, args) => {
        const player = playerFrom(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        const minutes = Number(args?.[0]);
        if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) {
            system.run(() => player.sendMessage("§c[Anti-AFK] Bitte eine Zeit zwischen 1 und 1440 Minuten angeben."));
            return { status: CustomCommandStatus.Failure };
        }
        runtimeKickAfterMs = Math.floor(minutes * 60 * 1000);
        system.run(() => player.sendMessage(`§a[Anti-AFK] AFK-Kick-Zeit auf ${minutes} Minuten gesetzt.`));
        return { status: CustomCommandStatus.Success };
    });

    adminCommand(registry, "siedler:afk_reset", "Setzt alle Spieler auf aktiv.", () => {
        for (const player of world.getPlayers()) markActivity(player, "admin-reset");
    });
});

console.info("§a[Siedler Logic] Anti-AFK-System geladen.");

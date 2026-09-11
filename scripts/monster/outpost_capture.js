import { system, world, CustomCommandStatus } from "@minecraft/server";
import { getPlayerTeam, getTeams, saveTeams } from "../teams/index.js";

const PROPERTY = "siedler:outposts";
const CAPTURE_RADIUS = 12;
const CAPTURE_TICKS = 200; // 10 Sekunden
const TICK_INTERVAL = 20;

function loadOutposts() {
    try {
        const raw = world.getDynamicProperty(PROPERTY);
        if (typeof raw !== "string" || !raw) return {};
        const data = JSON.parse(raw);
        return data && typeof data === "object" ? data : {};
    } catch {
        return {};
    }
}

function saveOutposts(outposts) {
    try {
        world.setDynamicProperty(PROPERTY, JSON.stringify(outposts));
        return true;
    } catch (error) {
        console.error(`[Outpost] Speichern fehlgeschlagen: ${error}`);
        return false;
    }
}

function key(dimension, location) {
    return `${dimension.id}:${Math.floor(location.x)}:${Math.floor(location.z)}`;
}

function distanceSq(a, b) {
    return (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
}

function onlinePlayersInRadius(dimension, location) {
    return world.getAllPlayers().filter(player =>
        player.dimension.id === dimension.id &&
        distanceSq(player.location, location) <= CAPTURE_RADIUS ** 2
    );
}

function teamName(player) {
    return getPlayerTeam(player);
}

function announce(message) {
    for (const player of world.getAllPlayers()) player.sendMessage(message);
}

function registerOutpost(player, location) {
    const team = teamName(player);
    if (!team) {
        player.sendMessage("§cDu musst einem Team angehören, um einen Outpost zu registrieren.");
        return false;
    }

    const outposts = loadOutposts();
    const id = key(player.dimension, location);
    outposts[id] = {
        id,
        dimension: player.dimension.id,
        location: { x: Math.floor(location.x), y: Math.floor(location.y), z: Math.floor(location.z) },
        ownerTeam: null,
        capturingTeam: null,
        captureProgress: 0,
        registeredBy: player.id
    };

    if (!saveOutposts(outposts)) return false;
    player.sendMessage(`§aOutpost registriert: §f${id}`);
    return true;
}

function setOutpostOwner(outpost, newTeam) {
    const previous = outpost.ownerTeam;
    outpost.ownerTeam = newTeam;
    outpost.capturingTeam = null;
    outpost.captureProgress = 0;

    const teams = getTeams();
    if (!teams[newTeam]) return;

    // Optional kleiner Wirtschaftsvorteil: ein eroberter Outpost erhöht den
    // persistenten TaxBonus des Teams nicht automatisch. Der Outpost ist
    // primär ein strategischer Besitzpunkt.
    if (previous && previous !== newTeam) {
        announce(`§6⚔ §e${newTeam} §6hat den Outpost von §c${previous} §6erobert!`);
    } else {
        announce(`§6⚔ §e${newTeam} §6hat einen Outpost erobert!`);
    }
}

function tickOutposts() {
    const outposts = loadOutposts();
    let changed = false;

    for (const outpost of Object.values(outposts)) {
        const dimension = world.getDimension(outpost.dimension);
        const players = onlinePlayersInRadius(dimension, outpost.location);
        const teamsPresent = [...new Set(players.map(teamName).filter(Boolean))];

        // Mehrere Teams im Radius = umkämpft, Fortschritt pausiert.
        if (teamsPresent.length !== 1) {
            if (outpost.capturingTeam || outpost.captureProgress) {
                outpost.capturingTeam = null;
                outpost.captureProgress = 0;
                changed = true;
            }
            if (teamsPresent.length > 1) {
                for (const player of players) player.sendActionBar("§c⚔ OUTPOST UMKÄMPFT");
            }
            continue;
        }

        const team = teamsPresent[0];
        if (outpost.ownerTeam === team) {
            outpost.capturingTeam = null;
            outpost.captureProgress = 0;
            for (const player of players) player.sendActionBar("§a✓ OUTPOST UNTER EIGENER KONTROLLE");
            continue;
        }

        if (outpost.capturingTeam !== team) {
            outpost.capturingTeam = team;
            outpost.captureProgress = 0;
            changed = true;
            for (const player of players) player.sendMessage(`§e⚑ Team ${team} beginnt, den Outpost zu erobern!`);
        }

        outpost.captureProgress += TICK_INTERVAL;
        const seconds = Math.ceil((CAPTURE_TICKS - outpost.captureProgress) / 20);
        for (const player of players) {
            player.sendActionBar(`§e⚑ Eroberung: §f${Math.min(100, Math.floor(outpost.captureProgress / CAPTURE_TICKS * 100))}% §7(${Math.max(0, seconds)}s)`);
        }

        if (outpost.captureProgress >= CAPTURE_TICKS) {
            setOutpostOwner(outpost, team);
            changed = true;
        }
    }

    if (changed) saveOutposts(outposts);
}

system.beforeEvents.startup.subscribe(event => {
    event.customCommandRegistry.registerCommand({
        name: "siedler:outpost_register",
        description: "Registriert den aktuellen Standort als eroberbaren Outpost.",
        permissionLevel: 0,
        cheatsRequired: false
    }, origin => {
        const player = origin.sourceEntity;
        if (!player?.id) return { status: CustomCommandStatus.Failure };
        system.run(() => registerOutpost(player, player.location));
        return { status: CustomCommandStatus.Success };
    });
});

system.runInterval(tickOutposts, TICK_INTERVAL);
console.info("§a[Outpost] Eroberungssystem geladen.");

import {
    system,
    world,
    ItemStack,
    CommandPermissionLevel,
    CustomCommandParamType,
    CustomCommandStatus
} from "@minecraft/server";
import { getTeams } from "../teams/index.js";

const OP_PERMISSION = CommandPermissionLevel.GameDirectors;
const OVERWORLD_ID = "minecraft:overworld";
const KIT_TAG = "siedler:starterkit_received";

const STARTER_KIT = [
    { item: "minecraft:stone_pickaxe", count: 1 },
    { item: "minecraft:stone_axe", count: 1 },
    { item: "minecraft:stone_shovel", count: 1 },
    { item: "minecraft:stone_sword", count: 1 },
    { item: "minecraft:bread", count: 12 },
    { item: "minecraft:oak_log", count: 16 },
    { item: "minecraft:coal", count: 8 },
    { item: "minecraft:torch", count: 16 },
    { item: "minecraft:wheat_seeds", count: 8 },
    { item: "minecraft:bucket", count: 1 },
    { item: "minecraft:leather", count: 4 },
    { item: "minecraft:iron_ingot", count: 3 },
    { item: "minecraft:villager_spawn_egg", count: 5 }
];

system.beforeEvents.startup.subscribe((event) => {
    registerCommands(event.customCommandRegistry);
});

function registerCommands(registry) {
    registry.registerCommand({
        name: "siedler:team_tp",
        description: "Teleportiert einen Spieler zu seinem Team.",
        permissionLevel: OP_PERMISSION,
        cheatsRequired: false,
        mandatoryParameters: [{ name: "player", type: CustomCommandParamType.String }]
    }, (origin, playerArg) => {
        const player = resolvePlayerArgument(playerArg);
        if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => tpPlayerToTeam(player));
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({
        name: "siedler:starterkit",
        description: "Gibt einem Spieler das Starterkit.",
        permissionLevel: OP_PERMISSION,
        cheatsRequired: false,
        mandatoryParameters: [{ name: "player", type: CustomCommandParamType.String }]
    }, (origin, playerArg) => {
        const player = resolvePlayerArgument(playerArg);
        if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => giveStarterKit(player, true));
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({
        name: "siedler:startgame",
        description: "Startet das Siedler-Spiel für alle Spieler in gültigen Teams.",
        permissionLevel: OP_PERMISSION,
        cheatsRequired: false
    }, (origin) => {
        const source = origin?.sourceEntity;
        if (source && source.typeId !== "minecraft:player") {
            return { status: CustomCommandStatus.Failure };
        }
        system.run(() => startGame(source?.typeId === "minecraft:player" ? source : null));
        return { status: CustomCommandStatus.Success };
    });
}

function resolvePlayerArgument(argument) {
    const value = String(Array.isArray(argument) ? argument[0] : argument ?? "").trim().toLowerCase();
    if (!value) return null;

    const players = world.getPlayers();
    return players.find(player => player.id.toLowerCase() === value) ??
        players.find(player => player.name.toLowerCase() === value) ??
        players.find(player => player.name.toLowerCase().startsWith(value)) ??
        null;
}

function isValidTeamCoords(coords) {
    return coords &&
        Number.isFinite(Number(coords.x)) &&
        Number.isFinite(Number(coords.y)) &&
        Number.isFinite(Number(coords.z));
}

function getOverworld() {
    try {
        return world.getDimension(OVERWORLD_ID);
    } catch (error) {
        console.error(`[StartGame] Overworld konnte nicht geladen werden: ${error}`);
        return null;
    }
}

function getOnlinePlayerById(playerId) {
    try {
        return world.getPlayers().find(player => player.id === playerId) ?? null;
    } catch {
        return null;
    }
}

function startGame(executor = null) {
    const teams = getTeams() ?? {};
    const overworld = getOverworld();

    if (!overworld) {
        executor?.sendMessage("§cDas Spiel konnte nicht gestartet werden: Overworld nicht verfügbar.");
        return false;
    }

    let teleported = 0;
    let kitsGiven = 0;
    let skippedTeams = 0;
    let skippedPlayers = 0;
    const processedPlayers = new Set();

    for (const [teamName, teamData] of Object.entries(teams)) {
        if (!teamData || !Array.isArray(teamData.players) || teamData.players.length === 0) {
            console.warn(`[StartGame] Team "${teamName}" hat keine Spieler und wird übersprungen.`);
            skippedTeams++;
            continue;
        }

        if (!isValidTeamCoords(teamData.coords)) {
            console.warn(`[StartGame] Team "${teamName}" hat keine gültigen Koordinaten und wird übersprungen.`);
            skippedTeams++;
            continue;
        }

        for (const playerId of teamData.players) {
            if (typeof playerId !== "string" || processedPlayers.has(playerId)) continue;
            processedPlayers.add(playerId);

            const player = getOnlinePlayerById(playerId);
            if (!player) {
                console.warn(`[StartGame] Spieler mit ID "${playerId}" nicht online.`);
                skippedPlayers++;
                continue;
            }

            try {
                player.teleport({
                    x: Number(teamData.coords.x),
                    y: Number(teamData.coords.y),
                    z: Number(teamData.coords.z)
                }, { dimension: overworld });
                teleported++;
            } catch (error) {
                console.error(`[StartGame] Teleport von ${player.name}: ${error}`);
                player.sendMessage("§cDein Team-Teleport ist fehlgeschlagen.");
                skippedPlayers++;
                continue;
            }

            if (giveStarterKit(player, false)) kitsGiven++;
        }
    }

    if (teleported === 0) {
        executor?.sendMessage("§cDas Spiel konnte nicht gestartet werden: Kein Spieler konnte zu einem gültigen Team teleportiert werden.");
        console.warn("[StartGame] Keine Spieler teleportiert.");
        return false;
    }

    console.log(`[StartGame] Spiel gestartet: ${teleported} teleportiert, ${kitsGiven} Starterkits vergeben, ${skippedTeams} Teams übersprungen, ${skippedPlayers} Spieler übersprungen.`);
    world.sendMessage(`§aDas Spiel wurde gestartet! §7${teleported} Spieler wurden zu ihren Teams teleportiert.`);

    if (kitsGiven < teleported) {
        world.sendMessage(`§e${teleported - kitsGiven} Spieler hatten bereits ein Starterkit und erhielten kein zweites.`);
    }

    return true;
}

function tpPlayerToTeam(player) {
    const teams = getTeams() ?? {};
    const teamName = Object.keys(teams).find(name => teams[name]?.players?.includes(player.id));

    if (!teamName) {
        player.sendMessage("§cDer Spieler ist in keinem Team.");
        return false;
    }

    const coords = teams[teamName]?.coords;
    if (!isValidTeamCoords(coords)) {
        player.sendMessage(`§cDas Team "${teamName}" hat keine gültigen Koordinaten gespeichert.`);
        return false;
    }

    const overworld = getOverworld();
    if (!overworld) {
        player.sendMessage("§cDie Overworld ist aktuell nicht verfügbar.");
        return false;
    }

    try {
        player.teleport({
            x: Number(coords.x),
            y: Number(coords.y),
            z: Number(coords.z)
        }, { dimension: overworld });
        player.sendMessage(`§aDu wurdest zum Startpunkt deines Teams "${teamName}" teleportiert.`);
        return true;
    } catch (error) {
        console.error(`[StartGame] Team-Teleport für ${player.name}: ${error}`);
        player.sendMessage("§cDer Team-Teleport ist fehlgeschlagen.");
        return false;
    }
}

function giveStarterKit(player, force = false) {
    if (!player?.isValid || player.typeId !== "minecraft:player") return false;

    if (!force && hasStarterKit(player)) return false;

    let inventory;
    try {
        inventory = player.getComponent("minecraft:inventory")?.container;
    } catch (error) {
        console.error(`[StartGame] Inventar von ${player.name} konnte nicht geladen werden: ${error}`);
        return false;
    }

    if (!inventory) {
        player.sendMessage("§cDein Starterkit konnte nicht vergeben werden.");
        return false;
    }

    let added = 0;
    let failed = 0;

    for (const entry of STARTER_KIT) {
        try {
            const stack = new ItemStack(entry.item, entry.count);
            const leftover = inventory.addItem(stack);
            if (leftover) failed += leftover.amount ?? entry.count;
            else added++;
        } catch (error) {
            failed++;
            console.error(`[StartGame] Starterkit-Item ${entry.item} für ${player.name}: ${error}`);
        }
    }

    if (added === 0) {
        player.sendMessage("§cDas Starterkit konnte nicht ins Inventar gelegt werden. Ist dein Inventar voll?");
        return false;
    }

    try {
        player.addTag(KIT_TAG);
    } catch (error) {
        console.warn(`[StartGame] Starterkit-Tag für ${player.name} konnte nicht gesetzt werden: ${error}`);
    }

    if (failed > 0) {
        player.sendMessage("§eStarterkit teilweise erhalten. §7Einige Items konnten wegen eines vollen Inventars nicht hinzugefügt werden.");
    } else {
        player.sendMessage("§aStarterkit erhalten!");
    }

    return true;
}

function hasStarterKit(player) {
    try {
        return player.hasTag(KIT_TAG);
    } catch {
        return false;
    }
}

console.info("[Siedler Logic] Start-/Starterkit-System geladen.");

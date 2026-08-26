import { world, system, CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus} from "@minecraft/server";
import { addTaxes } from "./taxes.js";
import { getTeams, saveTeams } from "../teams/index.js";
import { countVillagersInTeamClaims } from "../claims/utils.js";

const MORNING_START = 0;
const MORNING_WINDOW = 200;
const OP_PERMISSION = CommandPermissionLevel.GameDirectors;

let dayStarted = false;
let lastPaidDay = -1;
let debug = true;
if (debug) {
    console.log("Started Taxes System")
}
system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;
    registerTaxCommands(registry);
    if (debug) {
        console.log("Registered Tax Commands")
    }
});
system.runInterval(() => {
    const timeNow = world.getTimeOfDay();
    const currentDay = Math.floor(world.getAbsoluteTime() / 24000);

    if (timeNow >= MORNING_START && timeNow < MORNING_START + MORNING_WINDOW) {
        if (!dayStarted && lastPaidDay !== currentDay) {
            dayStarted = true;
            lastPaidDay = currentDay;
            if (debug) {
                console.log("Day started")
            }
            payAllTeamTaxes();
        }
    } else {
        dayStarted = false;
    }
}, 20);
function playerOnly(origin) {
    const player = origin?.sourceEntity;
    return player?.typeId === "minecraft:player" ? player : null;
}
function payAllTeamTaxes() {
    const teams = getTeams();
    let paidCount = 0;

    for (const [teamName, data] of Object.entries(teams)) {
        if (!data?.taxChest) continue;

        const villagerCount = countVillagersInTeamClaims(teamName, ["fv:villager*", "minecraft:villager"]);
        const configuredAmount = Number.isFinite(Number(data.taxAmount)) ? Number(data.taxAmount) : villagerCount;
        const amount = Math.max(0, Math.floor(configuredAmount));

        if (amount <= 0) continue;

        const success = addTaxes(data.taxChest, amount, teamName);
        if (success) {
            paidCount++;
            notifyTeamMembers(teamName, data, amount, villagerCount);
            if (debug) {
                console.log("Paid taxes")
            }
        }
    }

    if (paidCount > 0) {
        console.info(`[Steuern] ${paidCount} Team(s) haben Steuern erhalten.`);
    }
}

function notifyTeamMembers(teamName, teamData, amount, villagerCount) {
    const color = teamData.color || "§f";
    const message = `§a[Steuern] Euer Team ${color}${teamName}§a hat §e${amount} Emeralds§a erhalten §7(${villagerCount} Dorfbewohner)`;

    for (const player of world.getAllPlayers()) {
        if (Array.isArray(teamData.players) && teamData.players.includes(player.name)) {
            player.sendMessage(message);
        }
    }
}
function registerTaxCommands(registry) {
    registry.registerCommand({
        name: "siedler:settax",
        description: "Setzt Steuerkiste",
        permissionLevel: OP_PERMISSION,
        cheatsRequired: false,
        mandatoryParameters: [
            { type: CustomCommandParamType.String, name: "team" },
            { type: CustomCommandParamType.Float, name: "x" },
            { type: CustomCommandParamType.Float, name: "y" },
            { type: CustomCommandParamType.Float, name: "z" }
        ],
    }, (origin, team, x, y, z) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        const teamName = String(team ?? "").trim();
        system.run(() => {
            const teams = getTeams();
            const teamData = teams[teamName];
            if (!teamData) { player.sendMessage(`§cDas Team "${teamName}" existiert nicht.`); return; }
            teamData.taxChest = {
                x: Math.floor(Number(x)),
                y: Math.floor(Number(y)),
                z: Math.floor(Number(z))
            };
            player.sendMessage(saveTeams(teams) ? `§aSteuerkiste für Team "${teamData.color || "§f"}${teamName}§a" gesetzt.` : "§cDie Steuerkonfiguration konnte nicht gespeichert werden.");
        });
        return { status: CustomCommandStatus.Success };
    });
};
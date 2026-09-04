import { world, system, CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus } from "@minecraft/server";
import { addTaxes } from "./taxes.js";
import { calculateTax, normalizeTaxBonus } from "./config.js";
import { getTeams, saveTeams } from "../teams/index.js";
import { countVillagersInTeamClaims } from "../claims/utils.js";
import showTaxStatsForm from "./stats.js";

const MORNING_START = 0;
const MORNING_WINDOW = 200;
const LAST_PAID_DAY_PROPERTY = "tax:lastPaidDay";
const OP_PERMISSION = CommandPermissionLevel.GameDirectors;
let dayStarted = false;

system.beforeEvents.startup.subscribe((event) => registerTaxCommands(event.customCommandRegistry));

system.runInterval(() => {
    try {
        const timeNow = world.getTimeOfDay();
        const currentDay = Math.floor(world.getAbsoluteTime() / 24000);
        if (timeNow >= MORNING_START && timeNow < MORNING_START + MORNING_WINDOW) {
            if (!dayStarted) {
                dayStarted = true;
                payTaxesOncePerDay(currentDay);
            }
        } else dayStarted = false;
    } catch (error) {
        console.error(`[Steuern] Tagesprüfung fehlgeschlagen: ${error}`);
    }
}, 20);

function playerOnly(origin) {
    const player = origin?.sourceEntity;
    return player?.typeId === "minecraft:player" ? player : null;
}

function getCurrentPlayer() {
    const players = world.getAllPlayers();
    return players.length > 0 ? players[0] : null;
}

function getLastPaidDay() {
    const value = world.getDynamicProperty(LAST_PAID_DAY_PROPERTY);
    return typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : -1;
}

function setLastPaidDay(day) {
    try {
        world.setDynamicProperty(LAST_PAID_DAY_PROPERTY, Math.floor(day));
        return true;
    } catch (error) {
        console.error(`[Steuern] Konnte letzten Auszahlungstag nicht speichern: ${error}`);
        return false;
    }
}

function payTaxesOncePerDay(currentDay) {
    if (getLastPaidDay() === currentDay) return;
    if (!setLastPaidDay(currentDay)) return;
    payAllTeamTaxes();

    const player = getCurrentPlayer();
    if (player && typeof showTaxStatsForm === "function") {
        showTaxStatsForm(player);
    }
}

function payAllTeamTaxes() {
    const teams = getTeams();
    let paidCount = 0;

    for (const [teamName, data] of Object.entries(teams)) {
        if (!data?.taxChest) continue;
        try {
            const villagers = countVillagersInTeamClaims(teamName, "villager");
            const tax = calculateTax(villagers, data.taxBonus);
            if (tax.total <= 0) continue;

            const result = addTaxes(data.taxChest, tax.total, teamName);
            if (!result?.success) continue;

            paidCount++;
            // TaxBonus is permanent and therefore remains stored after payout.
            notifyTeamMembers(teamName, data, tax, result);
        } catch (error) {
            console.error(`[Steuern] Fehler für Team "${teamName}": ${error}`);
        }
    }

    if (paidCount > 0) console.info(`[Steuern] ${paidCount} Team(s) haben ihre Tagessteuer erhalten.`);
}

function notifyTeamMembers(teamName, teamData, tax, result) {
    const color = teamData.color || "§f";
    const storageText = result.dropped > 0
        ? ` §7(${result.inserted} in Kiste, ${result.dropped} daneben abgelegt)`
        : "";
    const message = `§a[Steuern] ${color}${teamName}§a erhielt §e${tax.total} Emeralds§a §7(${tax.villagers} Dorfbewohner + ${tax.bonus} permanenter Token-Bonus)${storageText}`;

    for (const player of world.getAllPlayers()) {
        if (Array.isArray(teamData.players) && teamData.players.includes(player.id)) player.sendMessage(message);
    }
}

function getTeamOrTell(player, teamName) {
    const teams = getTeams();
    const teamData = teams[teamName];
    if (!teamData) {
        player.sendMessage(`§cDas Team "${teamName}" existiert nicht.`);
        return null;
    }
    return { teams, teamData };
}

function registerTaxCommands(registry) {
    registry.registerCommand({
        name: "siedler:countvillagers",
        description: "Zählt Dorfbewohner in den Claims eines Teams",
        permissionLevel: OP_PERMISSION,
        cheatsRequired: false,
        mandatoryParameters: [{ type: CustomCommandParamType.String, name: "team" }]
    }, (origin, team) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        const teamName = String(team ?? "").trim();
        system.run(() => {
            if (!getTeamOrTell(player, teamName)) return;
            const count = countVillagersInTeamClaims(teamName, "villager");
            player.sendMessage(`§a[Steuern] Team §f${teamName}§a hat §e${count}§a Dorfbewohner in seinen Claims.`);
        });
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({
        name: "siedler:settax",
        description: "Setzt die Steuerkiste eines Teams",
        permissionLevel: OP_PERMISSION,
        cheatsRequired: false,
        mandatoryParameters: [
            { type: CustomCommandParamType.String, name: "team" },
            { type: CustomCommandParamType.Float, name: "x" },
            { type: CustomCommandParamType.Float, name: "y" },
            { type: CustomCommandParamType.Float, name: "z" }
        ]
    }, (origin, team, x, y, z) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        const teamName = String(team ?? "").trim();
        system.run(() => {
            const result = getTeamOrTell(player, teamName);
            if (!result) return;
            const coords = [x, y, z].map(Number);
            if (coords.some(value => !Number.isFinite(value))) {
                player.sendMessage("§cUngültige Koordinaten.");
                return;
            }
            result.teamData.taxChest = { x: Math.floor(coords[0]), y: Math.floor(coords[1]), z: Math.floor(coords[2]) };
            player.sendMessage(saveTeams(result.teams)
                ? `§aSteuerkiste für Team "${result.teamData.color || "§f"}${teamName}§a" gesetzt.`
                : "§cDie Steuerkonfiguration konnte nicht gespeichert werden.");
        });
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({
        name: "siedler:taxinfo",
        description: "Zeigt die tägliche Steuer inklusive permanentem Monster-Token-Bonus",
        permissionLevel: OP_PERMISSION,
        cheatsRequired: false,
        mandatoryParameters: [{ type: CustomCommandParamType.String, name: "team" }]
    }, (origin, team) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        const teamName = String(team ?? "").trim();
        system.run(() => {
            const result = getTeamOrTell(player, teamName);
            if (!result) return;
            const villagers = countVillagersInTeamClaims(teamName, "villager");
            const bonus = normalizeTaxBonus(result.teamData.taxBonus);
            const tax = calculateTax(villagers, bonus);
            player.sendMessage(`§6--- Steuerinfo: ${result.teamData.color || "§f"}${teamName}§6 ---`);
            player.sendMessage(`§7Dorfbewohner: §e${tax.villagers}`);
            player.sendMessage(`§7Permanenter Monster-Token-Bonus: §e+${tax.bonus} Emeralds/Tag`);
            player.sendMessage(`§7Tägliche Steuer: §e${tax.total} Emeralds`);
            player.sendMessage("§7Bonusquelle: §6besiegte Monster-Tokens");
        });
        return { status: CustomCommandStatus.Success };
    });
}

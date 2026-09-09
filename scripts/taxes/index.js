import { world, system, CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus } from "@minecraft/server";
import { addTaxes } from "./taxes.js";
import { calculateTax, normalizeTaxBonus } from "./config.js";
import { getTeams, saveTeams } from "../teams/index.js";
import { countVillagersInTeamClaims } from "../claims/utils.js";
import { showTaxStatsForm } from "./stats.js";

const OP_PERMISSION = CommandPermissionLevel.GameDirectors;
const TAX_CHECK_INTERVAL = 20;
const TAX_RETRY_INTERVAL = 1200; // 60 seconds

system.beforeEvents.startup.subscribe((event) => registerTaxCommands(event.customCommandRegistry));

system.runInterval(() => {
    try {
        processDailyTaxes();
    } catch (error) {
        console.error(`[Steuern] Tagesabrechnung fehlgeschlagen: ${error}`);
    }
}, TAX_CHECK_INTERVAL);

function playerOnly(origin) {
    const player = origin?.sourceEntity;
    return player?.typeId === "minecraft:player" ? player : null;
}

function getCurrentPlayer() {
    return world.getAllPlayers()[0] ?? null;
}

function isTeamMemberOnline(teamData) {
    if (!Array.isArray(teamData?.players) || teamData.players.length === 0) return false;
    const onlineIds = new Set(world.getAllPlayers().map(player => player.id));
    return teamData.players.some(id => onlineIds.has(id));
}

function ensureTaxData(teamData) {
    if (!teamData || typeof teamData !== "object") return false;

    let changed = false;
    const defaults = {
        totalTaxes: 0,
        villagerCount: 0,
        lastPaidDay: -1,
        lastTaxAmount: 0,
        lastTaxBonus: 0,
        lastPaymentStatus: "never",
        taxFailures: 0,
        lastTaxAttemptDay: -1,
        lastTaxAttemptTick: -1
    };

    for (const [key, value] of Object.entries(defaults)) {
        if (!Object.prototype.hasOwnProperty.call(teamData, key)) {
            teamData[key] = value;
            changed = true;
        }
    }

    const numericFields = ["totalTaxes", "villagerCount", "lastPaidDay", "lastTaxAmount", "lastTaxBonus", "taxFailures", "lastTaxAttemptDay", "lastTaxAttemptTick"];
    for (const key of numericFields) {
        const value = Number(teamData[key]);
        if (!Number.isFinite(value)) {
            teamData[key] = defaults[key];
            changed = true;
        } else if (teamData[key] !== Math.floor(value)) {
            teamData[key] = Math.floor(value);
            changed = true;
        }
    }

    return changed;
}

function shouldAttemptTax(teamData, currentDay, currentTick) {
    if (Number(teamData.lastPaidDay) === currentDay) return false;
    if (Number(teamData.lastTaxAttemptDay) !== currentDay) return true;
    return currentTick - Number(teamData.lastTaxAttemptTick) >= TAX_RETRY_INTERVAL;
}

function processDailyTaxes() {
    const teams = getTeams();
    const currentDay = Math.floor(world.getAbsoluteTime() / 24000);
    const currentTick = world.getAbsoluteTime();
    let changed = false;

    for (const [teamName, data] of Object.entries(teams)) {
        if (!ensureTaxData(data)) {
            // No migration was required for this team.
        } else {
            changed = true;
        }

        if (!data?.taxChest || !isTeamMemberOnline(data)) continue;
        if (!shouldAttemptTax(data, currentDay, currentTick)) continue;

        data.lastTaxAttemptDay = currentDay;
        data.lastTaxAttemptTick = currentTick;
        changed = true;

        const paid = processTeamTax(teamName, data, currentDay);
        if (paid) changed = true;
    }

    if (changed) saveTeams(teams);
}

function processTeamTax(teamName, teamData, currentDay) {
    try {
        const villagers = countVillagersInTeamClaims(teamName, "villager");
        const tax = calculateTax(villagers, normalizeTaxBonus(teamData.taxBonus));

        teamData.villagerCount = tax.villagers;
        teamData.lastTaxBonus = tax.bonus;

        if (tax.total <= 0) {
            teamData.lastPaidDay = currentDay;
            teamData.lastTaxAmount = 0;
            teamData.lastPaymentStatus = "no_tax";
            return true;
        }

        const result = addTaxes(teamData.taxChest, tax.total, teamName);
        if (!result?.success || result.inserted !== tax.total) {
            teamData.taxFailures = Math.max(0, Number(teamData.taxFailures) || 0) + 1;
            teamData.lastPaymentStatus = result?.reason || "failed";
            console.warn(`[Steuern] Team "${teamName}" konnte nicht abgerechnet werden: ${result?.reason || "unknown"}. Neuer Versuch später.`);
            return true;
        }

        teamData.lastPaidDay = currentDay;
        teamData.lastTaxAmount = tax.total;
        teamData.totalTaxes = Math.max(0, Number(teamData.totalTaxes) || 0) + tax.total;
        teamData.taxFailures = 0;
        teamData.lastPaymentStatus = "paid";

        notifyTeamMembers(teamName, teamData, tax);
        return true;
    } catch (error) {
        teamData.taxFailures = Math.max(0, Number(teamData.taxFailures) || 0) + 1;
        teamData.lastPaymentStatus = "exception";
        console.error(`[Steuern] Fehler für Team "${teamName}": ${error}`);
        return true;
    }
}

function notifyTeamMembers(teamName, teamData, tax) {
    const color = teamData.color || "§f";
    const message = `§a[Steuern] ${color}${teamName}§a: §e${tax.total} Emeralds§a eingezahlt §7(${tax.villagers} Dorfbewohner × ${2} + ${tax.bonus} permanenter Token-Bonus)`;

    for (const player of world.getAllPlayers()) {
        if (Array.isArray(teamData.players) && teamData.players.includes(player.id)) {
            player.sendMessage(message);
        }
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
        description: "Zeigt den aktuellen Steuerstatus eines Teams",
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
            const data = result.teamData;
            const villagers = countVillagersInTeamClaims(teamName, "villager");
            const bonus = normalizeTaxBonus(data.taxBonus);
            const tax = calculateTax(villagers, bonus);

            player.sendMessage(`§6--- Steuerinfo: ${data.color || "§f"}${teamName}§6 ---`);
            player.sendMessage(`§7Dorfbewohner: §e${tax.villagers}`);
            player.sendMessage(`§7Steuer pro Dorfbewohner: §e${2} Emeralds/Tag`);
            player.sendMessage(`§7Permanenter Token-Bonus: §e+${tax.bonus} Emeralds/Tag`);
            player.sendMessage(`§7Nächste Tagessteuer: §e${tax.total} Emeralds`);
            player.sendMessage(`§7Bisher insgesamt eingezahlt: §e${data.totalTaxes ?? 0} Emeralds`);
            player.sendMessage(`§7Letzte Zahlung: §e${data.lastTaxAmount ?? 0} Emeralds§7, Tag ${data.lastPaidDay ?? "Nie"}`);
            player.sendMessage(`§7Status: §e${data.lastPaymentStatus ?? "never"}§7, Fehlversuche: §e${data.taxFailures ?? 0}`);
            player.sendMessage(`§7Steuerkiste: ${data.taxChest ? "§aKonfiguriert" : "§cNicht konfiguriert"}`);
        });
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({
        name: "siedler:taxstats",
        description: "Öffnet die Steuerstatistik eines Teams",
        permissionLevel: OP_PERMISSION,
        cheatsRequired: false,
        mandatoryParameters: [{ type: CustomCommandParamType.String, name: "team" }]
    }, (origin, team) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        const teamName = String(team ?? "").trim();
        system.run(() => {
            if (!getTeamOrTell(player, teamName)) return;
            const form = showTaxStatsForm(teamName);
            if (form) form.show(player).catch(() => {});
        });
        return { status: CustomCommandStatus.Success };
    });
}

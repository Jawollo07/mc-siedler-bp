import {
    world,
    system,
    CommandPermissionLevel,
    CustomCommandParamType,
    CustomCommandStatus
} from "@minecraft/server";
import { addTaxes } from "./taxes.js";
import {
    TAX_BONUS_CONFIG,
    calculateTax,
    normalizeTaxBonus
} from "./config.js";
import { getTeams, saveTeams } from "../teams/index.js";
import { countVillagersInTeamClaims } from "../claims/utils.js";

const MORNING_START = 0;
const MORNING_WINDOW = 200;
const LAST_PAID_DAY_PROPERTY = "tax:lastPaidDay";
const OP_PERMISSION = CommandPermissionLevel.GameDirectors;

let dayStarted = false;

system.beforeEvents.startup.subscribe((event) => {
    registerTaxCommands(event.customCommandRegistry);
});

system.runInterval(() => {
    try {
        const timeNow = world.getTimeOfDay();
        const currentDay = Math.floor(world.getAbsoluteTime() / 24000);

        if (timeNow >= MORNING_START && timeNow < MORNING_START + MORNING_WINDOW) {
            if (!dayStarted) {
                dayStarted = true;
                payTaxesOncePerDay(currentDay);
            }
        } else {
            dayStarted = false;
        }
    } catch (error) {
        console.error(`[Steuern] Tagesprüfung fehlgeschlagen: ${error}`);
    }
}, 20);

function playerOnly(origin) {
    const player = origin?.sourceEntity;
    return player?.typeId === "minecraft:player" ? player : null;
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

    // Mark the day before processing so a server restart cannot pay the same
    // daily tax twice. Individual team failures are handled independently.
    if (!setLastPaidDay(currentDay)) return;

    payAllTeamTaxes();
}

function payAllTeamTaxes() {
    const teams = getTeams();
    let paidCount = 0;

    for (const [teamName, data] of Object.entries(teams)) {
        if (!data?.taxChest) continue;

        try {
            const villagerCount = countVillagersInTeamClaims(teamName, "villager");
            const tax = calculateTax(villagerCount, data.taxBonus);

            if (tax.total <= 0) continue;

            const success = addTaxes(data.taxChest, tax.total, teamName);
            if (!success) continue;

            paidCount++;
            notifyTeamMembers(teamName, data, tax);
        } catch (error) {
            console.error(`[Steuern] Fehler für Team "${teamName}": ${error}`);
        }
    }

    if (paidCount > 0) {
        console.info(`[Steuern] ${paidCount} Team(s) haben ihre Tagessteuer erhalten.`);
    }
}

function notifyTeamMembers(teamName, teamData, tax) {
    const color = teamData.color || "§f";
    const bonusText = tax.totalBonus > 0
        ? ` §7(+${tax.totalBonus} Bonus)`
        : "";
    const message =
        `§a[Steuern] ${color}${teamName}§a erhält §e${tax.total} Emeralds§a ` +
        `§7(${tax.villagers} Dorfbewohner${bonusText})`;

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
        mandatoryParameters: [
            { type: CustomCommandParamType.String, name: "team" }
        ]
    }, (origin, team) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        const teamName = String(team ?? "").trim();
        system.run(() => {
            if (!getTeamOrTell(player, teamName)) return;
            const villagerCount = countVillagersInTeamClaims(teamName, "villager");
            player.sendMessage(`§a[Steuern] Team §f${teamName}§a hat §e${villagerCount}§a Dorfbewohner in seinen Claims.`);
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

            result.teamData.taxChest = {
                x: Math.floor(coords[0]),
                y: Math.floor(coords[1]),
                z: Math.floor(coords[2])
            };

            player.sendMessage(
                saveTeams(result.teams)
                    ? `§aSteuerkiste für Team "${result.teamData.color || "§f"}${teamName}§a" gesetzt.`
                    : "§cDie Steuerkonfiguration konnte nicht gespeichert werden."
            );
        });

        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({
        name: "siedler:settaxbonus",
        description: `Setzt den festen TaxBonus (0-${TAX_BONUS_CONFIG.MAX_FIXED_BONUS})`,
        permissionLevel: OP_PERMISSION,
        cheatsRequired: false,
        mandatoryParameters: [
            { type: CustomCommandParamType.String, name: "team" },
            { type: CustomCommandParamType.Float, name: "bonus" }
        ]
    }, (origin, team, bonus) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        const teamName = String(team ?? "").trim();
        system.run(() => {
            const result = getTeamOrTell(player, teamName);
            if (!result) return;

            const value = Number(bonus);
            if (!Number.isFinite(value) || value < 0) {
                player.sendMessage("§cDer Bonus muss eine Zahl ab 0 sein.");
                return;
            }

            result.teamData.taxBonus = normalizeTaxBonus(value);

            player.sendMessage(
                saveTeams(result.teams)
                    ? `§aFester TaxBonus für "${result.teamData.color || "§f"}${teamName}§a": §e${result.teamData.taxBonus} Emeralds/Tag§a.`
                    : "§cDer TaxBonus konnte nicht gespeichert werden."
            );
        });

        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({
        name: "siedler:addtaxbonus",
        description: "Erhöht den festen TaxBonus eines Teams",
        permissionLevel: OP_PERMISSION,
        cheatsRequired: false,
        mandatoryParameters: [
            { type: CustomCommandParamType.String, name: "team" },
            { type: CustomCommandParamType.Float, name: "betrag" }
        ]
    }, (origin, team, amount) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        const teamName = String(team ?? "").trim();
        system.run(() => {
            const result = getTeamOrTell(player, teamName);
            if (!result) return;

            const value = Number(amount);
            if (!Number.isFinite(value)) {
                player.sendMessage("§cDer Betrag muss eine gültige Zahl sein.");
                return;
            }

            const current = normalizeTaxBonus(result.teamData.taxBonus);
            result.teamData.taxBonus = normalizeTaxBonus(current + Math.floor(value));

            player.sendMessage(
                saveTeams(result.teams)
                    ? `§aTaxBonus von "${result.teamData.color || "§f"}${teamName}§a": §e${result.teamData.taxBonus} Emeralds/Tag§a.`
                    : "§cDer TaxBonus konnte nicht gespeichert werden."
            );
        });

        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({
        name: "siedler:taxinfo",
        description: "Zeigt die aktuelle Steuer- und Bonusberechnung eines Teams",
        permissionLevel: OP_PERMISSION,
        cheatsRequired: false,
        mandatoryParameters: [
            { type: CustomCommandParamType.String, name: "team" }
        ]
    }, (origin, team) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        const teamName = String(team ?? "").trim();
        system.run(() => {
            const result = getTeamOrTell(player, teamName);
            if (!result) return;

            const villagerCount = countVillagersInTeamClaims(teamName, "villager");
            const tax = calculateTax(villagerCount, result.teamData.taxBonus);
            const chest = result.teamData.taxChest;

            player.sendMessage(`§6--- Steuerinfo: ${result.teamData.color || "§f"}${teamName}§6 ---`);
            player.sendMessage(`§7Dorfbewohner: §e${tax.villagers}`);
            player.sendMessage(`§7Fester TaxBonus: §e+${tax.fixedBonus}`);
            player.sendMessage(`§7Bevölkerungsbonus: §e+${tax.populationBonus}`);
            player.sendMessage(`§7Gesamtbonus: §e+${tax.totalBonus}`);
            player.sendMessage(`§7Tagessteuer: §e${tax.total} Emeralds`);
            player.sendMessage(`§7Steuerkiste: ${chest ? `§a${chest.x} ${chest.y} ${chest.z}` : "§cnicht gesetzt"}`);
        });

        return { status: CustomCommandStatus.Success };
    });
}

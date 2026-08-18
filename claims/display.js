import { world, system } from "@minecraft/server";
import { getClaimAt } from "./utils.js";
import { getTeams } from "../teams/index.js";

const lastShown = new Map();

system.runInterval(() => {
    const online = new Set();

    for (const player of world.getAllPlayers()) {
        online.add(player.id);

        const claim = getClaimAt(player.location);
        const key = player.id;

        if (!claim) {
            if (lastShown.get(key) !== null) {
                player.onScreenDisplay.setActionBar("");
                lastShown.set(key, null);
            }
            continue;
        }

        if (lastShown.get(key) === claim.team) continue;

        const teamData = getTeams()[claim.team];
        const color = teamData?.color || "§f";
        const players = Array.isArray(teamData?.players) ? teamData.players : [];
        const isOwnTeam = players.includes(player.name);

        const text = isOwnTeam
            ? `§aDein Grundstück §7(${color}${claim.team}§7)`
            : `§7Grundstück von ${color}${claim.team}`;

        player.onScreenDisplay.setActionBar(text);
        lastShown.set(key, claim.team);
    }

    for (const key of lastShown.keys()) {
        if (!online.has(key)) lastShown.delete(key);
    }
}, 10);

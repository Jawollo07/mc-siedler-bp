import {
    system,
    world,
    CommandPermissionLevel,
    CustomCommandParamType,
    CustomCommandStatus
} from "@minecraft/server";

import {
    getChunkCoords,
    getChunkKey,
    getClaims,
    saveClaims,
    get2x2Chunks,
    areChunksFree,
    countTeamClaims
} from "./utils.js";

import { getTeams } from "../teams/index.js";

function getPlayer(origin) {
    const player = origin.sourceEntity;
    return player?.typeId === "minecraft:player" ? player : null;
}

system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;

    registry.registerCommand({
        name: "claim:set",
        description: "Claimt ein 2x2-Chunk-Grundstück für ein Team (nur OPs).",
        permissionLevel: CommandPermissionLevel.Operator,
        cheatsRequired: false,
        mandatoryParameters: [{ type: CustomCommandParamType.String, name: "team" }]
    }, (origin, args) => {
        const player = getPlayer(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        const teamName = String(args[0] ?? "");
        system.run(() => {
            const teams = getTeams();
            if (!teams[teamName]) {
                player.sendMessage(`§cDas Team "${teamName}" existiert nicht.`);
                return;
            }

            const claims = getClaims();
            if (countTeamClaims(teamName, claims) >= 4) {
                player.sendMessage(`§cTeam "${teamName}" hat bereits die maximalen 4 Chunks.`);
                return;
            }

            const start = getChunkCoords(player.location);
            const chunks = get2x2Chunks(start.x, start.z);

            if (!areChunksFree(chunks, claims)) {
                player.sendMessage("§cEiner oder mehrere der 4 Chunks sind bereits geclaimt.");
                return;
            }

            const claimedAt = Date.now();
            for (const chunk of chunks) {
                claims[getChunkKey(chunk.x, chunk.z)] = { team: teamName, claimedAt };
            }

            if (!saveClaims(claims)) {
                player.sendMessage("§cDas Grundstück konnte nicht gespeichert werden.");
                return;
            }

            const color = teams[teamName].color || "§f";
            player.sendMessage(`§a2×2-Grundstück für Team ${color}${teamName}§a gesetzt (Chunks: ${start.x}, ${start.z} bis ${start.x + 1}, ${start.z + 1}).`);
        });

        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({
        name: "claim:remove",
        description: "Entfernt das gesamte Grundstück eines Teams.",
        permissionLevel: CommandPermissionLevel.Operator,
        cheatsRequired: false,
        mandatoryParameters: [{ type: CustomCommandParamType.String, name: "team" }]
    }, (origin, args) => {
        const player = getPlayer(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        const teamName = String(args[0] ?? "");
        system.run(() => {
            const claims = getClaims();
            let removed = 0;

            for (const [key, claim] of Object.entries(claims)) {
                if (claim?.team === teamName) {
                    delete claims[key];
                    removed++;
                }
            }

            if (removed === 0) {
                player.sendMessage(`§cTeam "${teamName}" hat kein Grundstück.`);
                return;
            }

            if (!saveClaims(claims)) {
                player.sendMessage("§cDie Änderungen konnten nicht gespeichert werden.");
                return;
            }

            player.sendMessage(`§eGrundstück von Team "${teamName}" entfernt (${removed} Chunks).`);
        });

        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({
        name: "claim:info",
        description: "Zeigt Informationen zum aktuellen Chunk.",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false
    }, (origin) => {
        const player = getPlayer(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        system.run(() => {
            const chunk = getChunkCoords(player.location);
            const claim = getClaims()[getChunkKey(chunk.x, chunk.z)];
            if (!claim) {
                player.sendMessage(`§7Chunk ${chunk.x}, ${chunk.z} ist §afrei§7.`);
                return;
            }

            const team = getTeams()[claim.team];
            const color = team?.color || "§f";
            player.sendMessage(`§6Chunk ${chunk.x}, ${chunk.z} gehört zu Team ${color}${claim.team}§r.`);
        });

        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({
        name: "claim:list",
        description: "Listet alle vergebenen Grundstücke.",
        permissionLevel: CommandPermissionLevel.Operator,
        cheatsRequired: false
    }, (origin) => {
        const player = getPlayer(origin);
        if (!player) return { status: CustomCommandStatus.Failure };

        system.run(() => {
            const claims = getClaims();
            const teams = getTeams();
            const byTeam = {};

            for (const [key, claim] of Object.entries(claims)) {
                if (!claim?.team) continue;
                (byTeam[claim.team] ??= []).push(key);
            }

            const teamNames = Object.keys(byTeam);
            if (teamNames.length === 0) {
                player.sendMessage("§7Es sind noch keine Grundstücke vergeben.");
                return;
            }

            player.sendMessage("§6--- Vergebene Grundstücke ---");
            for (const teamName of teamNames) {
                const color = teams[teamName]?.color || "§f";
                player.sendMessage(`${color}${teamName}§r: ${byTeam[teamName].length} Chunks (${byTeam[teamName].join(", ")})`);
            }
        });

        return { status: CustomCommandStatus.Success };
    });
});

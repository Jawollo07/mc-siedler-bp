import { system, world, CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { getChunkCoords, getChunkKey, getClaims, saveClaims, get5x5ChunksCentered, areChunksFree, countTeamClaims } from "./utils.js";
import { getTeams } from "../teams/index.js";

const OP_PERMISSION = CommandPermissionLevel.GameDirectors;
const ANY_PERMISSION = CommandPermissionLevel.Any;

function playerOnly(origin) {
    const player = origin?.sourceEntity;
    return player?.typeId === "minecraft:player" ? player : null;
}

function getTeamNames() {
    return Object.keys(getTeams()).sort((a, b) => a.localeCompare(b));
}

function showClaimMenu(player) {
    try {
        const form = new ActionFormData()
            .title("Claims")
            .body("Verwalte die Grundstücke deines Servers.")
            .button("§aGrundstück setzen")
            .button("§cGrundstück entfernen")
            .button("§eAktuellen Claim anzeigen")
            .button("§6Alle Claims anzeigen");

        form.show(player).then((response) => {
            if (response.canceled) return;
            switch (response.selection) {
                case 0: return showSetClaimForm(player);
                case 1: return showRemoveClaimForm(player);
                case 2: return showClaimInfo(player);
                case 3: return showClaimList(player);
            }
        }).catch((error) => console.error(`[Claims] showClaimMenu error: ${error}`));
    } catch (error) {
        console.error(`[Claims] showClaimMenu error: ${error}`);
    }
}

function showSetClaimForm(player) {
    try {
        const teams = getTeams();
        const teamNames = Object.keys(teams).sort((a, b) => a.localeCompare(b));
        if (!teamNames.length) {
            player.sendMessage("§cEs existieren noch keine Teams.");
            return;
        }

        const form = new ModalFormData()
            .title("Grundstück setzen")
            .dropdown("Team", teamNames, { defaultValueIndex: 0 });

        form.show(player).then((response) => {
            if (response.canceled) return;
            const index = Number(response.formValues?.[0] ?? -1);
            const teamName = teamNames[index];
            if (!teamName) {
                player.sendMessage("§cUngültiges Team ausgewählt.");
                return;
            }
            setClaimForPlayer(player, teamName);
        }).catch((error) => console.error(`[Claims] showSetClaimForm error: ${error}`));
    } catch (error) {
        console.error(`[Claims] showSetClaimForm error: ${error}`);
    }
}

function showRemoveClaimForm(player) {
    try {
        const teams = getTeams();
        const teamNames = Object.keys(teams).sort((a, b) => a.localeCompare(b));
        if (!teamNames.length) {
            player.sendMessage("§cEs existieren noch keine Teams.");
            return;
        }

        const form = new ModalFormData()
            .title("Grundstück entfernen")
            .dropdown("Team", teamNames, { defaultValueIndex: 0 });

        form.show(player).then((response) => {
            if (response.canceled) return;
            const index = Number(response.formValues?.[0] ?? -1);
            const teamName = teamNames[index];
            if (!teamName) {
                player.sendMessage("§cUngültiges Team ausgewählt.");
                return;
            }
            removeClaimsForTeam(player, teamName);
        }).catch((error) => console.error(`[Claims] showRemoveClaimForm error: ${error}`));
    } catch (error) {
        console.error(`[Claims] showRemoveClaimForm error: ${error}`);
    }
}

function setClaimForPlayer(player, teamName) {
    system.run(() => {
        const teams = getTeams();
        if (!teams[teamName]) {
            player.sendMessage(`§cDas Team "${teamName}" existiert nicht.`);
            return;
        }
        const claims = getClaims();
            const MAX_CHUNKS = 25; // 5x5
            if (countTeamClaims(teamName, claims) >= MAX_CHUNKS) {
                player.sendMessage(`§cTeam "${teamName}" hat bereits die maximalen ${MAX_CHUNKS} Chunks.`);
                return;
            }
            // Use the player's current block position as the center of the 5x5 claim
            const blockX = Math.floor(player.location.x);
            const blockZ = Math.floor(player.location.z);
            const chunks = get5x5ChunksCentered(blockX, blockZ);
            if (!areChunksFree(chunks, claims)) {
                player.sendMessage("§cEiner oder mehrere der 25 Chunks sind bereits geclaimt.");
                return;
        }
        const claimedAt = Date.now();
        for (const chunk of chunks) {
            claims[getChunkKey(chunk.x, chunk.z)] = { team: teamName, claimedAt };
        }
            player.sendMessage(saveClaims(claims)
                ? `§a5×5-Grundstück für Team ${teams[teamName].color || "§f"}${teamName}§a gesetzt.`
                : "§cDas Grundstück konnte nicht gespeichert werden.");
    });
}

function removeClaimsForTeam(player, teamName) {
    system.run(() => {
        const claims = getClaims();
        let removed = 0;
        for (const [key, claim] of Object.entries(claims)) {
            if (claim?.team === teamName) {
                delete claims[key];
                removed++;
            }
        }
        if (!removed) {
            player.sendMessage(`§cTeam "${teamName}" hat kein Grundstück.`);
            return;
        }
        player.sendMessage(saveClaims(claims)
            ? `§eGrundstück von Team "${teamName}" entfernt (${removed} Chunks).`
            : "§cDie Änderungen konnten nicht gespeichert werden.");
    });
}

function showClaimInfo(player) {
    system.run(() => {
        const chunk = getChunkCoords(player.location);
        const claim = getClaims()[getChunkKey(chunk.x, chunk.z)];
        if (!claim) {
            player.sendMessage(`§7Chunk ${chunk.x}, ${chunk.z} ist §afrei§7.`);
            return;
        }
        const team = getTeams()[claim.team];
        player.sendMessage(`§6Chunk ${chunk.x}, ${chunk.z} gehört zu Team ${team?.color || "§f"}${claim.team}§r.`);
    });
}

function showClaimList(player) {
    system.run(() => {
        const claims = getClaims();
        const teams = getTeams();
        const byTeam = {};
        for (const [key, claim] of Object.entries(claims)) {
            if (claim?.team) (byTeam[claim.team] ??= []).push(key);
        }
        const names = Object.keys(byTeam);
        if (!names.length) {
            player.sendMessage("§7Es sind noch keine Grundstücke vergeben.");
            return;
        }
        player.sendMessage("§6--- Vergebene Grundstücke ---");
        for (const name of names) {
            player.sendMessage(`${teams[name]?.color || "§f"}${name}§r: ${byTeam[name].length} Chunks (${byTeam[name].join(", ")})`);
        }
    });
}

system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;

    registry.registerCommand({ name: "siedler:claim", description: "Öffnet das Claim-Menü.", permissionLevel: ANY_PERMISSION, cheatsRequired: false }, (origin) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => showClaimMenu(player));
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "siedler:claim_set", description: "Claimt ein 2x2-Chunk-Grundstück für ein Team (nur OPs).", permissionLevel: OP_PERMISSION, cheatsRequired: false, mandatoryParameters: [{ type: CustomCommandParamType.String, name: "team" }] }, (origin, team) => {
        const player = playerOnly(origin); if (!player) return { status: CustomCommandStatus.Failure };
        const teamName = String(team ?? "").trim();
        if (!teamName) { player.sendMessage("§cKein Teamname angegeben."); return { status: CustomCommandStatus.Failure }; }
        setClaimForPlayer(player, teamName);
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "siedler:claim_remove", description: "Entfernt das gesamte Grundstück eines Teams.", permissionLevel: OP_PERMISSION, cheatsRequired: false, mandatoryParameters: [{ type: CustomCommandParamType.String, name: "team" }] }, (origin, team) => {
        const player = playerOnly(origin); if (!player) return { status: CustomCommandStatus.Failure };
        const teamName = String(team ?? "").trim();
        if (!teamName) { player.sendMessage("§cKein Teamname angegeben."); return { status: CustomCommandStatus.Failure }; }
        removeClaimsForTeam(player, teamName);
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "siedler:claim_info", description: "Zeigt Informationen zum aktuellen Chunk.", permissionLevel: ANY_PERMISSION, cheatsRequired: false }, (origin) => {
        const player = playerOnly(origin); if (!player) return { status: CustomCommandStatus.Failure };
        showClaimInfo(player);
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "siedler:claim_list", description: "Listet alle vergebenen Grundstücke.", permissionLevel: OP_PERMISSION, cheatsRequired: false }, (origin) => {
        const player = playerOnly(origin); if (!player) return { status: CustomCommandStatus.Failure };
        showClaimList(player);
        return { status: CustomCommandStatus.Success };
    });
});
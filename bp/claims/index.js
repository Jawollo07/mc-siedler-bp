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

// Dynamic Property registrieren
world.beforeEvents.worldInitialize.subscribe((event) => {
    event.dynamicPropertiesDefinition.defineString("claims", 32767);
});

// Commands
system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;

    // ==========================================
    // /claim set <Team>
    // Claimt ein 2×2-Quadrat ausgehend vom Chunk, in dem der OP steht
    // ==========================================
    registry.registerCommand(
        {
            name: "claim:set",
            description: "Claimt ein 2x2-Chunk-Grundstück für ein Team (nur OPs).",
            permissionLevel: CommandPermissionLevel.Operator,
            cheatsRequired: false,
            mandatoryParameters: [
                { type: CustomCommandParamType.String, name: "team" }
            ]
        },
        (origin, args) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") {
                return { status: CustomCommandStatus.Failure };
            }

            const teamName = args[0];

            system.run(() => {
                const teams = getTeams();
                if (!teams[teamName]) {
                    player.sendMessage(`§cDas Team "${teamName}" existiert nicht.`);
                    return;
                }

                const claims = getClaims();

                // Team darf maximal 4 Chunks haben
                if (countTeamClaims(teamName, claims) >= 4) {
                    player.sendMessage(`§cTeam "${teamName}" hat bereits ein Grundstück (4 Chunks).`);
                    return;
                }

                // Aktueller Chunk des OPs = Nord-West-Ecke des 2×2
                const start = getChunkCoords(player.location);
                const chunks = get2x2Chunks(start.x, start.z);

                // Prüfen ob alle 4 frei sind
                if (!areChunksFree(chunks, claims)) {
                    player.sendMessage("§cEiner oder mehrere der 4 Chunks sind bereits geclaimt.");
                    return;
                }

                // Claim speichern
                for (const c of chunks) {
                    const key = getChunkKey(c.x, c.z);
                    claims[key] = {
                        team: teamName,
                        claimedAt: Date.now()
                    };
                }
                saveClaims(claims);

                player.sendMessage(
                    `§a2×2-Grundstück für Team "\( {teams[teamName].color} \){teamName}§a" gesetzt ` +
                    `(Chunks: \( {start.x}, \){start.z} bis \( {start.x + 1}, \){start.z + 1})`
                );
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    // ==========================================
    // /claim remove <Team>
    // ==========================================
    registry.registerCommand(
        {
            name: "claim:remove",
            description: "Entfernt das gesamte 2×2-Grundstück eines Teams.",
            permissionLevel: CommandPermissionLevel.Operator,
            cheatsRequired: false,
            mandatoryParameters: [
                { type: CustomCommandParamType.String, name: "team" }
            ]
        },
        (origin, args) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") {
                return { status: CustomCommandStatus.Failure };
            }

            const teamName = args[0];

            system.run(() => {
                const claims = getClaims();
                let removed = 0;

                for (const [key, claim] of Object.entries(claims)) {
                    if (claim.team === teamName) {
                        delete claims[key];
                        removed++;
                    }
                }

                if (removed === 0) {
                    player.sendMessage(`§cTeam "${teamName}" hat kein Grundstück.`);
                    return;
                }

                saveClaims(claims);
                player.sendMessage(`§eGrundstück von Team "\( {teamName}" entfernt ( \){removed} Chunks).`);
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    // ==========================================
    // /claim info
    // ==========================================
    registry.registerCommand(
        {
            name: "claim:info",
            description: "Zeigt Informationen zum aktuellen Chunk.",
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false
        },
        (origin) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") {
                return { status: CustomCommandStatus.Failure };
            }

            system.run(() => {
                const chunk = getChunkCoords(player.location);
                const claims = getClaims();
                const claim = claims[getChunkKey(chunk.x, chunk.z)];

                if (!claim) {
                    player.sendMessage(`§7Chunk ${chunk.x}, ${chunk.z} ist §afrei§7.`);
                    return;
                }

                const teams = getTeams();
                const team = teams[claim.team];
                const color = team ? team.color : "§f";

                player.sendMessage(
                    `§6Chunk ${chunk.x}, ${chunk.z} gehört zu Team \( {color} \){claim.team}§r.`
                );
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    // ==========================================
    // /claim list
    // ==========================================
    registry.registerCommand(
        {
            name: "claim:list",
            description: "Listet alle vergebenen Grundstücke.",
            permissionLevel: CommandPermissionLevel.Operator,
            cheatsRequired: false
        },
        (origin) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") {
                return { status: CustomCommandStatus.Failure };
            }

            system.run(() => {
                const claims = getClaims();
                const teams = getTeams();

                // Nach Teams gruppieren
                const byTeam = {};
                for (const [key, claim] of Object.entries(claims)) {
                    if (!byTeam[claim.team]) byTeam[claim.team] = [];
                    byTeam[claim.team].push(key);
                }

                if (Object.keys(byTeam).length === 0) {
                    player.sendMessage("§7Es sind noch keine Grundstücke vergeben.");
                    return;
                }

                player.sendMessage("§6--- Vergebene Grundstücke ---");
                for (const [teamName, chunks] of Object.entries(byTeam)) {
                    const color = teams[teamName]?.color || "§f";
                    player.sendMessage(`\( {color} \){teamName}§r: \( {chunks.length} Chunks ( \){chunks.join(", ")})`);
                }
            });

            return { status: CustomCommandStatus.Success };
        }
    );
});
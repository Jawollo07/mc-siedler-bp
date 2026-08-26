import { world, system } from "@minecraft/server";
import { getClaimAt, getChunkCoords, getChunkKey, getClaims } from "./utils.js";
import { getTeams } from "../teams/index.js";

const lastShown = new Map();
const BORDER_DISTANCE = 6;
const BORDER_PARTICLE = "minecraft:totem_particle";

function showNearbyClaimBorders(player) {
    const location = player.location;
    const chunk = getChunkCoords(location);
    const claims = getClaims();
    const shown = new Set();

    for (let chunkX = chunk.x - 1; chunkX <= chunk.x + 1; chunkX++) {
        for (let chunkZ = chunk.z - 1; chunkZ <= chunk.z + 1; chunkZ++) {
            const claim = claims[getChunkKey(chunkX, chunkZ)];
            if (!claim?.team) continue;

            const isSameTeamClaim = (neighbourX, neighbourZ) =>
                claims[getChunkKey(neighbourX, neighbourZ)]?.team === claim.team;
            const boundaries = [
                { distance: Math.abs(location.x - chunkX * 16), near: location.z, fixed: chunkX * 16, horizontal: false, neighbour: [chunkX - 1, chunkZ] },
                { distance: Math.abs(location.x - (chunkX + 1) * 16), near: location.z, fixed: (chunkX + 1) * 16, horizontal: false, neighbour: [chunkX + 1, chunkZ] },
                { distance: Math.abs(location.z - chunkZ * 16), near: location.x, fixed: chunkZ * 16, horizontal: true, neighbour: [chunkX, chunkZ - 1] },
                { distance: Math.abs(location.z - (chunkZ + 1) * 16), near: location.x, fixed: (chunkZ + 1) * 16, horizontal: true, neighbour: [chunkX, chunkZ + 1] }
            ];

            for (const boundary of boundaries) {
                if (isSameTeamClaim(...boundary.neighbour)) continue;

                const minAlong = boundary.horizontal ? chunkX * 16 : chunkZ * 16;
                const maxAlong = boundary.horizontal ? (chunkX + 1) * 16 : (chunkZ + 1) * 16;
                const along = Math.max(minAlong, Math.min(maxAlong, boundary.near));
                const distance = Math.sqrt(boundary.distance ** 2 + (boundary.near - along) ** 2);
                if (distance > BORDER_DISTANCE) continue;

                const boundaryKey = `${boundary.fixed}:${boundary.horizontal ? "z" : "x"}`;
                if (shown.has(boundaryKey)) continue;
                shown.add(boundaryKey);

                for (let offset = -4; offset <= 4; offset += 2) {
                    const particleAlong = Math.max(minAlong, Math.min(maxAlong, along + offset));
                    for (const height of [0.2, 0.9]) {
                        const particleLocation = boundary.horizontal
                            ? { x: particleAlong, y: location.y + height, z: boundary.fixed }
                            : { x: boundary.fixed, y: location.y + height, z: particleAlong };
                        try {
                            player.dimension.spawnParticle(BORDER_PARTICLE, particleLocation);
                        } catch (error) {
                        }
                    }
                }
            }
        }
    }
}

system.runInterval(() => {
    const online = new Set();

    for (const player of world.getAllPlayers()) {
        online.add(player.id);

        const claim = getClaimAt(player.location);
        const key = player.id;

        showNearbyClaimBorders(player);

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

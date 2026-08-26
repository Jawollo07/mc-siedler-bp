import { world, system } from "@minecraft/server";
import { getClaimAt, getChunkCoords, getChunkKey, getClaims } from "./utils.js";
import { getTeams } from "../teams/index.js";

const lastShown = new Map();
const BORDER_DISTANCE = 6;
const BORDER_PARTICLE = "minecraft:endrod";

function showNearbyClaimBorder(player, claim) {
    const location = player.location;
    const chunk = getChunkCoords(location);
    const claims = getClaims();
    const isSameTeamClaim = (chunkX, chunkZ) => claims[getChunkKey(chunkX, chunkZ)]?.team === claim.team;
    const boundaries = [
        { distance: location.x - chunk.x * 16, near: location.x, fixed: chunk.z * 16, horizontal: true, neighbour: [chunk.x - 1, chunk.z] },
        { distance: (chunk.x + 1) * 16 - location.x, near: location.x, fixed: (chunk.z + 1) * 16, horizontal: true, neighbour: [chunk.x + 1, chunk.z] },
        { distance: location.z - chunk.z * 16, near: location.z, fixed: chunk.x * 16, horizontal: false, neighbour: [chunk.x, chunk.z - 1] },
        { distance: (chunk.z + 1) * 16 - location.z, near: location.z, fixed: (chunk.x + 1) * 16, horizontal: false, neighbour: [chunk.x, chunk.z + 1] }
    ];

    for (const boundary of boundaries) {
        if (boundary.distance > BORDER_DISTANCE || isSameTeamClaim(...boundary.neighbour)) continue;

        const minAlong = boundary.horizontal ? chunk.x * 16 : chunk.z * 16;
        const maxAlong = boundary.horizontal ? (chunk.x + 1) * 16 : (chunk.z + 1) * 16;
        for (let offset = -6; offset <= 6; offset += 2) {
            const along = boundary.near + offset;
            if (along < minAlong || along > maxAlong) continue;

            const particleLocation = boundary.horizontal
                ? { x: along, y: location.y + 0.2, z: boundary.fixed }
                : { x: boundary.fixed, y: location.y + 0.2, z: along };
            try {
                player.dimension.spawnParticle(BORDER_PARTICLE, particleLocation);
            } catch (error) {
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

        if (!claim) {
            if (lastShown.get(key) !== null) {
                player.onScreenDisplay.setActionBar("");
                lastShown.set(key, null);
            }
            continue;
        }

        showNearbyClaimBorder(player, claim);

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

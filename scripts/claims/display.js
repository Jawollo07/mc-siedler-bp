import { world, system } from "@minecraft/server";
import { getClaimAt, getChunkCoords, getChunkKey, getClaims } from "./utils.js";
import { getTeams } from "../teams/index.js";

const lastShown = new Map();

const BORDER_DISTANCE = 8;
const BORDER_PARTICLE = "minecraft:totem_particle";
const BORDER_INTERVAL = 10;
const PARTICLE_SPACING = 2;
const BORDER_HEIGHTS = [0.15, 0.8, 1.45];
const MAX_PARTICLES_PER_PLAYER = 180;

/**
 * Returns whether a neighbouring chunk belongs to the same team.
 * Borders between two claims owned by the same team are not displayed.
 */
function isSameTeamClaim(claims, x, z, team) {
    return claims[getChunkKey(x, z)]?.team === team;
}

/**
 * Creates a stable key for a claim border segment.
 */
function getBorderKey(x, z, side) {
    return `${x}:${z}:${side}`;
}

/**
 * Adds particles along one straight claim border.
 * The line is clipped to the chunk and only rendered when close enough.
 */
function renderBorder(player, boundary, state) {
    if (state.count >= MAX_PARTICLES_PER_PLAYER) return;

    const { horizontal, fixed, minAlong, maxAlong, near } = boundary;
    const clampedNear = Math.max(minAlong, Math.min(maxAlong, near));

    // Render a small section around the player instead of the complete border.
    const renderStart = Math.max(minAlong, clampedNear - BORDER_DISTANCE);
    const renderEnd = Math.min(maxAlong, clampedNear + BORDER_DISTANCE);

    for (let along = renderStart; along <= renderEnd; along += PARTICLE_SPACING) {
        for (const height of BORDER_HEIGHTS) {
            if (state.count >= MAX_PARTICLES_PER_PLAYER) return;

            const particleLocation = horizontal
                ? {
                    x: along,
                    y: player.location.y + height,
                    z: fixed,
                }
                : {
                    x: fixed,
                    y: player.location.y + height,
                    z: along,
                };

            try {
                player.dimension.spawnParticle(BORDER_PARTICLE, particleLocation);
                state.count++;
            } catch {
                // A player can leave/change dimension while particles are rendered.
            }
        }
    }
}

function showNearbyClaimBorders(player) {
    const location = player.location;
    const chunk = getChunkCoords(location);
    const claims = getClaims();
    const shown = new Set();
    const state = { count: 0 };

    // Check the surrounding 5x5 chunk area so borders are also visible
    // when the player is close to a claim just outside the current chunk.
    for (let chunkX = chunk.x - 2; chunkX <= chunk.x + 2; chunkX++) {
        for (let chunkZ = chunk.z - 2; chunkZ <= chunk.z + 2; chunkZ++) {
            if (state.count >= MAX_PARTICLES_PER_PLAYER) return;

            const claim = claims[getChunkKey(chunkX, chunkZ)];
            if (!claim?.team) continue;

            const boundaries = [
                {
                    side: "west",
                    x: chunkX,
                    z: chunkZ,
                    horizontal: false,
                    fixed: chunkX * 16,
                    minAlong: chunkZ * 16,
                    maxAlong: (chunkZ + 1) * 16,
                    near: location.z,
                    neighbour: [chunkX - 1, chunkZ],
                },
                {
                    side: "east",
                    x: chunkX,
                    z: chunkZ,
                    horizontal: false,
                    fixed: (chunkX + 1) * 16,
                    minAlong: chunkZ * 16,
                    maxAlong: (chunkZ + 1) * 16,
                    near: location.z,
                    neighbour: [chunkX + 1, chunkZ],
                },
                {
                    side: "north",
                    x: chunkX,
                    z: chunkZ,
                    horizontal: true,
                    fixed: chunkZ * 16,
                    minAlong: chunkX * 16,
                    maxAlong: (chunkX + 1) * 16,
                    near: location.x,
                    neighbour: [chunkX, chunkZ - 1],
                },
                {
                    side: "south",
                    x: chunkX,
                    z: chunkZ,
                    horizontal: true,
                    fixed: (chunkZ + 1) * 16,
                    minAlong: chunkX * 16,
                    maxAlong: (chunkX + 1) * 16,
                    near: location.x,
                    neighbour: [chunkX, chunkZ + 1],
                },
            ];

            for (const boundary of boundaries) {
                if (isSameTeamClaim(claims, boundary.neighbour[0], boundary.neighbour[1], claim.team)) {
                    continue;
                }

                const key = getBorderKey(boundary.x, boundary.z, boundary.side);
                if (shown.has(key)) continue;

                const distanceToBorder = boundary.horizontal
                    ? Math.abs(location.z - boundary.fixed)
                    : Math.abs(location.x - boundary.fixed);

                if (distanceToBorder > BORDER_DISTANCE) continue;

                shown.add(key);
                renderBorder(player, boundary, state);
            }
        }
    }
}

function updateClaimDisplay(player) {
    const claim = getClaimAt(player.location);
    const key = player.id;

    showNearbyClaimBorders(player);

    if (!claim) {
        if (lastShown.get(key) !== null) {
            try {
                player.onScreenDisplay.setActionBar("");
            } catch {
                // Player may have disconnected during the update.
            }
            lastShown.set(key, null);
        }
        return;
    }

    if (lastShown.get(key) === claim.team) return;

    const teamData = getTeams()[claim.team];
    const color = teamData?.color || "§f";
    const players = Array.isArray(teamData?.players) ? teamData.players : [];
    const isOwnTeam = players.includes(player.name);

    const text = isOwnTeam
        ? `§aDein Grundstück §7(${color}${claim.team}§7)`
        : `§7Grundstück von ${color}${claim.team}`;

    try {
        player.onScreenDisplay.setActionBar(text);
        lastShown.set(key, claim.team);
    } catch {
        // Player may have disconnected during the update.
    }
}

system.runInterval(() => {
    const online = new Set();

    for (const player of world.getAllPlayers()) {
        online.add(player.id);
        updateClaimDisplay(player);
    }

    // Remove cached players that are no longer online.
    for (const key of lastShown.keys()) {
        if (!online.has(key)) lastShown.delete(key);
    }
}, BORDER_INTERVAL);

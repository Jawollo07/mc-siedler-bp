import { world } from "@minecraft/server";
import { getTeams } from "../teams/index.js";

/** Chunk-Koordinaten aus Block-Position berechnen */
export function getChunkCoords(location) {
    return {
        x: Math.floor(location.x / 16),
        z: Math.floor(location.z / 16)
    };
}

/** Key für einen Chunk */
export function getChunkKey(chunkX, chunkZ) {
    return `\( {chunkX}, \){chunkZ}`;
}

/** Alle Claims laden */
export function getClaims() {
    const raw = world.getDynamicProperty("claims");
    return raw ? JSON.parse(raw) : {};
}

/** Claims speichern */
export function saveClaims(claims) {
    world.setDynamicProperty("claims", JSON.stringify(claims));
}

/** Gibt den Claim eines Chunks zurück (oder null) */
export function getClaimAt(location) {
    const chunk = getChunkCoords(location);
    const claims = getClaims();
    return claims[getChunkKey(chunk.x, chunk.z)] || null;
}

/** Prüft, ob ein Spieler Zugriff auf einen Claim hat */
export function hasAccess(player, claim) {
    if (!claim) return true; // unclaimed = frei

    const teams = getTeams();
    const team = teams[claim.team];
    if (!team) return false;

    return team.players.includes(player.name);
}

/** Erzeugt die 4 Chunks eines 2×2-Quadrats ausgehend von der Nord-West-Ecke */
export function get2x2Chunks(startChunkX, startChunkZ) {
    return [
        { x: startChunkX,     z: startChunkZ },
        { x: startChunkX + 1, z: startChunkZ },
        { x: startChunkX,     z: startChunkZ + 1 },
        { x: startChunkX + 1, z: startChunkZ + 1 }
    ];
}

/** Prüft, ob alle 4 Chunks frei sind */
export function areChunksFree(chunks, claims) {
    for (const c of chunks) {
        const key = getChunkKey(c.x, c.z);
        if (claims[key]) return false;
    }
    return true;
}

/** Zählt, wie viele Chunks ein Team bereits besitzt */
export function countTeamClaims(teamName, claims) {
    let count = 0;
    for (const claim of Object.values(claims)) {
        if (claim.team === teamName) count++;
    }
    return count;
}
/**
 * Zählt alle Dorfbewohner innerhalb der Claims eines Teams
 */
export function countVillagersInTeamClaims(teamName) {
    const claims = getClaims();
    const dimension = world.getDimension("overworld");
    let count = 0;

    // Alle Chunks des Teams finden
    const teamChunks = [];
    for (const [key, claim] of Object.entries(claims)) {
        if (claim.team === teamName) {
            const [cx, cz] = key.split(",").map(Number);
            teamChunks.push({ x: cx, z: cz });
        }
    }

    if (teamChunks.length === 0) return 0;

    // Alle Dorfbewohner in der Welt holen und prüfen, ob sie in einem Team-Chunk sind
    const villagers = dimension.getEntities({ type: "minecraft:villager" });

    for (const villager of villagers) {
        const loc = villager.location;
        const chunkX = Math.floor(loc.x / 16);
        const chunkZ = Math.floor(loc.z / 16);

        const isInTeamClaim = teamChunks.some(c => c.x === chunkX && c.z === chunkZ);
        if (isInTeamClaim) {
            count++;
        }
    }

    return count;
}
import { world } from "@minecraft/server";
import { getTeams } from "../teams/index.js";

/** Chunk-Koordinaten aus Block-Position berechnen. Funktioniert auch für negative Koordinaten. */
export function getChunkCoords(location) {
    return {
        x: Math.floor(location.x / 16),
        z: Math.floor(location.z / 16)
    };
}

/** Stabiler Schlüssel für einen Chunk. */
export function getChunkKey(chunkX, chunkZ) {
    return `${chunkX},${chunkZ}`;
}

/** Alle Claims laden. Beschädigte/ungültige Daten werden nicht den gesamten Script-Start zerstören lassen. */
export function getClaims() {
    const raw = world.getDynamicProperty("claims");
    if (typeof raw !== "string" || raw.length === 0) return {};

    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
        console.error(`[Claims] Ungültige Claims-Daten: ${error}`);
        return {};
    }
}

/** Claims speichern. */
export function saveClaims(claims) {
    try {
        world.setDynamicProperty("claims", JSON.stringify(claims));
        return true;
    } catch (error) {
        console.error(`[Claims] Fehler beim Speichern: ${error}`);
        return false;
    }
}

/** Gibt den Claim eines Chunks zurück (oder null). */
export function getClaimAt(location) {
    const chunk = getChunkCoords(location);
    const claims = getClaims();
    return claims[getChunkKey(chunk.x, chunk.z)] || null;
}

/** Prüft, ob ein Spieler Zugriff auf einen Claim hat. */
export function hasAccess(player, claim) {
    if (!claim) return true;

    const teams = getTeams();
    const team = teams[claim.team];
    if (!team || !Array.isArray(team.players)) return false;

    return team.players.includes(player.name);
}

/**
 * Berechnet das 2x2-Chunk-Raster so, dass die übergebene Block-Koordinate
 * (wo der Spieler steht) exakt das mathematische Zentrum bildet.
 */
export function get2x2ChunksCentered(blockX, blockZ) {
    // Ein Chunk hat 16 Blöcke. Um das Zentrum eines 2x2-Rasters (32x32 Blöcke) 
    // zu treffen, verschieben wir den Startpunkt um ein halbes Raster (16 Blöcke) nach Nord-Westen.
    const startChunkX = Math.floor((blockX - 16) / 16);
    const startChunkZ = Math.floor((blockZ - 16) / 16);

    return [
        { x: startChunkX, z: startChunkZ },         // Nord-West
        { x: startChunkX + 1, z: startChunkZ },     // Nord-Ost
        { x: startChunkX, z: startChunkZ + 1 },     // Süd-West
        { x: startChunkX + 1, z: startChunkZ + 1 }  // Süd-Ost
    ];
}

/**
 * Returns a 2x2 chunk grid starting at the given chunk coordinates (NW corner).
 * This is a simple helper used by claims logic which passes chunk coordinates.
 */
export function get2x2Chunks(chunkX, chunkZ) {
    return [
        { x: chunkX, z: chunkZ },
        { x: chunkX + 1, z: chunkZ },
        { x: chunkX, z: chunkZ + 1 },
        { x: chunkX + 1, z: chunkZ + 1 }
    ];
}


/** Prüft, ob alle 4 Chunks frei sind. */
export function areChunksFree(chunks, claims) {
    return chunks.every((chunk) => !claims[getChunkKey(chunk.x, chunk.z)]);
}

/** Zählt, wie viele Chunks ein Team bereits besitzt. */
export function countTeamClaims(teamName, claims) {
    return Object.values(claims).filter((claim) => claim?.team === teamName).length;
}

/** Zählt Dorfbewohner innerhalb der Claims eines Teams. */
export function countVillagersInTeamClaims(teamName) {
    const claims = getClaims();
    const dimension = world.getDimension("overworld");
    const teamChunks = [];

    for (const [key, claim] of Object.entries(claims)) {
        if (claim?.team !== teamName) continue;

        const separator = key.indexOf(",");
        if (separator === -1) continue;

        const x = Number(key.slice(0, separator));
        const z = Number(key.slice(separator + 1));
        if (Number.isInteger(x) && Number.isInteger(z)) {
            teamChunks.push({ x, z });
        }
    }

    if (teamChunks.length === 0) return 0;

    const claimedKeys = new Set(teamChunks.map((chunk) => getChunkKey(chunk.x, chunk.z)));
    const villagers = dimension.getEntities({ type: "minecraft:villager" });

    let count = 0;
    for (const villager of villagers) {
        const chunk = getChunkCoords(villager.location);
        if (claimedKeys.has(getChunkKey(chunk.x, chunk.z))) count++;
    }

    return count;
}

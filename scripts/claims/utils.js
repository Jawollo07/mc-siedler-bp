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

/** Liefert die string-Repräsentation des Entity-Typs. Unterstützt verschiedene Bedrock-Field-Varianten. */
export function getEntityType(entity) {
    if (!entity) return null;
    if (typeof entity.typeId === "string") return entity.typeId;
    if (typeof entity.type === "string") return entity.type;
    if (entity.type && typeof entity.type.id === "string") return entity.type.id;
    if (typeof entity.id === "string") return entity.id;
    if (typeof entity.__identifier__ === "string") return entity.__identifier__;
    return null;
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

/**
 * Berechnet ein 5x5-Chunk-Raster mit der gegebenen Block-Position als Zentrum.
 * Die Funktion nimmt Block-Koordinaten (x, z) und bestimmt die 5×5 Chunks,
 * sodass der Chunk, in dem sich der Block befindet, das Zentrum der 5×5-Matrix ist.
 */
export function get4x4ChunksCentered(blockX, blockZ) {
    const centerChunkX = Math.floor(blockX / 16);
    const centerChunkZ = Math.floor(blockZ / 16);
    return get4x4ChunksFromChunk(centerChunkX, centerChunkZ);
}

export function get4x4ChunksFromChunk(centerChunkX, centerChunkZ) {
    const half = 2; // 4x4 -> radius 2
    const startX = centerChunkX - half;
    const startZ = centerChunkZ - half;

    const chunks = [];
    for (let dx = 0; dx < 5; dx++) {
        for (let dz = 0; dz < 5; dz++) {
            chunks.push({ x: startX + dx, z: startZ + dz });
        }
    }

    return chunks;
}

/**
 * Returns a 4x4 chunk grid using the provided chunk coordinates as center.
 * centerChunkX/centerChunkZ are chunk coordinates (not block coords).
 */

export function countEntitiesInChunksByPrefix(prefix, chunks) {
  const dimension = world.getDimension("overworld");
  const claimed = new Set(chunks.map(c => getChunkKey(c.x, c.z)));
  const entities = Array.from(dimension.getEntities()); // alle Entities
  let count = 0;
  for (const ent of entities) {
    try {
            const type = getEntityType(ent);
      if (!type) continue;
      if (!type.startsWith(prefix)) continue;
      const chunk = getChunkCoords(ent.location);
      if (claimed.has(getChunkKey(chunk.x, chunk.z))) count++;
    } catch (err) { /* ignore invalid entities */ }
  }
  return count;
}

export function countEntitiesInChunksByTypes(types, chunks) {
  const dimension = world.getDimension("overworld");
  const claimed = new Set(chunks.map(c => getChunkKey(c.x, c.z)));
  let count = 0;
  for (const t of types) {
        try {
            const entitiesByType = Array.from(dimension.getEntities({ type: t }));
            for (const e of entitiesByType) {
                const chunk = getChunkCoords(e.location);
                if (claimed.has(getChunkKey(chunk.x, chunk.z))) count++;
            }
        } catch (err) {
            // Falls das Filter-Objekt von getEntities nicht unterstützt wird,
            // fallen wir zurück auf Vollscan + Filter.
            const all = Array.from(dimension.getEntities());
            for (const e of all) {
                const et = getEntityType(e);
                if (!et) continue;
                if (et !== t) continue;
                const chunk = getChunkCoords(e.location);
                if (claimed.has(getChunkKey(chunk.x, chunk.z))) count++;
            }
        }
  }
  return count;
}

/** Prüft, ob alle 4 Chunks frei sind. */
export function areChunksFree(chunks, claims) {
    return chunks.every((chunk) => !claims[getChunkKey(chunk.x, chunk.z)]);
}

/** Zählt, wie viele Chunks ein Team bereits besitzt. */
export function countTeamClaims(teamName, claims) {
    return Object.values(claims).filter((claim) => claim?.team === teamName).length;
}

/** Zählt Villager innerhalb der Claims eines Teams anhand von Typ oder Entity-Tag. */
export function countVillagersInTeamClaims(teamName, tag = "villager") {
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

    // Ein einzelner Tag wird akzeptiert, inklusive Teilzeichenfolge.
    // Beispiel: "vil" passt auf "villager".
    const requiredTag = typeof tag === "string" ? tag.trim() : "";
    const isVillager = (entity) => {
        try {
            const type = getEntityType(entity);
            if (type === "minecraft:villager" || type === "minecraft:villager_v2") return true;
            if (!requiredTag) return false;
            const entityTags = entity.getTags();
            return entityTags.some((entityTag) => typeof entityTag === "string" && entityTag.includes(requiredTag));
        } catch (err) {
            return false;
        }
    };
    let entities;
    try {
        entities = Array.from(dimension.getEntities());
    } catch (err) {
        try {
            // Fallback falls getEntities kein Iterable zurückgibt
            entities = dimension.getEntities({});
        } catch (e) {
            console.error(`[Claims] Fehler beim Laden der Entities: ${e}`);
            return 0;
        }
    }

    let count = 0;
    for (const ent of entities) {
        try {
            if (!isVillager(ent)) continue;

            const chunk = getChunkCoords(ent.location);
            if (claimedKeys.has(getChunkKey(chunk.x, chunk.z))) count++;
        } catch (err) {
            // Ignoriere fehlerhafte/gelöschte Entities
            continue;
        }
    }

    return count;
}

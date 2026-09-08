import { world } from "@minecraft/server";
import { createLogger } from "../core/logger.js";
import { getClaimAt } from "../claims/utils.js";

const logger = createLogger("Essentials:VillagerDeath");

const VILLAGER_TYPES = new Set([
    "minecraft:villager",
    "minecraft:villager_v2"
]);

function isVillager(entity) {
    try {
        return !!entity && VILLAGER_TYPES.has(entity.typeId);
    } catch {
        return false;
    }
}

function safeString(value, fallback = "unbekannt") {
    if (value === undefined || value === null || value === "") return fallback;
    return String(value);
}

function formatPosition(entity) {
    try {
        const { x, y, z } = entity.location;
        return `${Math.floor(x)}, ${Math.floor(y)}, ${Math.floor(z)}`;
    } catch {
        return "unbekannt";
    }
}

function formatDimension(entity) {
    try {
        return safeString(entity.dimension?.id, "unbekannt").replace(/^minecraft:/, "");
    } catch {
        return "unbekannt";
    }
}

function formatEntity(entity) {
    if (!entity) return "keiner";

    try {
        const typeId = safeString(entity.typeId);
        const name = safeString(entity.nameTag, "");
        const id = safeString(entity.id, "unbekannt");
        return name ? `${name} [${typeId}] (ID: ${id})` : `${typeId} (ID: ${id})`;
    } catch {
        return "unbekannt";
    }
}

function formatCause(damageSource) {
    try {
        return safeString(damageSource?.cause, "unbekannt");
    } catch {
        return "unbekannt";
    }
}

function getProjectile(damageSource) {
    try {
        return damageSource?.damagingProjectile ?? null;
    } catch {
        return null;
    }
}

function getDamager(damageSource) {
    try {
        return damageSource?.damagingEntity ?? null;
    } catch {
        return null;
    }
}

function getClaimTeam(entity) {
    try {
        const claim = getClaimAt(entity.location);
        if (!claim) return "§7Kein Claim";
        return safeString(claim.team, "§cUnbekanntes Team");
    } catch (error) {
        logger.debug(`Claim-Team konnte für Villager nicht ermittelt werden: ${error}`);
        return "§cNicht ermittelbar";
    }
}

function logVillagerDeath(event) {
    const villager = event?.deadEntity;
    if (!isVillager(villager)) return;

    const damageSource = event?.damageSource;
    const damager = getDamager(damageSource);
    const projectile = getProjectile(damageSource);
    const cause = formatCause(damageSource);
    const claimTeam = getClaimTeam(villager);

    const details = [
        `Villager-Tod erkannt`,
        `Name: ${safeString(villager.nameTag, "<kein NameTag>")}`,
        `Typ: ${safeString(villager.typeId)}`,
        `ID: ${safeString(villager.id)}`,
        `Position: ${formatPosition(villager)}`,
        `Dimension: ${formatDimension(villager)}`,
        `Aktueller Claim / Team: ${claimTeam}`,
        `Todesursache: ${cause}`,
        `Verursacher: ${formatEntity(damager)}`,
        `Projektile: ${formatEntity(projectile)}`
    ];

    logger.warn(details.join(" | "));
}

export function registerVillagerDeathLogger() {
    try {
        if (!world.afterEvents?.entityDie?.subscribe) {
            logger.error("Villager-Todeslogger konnte nicht aktiviert werden: afterEvents.entityDie ist nicht verfügbar.");
            return false;
        }

        world.afterEvents.entityDie.subscribe((event) => {
            try {
                logVillagerDeath(event);
            } catch (error) {
                logger.exception("Verarbeitung eines Villager-Todes ist fehlgeschlagen", error);
            }
        });

        logger.info("Villager-Todeslogger aktiviert. Todesursache, Verursacher, Projektil, Position, Dimension und Claim-Team werden erfasst.");
        return true;
    } catch (error) {
        logger.exception("Villager-Todeslogger konnte nicht registriert werden", error);
        return false;
    }
}

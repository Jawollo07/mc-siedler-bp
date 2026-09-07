import { world } from "@minecraft/server";
import { createLogger } from "../core/logger.js";
import { HOMES_KEY, DEATH_POINTS_KEY, homes, deathPoints } from "./state.js";

const logger = createLogger("Essentials:Storage");

function isValidLocation(value) {
    return value &&
        Number.isFinite(Number(value.x)) &&
        Number.isFinite(Number(value.y)) &&
        Number.isFinite(Number(value.z)) &&
        typeof value.dimension === "string";
}

export function readObject(key) {
    const raw = world.getDynamicProperty(key);
    if (typeof raw !== "string" || !raw) {
        logger.debug(`Keine Daten für ${key} vorhanden.`);
        return {};
    }

    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            logger.warn(`Dynamic Property ${key} enthält kein gültiges Objekt.`);
            return {};
        }
        return parsed;
    } catch (error) {
        logger.exception(`Ungültige Dynamic Property ${key}`, error);
        return {};
    }
}

export function writeObject(key, value) {
    try {
        world.setDynamicProperty(key, JSON.stringify(value));
        logger.debug(`${key} gespeichert (${Object.keys(value).length} Einträge).`);
        return true;
    } catch (error) {
        logger.exception(`Fehler beim Speichern von ${key}`, error);
        return false;
    }
}

export function loadPersistentState() {
    homes.clear();
    deathPoints.clear();

    const homeData = readObject(HOMES_KEY);
    const deathData = readObject(DEATH_POINTS_KEY);
    let invalidHomes = 0;
    let invalidDeaths = 0;

    for (const [id, value] of Object.entries(homeData)) {
        if (isValidLocation(value)) homes.set(id, value);
        else invalidHomes++;
    }
    for (const [id, value] of Object.entries(deathData)) {
        if (isValidLocation(value)) deathPoints.set(id, value);
        else invalidDeaths++;
    }

    logger.info(`Persistenter Zustand geladen: ${homes.size} Homes, ${deathPoints.size} Todespunkte.`);
    if (invalidHomes || invalidDeaths) {
        logger.warn(`Ungültige Einträge verworfen: ${invalidHomes} Homes, ${invalidDeaths} Todespunkte.`);
    }
}

export function saveHomes() {
    return writeObject(HOMES_KEY, Object.fromEntries(homes));
}

export function saveDeaths() {
    return writeObject(DEATH_POINTS_KEY, Object.fromEntries(deathPoints));
}

export { isValidLocation };

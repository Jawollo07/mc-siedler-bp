import { world, ItemStack } from "@minecraft/server";
import { createLogger } from "../core/logger.js";

const logger = createLogger("Taxes");
const MAX_TAX_AMOUNT = 10000;
const MAX_CHEST_CAPACITY = 27 * 64;

function normalizeAmount(amount) {
    const number = Number(amount);
    if (!Number.isFinite(number)) return 0;
    return Math.min(MAX_TAX_AMOUNT, Math.max(0, Math.floor(number)));
}

function getChestCapacity(container) {
    let capacity = 0;

    for (let slot = 0; slot < container.size; slot++) {
        const item = container.getItem(slot);

        if (!item) {
            capacity += 64;
            continue;
        }

        if (item.typeId === "minecraft:emerald") {
            capacity += Math.max(0, 64 - item.amount);
        }
    }

    return Math.min(MAX_CHEST_CAPACITY, capacity);
}

/**
 * Deposits a daily tax into a team's tax chest.
 *
 * Tax payments are atomic: if the chest cannot hold the complete amount,
 * nothing is inserted and no Emeralds are dropped on the ground.
 */
export function addTaxes(coords, amount, teamName = "Unbekannt") {
    const safeAmount = normalizeAmount(amount);

    if (safeAmount <= 0) {
        return { success: false, inserted: 0, dropped: 0, reason: "invalid_amount" };
    }

    if (!coords || ![coords.x, coords.y, coords.z].map(Number).every(Number.isFinite)) {
        logger.warn(`Ungültige Steuerkisten-Koordinaten für Team "${teamName}".`);
        return { success: false, inserted: 0, dropped: 0, reason: "invalid_coordinates" };
    }

    const location = {
        x: Math.floor(Number(coords.x)),
        y: Math.floor(Number(coords.y)),
        z: Math.floor(Number(coords.z))
    };

    try {
        const dimension = world.getDimension("overworld");
        const block = dimension.getBlock(location);

        if (!block) {
            logger.warn(`Steuerkiste für Team "${teamName}" ist nicht geladen.`);
            return { success: false, inserted: 0, dropped: 0, reason: "unloaded" };
        }

        if (block.typeId !== "minecraft:chest") {
            logger.warn(`Keine Truhe für Team "${teamName}" bei ${location.x} ${location.y} ${location.z}`);
            return { success: false, inserted: 0, dropped: 0, reason: "not_a_chest" };
        }

        const container = block.getComponent("inventory")?.container;
        if (!container) {
            logger.warn(`Steuerkiste von Team "${teamName}" besitzt kein Inventar.`);
            return { success: false, inserted: 0, dropped: 0, reason: "no_inventory" };
        }

        const capacity = getChestCapacity(container);
        if (capacity < safeAmount) {
            logger.warn(`Steuerkiste von "${teamName}" ist zu voll: ${capacity}/${safeAmount} Emeralds verfügbar.`);
            return { success: false, inserted: 0, dropped: 0, reason: "chest_full", capacity };
        }

        let remaining = safeAmount;
        let inserted = 0;

        while (remaining > 0) {
            const stackSize = Math.min(64, remaining);
            const leftover = container.addItem(new ItemStack("minecraft:emerald", stackSize));
            const leftoverAmount = leftover?.amount ?? 0;

            if (leftoverAmount > 0) {
                logger.error(`Atomare Steuerbuchung für "${teamName}" konnte nicht vollständig abgeschlossen werden.`);
                return { success: false, inserted: 0, dropped: 0, reason: "insert_failed" };
            }

            inserted += stackSize;
            remaining -= stackSize;
        }

        logger.info(`Team "${teamName}": ${inserted} Emeralds sicher in der Steuerkiste eingelagert.`);
        logger.debug(`Steuerbuchung abgeschlossen: team=${teamName}, requested=${safeAmount}, inserted=${inserted}`);

        return { success: inserted === safeAmount, inserted, dropped: 0, reason: "paid" };
    } catch (error) {
        logger.exception(`Fehler bei Steuerkiste von Team "${teamName}"`, error);
        return { success: false, inserted: 0, dropped: 0, reason: "exception" };
    }
}

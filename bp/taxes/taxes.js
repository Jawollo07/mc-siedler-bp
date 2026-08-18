import { world, ItemStack } from "@minecraft/server";

/**
 * Zahlt Steuern in die Steuerkiste eines Teams ein
 */
export function addTaxes(coords, amount, teamName = "Unbekannt") {
    try {
        const dimension = world.getDimension("overworld");
        const block = dimension.getBlock(coords);

        if (!block || block.typeId !== "minecraft:chest") {
            console.warn(`[Steuern] Keine Truhe gefunden für Team "${teamName}" bei ${coords.x} ${coords.y} ${coords.z}`);
            return false;
        }

        const inventory = block.getComponent("inventory");
        if (!inventory || !inventory.container) {
            console.warn(`[Steuern] Keine Inventory-Komponente bei Team "${teamName}"`);
            return false;
        }

        const item = new ItemStack("minecraft:emerald", amount);
        const leftover = inventory.container.addItem(item);

        if (leftover) {
            dimension.spawnItem(leftover, coords);
            console.warn(`[Steuern] Truhe von "${teamName}" war voll – Rest gedroppt`);
        }

        console.info(`[Steuern] \( {amount} Emeralds an Team " \){teamName}" ausgezahlt`);
        return true;
    } catch (e) {
        console.error(`[Steuern] Fehler bei Team "${teamName}":`, e);
        return false;
    }
}
import { world, ItemStack } from "@minecraft/server";

export function addTaxes(coords, amount, teamName = "Unbekannt") {
    const safeAmount = Math.floor(Number(amount));
    if (!Number.isFinite(safeAmount) || safeAmount <= 0) return false;

    try {
        const dimension = world.getDimension("overworld");
        const block = dimension.getBlock(coords);

        if (!block || block.typeId !== "minecraft:chest") {
            console.warn(`[Steuern] Keine Truhe für Team "${teamName}" bei ${coords.x} ${coords.y} ${coords.z}`);
            return false;
        }

        const inventory = block.getComponent("inventory");
        const container = inventory?.container;
        if (!container) {
            console.warn(`[Steuern] Keine Inventory-Komponente für Team "${teamName}".`);
            return false;
        }

        let remaining = safeAmount;
        while (remaining > 0) {
            const stackSize = Math.min(64, remaining);
            const leftover = container.addItem(new ItemStack("minecraft:emerald", stackSize));
            remaining -= stackSize - (leftover?.amount ?? 0);

            if (leftover?.amount) {
                dimension.spawnItem(leftover, {
                    x: coords.x + 0.5,
                    y: coords.y + 1,
                    z: coords.z + 0.5
                });
                console.warn(`[Steuern] Steuerkiste von "${teamName}" war voll; ${leftover.amount} Emeralds wurden daneben abgelegt.`);
                break;
            }
        }

        console.info(`[Steuern] ${safeAmount} Emeralds an Team "${teamName}" ausgezahlt.`);
        return true;
    } catch (error) {
        console.error(`[Steuern] Fehler bei Team "${teamName}":`, error);
        return false;
    }
}

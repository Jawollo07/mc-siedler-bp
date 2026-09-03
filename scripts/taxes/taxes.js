import { world, ItemStack } from "@minecraft/server";

const MAX_TAX_AMOUNT = 256;

export function addTaxes(coords, amount, teamName = "Unbekannt") {
    const safeAmount = Math.min(MAX_TAX_AMOUNT, Math.max(0, Math.floor(Number(amount))));
    if (!Number.isFinite(safeAmount) || safeAmount <= 0) return { success: false, inserted: 0, dropped: 0 };
    if (!coords || !Number.isFinite(Number(coords.x)) || !Number.isFinite(Number(coords.y)) || !Number.isFinite(Number(coords.z))) {
        console.warn(`[Steuern] Ungültige Steuerkisten-Koordinaten für Team "${teamName}".`);
        return { success: false, inserted: 0, dropped: 0 };
    }

    try {
        const dimension = world.getDimension("overworld");
        const block = dimension.getBlock({ x: Math.floor(Number(coords.x)), y: Math.floor(Number(coords.y)), z: Math.floor(Number(coords.z)) });
        if (!block || block.typeId !== "minecraft:chest") {
            console.warn(`[Steuern] Keine Truhe für Team "${teamName}" bei ${coords.x} ${coords.y} ${coords.z}`);
            return { success: false, inserted: 0, dropped: 0 };
        }

        const container = block.getComponent("inventory")?.container;
        if (!container) return { success: false, inserted: 0, dropped: 0 };

        let remaining = safeAmount;
        let inserted = 0;
        let dropped = 0;

        while (remaining > 0) {
            const stackSize = Math.min(64, remaining);
            const leftover = container.addItem(new ItemStack("minecraft:emerald", stackSize));
            const leftoverAmount = leftover?.amount ?? 0;
            const added = stackSize - leftoverAmount;
            inserted += added;
            remaining -= added;

            if (leftoverAmount > 0) {
                dropped += leftoverAmount;
                dimension.spawnItem(leftover, { x: Math.floor(Number(coords.x)) + 0.5, y: Math.floor(Number(coords.y)) + 1, z: Math.floor(Number(coords.z)) + 0.5 });
                break;
            }
        }

        if (dropped > 0) console.warn(`[Steuern] Steuerkiste von "${teamName}" war teilweise voll; ${dropped} Emeralds wurden daneben abgelegt.`);
        console.info(`[Steuern] Team "${teamName}": ${inserted} Emeralds eingelagert, ${dropped} abgelegt.`);
        return { success: inserted > 0, inserted, dropped };
    } catch (error) {
        console.error(`[Steuern] Fehler bei Team "${teamName}":`, error);
        return { success: false, inserted: 0, dropped: 0 };
    }
}

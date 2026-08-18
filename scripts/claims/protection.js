import { world } from "@minecraft/server";
import { getClaimAt, hasAccess } from "./utils.js";

const PROTECTED_BLOCK_PATTERNS = [
    "chest",
    "trapped_chest",
    "barrel",
    "shulker_box",
    "furnace",
    "blast_furnace",
    "smoker",
    "crafting_table",
    "enchanting_table",
    "anvil",
    "bed",
    "respawn_anchor",
    "door",
    "trapdoor",
    "fence_gate",
    "button",
    "lever",
    "hopper",
    "dropper",
    "dispenser",
    "brewing_stand",
    "beacon",
    "jukebox",
    "lectern",
    "smithing_table",
    "stonecutter",
    "cartography_table",
    "loom",
    "grindstone",
    "composter"
];

const beforeEvents = world.beforeEvents;
const afterEvents = world.afterEvents;

function deny(player, message) {
    try {
        player?.sendMessage(message);
    } catch {
        // Ein fehlendes/ungültiges Player-Objekt darf den Event-Handler nicht stoppen.
    }
}

function subscribe(eventSignal, callback, warning) {
    if (!eventSignal || typeof eventSignal.subscribe !== "function") {
        if (warning) console.warn(warning);
        return false;
    }

    try {
        eventSignal.subscribe(callback);
        return true;
    } catch (error) {
        console.error(`§c[Siedler Logic] Claim-Event konnte nicht registriert werden: ${error}`);
        return false;
    }
}

function isProtectedBlock(block) {
    if (!block?.typeId) return false;

    const id = block.typeId.toLowerCase();

    // Inventar-Komponente ist genauer als eine lange Liste, falls der
    // Server-Build sie für den Block bereitstellt.
    try {
        if (block.getComponent?.("minecraft:inventory") || block.getComponent?.("inventory")) {
            return true;
        }
    } catch {
        // Fallback auf die Type-ID.
    }

    return PROTECTED_BLOCK_PATTERNS.some((pattern) => id.includes(pattern));
}

function getClaimForBlock(block) {
    try {
        return block?.location ? getClaimAt(block.location) : null;
    } catch (error) {
        console.warn(`§e[Claims] Claim-Prüfung fehlgeschlagen: ${error}`);
        return null;
    }
}

function canAccess(player, claim) {
    if (!claim) return true;

    try {
        return Boolean(player && hasAccess(player, claim));
    } catch (error) {
        // Im Zweifel niemals Zugriff gewähren.
        console.warn(`§e[Claims] Zugriffsprüfung fehlgeschlagen: ${error}`);
        return false;
    }
}

/*
 * Blockabbau
 *
 * Wenn der Before-Event verfügbar ist, wird der Abbau VOR der Änderung
 * verhindert. Gibt es ihn im jeweiligen Server-Build nicht, wird kein
 * unsicherer After-Event-Fallback verwendet: Ein After-Event kann den
 * verursachenden Spieler je nach Build nicht zuverlässig liefern und könnte
 * dadurch legitime Blöcke löschen.
 */
subscribe(
    beforeEvents?.playerBreakBlock,
    (event) => {
        const claim = getClaimForBlock(event.block);
        if (!claim || canAccess(event.player, claim)) return;

        event.cancel = true;
        deny(event.player, "§cDieses Grundstück gehört einem anderen Team!");
    },
    "§e[Siedler Logic] playerBreakBlock-API nicht verfügbar; Claim-Abbau-Schutz ist in diesem Server-Build nicht verfügbar."
);

/*
 * Blockplatzierung
 *
 * Das Before-Event ist die sichere Variante, weil die Platzierung noch nicht
 * stattgefunden hat. Ein After-Event wird nur verwendet, wenn es den Spieler
 * und den gesetzten Block eindeutig liefert. Es wird NICHT auf blockChanged /
 * blockUpdate zurückgegriffen, weil diese Events keinen sicheren Urheber haben.
 */
const placeBeforeAvailable = subscribe(
    beforeEvents?.playerPlaceBlock,
    (event) => {
        const claim = getClaimForBlock(event.block);
        if (!claim || canAccess(event.player, claim)) return;

        event.cancel = true;
        deny(event.player, "§cDu darfst hier nichts bauen!");
    },
    "§e[Siedler Logic] playerPlaceBlock-Before-API nicht verfügbar; suche nach sicherem After-Event-Fallback."
);

if (!placeBeforeAvailable) {
    const placeAfter = afterEvents?.playerPlaceBlock;

    subscribe(
        placeAfter,
        (event) => {
            const block = event?.block;
            const player = event?.player;
            const claim = getClaimForBlock(block);

            if (!claim || !player || canAccess(player, claim)) return;

            // After-Events können die Platzierung nicht mehr abbrechen.
            // Wir entfernen deshalb ausschließlich dann den Block, wenn wir
            // einen echten Player aus dem Event erhalten haben.
            try {
                block?.setType?.("minecraft:air");
            } catch (error) {
                console.warn(`§e[Claims] Unerlaubter Block konnte nicht entfernt werden: ${error}`);
                return;
            }

            deny(player, "§cDieses Grundstück ist geschützt! Platzierung rückgängig gemacht.");
        },
        "§e[Siedler Logic] Kein kompatibles playerPlaceBlock-Event verfügbar; Claim-Bau-Schutz kann in diesem Server-Build nicht zuverlässig erzwungen werden."
    );
}

/*
 * Interaktion mit geschützten Blöcken.
 */
subscribe(
    beforeEvents?.playerInteractWithBlock,
    (event) => {
        const claim = getClaimForBlock(event.block);
        if (!claim || canAccess(event.player, claim)) return;

        if (!isProtectedBlock(event.block)) return;

        event.cancel = true;
        deny(event.player, "§cDieses Grundstück ist geschützt!");
    },
    "§e[Siedler Logic] playerInteractWithBlock-API nicht verfügbar; Interaktionsschutz deaktiviert."
);

/*
 * Explosionen
 *
 * Wenn setImpactedBlocks() vorhanden ist, werden nur Blöcke innerhalb von
 * Claims aus der Explosion entfernt. Dadurch zerstört eine Explosion in der
 * Nähe eines Claims nicht unnötig ungeschützte Blöcke und umgekehrt.
 *
 * Falls der Build nur getImpactedBlocks() bereitstellt, wird die Explosion
 * sicherheitshalber komplett abgebrochen, sobald sie einen Claim berührt.
 */
subscribe(
    beforeEvents?.explosion,
    (event) => {
        let impactedBlocks;

        try {
            impactedBlocks = event.getImpactedBlocks();
        } catch (error) {
            console.warn(`§e[Claims] Explosionsblöcke konnten nicht ermittelt werden: ${error}`);
            event.cancel = true;
            return;
        }

        if (!Array.isArray(impactedBlocks) || impactedBlocks.length === 0) return;

        const protectedBlocks = [];
        const allowedBlocks = [];

        for (const block of impactedBlocks) {
            if (getClaimForBlock(block)) protectedBlocks.push(block);
            else allowedBlocks.push(block);
        }

        if (protectedBlocks.length === 0) return;

        if (typeof event.setImpactedBlocks === "function") {
            try {
                event.setImpactedBlocks(allowedBlocks);
                return;
            } catch (error) {
                console.warn(`§e[Claims] Explosion konnte nicht gefiltert werden: ${error}`);
            }
        }

        // Sicherer Fallback für ältere/abweichende API-Builds.
        event.cancel = true;
    },
    "§e[Siedler Logic] explosion-API nicht verfügbar; Explosionsschutz deaktiviert."
);

console.info("§a[Siedler Logic] Claim-Protection geladen (API-kompatibel, sicherer Fallback aktiv).");

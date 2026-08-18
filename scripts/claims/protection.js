import { world } from "@minecraft/server";
import { getClaimAt, hasAccess } from "./utils.js";

function deny(player, message) {
    try { player.sendMessage(message); } catch {}
}

const beforeEvents = world.beforeEvents;

// Die Bedrock-API kann einzelne Before-Event-Signale je nach Server-Build
// nicht bereitstellen. Ein fehlendes Signal darf daher nicht das komplette
// Siedler-Plugin stoppen.
const playerBreakBlock = beforeEvents?.playerBreakBlock;
if (playerBreakBlock && typeof playerBreakBlock.subscribe === "function") {
    playerBreakBlock.subscribe((event) => {
        const claim = getClaimAt(event.block.location);
        if (claim && !hasAccess(event.player, claim)) {
            event.cancel = true;
            deny(event.player, "§cDieses Grundstück gehört einem anderen Team!");
        }
    });
} else {
    console.warn("§e[Siedler Logic] playerBreakBlock-API nicht verfügbar; Claim-Abbau-Schutz deaktiviert.");
}

const playerPlaceBlock = beforeEvents?.playerPlaceBlock;
if (playerPlaceBlock && typeof playerPlaceBlock.subscribe === "function") {
    playerPlaceBlock.subscribe((event) => {
        const claim = getClaimAt(event.block.location);
        if (!claim || hasAccess(event.player, claim)) return;

        event.cancel = true;
        deny(event.player, "§cDu darfst hier nichts bauen!");
    });
} else {
    console.warn("§e[Siedler Logic] playerPlaceBlock-API nicht verfügbar; Claim-Bau-Schutz deaktiviert.");
}

const playerInteractWithBlock = beforeEvents?.playerInteractWithBlock;
if (playerInteractWithBlock && typeof playerInteractWithBlock.subscribe === "function") {
    playerInteractWithBlock.subscribe((event) => {
        const claim = getClaimAt(event.block.location);
        if (!claim || hasAccess(event.player, claim)) return;

        const id = event.block.typeId;
        const protectedBlock =
            event.block.getComponent("inventory") ||
            id.includes("door") ||
            id.includes("gate") ||
            id.includes("button") ||
            id.includes("lever") ||
            id.includes("trapdoor") ||
            id.includes("bed") ||
            id.includes("respawn_anchor") ||
            id.includes("enchanting_table") ||
            id.includes("anvil") ||
            id.includes("crafting_table") ||
            id.includes("furnace") ||
            id.includes("blast_furnace") ||
            id.includes("smoker") ||
            id.includes("barrel") ||
            id.includes("shulker_box") ||
            id.includes("chest");

        if (protectedBlock) {
            event.cancel = true;
            deny(event.player, "§cDieses Grundstück ist geschützt!");
        }
    });
} else {
    console.warn("§e[Siedler Logic] playerInteractWithBlock-API nicht verfügbar; Interaktionsschutz deaktiviert.");
}

const explosion = beforeEvents?.explosion;
if (explosion && typeof explosion.subscribe === "function") {
    explosion.subscribe((event) => {
        let impactedBlocks;
        try {
            impactedBlocks = event.getImpactedBlocks();
        } catch {
            event.cancel = true;
            return;
        }

        for (const block of impactedBlocks) {
            if (getClaimAt(block.location)) {
                event.cancel = true;
                return;
            }
        }
    });
} else {
    console.warn("§e[Siedler Logic] explosion-API nicht verfügbar; Explosionsschutz deaktiviert.");
}

console.info("§a[Siedler Logic] Claim-Protection geladen.");

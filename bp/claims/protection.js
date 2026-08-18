import { world } from "@minecraft/server";
import { getClaimAt, hasAccess } from "./utils.js";

function deny(player, message) {
    try { player.sendMessage(message); } catch {}
}

// Block abbauen
world.beforeEvents.playerBreakBlock.subscribe((event) => {
    const claim = getClaimAt(event.block.location);
    if (claim && !hasAccess(event.player, claim)) {
        event.cancel = true;
        deny(event.player, "§cDieses Grundstück gehört einem anderen Team!");
    }
});

// Block platzieren – fremde Claims sind vollständig geschützt.
world.beforeEvents.playerPlaceBlock.subscribe((event) => {
    const claim = getClaimAt(event.block.location);
    if (!claim || hasAccess(event.player, claim)) return;

    event.cancel = true;
    deny(event.player, "§cDu darfst hier nichts bauen!");
});

// Container, Türen und sonstige interaktive Blöcke schützen.
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
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

// Explosions dürfen keine Claims zerstören – auch TNT nicht.
world.beforeEvents.explosion.subscribe((event) => {
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

import { world } from "@minecraft/server";
import { getClaimAt, hasAccess } from "./utils.js";

// 1. Block abbauen
world.beforeEvents.playerBreakBlock.subscribe((event) => {
    const claim = getClaimAt(event.block.location);
    if (claim && !hasAccess(event.player, claim)) {
        event.cancel = true;
        event.player.sendMessage("§cDieses Grundstück gehört einem anderen Team!");
    }
});

// 2. Block platzieren – alles außer TNT blockiert
world.beforeEvents.playerPlaceBlock.subscribe((event) => {
    const claim = getClaimAt(event.block.location);
    if (!claim || hasAccess(event.player, claim)) return;

    const blockId = event.permutationToPlace.type.id;
    if (blockId === "minecraft:tnt") return; // TNT erlaubt

    event.cancel = true;
    event.player.sendMessage("§cDu darfst hier nichts bauen!");
});

// 3. Interaktionen
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    const claim = getClaimAt(event.block.location);
    if (!claim || hasAccess(event.player, claim)) return;

    const block = event.block;
    const id = block.typeId;

    if (
        block.getComponent("inventory") ||
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
        id.includes("chest")
    ) {
        event.cancel = true;
        event.player.sendMessage("§cDieses Grundstück ist geschützt!");
    }
});

// 4. Explosionen – nur TNT erlaubt
world.beforeEvents.explosion.subscribe((event) => {
    const source = event.source;

    if (!source) {
        event.cancel = true;
        return;
    }

    const isTnt = 
        source.typeId === "minecraft:tnt" || 
        source.typeId === "minecraft:tnt_minecart";

    if (isTnt)
    {
        return;
    }; // TNT darf alles zerstören

    // Andere Explosionen: wenn sie einen Claim berühren → canceln
    const impactedBlocks = event.getImpactedBlocks();
    for (const block of impactedBlocks) {
        const claim = getClaimAt(block.location);
        if (claim) {
            event.cancel = true;
            return;
        }
    }
});
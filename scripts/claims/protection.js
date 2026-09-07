import { world, system } from "@minecraft/server";
import { getClaimAt, hasAccess } from "./utils.js";

function deny(player, message) {
    try { player.sendMessage(message); } catch {}
}

const beforeEvents = world.beforeEvents;
const recentPlacements = [];
const recentBreaks = [];

function queueChange(queue, block, player, returnItem = false) {
    if (!block?.location) return;

    queue.push({
        x: Math.floor(block.location.x),
        y: Math.floor(block.location.y),
        z: Math.floor(block.location.z),
        dim: player?.dimension?.id ?? "minecraft:overworld",
        playerId: player?.id ?? null,
        blockType: block.typeId ?? "minecraft:air",
        returnItem,
        ts: Date.now()
    });

    if (queue.length > 2000) queue.splice(0, queue.length - 2000);
}

function restoreBlock(entry) {
    try {
        const dimension = world.getDimension(entry.dim || "minecraft:overworld");
        const block = dimension.getBlock({ x: entry.x, y: entry.y, z: entry.z });
        if (!block || typeof block.setType !== "function") return false;
        block.setType(entry.blockType || "minecraft:air");
        return true;
    } catch {
        return false;
    }
}

function findPlayer(id) {
    if (!id) return null;
    try { return world.getAllPlayers().find((player) => player.id === id) ?? null; }
    catch { return null; }
}

function returnPlacedItem(player, block) {
    try {
        if (!player || !block || typeof block.getItemStack !== "function") return false;

        // The block has already been placed in the after-event fallback, so
        // reconstruct exactly one item from the placed block before removing it.
        const item = block.getItemStack(1, true);
        if (!item) return false;

        const inventory = player.getComponent("minecraft:inventory")?.container;
        if (!inventory) return false;

        const remainder = inventory.addItem(item);
        if (!remainder) return true;

        // Inventory was full. Drop the remainder at the player's position so
        // the player never loses the item and no duplicate is created.
        try {
            player.dimension.spawnItem(remainder, player.location);
            return true;
        } catch {
            return false;
        }
    } catch {
        return false;
    }
}

// -----------------------------------------------------------------------------
// Block breaking
// -----------------------------------------------------------------------------
const playerBreakBlock = beforeEvents?.playerBreakBlock;
if (playerBreakBlock && typeof playerBreakBlock.subscribe === "function") {
    playerBreakBlock.subscribe((event) => {
        try {
            const claim = getClaimAt(event.block.location);
            if (!claim || hasAccess(event.player, claim)) return;

            queueChange(recentBreaks, event.block, event.player);
            event.cancel = true;
            deny(event.player, "§cDieses Grundstück gehört einem anderen Team! Der Block wurde geschützt.");
        } catch (err) {
            console.warn(`[Claims] Break protection error: ${err}`);
            try { event.cancel = true; } catch {}
        }
    });
} else {
    console.warn("§e[Siedler Logic] playerBreakBlock-API nicht verfügbar; After-Event-Recovery wird verwendet.");
}

const afterBreakCandidates = [
    world.afterEvents?.playerBreakBlock,
    world.afterEvents?.blockBreak
];

for (const candidate of afterBreakCandidates) {
    if (!candidate || typeof candidate.subscribe !== "function") continue;
    try {
        candidate.subscribe((event) => {
            try {
                const block = event?.block;
                const player = event?.player ?? event?.playerEntity ?? event?.source ?? null;
                if (!block?.location || !player) return;

                const claim = getClaimAt(block.location);
                if (!claim || hasAccess(player, claim)) return;

                const x = Math.floor(block.location.x);
                const y = Math.floor(block.location.y);
                const z = Math.floor(block.location.z);
                const index = recentBreaks.findIndex((entry) =>
                    entry.x === x && entry.y === y && entry.z === z && entry.playerId === player.id
                );

                if (index >= 0) {
                    const entry = recentBreaks[index];
                    restoreBlock(entry);
                    recentBreaks.splice(index, 1);
                    deny(player, "§aDer geschützte Block wurde wiederhergestellt.");
                }
            } catch (err) {
                console.warn(`[Claims] After-break fallback error: ${err}`);
            }
        });
    } catch (err) {
        console.warn(`[Claims] After-break event could not be registered: ${err}`);
    }
}

// -----------------------------------------------------------------------------
// Block placing
// -----------------------------------------------------------------------------
const playerPlaceBlock = beforeEvents?.playerPlaceBlock;
if (playerPlaceBlock && typeof playerPlaceBlock.subscribe === "function") {
    playerPlaceBlock.subscribe((event) => {
        const claim = getClaimAt(event.block.location);
        if (!claim || hasAccess(event.player, claim)) return;

        // Cancel BEFORE placement. The item therefore remains in the player's
        // inventory naturally; we must NOT add it again or it would duplicate.
        event.cancel = true;
        deny(event.player, "§cDu darfst hier nichts bauen! Dein Block bleibt im Inventar.");
    });
} else {
    console.info("§e[Siedler Logic] playerPlaceBlock-API nicht verfügbar; After-Event-Fallback für Platzierungen.");

    const afterCandidates = [
        world.afterEvents?.playerPlaceBlock,
        world.afterEvents?.blockPlace
    ];

    for (const candidate of afterCandidates) {
        if (!candidate || typeof candidate.subscribe !== "function") continue;
        try {
            candidate.subscribe((event) => {
                try {
                    const block = event?.block;
                    const player = event?.player ?? event?.playerEntity ?? event?.source ?? null;
                    if (!block?.location) return;

                    const claim = getClaimAt(block.location);
                    if (!claim || (player && hasAccess(player, claim))) return;

                    // In the after-event fallback the item has already been
                    // consumed. Return exactly one copy before removing the block.
                    const returned = player ? returnPlacedItem(player, block) : false;

                    queueChange(recentPlacements, block, player, returned);
                    try { block.setType("minecraft:air"); } catch {}

                    if (player) {
                        deny(
                            player,
                            returned
                                ? "§cDieses Grundstück ist geschützt! Der Block wurde entfernt und zurückgegeben."
                                : "§cDieses Grundstück ist geschützt! Platzierung rückgängig gemacht."
                        );
                    }
                } catch (err) {
                    console.warn(`[Claims] After-place fallback error: ${err}`);
                }
            });
        } catch (err) {
            console.warn(`[Claims] After-place event could not be registered: ${err}`);
        }
    }
}

// -----------------------------------------------------------------------------
// Block interaction
// -----------------------------------------------------------------------------
const playerInteractWithBlock = beforeEvents?.playerInteractWithBlock;
if (playerInteractWithBlock && typeof playerInteractWithBlock.subscribe === "function") {
    playerInteractWithBlock.subscribe((event) => {
        const claim = getClaimAt(event.block.location);
        if (!claim || hasAccess(event.player, claim)) return;

        const id = event.block.typeId;
        const protectedBlock =
            event.block.getComponent("inventory") ||
            id.includes("door") || id.includes("gate") || id.includes("button") ||
            id.includes("lever") || id.includes("trapdoor") || id.includes("bed") ||
            id.includes("respawn_anchor") || id.includes("enchanting_table") ||
            id.includes("anvil") || id.includes("crafting_table") || id.includes("furnace") ||
            id.includes("blast_furnace") || id.includes("smoker") || id.includes("barrel") ||
            id.includes("shulker_box") || id.includes("chest");

        if (protectedBlock) {
            event.cancel = true;
            deny(event.player, "§cDieses Grundstück ist geschützt!");
        }
    });
} else {
    console.warn("§e[Siedler Logic] playerInteractWithBlock-API nicht verfügbar; Interaktionsschutz deaktiviert.");
}

// -----------------------------------------------------------------------------
// Explosions
// -----------------------------------------------------------------------------
const explosion = beforeEvents?.explosion;
if (explosion && typeof explosion.subscribe === "function") {
    explosion.subscribe((event) => {
        let impactedBlocks;
        try { impactedBlocks = event.getImpactedBlocks(); }
        catch { event.cancel = true; return; }

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

// -----------------------------------------------------------------------------
// Recovery scanner
// -----------------------------------------------------------------------------
system.runInterval(() => {
    const now = Date.now();
    const maxProcess = 100;
    let processed = 0;

    for (let i = recentBreaks.length - 1; i >= 0 && processed < maxProcess; i--) {
        const entry = recentBreaks[i];
        if (now - entry.ts > 1000 * 60 * 5) {
            recentBreaks.splice(i, 1);
            continue;
        }

        try {
            const claim = getClaimAt({ x: entry.x + 0.5, y: entry.y, z: entry.z + 0.5 });
            if (!claim) {
                recentBreaks.splice(i, 1);
                continue;
            }

            const player = findPlayer(entry.playerId);
            if (player && hasAccess(player, claim)) {
                recentBreaks.splice(i, 1);
                continue;
            }

            const dimension = world.getDimension(entry.dim || "minecraft:overworld");
            const current = dimension.getBlock({ x: entry.x, y: entry.y, z: entry.z });
            const isAir = current?.typeId === "minecraft:air" ||
                current?.typeId === "minecraft:cave_air" ||
                current?.typeId === "minecraft:void_air";

            if (isAir) {
                if (restoreBlock(entry) && player) {
                    deny(player, "§aDer geschützte Block wurde wiederhergestellt.");
                }
            }

            recentBreaks.splice(i, 1);
            processed++;
        } catch {
            recentBreaks.splice(i, 1);
        }
    }

    for (let i = recentPlacements.length - 1; i >= 0 && processed < maxProcess; i--) {
        const entry = recentPlacements[i];
        if (now - entry.ts > 1000 * 60 * 5) {
            recentPlacements.splice(i, 1);
            continue;
        }

        // The item was already returned by the after-event handler. This queue
        // only removes the placed block if it somehow survived that handler.
        try {
            const claim = getClaimAt({ x: entry.x + 0.5, y: entry.y, z: entry.z + 0.5 });
            if (!claim) {
                recentPlacements.splice(i, 1);
                continue;
            }

            const player = findPlayer(entry.playerId);
            if (player && hasAccess(player, claim)) {
                recentPlacements.splice(i, 1);
                continue;
            }

            const dimension = world.getDimension(entry.dim || "minecraft:overworld");
            const block = dimension.getBlock({ x: entry.x, y: entry.y, z: entry.z });
            const isAir = block?.typeId === "minecraft:air" ||
                block?.typeId === "minecraft:cave_air" ||
                block?.typeId === "minecraft:void_air";

            if (!isAir) {
                try { block.setType("minecraft:air"); } catch {}
            }

            if (player) {
                deny(player, "§cDieses Grundstück ist geschützt! Die unerlaubte Platzierung wurde rückgängig gemacht.");
            }

            recentPlacements.splice(i, 1);
            processed++;
        } catch {
            recentPlacements.splice(i, 1);
        }
    }
}, 20);

console.info("§a[Siedler Logic] Claim-Protection geladen (inkl. Block-Recovery und Item-Rückgabe).");

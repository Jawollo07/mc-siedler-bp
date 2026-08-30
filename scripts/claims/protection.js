import { world, system } from "@minecraft/server";
import { getClaimAt, hasAccess } from "./utils.js";

function deny(player, message) {
    try { player.sendMessage(message); } catch {}
}

const beforeEvents = world.beforeEvents;

// Queue für platzierte Blöcke, die später durch den Scanner geprüft werden.
const recentPlacements = [];

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
    // Versuche einen After-Event-Fallback zu verwenden: einige Server-Builds
    // bieten nur `world.afterEvents.*`-Signale. Wir abonnieren mehrere
    // potenzielle Event-Namen und versuchen, unerlaubte Platzierungen
    // nachträglich zu entfernen. Alles in try/catch, damit fehlende APIs
    // das Plugin nicht zum Absturz bringen.
    console.info("§e[Siedler Logic] playerPlaceBlock-API nicht verfügbar; versuche After-Event-Fallback für Platzierungen.");

    const afterCandidates = [
        world.afterEvents?.playerPlaceBlock,
        world.afterEvents?.blockPlace,
        world.afterEvents?.blockChanged,
        world.afterEvents?.blockUpdate
    ];

    for (const candidate of afterCandidates) {
        if (!candidate || typeof candidate.subscribe !== "function") continue;

        try {
            candidate.subscribe((event) => {
                try {
                    const block = event?.block;
                    const loc = block?.location;

                    // Best-effort: Spieler aus verschiedenen Event-Varianten ermitteln
                    const player =
                        event?.player ??
                        event?.playerEntity ??
                        event?.source ??
                        null;

                    if (!loc) return;

                    const claim = getClaimAt(loc);
                    if (!claim) return;

                    if (player && hasAccess(player, claim)) {
                    return;
                }

                // Für die spätere Prüfung ausschließlich die Player-ID speichern.
                recentPlacements.push({
                    x: Math.floor(loc.x),
                    y: Math.floor(loc.y),
                    z: Math.floor(loc.z),

                    // Die tatsächliche Dimension speichern, nicht immer "overworld".
                    dim: player?.dimension?.id ?? "minecraft:overworld",

                    // ID statt Name
                    playerId: player?.id ?? null,

                    ts: Date.now()
                });

                // Queue begrenzen
                if (recentPlacements.length > 2000) {
                    recentPlacements.splice(
                        0,
                        recentPlacements.length - 2000
                    );
                }

                // Versuche die unerlaubte Platzierung sofort rückgängig zu machen.
                try {
                    if (
                        block &&
                        typeof block.setType === "function"
                    ) {
                        try {
                            block.setType("minecraft:air");
                        } catch {}
                    }

                    // Fallback: Block direkt aus der richtigen Dimension holen.
                    try {
                        const dimension = world.getDimension(
                            player?.dimension?.id ??
                            "minecraft:overworld"
                        );

                        const coord = {
                            x: Math.floor(loc.x),
                            y: Math.floor(loc.y),
                            z: Math.floor(loc.z)
                        };

                        const current = dimension.getBlock(coord);

                        if (current) {
                            if (
                                typeof current.setType === "function"
                            ) {
                                try {
                                current.setType("minecraft:air");
                                } catch {}
                            }
                        }
                    } catch {}
                } catch {
                    // Best-effort
                }

                // Spieler informieren.
                try {
                    if (player) {
                        deny(
                            player,
                            "§cDieses Grundstück ist geschützt! Platzierung rückgängig gemacht."
                        );
                    }
                } catch {}
            } catch (err) {
                console.warn(
                    `[Claims] After-Event-Fallback Fehler: ${err}`
                );
            }
        });
    } catch (err) {
        console.warn(
        `[Claims] After-Event konnte nicht registriert werden: ${err}`
        );
    }
    }
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

// Periodischer Scanner: prüft gemerkte Platzierungen und entfernt
// unerlaubte Blöcke, falls der sofortige Revert fehlgeschlagen ist.
system.runInterval(() => {
    if (recentPlacements.length === 0) return;

    const now = Date.now();
    const maxProcess = 100; // pro Durchlauf maximal verarbeiten
    let processed = 0;

    // Verarbeite von hinten (neueste Einträge) nach vorne.
    for (let i = recentPlacements.length - 1; i >= 0 && processed < maxProcess; i--) {
        const entry = recentPlacements[i];

        // Verwerfe zu alte Einträge (>5 Minuten)
        if (now - entry.ts > 1000 * 60 * 5) {
            recentPlacements.splice(i, 1);
            continue;
        }

        try {
            const loc = { x: entry.x + 0.5, y: entry.y, z: entry.z + 0.5 };
            const claim = getClaimAt(loc);
            if (!claim) {
                recentPlacements.splice(i, 1);
                continue;
            }

            // Wenn kein Spieler angegeben ist, prüfen wir trotzdem und
            // entfernen den Block, da wir Annahme treffen, dass Platzierung
            // von Fremden war (best-effort).
            let allowed = false;
            if (entry.playerId) {
                const player = world
                .getAllPlayers()
                .find((p) => p.id === entry.playerId);

                if (player) {
                    try {
                        allowed = hasAccess(player, claim);
                    } catch {
                        allowed = false;
                    }
                }
            }

            if (!allowed) {
                try {
                    const dim = world.getDimension(entry.dim || "overworld");
                    const block = dim.getBlock({ x: entry.x, y: entry.y, z: entry.z });
                    if (block && typeof block.setType === "function") {
                        try { block.setType("minecraft:air"); } catch {}
                    }
                } catch (err) {
                    // ignore
                }

                // Informiere (wenn möglich) den Spieler.
                try {
                    if (entry.playerId) {
                        for (const p of world.getAllPlayers()) {
                            if (p.id === entry.playerId) {
                                deny(p, "§cDieses Grundstück ist geschützt! Platzierung rückgängig gemacht.");
                                break;
                            }
                        }
                    }
                } catch {}

                recentPlacements.splice(i, 1);
                processed++;
            } else {
                // erlaubt - Eintrag entfernen
                recentPlacements.splice(i, 1);
            }
        } catch (err) {
            recentPlacements.splice(i, 1);
        }
    }
}, 20);

console.info("§a[Siedler Logic] Claim-Protection geladen.");

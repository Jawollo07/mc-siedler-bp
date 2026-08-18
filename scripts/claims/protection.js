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
                    // Best-effort: eruiere Spieler aus dem Event (verschiedene Builds)
                    const player = event.player || event.playerEntity || event.source || null;
                    if (!loc) return;

                    const claim = getClaimAt(loc);
                    if (!claim) return;
                    if (player && hasAccess(player, claim)) return;

                    // Versuche das platzierte Block rückgängig zu machen. Falls das
                    // sofort nicht möglich ist, merken wir die Position zur
                    // späteren Prüfung durch den periodischen Scanner vor.
                    recentPlacements.push({
                        x: Math.floor(loc.x),
                        y: Math.floor(loc.y),
                        z: Math.floor(loc.z),
                        dim: "overworld",
                        playerName: player && player.name ? player.name : null,
                        ts: Date.now()
                    });

                    // Truncate queue to reasonable size
                    if (recentPlacements.length > 2000) recentPlacements.splice(0, recentPlacements.length - 2000);

                    // Versuche sofort das platzierte Block rückgängig zu machen.
                    try {
                        // Wenn das Event-Block-Objekt eine direkte API hat.
                        if (block && typeof block.setType === "function") {
                            try { block.setType("minecraft:air"); } catch {}
                        }

                        // Fallback: direkt das Block-Objekt aus der Dimension holen
                        // und best-effort entfernen.
                        try {
                            const dim = world.getDimension("overworld");
                            const coord = { x: Math.floor(loc.x), y: Math.floor(loc.y), z: Math.floor(loc.z) };
                            const current = dim.getBlock(coord);
                            if (current) {
                                if (typeof current.setType === "function") {
                                    try { current.setType("minecraft:air"); } catch {}
                                } else if (typeof current.setPermutation === "function") {
                                    try { /* best-effort no-op to avoid errors */ } catch {}
                                }
                            }
                        } catch {}
                    } catch (err) {
                        // ignore
                    }

                    // Informiere Spieler, falls vorhanden.
                    try { if (player) deny(player, "§cDieses Grundstück ist geschützt! Platzierung rückgängig gemacht."); } catch {}
                } catch (err) {
                    if (console && console.warn) console.warn(`[Claims] After-Event-Fallback Fehler: ${err}`);
                }
            });

            console.info("§a[Siedler Logic] After-Event-Fallback für Platzierungen registriert.");
            break; // einen passenden Kandidaten registrieren reicht
        } catch (err) {
            // try next candidate
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
            if (entry.playerName) {
                // Erzeuge ein Pseudo-Spieler-Objekt mit `name` für hasAccess
                const pseudo = { name: entry.playerName };
                try { allowed = hasAccess(pseudo, claim); } catch { allowed = false; }
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
                    if (entry.playerName) {
                        for (const p of world.getAllPlayers()) {
                            if (p.name === entry.playerName) {
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

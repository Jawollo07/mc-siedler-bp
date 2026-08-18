import { world, system } from "@minecraft/server";

// ============================================
//  Siedler Logic - Behavior Pack
// ============================================

console.info("§8----------------------------------------");
console.info("§6[Siedler Logic] §7Lade Module...");

// ---------- Teams ----------
try {
    import("../teams/index.js");
    import("../teams/chat.js");
    console.info("§a✓ §7Teams + Chat geladen");
} catch (e) {
    console.error("§c✗ §7Teams konnten nicht geladen werden:", e);
}

// ---------- Steuern ----------
try {
    import("../taxes/time_watcher.js");
    console.info("§a✓ §7Steuer-System geladen");
} catch (e) {
    console.error("§c✗ §7Steuern konnten nicht geladen werden:", e);
}

// ---------- Claims ----------
try {
    import("../claims/index.js");
    import("../claims/protection.js");
    import("../claims/display.js");
    console.info("§a✓ §7Claims + Schutz + Anzeige geladen");
} catch (e) {
    console.error("§c✗ §7Claims konnten nicht geladen werden:", e);
}

// ---------- Essentials ----------
try {
    import("../essentials/index.js");
    console.info("§a✓ §7Essentials + Admin-Befehle geladen");
} catch (e) {
    console.error("§c✗ §7Essentials konnten nicht geladen werden:", e);
}

// ============================================
//  Start-Nachricht
// ============================================

system.runTimeout(() => {
    console.info("§8----------------------------------------");
    console.info("§6[Siedler Logic] §aErfolgreich gestartet!");
    console.info("§7Module: Teams · Steuern · Claims · Essentials");
    console.info("§8----------------------------------------");
}, 20);
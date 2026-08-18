import { world, system } from "@minecraft/server";

console.info("§8----------------------------------------");
console.info("§6[Siedler Logic] §7Lade Module...");

async function loadModule(label, path) {
    try {
        await import(path);
        console.info(`§a✓ §7${label} geladen`);
    } catch (error) {
        console.error(`§c✗ §7${label} konnte nicht geladen werden:`, error);
    }
}

// Reihenfolge beibehalten: Module registrieren ihre Events/Commands beim Import.
void loadModule("Teams + Chat", "../teams/index.js");
void loadModule("Teams Chat", "../teams/chat.js");
void loadModule("Steuer-System", "../taxes/time_watcher.js");
void loadModule("Claims", "../claims/index.js");
void loadModule("Claim-Schutz", "../claims/protection.js");
void loadModule("Claim-Anzeige", "../claims/display.js");
void loadModule("Monster-System", "../monster/index.js");
void loadModule("Monster-Befehle", "../monster/commads.js");
void loadModule("Essentials + Admin-Befehle", "../essentials/index.js");

system.runTimeout(() => {
    console.info("§8----------------------------------------");
    console.info("§6[Siedler Logic] §aErfolgreich gestartet!");
    console.info("§7Module: Teams · Steuern · Claims · Monster · Essentials");
    console.info("§8----------------------------------------");
}, 20);

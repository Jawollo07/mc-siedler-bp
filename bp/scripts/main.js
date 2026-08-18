import { system } from "@minecraft/server";

// Alle Module statisch laden, damit Event- und Dynamic-Property-Handler
// rechtzeitig vor der Weltinitialisierung registriert werden.
import "../teams/index.js";
import "../teams/chat.js";
import "../taxes/time_watcher.js";
import "../claims/index.js";
import "../claims/protection.js";
import "../claims/display.js";
import "../monster/index.js";
import "../monster/commads.js";
import "../monster/pillager_squads.js";
import "../essentials/index.js";

console.info("§8----------------------------------------");
console.info("§6[Siedler Logic] §aAlle Module geladen!");
console.info("§7Module: Teams · Steuern · Claims · Monster · Pillager · Essentials");
console.info("§8----------------------------------------");

system.runTimeout(() => {
    console.info("§6[Siedler Logic] §aErfolgreich gestartet!");
}, 20);

import { system } from "@minecraft/server";

// Muss früh geladen werden: registriert die World-Dynamic-Properties für Scripting V2.
import "./dynamic_properties.js";

import "./teams/index.js";
import "./teams/chat.js";

import "./taxes/time_watcher.js";

import "./claims/index.js";
import "./claims/protection.js";
import "./claims/display.js";

import "./monster/index.js";
import "./monster/pillager_squads.js";
import "./monster/outpost_raids.js";
import "./monster/commands.js";
import "./monster/token.js";

import "./essentials/index.js";
import "./essentials/player_stats.js";

import "./soldier/scripts/main.js";

console.info("§8----------------------------------------");
console.info("§6[Siedler Logic] §aAlle Module geladen!");
console.info("§7Module: Teams · Steuern · Claims · Monster · Pillager · Außenposten · Essentials · Spieler-Stats");
console.info("§8----------------------------------------");

system.runTimeout(() => {
    console.info("§6[Siedler Logic] §aErfolgreich gestartet!");
}, 20);

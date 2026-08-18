import { system } from "@minecraft/server";

import "./teams/index.js";
import "./teams/chat.js";

import "./taxes/time_watcher.js";

import "./claims/index.js";
import "./claims/protection.js";
import "./claims/display.js";

import "./monster/index.js";
import "./monster/pillager_squads.js";
import "./monster/outpost_raids.js";

import "./essentials/index.js";

console.info("§8----------------------------------------");
console.info("§6[Siedler Logic] §aAlle Module geladen!");
console.info("§7Module: Teams · Steuern · Claims · Monster · Pillager · Außenposten · Essentials");
console.info("§8----------------------------------------");

system.runTimeout(() => {
    console.info("§6[Siedler Logic] §aErfolgreich gestartet!");
}, 20);

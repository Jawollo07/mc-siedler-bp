import "./logger.js";
import { system } from "@minecraft/server";
import { version } from "./version.js";
import "./dynamic_properties.js";
import "../teams/index.js";
import "../teams/chat.js";
import "../teams/elimination.js";
import "../taxes/index.js";
import "../claims/index.js";
import "../claims/protection.js";
import "../claims/display.js";
import "../market/market_place.js";
import "../market/commands.js";
import "../market/trader_commands.js";
import "../monster/index.js";
import "../monster/pillager_squads.js";
import "../monster/outpost_raids.js";
import "../monster/outpost_capture.js";
import "../monster/commands.js";
import "../monster/weakness_commands.js";
import "../monster/token.js";
import "../essentials/index.js";
import "../essentials/player_stats.js";
import "../essentials/start.js";
import "../antiafk/index.js";
import "../soldier/index.js";
import "../soldier/trader.js";
import "../soldier/level.js";
import "../minefield/index.js";
import "../minefield/ui.js";

const VERSION = version;
const MODULE_COUNT = 25;
const STARTUP_DELAY = 20;
const WATCHDOG_INTERVAL = 200;
let startupCompleted = false;
let watchdogHandle;

function safeRun(label, callback) {
    try { callback(); }
    catch (error) { console.error(`[Loader] ${label} failed:`, error); }
}
function startWatchdog() {
    if (watchdogHandle !== undefined) return;
    watchdogHandle = system.runInterval(() => {
        if (startupCompleted) { system.clearRun(watchdogHandle); watchdogHandle = undefined; return; }
        console.warn("[Loader] Startup is taking longer than expected. Continuing without blocking the server.");
    }, WATCHDOG_INTERVAL);
}
system.runTimeout(() => safeRun("startup", () => {
    console.info(`[Siedler Logic ${VERSION}] Starting ${MODULE_COUNT} modules...`);
    startWatchdog();
}), STARTUP_DELAY);
system.runTimeout(() => {
    startupCompleted = true;
    console.info(`[Siedler Logic ${VERSION}] Loader initialized.`);
}, STARTUP_DELAY + 1);

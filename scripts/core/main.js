import "./logger.js";
import { system } from "@minecraft/server";
import { version } from "./version.js";

/**
 * Siedler Logic – Main Loader
 *
 * Important:
 * - Keep imports static for Bedrock module compatibility.
 * - Keep the import order deterministic.
 * - Never let a non-critical startup task prevent the loader from finishing.
 * - Dynamic properties must be registered before modules that use them.
 * - The logger is imported first so all subsequent module console output is normalized.
 */

// Core
import "./dynamic_properties.js";

// Teams
import ".././teams/index.js";
import ".././teams/chat.js";
import ".././teams/elimination.js";

// Economy
import ".././taxes/index.js";

// Claims
import ".././claims/index.js";
import ".././claims/protection.js";
import ".././claims/display.js";

// Market
import ".././market/market_place.js";
import ".././market/commands.js";
import ".././market/trader_commands.js";

// Monster system
import ".././monster/index.js";
import ".././monster/pillager_squads.js";
import ".././monster/outpost_raids.js";
import ".././monster/commands.js";
import ".././monster/weakness_commands.js";
import ".././monster/token.js";

// Essentials
import ".././essentials/index.js";
import ".././essentials/player_stats.js";
import ".././essentials/start.js";

// Anti-AFK
import ".././antiafk/index.js";

// Soldier system
import ".././soldier/index.js";
import ".././soldier/trader.js";
import ".././soldier/level.js";

// Minefield
// v2 contains the complete team/diplomacy integration and persistent mine groups.
import ".././minefield/index_v2.js";

const VERSION = version;
const MODULE_COUNT = 23;
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
function finishStartup() {
    if (startupCompleted) return;
    startupCompleted = true;
    safeRun("Startup status", () => {
        console.info("----------------------------------------");
        console.info("[Loader] ✓ All modules initialized.");
        console.info(`[Loader] Loaded ${MODULE_COUNT} modules.`);
        console.info("[Loader] Teams · Elimination · Taxes · Claims · Market · Trader · Monster · Pillager · Outposts · Essentials · Anti-AFK · Soldier · Minefield");
        console.info(`[Loader] Version: ${VERSION}`);
        console.info("----------------------------------------");
    });
}
function startLoader() {
    safeRun("Loader initialization", () => { console.info(`[Loader] Starting ${MODULE_COUNT} modules...`); startWatchdog(); });
    system.runTimeout(() => safeRun("Startup completion", finishStartup), STARTUP_DELAY);
}

startLoader();

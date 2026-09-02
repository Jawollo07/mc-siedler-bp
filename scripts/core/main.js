import { system } from "@minecraft/server";
import { version } from "./version.js"
/**
 * Siedler Logic – Main Loader
 *
 * Important:
 * - Keep imports static for Bedrock module compatibility.
 * - Keep the import order deterministic.
 * - Never let a non-critical startup task prevent the loader from finishing.
 * - Dynamic properties must be registered before modules that use them.
 */

// -----------------------------------------------------------------------------
// Core
// -----------------------------------------------------------------------------
import "./dynamic_properties.js";

// -----------------------------------------------------------------------------
// Teams
// -----------------------------------------------------------------------------
import ".././teams/index.js";
import ".././teams/chat.js";

// -----------------------------------------------------------------------------
// Economy
// -----------------------------------------------------------------------------
import ".././taxes/index.js";

// -----------------------------------------------------------------------------
// Claims
// -----------------------------------------------------------------------------
import ".././claims/index.js";
import ".././claims/protection.js";
import ".././claims/display.js";

// -----------------------------------------------------------------------------
// Market
// -----------------------------------------------------------------------------
import ".././market/market_place.js";
import ".././market/commands.js";
import ".././market/trader_commands.js";

// -----------------------------------------------------------------------------
// Monster system
// -----------------------------------------------------------------------------
import ".././monster/index.js";
import ".././monster/pillager_squads.js";
import ".././monster/outpost_raids.js";
import ".././monster/commands.js";
import ".././monster/token.js";

// -----------------------------------------------------------------------------
// Essentials
// -----------------------------------------------------------------------------
import ".././essentials/index.js";
import ".././essentials/player_stats.js";

// -----------------------------------------------------------------------------
// Soldier system
// -----------------------------------------------------------------------------
import ".././soldier/index.js";
import ".././soldier/trader.js";

const VERSION = version;
const MODULE_COUNT = 19;
const STARTUP_DELAY = 20;
const WATCHDOG_INTERVAL = 200;

let startupCompleted = false;
let watchdogHandle;

function log(message) {
    console.info(`§6[Siedler Logic ${VERSION}] §7${message}`);
}

function logSuccess(message) {
    console.info(`§6[Siedler Logic ${VERSION}] §a${message}`);
}

function logWarning(message) {
    console.warn(`§6[Siedler Logic ${VERSION}] §e${message}`);
}

function safeRun(label, callback) {
    try {
        callback();
    } catch (error) {
        console.error(`§6[Siedler Logic ${VERSION}] §c${label} failed:`);
        console.error(error);
    }
}

function startWatchdog() {
    if (watchdogHandle !== undefined) {
        return;
    }

    watchdogHandle = system.runInterval(() => {
        if (startupCompleted) {
            system.clearRun(watchdogHandle);
            watchdogHandle = undefined;
            return;
        }

        logWarning("Startup is taking longer than expected. Continuing without blocking the server.");
    }, WATCHDOG_INTERVAL);
}

function finishStartup() {
    if (startupCompleted) {
        return;
    }

    startupCompleted = true;

    safeRun("Startup status", () => {
        console.info("§8----------------------------------------");
        logSuccess("All modules initialized.");
        log(`Loaded ${MODULE_COUNT} modules.`);
        console.info("§7Teams · Taxes · Claims · Market · Trader · Monster · Pillager · Outposts · Essentials · Soldier");
        console.info("§7 Version: " + VERSION);
        console.info("§8----------------------------------------");
    });
}

function startLoader() {
    safeRun("Loader initialization", () => {
        log(`Starting ${MODULE_COUNT} modules...`);
        startWatchdog();
    });

    system.runTimeout(() => {
        safeRun("Startup completion", finishStartup);
    }, STARTUP_DELAY);
}

// All module imports above are evaluated before this code executes.
// Keeping the final startup sequence guarded prevents logging/watchdog errors
// from becoming a second failure after the actual modules have loaded.
startLoader();

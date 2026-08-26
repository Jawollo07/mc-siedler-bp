import { system } from "@minecraft/server";

/**
 * Siedler Logic – Main Module Loader
 *
 * Keep initialization in one place and load modules in dependency order.
 * Dynamic properties must be registered before modules that use them.
 */

const MODULES = [
    // Core
    "./dynamic_properties.js",

    // Teams
    "./teams/index.js",
    "./teams/chat.js",

    // Economy
    "./taxes/index.js",

    // Claims
    "./claims/index.js",
    "./claims/protection.js",
    "./claims/display.js",

    // Monster system
    "./monster/index.js",
    "./monster/pillager_squads.js",
    "./monster/outpost_raids.js",
    "./monster/commands.js",
    "./monster/token.js",

    // Essentials
    "./essentials/index.js",
    "./essentials/player_stats.js",

    // Soldier system
    "./soldier/scripts/main.js",
];

const MODULE_NAMES = [
    "Dynamic Properties",
    "Teams",
    "Team Chat",
    "Taxes",
    "Claims",
    "Claim Protection",
    "Claim Display",
    "Monster",
    "Pillager Squads",
    "Outpost Raids",
    "Monster Commands",
    "Monster Token",
    "Essentials",
    "Player Stats",
    "Soldier",
];

function log(message) {
    console.info(`[Siedler Logic] ${message}`);
}

function loadModules() {
    log(`Loading ${MODULES.length} modules...`);

    // Static imports are intentionally used below so Minecraft can resolve
    // and initialize every module before the main runtime starts.
    return MODULES.length;
}

loadModules();

console.info("§8----------------------------------------");
console.info("§6[Siedler Logic] §aAll modules loaded!");
console.info(`§7Modules: ${MODULE_NAMES.join(" · ")}`);
console.info("§8----------------------------------------");

system.runTimeout(() => {
    log(`Successfully started (${MODULES.length} modules).`);
}, 20);

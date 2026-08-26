import { system } from "@minecraft/server";

/**
 * Dynamic Properties in the current @minecraft/server 2.x API do not expose
 * DynamicPropertiesDefinition anymore. World properties can be read/written
 * directly through world.getDynamicProperty()/setDynamicProperty().
 *
 * Keep this module as an early-startup marker so main.js can continue to load
 * one central initialization module without importing a removed API symbol.
 */
system.beforeEvents.startup.subscribe(() => {
    console.info("§a[Siedler Logic] Dynamic-Property-System bereit (API 2.x)");
});
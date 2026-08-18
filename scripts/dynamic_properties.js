import { system, DynamicPropertiesDefinition } from "@minecraft/server";

/**
 * Registriert alle weltweiten Dynamic Properties zentral.
 * Scripting V2 verwendet system.beforeEvents.startup anstelle
 * des entfernten world.beforeEvents.worldInitialize Events.
 */
system.beforeEvents.startup.subscribe((event) => {
    const teams = new DynamicPropertiesDefinition();
    teams.defineString("teams", 32767);
    event.propertyRegistry.registerWorldDynamicProperties(teams);

    const claims = new DynamicPropertiesDefinition();
    claims.defineString("claims", 32767);
    event.propertyRegistry.registerWorldDynamicProperties(claims);

    const monster = new DynamicPropertiesDefinition();
    monster.defineString("monster_config", 32767);
    event.propertyRegistry.registerWorldDynamicProperties(monster);

    console.info("§a[Siedler Logic] World-Dynamic-Properties registriert: teams, claims, monster_config");
});

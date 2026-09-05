import { system, world, CustomCommandParamType, CustomCommandStatus, CommandPermissionLevel } from "@minecraft/server";

const TRADER_TYPE = "siedler:trader";
const OP_PERMISSION = CommandPermissionLevel.GameDirectors;

const TRADER_TYPES = {
    food: { event: "siedler:set_food", name: "§aLebensmittelhändler", tag: "trader_food" },
    building: { event: "siedler:set_building", name: "§6Baustoffhändler", tag: "trader_building" },
    resources: { event: "siedler:set_resources", name: "§7Rohstoffhändler", tag: "trader_resources" },
    tools: { event: "siedler:set_tools", name: "§bWerkzeughändler", tag: "trader_tools" },
    weapons: { event: "siedler:set_weapons", name: "§cWaffenhändler", tag: "trader_weapons" },
    supplies: { event: "siedler:set_supplies", name: "§dVersorgungshändler", tag: "trader_supplies" },
    soldiers: { event: "siedler:set_soldiers", name: "§cSoldatenhändler", tag: "soldier_trader" }
};

function playerOnly(origin) {
    try {
        const player = origin.sourceEntity;
        return player?.typeId === "minecraft:player" ? player : null;
    } catch { return null; }
}

function reply(player, message) {
    try { player.sendMessage(`§8[§bHändler§8]§r ${message}`); } catch {}
}

function hasTraderRole(trader) {
    return Object.values(TRADER_TYPES).some(config => config.tag && trader.hasTag(config.tag));
}

function applyTraderType(trader, type) {
    const config = TRADER_TYPES[type];
    if (!config || !trader?.isValid) return false;

    try {
        trader.triggerEvent(config.event);
        if (config.tag && !trader.hasTag(config.tag)) trader.addTag(config.tag);
        try { trader.nameTag = config.name; } catch {}
        return true;
    } catch (error) {
        console.warn(`[Trader] Failed to apply type ${type}: ${error}`);
        return false;
    }
}

function getTraderType(trader) {
    for (const [type, config] of Object.entries(TRADER_TYPES)) {
        if (config.tag && trader.hasTag(config.tag)) return type;
    }
    return "food";
}

function spawnTrader(player, type, location) {
    const config = TRADER_TYPES[type];
    if (!config) {
        reply(player, `§cUnbekannter Typ: ${type}`);
        reply(player, `§7Verfügbar: ${Object.keys(TRADER_TYPES).join(", ")}`);
        return;
    }

    try {
        const trader = player.dimension.spawnEntity(TRADER_TYPE, location);

        // Trade tables are component groups. Apply them after the entity has
        // completed spawning to avoid a blank/non-interactive trade state.
        system.run(() => {
            if (!applyTraderType(trader, type)) {
                reply(player, "§cHändler konnte nicht initialisiert werden.");
                return;
            }
            reply(player, `§a${config.name} §agespawnt.`);
        });
    } catch (error) {
        console.warn(`[Trader] Spawn failed: ${error}`);
        reply(player, "§cHändler konnte nicht gespawnt werden.");
    }
}

// Repair traders created by older versions or by /summon. The entity JSON
// already gives new traders the food trade table, so only role-less traders
// need recovery here. Existing role tags are never re-applied periodically,
// which prevents trade uses from being reset.
world.afterEvents.entitySpawn.subscribe((event) => {
    const trader = event.entity;
    if (trader.typeId !== TRADER_TYPE) return;

    system.run(() => {
        try {
            if (!hasTraderRole(trader)) applyTraderType(trader, "food");
        } catch (error) {
            console.warn(`[Trader] Spawn initialization failed: ${error}`);
        }
    });
});

system.runInterval(() => {
    for (const dimensionId of ["overworld", "nether", "the_end"]) {
        try {
            const dimension = world.getDimension(dimensionId);
            for (const trader of dimension.getEntities({ type: TRADER_TYPE })) {
                if (!hasTraderRole(trader)) applyTraderType(trader, "food");
            }
        } catch {}
    }
}, 200);

system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;

    registry.registerCommand({
        name: "siedler:trader",
        description: "Spawnt einen vordefinierten Händler.",
        permissionLevel: OP_PERMISSION,
        cheatsRequired: false,
        mandatoryParameters: [{ name: "type", type: CustomCommandParamType.String }]
    }, (origin, type) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => spawnTrader(player, String(type).toLowerCase(), player.location));
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({
        name: "siedler:trader_here",
        description: "Spawnt einen Händler vor dir.",
        permissionLevel: OP_PERMISSION,
        cheatsRequired: false,
        mandatoryParameters: [{ name: "type", type: CustomCommandParamType.String }]
    }, (origin, type) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => {
            const rotation = player.getRotation();
            const yaw = (rotation.y + 90) * Math.PI / 180;
            spawnTrader(player, String(type).toLowerCase(), {
                x: player.location.x + Math.cos(yaw) * 2,
                y: player.location.y,
                z: player.location.z + Math.sin(yaw) * 2
            });
        });
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({
        name: "siedler:trader_types",
        description: "Zeigt alle Händlertypen.",
        permissionLevel: OP_PERMISSION,
        cheatsRequired: false
    }, (origin) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        reply(player, `§bHändlertypen: §f${Object.keys(TRADER_TYPES).join("§7, §f")}`);
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({
        name: "siedler:trader_remove",
        description: "Entfernt alle Siedler-Händler in deiner Dimension.",
        permissionLevel: OP_PERMISSION,
        cheatsRequired: false
    }, (origin) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => {
            let removed = 0;
            try {
                for (const trader of player.dimension.getEntities({ type: TRADER_TYPE })) {
                    try { trader.remove(); removed++; } catch {}
                }
            } catch (error) { console.warn(`[Trader] Remove failed: ${error}`); }
            reply(player, `§a${removed} Händler entfernt.`);
        });
        return { status: CustomCommandStatus.Success };
    });

    console.info("§a[Trader] Predefined trader types registered");
});

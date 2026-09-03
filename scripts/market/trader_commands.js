import { system, CustomCommandParamType, CustomCommandStatus, CommandPermissionLevel } from "@minecraft/server";

const TRADER_TYPE = "siedler:trader";
const OP_PERMISSION = CommandPermissionLevel.GameDirectors;
const TRADER_VARIANT_TAGS = ["trader_food", "trader_building", "trader_resources", "trader_tools", "trader_weapons", "trader_supplies", "trader_soldiers"];

const TRADER_TYPES = {
    food: { event: "siedler:set_food", name: "§aLebensmittelhändler", tag: "trader_food" },
    building: { event: "siedler:set_building", name: "§6Baustoffhändler", tag: "trader_building" },
    resources: { event: "siedler:set_resources", name: "§7Rohstoffhändler", tag: "trader_resources" },
    tools: { event: "siedler:set_tools", name: "§bWerkzeughändler", tag: "trader_tools" },
    weapons: { event: "siedler:set_weapons", name: "§cWaffenhändler", tag: "trader_weapons" },
    supplies: { event: "siedler:set_supplies", name: "§dVersorgungshändler", tag: "trader_supplies" },
    soldiers: { event: null, name: "§cSoldatenhändler", tag: "soldier_trader", variantTag: "trader_soldiers" }
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

function setTraderVariant(trader, config) {
    for (const tag of TRADER_VARIANT_TAGS) {
        try { if (trader.hasTag(tag)) trader.removeTag(tag); } catch {}
    }
    try { trader.addTag(config.variantTag ?? config.tag); } catch {}
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
        if (config.event) trader.triggerEvent(config.event);
        setTraderVariant(trader, config);
        try { trader.nameTag = config.name; } catch {}
        reply(player, `§a${config.name} §agespawnt.`);
    } catch (error) {
        console.warn(`[Trader] Spawn failed: ${error}`);
        reply(player, "§cHändler konnte nicht gespawnt werden.");
    }
}

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

import {
    system,
    CustomCommandParamType,
    CustomCommandStatus,
    CommandPermissionLevel
} from "@minecraft/server";

const TRADER_TYPE = "siedler:trader";
const OP_PERMISSION = CommandPermissionLevel.GameDirectors;

const TRADER_TYPES = {
    food: { event: "siedler:set_food", name: "§aLebensmittelhändler" },
    materials: { event: "siedler:set_materials", name: "§7Materialhändler" },
    tools: { event: "siedler:set_tools", name: "§6Werkzeughändler" }
};

function playerOnly(origin) {
    try {
        const player = origin.sourceEntity;
        if (!player || player.typeId !== "minecraft:player") return null;
        return player;
    } catch {
        return null;
    }
}

function reply(player, message) {
    try { player.sendMessage(`§8[§bHändler§8]§r ${message}`); } catch {}
}

function spawnTrader(player, type, location) {
    const config = TRADER_TYPES[type];
    if (!config) {
        reply(player, `§cUnbekannter Händlertyp: ${type}`);
        reply(player, `§7Verfügbar: ${Object.keys(TRADER_TYPES).join(", ")}`);
        return;
    }

    try {
        const trader = player.dimension.spawnEntity(TRADER_TYPE, location);
        trader.triggerEvent(config.event);
        try { trader.nameTag = config.name; } catch {}
        reply(player, `§a${type}-Händler gespawnt.`);
    } catch (error) {
        console.warn(`[Trader] Spawn failed: ${error}`);
        reply(player, "§cHändler konnte nicht gespawnt werden.");
    }
}

system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;

    registry.registerCommand(
        {
            name: "siedler:trader",
            description: "Spawnt einen vordefinierten Händlertyp.",
            permissionLevel: OP_PERMISSION,
            cheatsRequired: false,
            mandatoryParameters: [
                { name: "type", type: CustomCommandParamType.String }
            ]
        },
        (origin, type) => {
            const player = playerOnly(origin);
            if (!player) return { status: CustomCommandStatus.Failure };

            system.run(() => spawnTrader(player, String(type).toLowerCase(), {
                x: player.location.x,
                y: player.location.y,
                z: player.location.z
            }));

            return { status: CustomCommandStatus.Success };
        }
    );

    registry.registerCommand(
        {
            name: "siedler:trader_here",
            description: "Spawnt einen vordefinierten Händler vor dir.",
            permissionLevel: OP_PERMISSION,
            cheatsRequired: false,
            mandatoryParameters: [
                { name: "type", type: CustomCommandParamType.String }
            ]
        },
        (origin, type) => {
            const player = playerOnly(origin);
            if (!player) return { status: CustomCommandStatus.Failure };

            system.run(() => {
                try {
                    const rotation = player.getRotation();
                    const yaw = (rotation.y + 90) * Math.PI / 180;
                    spawnTrader(player, String(type).toLowerCase(), {
                        x: player.location.x + Math.cos(yaw) * 2,
                        y: player.location.y,
                        z: player.location.z + Math.sin(yaw) * 2
                    });
                } catch (error) {
                    console.warn(`[Trader] Spawn failed: ${error}`);
                    reply(player, "§cHändler konnte nicht gespawnt werden.");
                }
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    registry.registerCommand(
        {
            name: "siedler:trader_types",
            description: "Zeigt alle vordefinierten Händlertypen.",
            permissionLevel: OP_PERMISSION,
            cheatsRequired: false
        },
        (origin) => {
            const player = playerOnly(origin);
            if (!player) return { status: CustomCommandStatus.Failure };
            reply(player, "§bHändlertypen: §f" + Object.keys(TRADER_TYPES).join("§7, §f"));
            return { status: CustomCommandStatus.Success };
        }
    );

    registry.registerCommand(
        {
            name: "siedler:trader_remove",
            description: "Entfernt alle Siedler-Händler in deiner Dimension.",
            permissionLevel: OP_PERMISSION,
            cheatsRequired: false
        },
        (origin) => {
            const player = playerOnly(origin);
            if (!player) return { status: CustomCommandStatus.Failure };

            system.run(() => {
                let removed = 0;
                try {
                    for (const trader of player.dimension.getEntities({ type: TRADER_TYPE })) {
                        try { trader.remove(); removed++; } catch {}
                    }
                } catch (error) {
                    console.warn(`[Trader] Remove failed: ${error}`);
                }
                reply(player, `§a${removed} Händler entfernt.`);
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    console.info("§a[Trader] Predefined trader commands registered");
});

import {
    system,
    CustomCommandParamType,
    CustomCommandStatus,
    CommandPermissionLevel
} from "@minecraft/server";

const TRADER_TYPE = "siedler:trader";
const OP_PERMISSION = CommandPermissionLevel.GameDirectors;

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
    try {
        player.sendMessage(`§8[§bHändler§8]§r ${message}`);
    } catch {}
}

system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;

    registry.registerCommand(
        {
            name: "siedler:trader",
            description: "Spawnt einen Händler mit den konfigurierten Custom-Trades.",
            permissionLevel: OP_PERMISSION,
            cheatsRequired: false
        },
        (origin) => {
            const player = playerOnly(origin);
            if (!player) return { status: CustomCommandStatus.Failure };

            system.run(() => {
                try {
                    const location = {
                        x: player.location.x,
                        y: player.location.y,
                        z: player.location.z
                    };

                    const trader = player.dimension.spawnEntity(
                        TRADER_TYPE,
                        location
                    );

                    try {
                        trader.nameTag = "§bHändler";
                    } catch {}

                    reply(player, "§aCustom-Trader gespawnt.");
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
            name: "siedler:trader_here",
            description: "Spawnt einen Händler leicht vor dir.",
            permissionLevel: OP_PERMISSION,
            cheatsRequired: false
        },
        (origin) => {
            const player = playerOnly(origin);
            if (!player) return { status: CustomCommandStatus.Failure };

            system.run(() => {
                try {
                    const rotation = player.getRotation();
                    const yaw = (rotation.y + 90) * Math.PI / 180;

                    const location = {
                        x: player.location.x + Math.cos(yaw) * 2,
                        y: player.location.y,
                        z: player.location.z + Math.sin(yaw) * 2
                    };

                    const trader = player.dimension.spawnEntity(
                        TRADER_TYPE,
                        location
                    );

                    try {
                        trader.nameTag = "§bHändler";
                    } catch {}

                    reply(player, "§aHändler vor dir gespawnt.");
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
                    const traders = player.dimension.getEntities({
                        type: TRADER_TYPE
                    });

                    for (const trader of traders) {
                        try {
                            trader.remove();
                            removed++;
                        } catch {}
                    }
                } catch (error) {
                    console.warn(`[Trader] Remove failed: ${error}`);
                }

                reply(player, `§a${removed} Händler entfernt.`);
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    console.info("§a[Trader] Custom trader commands registered");
});

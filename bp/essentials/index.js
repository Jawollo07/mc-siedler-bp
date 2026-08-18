import { 
    system, 
    world, 
    CommandPermissionLevel, 
    CustomCommandParamType,
    CustomCommandStatus 
} from "@minecraft/server";

// Speichert Homes und TPA-Anfragen
const homes = new Map();          // playerName → {x, y, z, dimension}
const tpaRequests = new Map();    // targetName → {from: playerName, timeout}
const lastDeath = new Map();      // playerName → {x, y, z, dimension}

// Dynamic Properties für Homes (persistent)
world.beforeEvents.worldInitialize.subscribe((event) => {
    event.dynamicPropertiesDefinition.defineString("homes", 32767);
});

function getHomes() {
    const raw = world.getDynamicProperty("homes");
    return raw ? JSON.parse(raw) : {};
}

function saveHomes(data) {
    world.setDynamicProperty("homes", JSON.stringify(data));
}

// Todespunkt speichern
world.afterEvents.entityDie.subscribe((event) => {
    const player = event.deadEntity;
    if (player.typeId !== "minecraft:player") return;

    lastDeath.set(player.name, {
        x: player.location.x,
        y: player.location.y,
        z: player.location.z,
        dimension: player.dimension.id
    });
});

system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;

    // ==========================================
    // /spawn
    // ==========================================
    registry.registerCommand(
        {
            name: "spawn",
            description: "Teleportiert dich zum Spawn.",
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false
        },
        (origin) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };

            system.run(() => {
                const spawn = world.getDefaultSpawnLocation();
                player.teleport(spawn, { dimension: world.getDimension("overworld") });
                player.sendMessage("§aDu wurdest zum Spawn teleportiert.");
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    // ==========================================
    // /sethome
    // ==========================================
    registry.registerCommand(
        {
            name: "sethome",
            description: "Setzt dein Zuhause an deiner aktuellen Position.",
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false
        },
        (origin) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };

            system.run(() => {
                const data = getHomes();
                data[player.name] = {
                    x: Math.floor(player.location.x),
                    y: Math.floor(player.location.y),
                    z: Math.floor(player.location.z),
                    dimension: player.dimension.id
                };
                saveHomes(data);
                player.sendMessage("§aZuhause gesetzt!");
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    // ==========================================
    // /home
    // ==========================================
    registry.registerCommand(
        {
            name: "home",
            description: "Teleportiert dich zu deinem Zuhause.",
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false
        },
        (origin) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };

            system.run(() => {
                const data = getHomes();
                const home = data[player.name];

                if (!home) {
                    player.sendMessage("§cDu hast noch kein Zuhause gesetzt. Nutze /sethome");
                    return;
                }

                const dim = world.getDimension(home.dimension || "overworld");
                player.teleport({ x: home.x, y: home.y, z: home.z }, { dimension: dim });
                player.sendMessage("§aWillkommen zu Hause!");
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    // ==========================================
    // /tpa <Spieler>
    // ==========================================
    registry.registerCommand(
        {
            name: "tpa",
            description: "Sendet eine Teleport-Anfrage an einen Spieler.",
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false,
            mandatoryParameters: [
                { type: CustomCommandParamType.String, name: "spieler" }
            ]
        },
        (origin, args) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };

            const targetName = args[0];

            system.run(() => {
                if (targetName === player.name) {
                    player.sendMessage("§cDu kannst dir keine Anfrage selbst senden.");
                    return;
                }

                const target = world.getPlayers().find(p => p.name === targetName);
                if (!target) {
                    player.sendMessage(`§cSpieler "${targetName}" ist nicht online.`);
                    return;
                }

                tpaRequests.set(targetName, {
                    from: player.name,
                    timeout: Date.now() + 60000 // 60 Sekunden
                });

                player.sendMessage(`§aTeleport-Anfrage an ${targetName} gesendet.`);
                target.sendMessage(`§e${player.name} §möchte sich zu dir teleportieren.`);
                target.sendMessage(`§7Nutze §a/tpaccept §7oder §c/tpdeny`);
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    // ==========================================
    // /tpaccept
    // ==========================================
    registry.registerCommand(
        {
            name: "tpaccept",
            description: "Nimmt eine Teleport-Anfrage an.",
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false
        },
        (origin) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };

            system.run(() => {
                const request = tpaRequests.get(player.name);

                if (!request || Date.now() > request.timeout) {
                    player.sendMessage("§cKeine offene Teleport-Anfrage.");
                    tpaRequests.delete(player.name);
                    return;
                }

                const fromPlayer = world.getPlayers().find(p => p.name === request.from);
                if (!fromPlayer) {
                    player.sendMessage("§cDer Spieler ist nicht mehr online.");
                    tpaRequests.delete(player.name);
                    return;
                }

                fromPlayer.teleport(player.location, { dimension: player.dimension });
                fromPlayer.sendMessage(`§aDu wurdest zu ${player.name} teleportiert.`);
                player.sendMessage(`§a${fromPlayer.name} wurde zu dir teleportiert.`);

                tpaRequests.delete(player.name);
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    // ==========================================
    // /tpdeny
    // ==========================================
    registry.registerCommand(
        {
            name: "tpdeny",
            description: "Lehnt eine Teleport-Anfrage ab.",
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false
        },
        (origin) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };

            system.run(() => {
                const request = tpaRequests.get(player.name);

                if (!request) {
                    player.sendMessage("§cKeine offene Teleport-Anfrage.");
                    return;
                }

                const fromPlayer = world.getPlayers().find(p => p.name === request.from);
                if (fromPlayer) {
                    fromPlayer.sendMessage(`§c${player.name} hat deine Teleport-Anfrage abgelehnt.`);
                }

                player.sendMessage("§eTeleport-Anfrage abgelehnt.");
                tpaRequests.delete(player.name);
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    // ==========================================
    // /msg <Spieler> <Nachricht>
    // ==========================================
    registry.registerCommand(
        {
            name: "msg",
            description: "Sendet eine private Nachricht an einen Spieler.",
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false,
            mandatoryParameters: [
                { type: CustomCommandParamType.String, name: "spieler" },
                { type: CustomCommandParamType.String, name: "nachricht" }
            ]
        },
        (origin, args) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };

            const targetName = args[0];
            const message = args[1];

            system.run(() => {
                const target = world.getPlayers().find(p => p.name === targetName);
                if (!target) {
                    player.sendMessage(`§cSpieler "${targetName}" ist nicht online.`);
                    return;
                }

                player.sendMessage(`§7[Ich → \( {targetName}] §f \){message}`);
                target.sendMessage(`§7[\( {player.name} → Mir] §f \){message}`);
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    // ==========================================
    // /back
    // ==========================================
    registry.registerCommand(
        {
            name: "back",
            description: "Teleportiert dich zum letzten Todespunkt.",
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false
        },
        (origin) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };

            system.run(() => {
                const death = lastDeath.get(player.name);
                if (!death) {
                    player.sendMessage("§cKein Todespunkt gespeichert.");
                    return;
                }

                const dim = world.getDimension(death.dimension || "overworld");
                player.teleport({ x: death.x, y: death.y, z: death.z }, { dimension: dim });
                player.sendMessage("§aZum Todespunkt teleportiert.");
            });

            return { status: CustomCommandStatus.Success };
        }
    );
    // ==========================================
    // ADMIN BEFEHLE
    // ==========================================

    // /admin:heal [Spieler]
    registry.registerCommand(
        {
            name: "admin:heal",
            description: "Heilt dich oder einen anderen Spieler.",
            permissionLevel: CommandPermissionLevel.Operator,
            cheatsRequired: false,
            optionalParameters: [
                { type: CustomCommandParamType.String, name: "spieler" }
            ]
        },
        (origin, args) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };

            system.run(() => {
                const targetName = args[0];
                let target = player;

                if (targetName) {
                    target = world.getPlayers().find(p => p.name === targetName);
                    if (!target) {
                        player.sendMessage(`§cSpieler "${targetName}" nicht gefunden.`);
                        return;
                    }
                }

                target.addEffect("instant_health", 1, { amplifier: 10, showParticles: false });
                target.addEffect("saturation", 1, { amplifier: 10, showParticles: false });

                if (target === player) {
                    player.sendMessage("§aDu wurdest geheilt.");
                } else {
                    player.sendMessage(`§a${target.name} wurde geheilt.`);
                    target.sendMessage("§aDu wurdest von einem Admin geheilt.");
                }
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    // /admin:feed [Spieler]
    registry.registerCommand(
        {
            name: "admin:feed",
            description: "Füllt den Hunger.",
            permissionLevel: CommandPermissionLevel.Operator,
            cheatsRequired: false,
            optionalParameters: [
                { type: CustomCommandParamType.String, name: "spieler" }
            ]
        },
        (origin, args) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };

            system.run(() => {
                const targetName = args[0];
                let target = player;

                if (targetName) {
                    target = world.getPlayers().find(p => p.name === targetName);
                    if (!target) {
                        player.sendMessage(`§cSpieler "${targetName}" nicht gefunden.`);
                        return;
                    }
                }

                target.addEffect("saturation", 1, { amplifier: 10, showParticles: false });
                target.sendMessage("§aHunger gefüllt.");
                if (target !== player) player.sendMessage(`§a${target.name} wurde gefüttert.`);
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    // /admin:god
    const godMode = new Set();

    registry.registerCommand(
        {
            name: "admin:god",
            description: "Schaltet Godmode um.",
            permissionLevel: CommandPermissionLevel.Operator,
            cheatsRequired: false
        },
        (origin) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };

            system.run(() => {
                if (godMode.has(player.name)) {
                    godMode.delete(player.name);
                    player.removeEffect("resistance");
                    player.removeEffect("fire_resistance");
                    player.sendMessage("§eGodmode §cdeaktiviert§e.");
                } else {
                    godMode.add(player.name);
                    player.addEffect("resistance", 999999, { amplifier: 255, showParticles: false });
                    player.addEffect("fire_resistance", 999999, { amplifier: 0, showParticles: false });
                    player.sendMessage("§eGodmode §aaktiviert§e.");
                }
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    // /admin:fly
    registry.registerCommand(
        {
            name: "admin:fly",
            description: "Schaltet Flugmodus um.",
            permissionLevel: CommandPermissionLevel.Operator,
            cheatsRequired: false
        },
        (origin) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };

            system.run(() => {
                // Einfacher Toggle über mayfly Ability
                const canFly = player.hasTag("flying");
                if (canFly) {
                    player.removeTag("flying");
                    player.runCommand("ability @s mayfly false");
                    player.sendMessage("§eFlugmodus §cdeaktiviert§e.");
                } else {
                    player.addTag("flying");
                    player.runCommand("ability @s mayfly true");
                    player.sendMessage("§eFlugmodus §aaktiviert§e.");
                }
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    // /admin:tp <Spieler>
    registry.registerCommand(
        {
            name: "admin:tp",
            description: "Teleportiert dich zu einem Spieler.",
            permissionLevel: CommandPermissionLevel.Operator,
            cheatsRequired: false,
            mandatoryParameters: [
                { type: CustomCommandParamType.String, name: "spieler" }
            ]
        },
        (origin, args) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };

            const targetName = args[0];

            system.run(() => {
                const target = world.getPlayers().find(p => p.name === targetName);
                if (!target) {
                    player.sendMessage(`§cSpieler "${targetName}" nicht gefunden.`);
                    return;
                }

                player.teleport(target.location, { dimension: target.dimension });
                player.sendMessage(`§aZu ${targetName} teleportiert.`);
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    // /admin:tphere <Spieler>
    registry.registerCommand(
        {
            name: "admin:tphere",
            description: "Teleportiert einen Spieler zu dir.",
            permissionLevel: CommandPermissionLevel.Operator,
            cheatsRequired: false,
            mandatoryParameters: [
                { type: CustomCommandParamType.String, name: "spieler" }
            ]
        },
        (origin, args) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };

            const targetName = args[0];

            system.run(() => {
                const target = world.getPlayers().find(p => p.name === targetName);
                if (!target) {
                    player.sendMessage(`§cSpieler "${targetName}" nicht gefunden.`);
                    return;
                }

                target.teleport(player.location, { dimension: player.dimension });
                player.sendMessage(`§a${targetName} wurde zu dir teleportiert.`);
                target.sendMessage(`§eDu wurdest zu ${player.name} teleportiert.`);
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    // /admin:clear [Spieler]
    registry.registerCommand(
        {
            name: "admin:clear",
            description: "Leert das Inventar.",
            permissionLevel: CommandPermissionLevel.Operator,
            cheatsRequired: false,
            optionalParameters: [
                { type: CustomCommandParamType.String, name: "spieler" }
            ]
        },
        (origin, args) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };

            system.run(() => {
                const targetName = args[0];
                let target = player;

                if (targetName) {
                    target = world.getPlayers().find(p => p.name === targetName);
                    if (!target) {
                        player.sendMessage(`§cSpieler "${targetName}" nicht gefunden.`);
                        return;
                    }
                }

                target.runCommand("clear @s");
                target.sendMessage("§eDein Inventar wurde geleert.");
                if (target !== player) player.sendMessage(`§aInventar von ${target.name} geleert.`);
            });

            return { status: CustomCommandStatus.Success };
        }
    );

    // /admin:day
    registry.registerCommand(
        {
            name: "admin:day",
            description: "Setzt die Zeit auf Tag.",
            permissionLevel: CommandPermissionLevel.Operator,
            cheatsRequired: false
        },
        (origin) => {
            system.run(() => {
                world.setTimeOfDay(1000);
                world.sendMessage("§eDie Zeit wurde auf §aTag §egesetzt.");
            });
            return { status: CustomCommandStatus.Success };
        }
    );

    // /admin:night
    registry.registerCommand(
        {
            name: "admin:night",
            description: "Setzt die Zeit auf Nacht.",
            permissionLevel: CommandPermissionLevel.Operator,
            cheatsRequired: false
        },
        (origin) => {
            system.run(() => {
                world.setTimeOfDay(13000);
                world.sendMessage("§eDie Zeit wurde auf §cNacht §egesetzt.");
            });
            return { status: CustomCommandStatus.Success };
        }
    );

    // /admin:sun
    registry.registerCommand(
        {
            name: "admin:sun",
            description: "Setzt klares Wetter.",
            permissionLevel: CommandPermissionLevel.Operator,
            cheatsRequired: false
        },
        (origin) => {
            system.run(() => {
                world.getDimension("overworld").runCommand("weather clear");
                world.sendMessage("§eDas Wetter wurde auf §aSonnenschein §egesetzt.");
            });
            return { status: CustomCommandStatus.Success };
        }
    );

    // /admin:rain
    registry.registerCommand(
        {
            name: "admin:rain",
            description: "Setzt Regen.",
            permissionLevel: CommandPermissionLevel.Operator,
            cheatsRequired: false
        },
        (origin) => {
            system.run(() => {
                world.getDimension("overworld").runCommand("weather rain");
                world.sendMessage("§eDas Wetter wurde auf §bRegen §egesetzt.");
            });
            return { status: CustomCommandStatus.Success };
        }
    );

    // /admin:kick <Spieler> [Grund]
    registry.registerCommand(
        {
            name: "admin:kick",
            description: "Kickt einen Spieler.",
            permissionLevel: CommandPermissionLevel.Operator,
            cheatsRequired: false,
            mandatoryParameters: [
                { type: CustomCommandParamType.String, name: "spieler" }
            ],
            optionalParameters: [
                { type: CustomCommandParamType.String, name: "grund" }
            ]
        },
        (origin, args) => {
            const player = origin.sourceEntity;
            if (!player || player.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };

            const targetName = args[0];
            const reason = args[1] || "Kein Grund angegeben";

            system.run(() => {
                const target = world.getPlayers().find(p => p.name === targetName);
                if (!target) {
                    player.sendMessage(`§cSpieler "${targetName}" nicht gefunden.`);
                    return;
                }

                target.runCommand(`kick "${target.name}" ${reason}`);
                world.sendMessage(`§c${targetName} wurde gekickt. §7Grund: ${reason}`);
            });

            return { status: CustomCommandStatus.Success };
        }
    );
});
import { system, world } from "@minecraft/server";
import { createLogger } from "../core/logger.js";
import { godMode } from "./state.js";
import { registerTeleportCommands, registerTeleportEvents } from "./teleport.js";
import { registerMessagingCommands } from "./messaging.js";
import { registerAdminCommands } from "./admin.js";

const logger = createLogger("Essentials");

/**
 * Essentials – zentraler Einstiegspunkt.
 *
 * Die eigentliche Funktionalität liegt bewusst in getrennten Modulen:
 * - state.js      Laufzeitdaten
 * - storage.js    Dynamic Properties / Persistenz
 * - players.js    Spielerauflösung und Command-Helfer
 * - teleport.js   Spawn, Home, Back und TPA
 * - messaging.js  MSG / Reply
 * - admin.js      Admin-Werkzeuge
 */

registerTeleportEvents();

world.afterEvents.playerSpawn?.subscribe?.((event) => {
    if (!event?.initialSpawn) return;
    const player = event.player;

    system.run(() => {
        try {
            if (godMode.has(player.id)) {
                player.addEffect("resistance", 999999, { amplifier: 255, showParticles: false });
                player.addEffect("fire_resistance", 999999, { amplifier: 0, showParticles: false });
                logger.debug(`Godmode-Effekte nach Spawn wiederhergestellt: ${player.name}.`);
            }
        } catch (error) {
            logger.exception(`Godmode-Effekte konnten nach Spawn nicht wiederhergestellt werden: ${player.name}`, error);
        }

        try {
            player.sendMessage("§6[Siedler] §7Essentials bereit. Nutze §f/siedler:stats §7für das Dashboard.");
        } catch (error) {
            logger.debug(`Welcome-Nachricht konnte nicht gesendet werden: ${player.name} (${error}).`);
        }
    });
});

system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;

    try {
        registerTeleportCommands(registry);
        registerMessagingCommands(registry);
        registerAdminCommands(registry);
        logger.info("Essentials-Commands registriert: Teleport, TPA, Messaging und Admin.");
    } catch (error) {
        logger.exception("Essentials-Commands konnten nicht vollständig registriert werden", error);
    }
});

logger.info("Essentials-Modulsystem geladen.");

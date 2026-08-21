import { system, world, CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";

const OP_PERMISSION = CommandPermissionLevel.GameDirectors;

export function getTeams() {
    const rawData = world.getDynamicProperty("teams");
    if (typeof rawData !== "string" || !rawData.length) return {};
    try {
        const parsed = JSON.parse(rawData);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
        console.error(`[Teams] Ungültige Team-Daten: ${error}`);
        return {};
    }
}

function saveTeams(teams) {
    try { world.setDynamicProperty("teams", JSON.stringify(teams)); return true; }
    catch (error) { console.error(`[Teams] Fehler beim Speichern der Teams: ${error}`); return false; }
}

function playerOnly(origin) {
    const player = origin?.sourceEntity;
    return player?.typeId === "minecraft:player" ? player : null;
}

world.afterEvents.playerSpawn?.subscribe?.((event) => {
    if (!event.initialSpawn) return;
    const player = event.player;
    for (const [teamName, data] of Object.entries(getTeams())) {
        if (Array.isArray(data.players) && data.players.includes(player.name)) {
            player.sendMessage(`§aWillkommen zurück! Du bist im Team ${(data.color || "§f")}${teamName}§a.`);
            break;
        }
    }
});

system.beforeEvents.startup.subscribe((event) => {
    const registry = event.customCommandRegistry;

    registry.registerCommand({ name: "siedler:team_create", description: "Erstellt ein neues Team.", permissionLevel: OP_PERMISSION, cheatsRequired: false, mandatoryParameters: [{ type: CustomCommandParamType.String, name: "name" }], optionalParameters: [{ type: CustomCommandParamType.String, name: "farbe" }] }, (origin, args) => {
        const player = playerOnly(origin); if (!player) return { status: CustomCommandStatus.Failure };
        const rawArgs = Array.isArray(args) ? args.map((a) => String(a)) : [];
        if (!rawArgs.length) return { status: CustomCommandStatus.Failure };

        // Detect optional color as the last argument if it starts with the section sign (§)
        let color = "§f";
        if (rawArgs.length >= 2 && rawArgs[rawArgs.length - 1].startsWith("§")) {
            color = rawArgs[rawArgs.length - 1];
            rawArgs.pop();
        }

        const teamName = rawArgs.join(" ").trim();
        if (!teamName) { player.sendMessage("§cDer Teamname darf nicht leer sein."); return { status: CustomCommandStatus.Failure }; }
        system.run(() => {
            const teams = getTeams();
            if (teams[teamName]) { player.sendMessage(`§cDas Team "${teamName}" existiert bereits!`); return; }
            teams[teamName] = { color, players: [], taxChest: null, taxAmount: null };
            player.sendMessage(saveTeams(teams) ? `§aTeam "${color}${teamName}§a" wurde erstellt.` : "§cDas Team konnte nicht gespeichert werden.");
        });
        return { status: CustomCommandStatus.Success };
    });

    /* -----------------------------------------------------
     * In-Game Team UI (/team) - ActionForm menu + input forms
     * Uses ActionFormData for the main menu and ModalFormData for text input.
     */

    async function showCreateTeamForm(player) {
        try {
            if (typeof ModalFormData !== "function") {
                player.sendMessage("§eFormular-API nicht verfügbar. Verwende: /siedler:team_create <name> [farbe]");
                return;
            }
            const form = new ModalFormData();
            form.title("Team erstellen");
            form.textField("Teamname", "MeinTeam", "");
            form.textField("Farbe (optional, z.B. §c)", "§f", "§f");

            const response = await form.show(player);
            if (response.canceled) return;
            const values = response.formValues || [];
            const name = String(values[0] ?? "").trim();
            const color = String(values[1] ?? "§f").trim() || "§f";
            if (!name) { player.sendMessage("§cKein Teamname angegeben."); return; }

            // Delegate to existing command handler via runCommandAsync
            await player.runCommandAsync(`siedler:team_create ${JSON.stringify(name)} ${JSON.stringify(color)}`);
        } catch (error) {
            console.error(`[Teams] showCreateTeamForm error: ${error}`);
            player.sendMessage("§cFehler beim Öffnen des Erstellungsformulars.");
        }
    }

    async function showAddPlayerForm(player) {
        try {
            if (typeof ModalFormData !== "function") {
                player.sendMessage("§eFormular-API nicht verfügbar. Verwende: /siedler:team_add <spieler> <team>");
                return;
            }
            const form = new ModalFormData();
            form.title("Spieler zu Team hinzufügen");
            form.textField("Spielername (exakt)", "SpielerName", "");
            form.textField("Teamname", "TeamName", "");

            const response = await form.show(player);
            if (response.canceled) return;
            const values = response.formValues || [];
            const target = String(values[0] ?? "").trim();
            const team = String(values[1] ?? "").trim();
            if (!target || !team) { player.sendMessage("§cSpieler oder Team fehlt."); return; }

            await player.runCommandAsync(`siedler:team_add ${JSON.stringify(target)} ${JSON.stringify(team)}`);
        } catch (error) {
            console.error(`[Teams] showAddPlayerForm error: ${error}`);
            player.sendMessage("§cFehler beim Öffnen des Hinzufügeformulars.");
        }
    }

    async function showRemovePlayerForm(player) {
        try {
            if (typeof ModalFormData !== "function") {
                player.sendMessage("§eFormular-API nicht verfügbar. Verwende: /siedler:team_remove <spieler> <team>");
                return;
            }
            const form = new ModalFormData();
            form.title("Spieler aus Team entfernen");
            form.textField("Spielername (exakt)", "SpielerName", "");
            form.textField("Teamname", "TeamName", "");

            const response = await form.show(player);
            if (response.canceled) return;
            const values = response.formValues || [];
            const target = String(values[0] ?? "").trim();
            const team = String(values[1] ?? "").trim();
            if (!target || !team) { player.sendMessage("§cSpieler oder Team fehlt."); return; }

            await player.runCommandAsync(`siedler:team_remove ${JSON.stringify(target)} ${JSON.stringify(team)}`);
        } catch (error) {
            console.error(`[Teams] showRemovePlayerForm error: ${error}`);
            player.sendMessage("§cFehler beim Öffnen des Entfernen-Formulars.");
        }
    }

    async function showDeleteTeamForm(player) {
        try {
            const teams = Object.keys(getTeams());
            if (!teams.length) { player.sendMessage("§7Es sind keine Teams zum Löschen vorhanden."); return; }

            const menu = new ActionFormData();
            menu.title("Team löschen");
            menu.body("Wähle ein Team zum Löschen aus:");
            for (const t of teams) menu.button((getTeams()[t].color || "§f") + t);

            const res = await menu.show(player);
            if (res.canceled) return;
            const idx = res.selection;
            const teamName = teams[idx];
            if (!teamName) return;
            await player.runCommandAsync(`siedler:team_delete ${JSON.stringify(teamName)}`);
        } catch (error) {
            console.error(`[Teams] showDeleteTeamForm error: ${error}`);
            player.sendMessage("§cFehler beim Öffnen des Lösch-Formulars.");
        }
    }

    async function showTeamMenu(player) {
        try {
            const menu = new ActionFormData();
            menu.title("Team-Management");
            menu.body("Wähle eine Aktion:");
            menu.button("Team erstellen");
            menu.button("Spieler hinzufügen");
            menu.button("Spieler entfernen");
            menu.button("Team löschen");
            menu.button("Teams anzeigen");
            menu.button("Steuer setzen (Befehl)");

            const res = await menu.show(player);
            if (res.canceled) return;

            switch (res.selection) {
                case 0:
                    await showCreateTeamForm(player);
                    break;
                case 1:
                    await showAddPlayerForm(player);
                    break;
                case 2:
                    await showRemovePlayerForm(player);
                    break;
                case 3:
                    await showDeleteTeamForm(player);
                    break;
                case 4:
                    await player.runCommandAsync("siedler:team_list");
                    break;
                case 5:
                    player.sendMessage("§eVerwende /siedler:team_settax <team> <x> <y> <z> [amount] um die Steuer zu setzen.");
                    break;
            }
        } catch (error) {
            console.error(`[Teams] showTeamMenu error: ${error}`);
            player.sendMessage("§cFehler beim Öffnen des Team-Menüs.");
        }
    }

    // Register short `/team` command that opens the UI
    registry.registerCommand({ name: "siedler:team", description: "Öffnet das Team-Management UI.", permissionLevel: OP_PERMISSION, cheatsRequired: false }, (origin) => {
        const player = playerOnly(origin); if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => showTeamMenu(player));
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "siedler:team_add", description: "Fügt einen Spieler zu einem Team hinzu.", permissionLevel: OP_PERMISSION, cheatsRequired: false, mandatoryParameters: [{ type: CustomCommandParamType.String, name: "spieler" }, { type: CustomCommandParamType.String, name: "team" }] }, (origin, args) => {
        const player = playerOnly(origin); if (!player) return { status: CustomCommandStatus.Failure };
        const targetName = String(args[0] ?? ""); const teamName = String(args[1] ?? "");
        system.run(() => {
            const teams = getTeams(); const team = teams[teamName];
            if (!team) { player.sendMessage(`§cDas Team "${teamName}" existiert nicht.`); return; }
            for (const other of Object.values(teams)) other.players = Array.isArray(other.players) ? other.players.filter((n) => n !== targetName) : [];
            team.players = Array.isArray(team.players) ? team.players : [];
            if (!team.players.includes(targetName)) team.players.push(targetName);
            if (!saveTeams(teams)) { player.sendMessage("§cDie Teamänderung konnte nicht gespeichert werden."); return; }
            player.sendMessage(`§a${targetName} wurde zu Team "${team.color || "§f"}${teamName}§a" hinzugefügt.`);
            world.getPlayers().find((p) => p.name === targetName)?.sendMessage(`§aDu wurdest dem Team "${team.color || "§f"}${teamName}§a" hinzugefügt.`);
        });
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "siedler:team_remove", description: "Entfernt einen Spieler aus einem Team.", permissionLevel: OP_PERMISSION, cheatsRequired: false, mandatoryParameters: [{ type: CustomCommandParamType.String, name: "spieler" }, { type: CustomCommandParamType.String, name: "team" }] }, (origin, args) => {
        const player = playerOnly(origin); if (!player) return { status: CustomCommandStatus.Failure };
        const targetName = String(args[0] ?? ""); const teamName = String(args[1] ?? "");
        system.run(() => {
            const teams = getTeams(); const team = teams[teamName];
            if (!team) { player.sendMessage(`§cDas Team "${teamName}" existiert nicht.`); return; }
            team.players = Array.isArray(team.players) ? team.players.filter((n) => n !== targetName) : [];
            if (!saveTeams(teams)) { player.sendMessage("§cDie Teamänderung konnte nicht gespeichert werden."); return; }
            player.sendMessage(`§e${targetName} wurde aus Team "${team.color || "§f"}${teamName}§e" entfernt.`);
            world.getPlayers().find((p) => p.name === targetName)?.sendMessage(`§eDu wurdest aus dem Team "${team.color || "§f"}${teamName}§e" entfernt.`);
        });
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "siedler:team_delete", description: "Löscht ein gesamtes Team.", permissionLevel: OP_PERMISSION, cheatsRequired: false, mandatoryParameters: [{ type: CustomCommandParamType.String, name: "team" }] }, (origin, args) => {
        const player = playerOnly(origin); if (!player) return { status: CustomCommandStatus.Failure };
        const teamName = String(args[0] ?? "");
        system.run(() => {
            const teams = getTeams(); if (!teams[teamName]) { player.sendMessage(`§cDas Team "${teamName}" existiert nicht.`); return; }
            const color = teams[teamName].color || "§f"; delete teams[teamName];
            player.sendMessage(saveTeams(teams) ? `§eTeam "${color}${teamName}§e" wurde gelöscht.` : "§cDas Team konnte nicht gelöscht werden.");
        });
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "siedler:team_list", description: "Zeigt alle registrierten Teams.", permissionLevel: OP_PERMISSION, cheatsRequired: false }, (origin) => {
        const player = playerOnly(origin); if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => {
            const teams = getTeams(); const names = Object.keys(teams);
            if (!names.length) { player.sendMessage("§7Es sind aktuell keine Teams registriert."); return; }
            player.sendMessage("§6--- Registrierte Teams ---");
            for (const name of names) {
                const data = teams[name]; const members = Array.isArray(data.players) ? data.players : [];
                const tax = data.taxChest ? `§7(Steuerkiste: ${data.taxChest.x} ${data.taxChest.y} ${data.taxChest.z})` : "§8(keine Steuerkiste)";
                player.sendMessage(`${data.color || "§f"}${name}§r: ${members.length ? members.join(", ") : "§7Keine Spieler§r"} ${tax}`);
            }
        });
        return { status: CustomCommandStatus.Success };
    });

    registry.registerCommand({ name: "siedler:team_settax", description: "Setzt Steuerkiste und optional Steuerbetrag.", permissionLevel: OP_PERMISSION, cheatsRequired: false, mandatoryParameters: [{ type: CustomCommandParamType.String, name: "team" }, { type: CustomCommandParamType.Integer, name: "x" }, { type: CustomCommandParamType.Integer, name: "y" }, { type: CustomCommandParamType.Integer, name: "z" }], optionalParameters: [{ type: CustomCommandParamType.Integer, name: "amount" }] }, (origin, args) => {
        const player = playerOnly(origin); if (!player) return { status: CustomCommandStatus.Failure };
        const teamName = String(args[0] ?? "");
        system.run(() => {
            const teams = getTeams(); const team = teams[teamName];
            if (!team) { player.sendMessage(`§cDas Team "${teamName}" existiert nicht.`); return; }
            team.taxChest = { x: args[1], y: args[2], z: args[3] };
            if (args[4] !== undefined) team.taxAmount = Math.max(0, Number(args[4]));
            player.sendMessage(saveTeams(teams) ? `§aSteuerkiste für Team "${team.color || "§f"}${teamName}§a" gesetzt.` : "§cDie Steuerkonfiguration konnte nicht gespeichert werden.");
        });
        return { status: CustomCommandStatus.Success };
    });
});
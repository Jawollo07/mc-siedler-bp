import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { * } from "./index.js";
import { * } from "./relations.js"

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

        const response = await menu.show(player);
        if (response.canceled) return;

        switch (response.selection) {
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
                runPlayerCommand(player, "siedler:team_list");
                break;
            case 5:
                player.sendMessage(
                    "§eVerwende /siedler:team_settax <team> <x> <y> <z> [amount]."
                );
                break;
        }
    } catch (error) {
        console.error(`[Teams] showTeamMenu error: ${error}`);
        player.sendMessage(`§cFehler beim Team-Menü: ${error}`);
    }
}
async function showCreateTeamForm(player) {
    try {
        const form = new ModalFormData();
        form.title("Team erstellen");
        form.textField("Teamname", "MeinTeam", { defaultValue: "" });
        form.textField(
            "Farbe (optional, z.B. §c)",
            "§f",
            { defaultValue: "§f" }
        );

        const response = await form.show(player);
        if (response.canceled) return;

        const values = response.formValues ?? [];
        const name = String(values[0] ?? "").trim();
        const color = String(values[1] ?? "§f").trim() || "§f";

        if (!name) {
            player.sendMessage("§cKein Teamname angegeben.");
            return;
        }

        runPlayerCommand(
            player,
            `siedler:team_create ${JSON.stringify(name)} ${JSON.stringify(color)}`
        );
    } catch (error) {
        console.error(`[Teams] showCreateTeamForm error: ${error}`);
        player.sendMessage(`§cFehler beim Erstellen: ${error}`);
    }
}

async function showAddPlayerForm(player) {
    try {
        const form = new ModalFormData();
        form.title("Spieler zu Team hinzufügen");
        form.textField(
            "Spielername (exakt)",
            "SpielerName",
            { defaultValue: "" }
        );
        form.textField(
            "Teamname",
            "TeamName",
            { defaultValue: "" }
        );

        const response = await form.show(player);
        if (response.canceled) return;

        const values = response.formValues ?? [];
        const target = String(values[0] ?? "").trim();
        const team = String(values[1] ?? "").trim();

        if (!target || !team) {
            player.sendMessage("§cSpieler oder Team fehlt.");
            return;
        }

        runPlayerCommand(
            player,
            `siedler:team_add ${JSON.stringify(target)} ${JSON.stringify(team)}`
        );
    } catch (error) {
        console.error(`[Teams] showAddPlayerForm error: ${error}`);
        player.sendMessage(`§cFehler beim Hinzufügen: ${error}`);
    }
}

async function showRemovePlayerForm(player) {
    try {
        const form = new ModalFormData();
        form.title("Spieler aus Team entfernen");
        form.textField(
            "Spielername (exakt)",
            "SpielerName",
            { defaultValue: "" }
        );
        form.textField(
            "Teamname",
            "TeamName",
            { defaultValue: "" }
        );

        const response = await form.show(player);
        if (response.canceled) return;

        const values = response.formValues ?? [];
        const target = String(values[0] ?? "").trim();
        const team = String(values[1] ?? "").trim();

        if (!target || !team) {
            player.sendMessage("§cSpieler oder Team fehlt.");
            return;
        }

        runPlayerCommand(
            player,
            `siedler:team_remove ${JSON.stringify(target)} ${JSON.stringify(team)}`
        );
    } catch (error) {
        console.error(`[Teams] showRemovePlayerForm error: ${error}`);
        player.sendMessage(`§cFehler beim Entfernen: ${error}`);
    }
}

async function showDeleteTeamForm(player) {
    try {
        const teams = Object.keys(getTeams());

        if (!teams.length) {
            player.sendMessage(
                "§7Es sind keine Teams zum Löschen vorhanden."
            );
            return;
        }

        const menu = new ActionFormData();
        menu.title("Team löschen");
        menu.body("Wähle ein Team zum Löschen aus:");

        for (const teamName of teams) {
            const teamData = getTeams()[teamName];
            menu.button(
                (teamData?.color || "§f") + teamName
            );
        }

        const response = await menu.show(player);
        if (response.canceled) return;

        const teamName = teams[response.selection];

        if (teamName) {
            runPlayerCommand(
                player,
                `siedler:team_delete ${JSON.stringify(teamName)}`
            );
        }
    } catch (error) {
        console.error(`[Teams] showDeleteTeamForm error: ${error}`);
        player.sendMessage(`§cFehler beim Löschen: ${error}`);
    }
}
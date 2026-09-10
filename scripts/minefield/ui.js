import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { system, world, CommandPermissionLevel, CustomCommandStatus } from "@minecraft/server";
import { createLogger } from "../core/logger.js";

const logger = createLogger("MinefieldUI");

function playerOnly(origin) {
    const player = origin?.sourceEntity;
    return player?.typeId === "minecraft:player" ? player : null;
}

function run(player, command) {
    try {
        player.runCommand(command);
    } catch (error) {
        logger.warn(`UI command failed: ${command}`, error);
        player.sendMessage("§c[Mine] Aktion konnte nicht ausgeführt werden.");
    }
}

async function showMain(player) {
    const form = new ActionFormData()
        .title("§6§lMinenfeld")
        .body(
            "§7Verwalte deine Minen und Minengruppen.\n\n" +
            "§f💣 Einzelmine\n§8Scharf, entschärfen oder entfernen\n\n" +
            "§f⛓ Minengruppe\n§8Mehrere Minen gemeinsam verwalten\n\n" +
            "§f⚙ Auslösemodus\n§8Feinde / Neutral / Alle"
        )
        .button("§a💣 Einzelmine\n§7Nächste Mine verwalten")
        .button("§b⛓ Gruppen\n§7Minengruppen verwalten")
        .button("§e⚙ Auslösemodus\n§7Nächste Mine einstellen")
        .button("§7📋 Mine-Liste")
        .button("§8Status");

    const result = await form.show(player);
    if (result.canceled) return;

    switch (result.selection) {
        case 0: return showMineMenu(player);
        case 1: return showGroupMenu(player);
        case 2: return showModeMenu(player);
        case 3: run(player, "siedler:mine_list"); return;
        case 4: run(player, "siedler:mine_status"); return;
    }
}

async function showMineMenu(player) {
    const form = new ActionFormData()
        .title("§6Einzelmine")
        .body("§7Die Aktion gilt für die nächste kontrollierbare Mine in deiner Nähe.")
        .button("§aScharf schalten")
        .button("§eEntschärfen")
        .button("§cEntfernen")
        .button("§7Alle Team-Minen löschen")
        .button("§8Zurück");

    const result = await form.show(player);
    if (result.canceled || result.selection === 4) return showMain(player);

    if (result.selection === 0) run(player, "siedler:mine_arm");
    else if (result.selection === 1) run(player, "siedler:mine_disarm");
    else if (result.selection === 2) run(player, "siedler:mine_remove");
    else if (result.selection === 3) run(player, "siedler:mine_clear");
}

async function showModeMenu(player) {
    const form = new ModalFormData()
        .title("§6Auslösemodus")
        .dropdown("Wer darf die Mine auslösen?", [
            "§cNur feindliche Teams",
            "§eFeindliche + neutrale Teams",
            "§cAlle Spieler"
        ], { defaultValueIndex: 0 });

    const result = await form.show(player);
    if (result.canceled) return showMain(player);

    const mode = Number(result.formValues?.[0]);
    if (Number.isInteger(mode) && mode >= 0 && mode <= 2) {
        run(player, `siedler:mine_mode ${mode}`);
    }
}

async function showGroupMenu(player) {
    const form = new ActionFormData()
        .title("§b§lMinengruppen")
        .body("§7Mehrere Minen können gemeinsam gesteuert werden.")
        .button("§aGruppe erstellen\n§7Minen im Radius zusammenfassen")
        .button("§bGruppen anzeigen")
        .button("§aGruppe scharf schalten")
        .button("§eGruppe entschärfen")
        .button("§cGruppe entfernen")
        .button("§6Gruppe manuell zünden")
        .button("§eGruppenmodus ändern")
        .button("§8Zurück");

    const result = await form.show(player);
    if (result.canceled || result.selection === 7) return showMain(player);

    switch (result.selection) {
        case 0: return createGroup(player);
        case 1: run(player, "siedler:mine_group_list"); return;
        case 2: return groupNameForm(player, "siedler:mine_group_arm", "Gruppe scharf schalten");
        case 3: return groupNameForm(player, "siedler:mine_group_disarm", "Gruppe entschärfen");
        case 4: return groupNameForm(player, "siedler:mine_group_remove", "Gruppe entfernen");
        case 5: return groupNameForm(player, "siedler:mine_group_detonate", "Gruppe manuell zünden");
        case 6: return groupModeForm(player);
    }
}

async function createGroup(player) {
    const form = new ModalFormData()
        .title("§aGruppe erstellen")
        .textField("Gruppenname", "z. B. Mauer-Nord", { defaultValue: "Minenfeld" })
        .slider("Radius", 1, 64, { valueStep: 1, defaultValue: 8 });

    const result = await form.show(player);
    if (result.canceled) return showGroupMenu(player);

    const name = String(result.formValues?.[0] ?? "").trim();
    const radius = Number(result.formValues?.[1] ?? 8);
    if (!name) {
        player.sendMessage("§c[Mine] Bitte einen Gruppennamen eingeben.");
        return showGroupMenu(player);
    }
    run(player, `siedler:mine_group_create ${quote(name)} ${Math.max(1, Math.min(64, radius))}`);
}

async function groupNameForm(player, command, title) {
    const form = new ModalFormData()
        .title(`§6${title}`)
        .textField("Gruppenname", "z. B. Mauer-Nord");

    const result = await form.show(player);
    if (result.canceled) return showGroupMenu(player);

    const name = String(result.formValues?.[0] ?? "").trim();
    if (!name) {
        player.sendMessage("§c[Mine] Bitte einen Gruppennamen eingeben.");
        return showGroupMenu(player);
    }
    run(player, `${command} ${quote(name)}`);
}

async function groupModeForm(player) {
    const form = new ModalFormData()
        .title("§eGruppenmodus")
        .textField("Gruppenname", "z. B. Mauer-Nord")
        .dropdown("Auslöser", [
            "§cNur feindliche Teams",
            "§eFeindliche + neutrale Teams",
            "§cAlle Spieler"
        ], { defaultValueIndex: 0 });

    const result = await form.show(player);
    if (result.canceled) return showGroupMenu(player);

    const name = String(result.formValues?.[0] ?? "").trim();
    const mode = Number(result.formValues?.[1] ?? 0);
    if (!name || !Number.isInteger(mode)) {
        player.sendMessage("§c[Mine] Ungültige Eingabe.");
        return showGroupMenu(player);
    }
    run(player, `siedler:mine_group_mode ${quote(name)} ${mode}`);
}

function quote(value) {
    const text = String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `"${text}"`;
}

system.beforeEvents.startup.subscribe((event) => {
    event.customCommandRegistry.registerCommand({
        name: "siedler:mines",
        description: "Öffnet die Minenfeld-Verwaltung.",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false
    }, (origin) => {
        const player = playerOnly(origin);
        if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => showMain(player));
        return { status: CustomCommandStatus.Success };
    });
});

logger.success("Minefield UI initialized.");

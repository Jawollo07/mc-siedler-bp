import { world, system, ItemStack } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { SOLDIERS } from "./config.js";
import {
    initializeSoldierGroups,
    getSoldierGroups,
    createSoldierGroup,
    deleteSoldierGroup,
    commandGroupFollow,
    commandGroupStay,
    commandGroupStop,
    setGroupFormation
} from "./groups.js";
import {
    commandFollow,
    commandStay,
    commandAttack,
    commandDefend,
    commandStop
} from "./command_manager.js";

export const SOLDIER_TOOL_ID = "minecraft:stick";
export const SOLDIER_TOOL_TAG = "siedler_soldier_control";
export const SOLDIER_TOOL_NAME = "§6Soldatenstab";

export function giveSoldierTool(player) {
    const item = new ItemStack(SOLDIER_TOOL_ID, 1);
    item.nameTag = SOLDIER_TOOL_NAME;
    item.setLore([
        "§7Benutzen: Soldatenverwaltung öffnen",
        "§7Soldaten auswählen und Gruppen verwalten"
    ]);
    item.addTag(SOLDIER_TOOL_TAG);
    player.getComponent("minecraft:inventory")?.container?.addItem(item);
}

world.afterEvents.itemUse.subscribe((event) => {
    const item = event.itemStack;
    if (item?.typeId !== SOLDIER_TOOL_ID) return;
    if (!(item.getTags?.() ?? []).includes(SOLDIER_TOOL_TAG)) return;
    system.run(() => openSoldierMenu(event.source));
});

function ownedSoldiers(player) {
    return [...SOLDIERS.values()].filter(s =>
        s?.entity?.isValid &&
        s.ownerId === player.id &&
        s.entity.dimension.id === player.dimension.id
    );
}

function ownedGroups(player) {
    initializeSoldierGroups();
    return getSoldierGroups(player.id);
}

function soldierName(soldier, index) {
    const type = soldier.type ?? soldier.soldierType ?? "Soldat";
    const level = soldier.level ?? 1;
    return `§e${index + 1}. ${type} §7(Lv. ${level})`;
}

function nearestEnemy(soldier, radius = 32) {
    const entity = soldier?.entity;
    if (!entity?.isValid) return null;
    let target = null;
    let best = Infinity;

    try {
        for (const candidate of entity.dimension.getEntities({ location: entity.location, maxDistance: radius })) {
            if (!candidate?.isValid || candidate.id === entity.id) continue;
            if (candidate.typeId === "minecraft:item" || candidate.typeId === "minecraft:xp_orb") continue;
            if (candidate.typeId === "minecraft:player" && candidate.id === soldier.ownerId) continue;

            const dx = candidate.location.x - entity.location.x;
            const dy = candidate.location.y - entity.location.y;
            const dz = candidate.location.z - entity.location.z;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 < best) {
                best = d2;
                target = candidate;
            }
        }
    } catch {}
    return target;
}

async function show(form, player) {
    try {
        return await form.show(player);
    } catch (error) {
        console.warn(`[SOLDIER UI] ${error}`);
        return { canceled: true };
    }
}

export async function openSoldierMenu(player) {
    const form = new ActionFormData()
        .title("§6Soldatenverwaltung")
        .body("§7Verwalte deine Soldaten und Truppen.")
        .button("§eSoldaten\n§8Einheiten auswählen")
        .button("§bGruppen\n§8Truppen verwalten")
        .button("§aSoldatenstab\n§8Einen weiteren Stab erhalten");

    const response = await show(form, player);
    if (response.canceled) return;
    if (response.selection === 0) return openSoldierSelection(player);
    if (response.selection === 1) return openGroupMenu(player);
    if (response.selection === 2) giveSoldierTool(player);
}

async function openSoldierSelection(player) {
    const soldiers = ownedSoldiers(player);
    const form = new ActionFormData().title("§eSoldaten");

    if (!soldiers.length) {
        form.body("§7Keine eigenen Soldaten in dieser Dimension.");
        form.button("§8Zurück");
    } else {
        form.body(`§7${soldiers.length} Soldat(en)`);
        soldiers.forEach((s, i) => form.button(soldierName(s, i)));
        form.button("§8Zurück");
    }

    const response = await show(form, player);
    if (response.canceled) return;
    if (response.selection === soldiers.length || !soldiers.length) return openSoldierMenu(player);
    return openSoldierActions(player, soldiers[response.selection]);
}

async function openSoldierActions(player, soldier) {
    if (!soldier?.entity?.isValid) return openSoldierSelection(player);

    const form = new ActionFormData()
        .title("§eSoldat verwalten")
        .body(`${soldierName(soldier, 0)}\n§7Wähle einen Befehl.`)
        .button("§aFolgen")
        .button("§eBleiben")
        .button("§cAngreifen")
        .button("§6Verteidigen")
        .button("§cStoppen")
        .button("§8Zurück");

    const response = await show(form, player);
    if (response.canceled) return;

    switch (response.selection) {
        case 0: commandFollow(soldier); break;
        case 1: commandStay(soldier); break;
        case 2: {
            const target = nearestEnemy(soldier);
            if (!target || !commandAttack(soldier, target)) player.sendMessage("§cKein gültiges feindliches Ziel gefunden.");
            break;
        }
        case 3: commandDefend(soldier, soldier.entity.location, 8); break;
        case 4: commandStop(soldier); break;
        default: return openSoldierSelection(player);
    }

    player.sendMessage("§aSoldatenbefehl ausgeführt.");
    return openSoldierSelection(player);
}

async function openGroupMenu(player) {
    const groups = ownedGroups(player);
    const form = new ActionFormData()
        .title("§bSoldatengruppen")
        .body(groups.length ? "§7Wähle eine Gruppe oder erstelle eine neue." : "§7Noch keine Gruppen.")
        .button("§aNeue Gruppe\n§8Soldaten in der Nähe");

    groups.forEach(group => form.button(`§b${group.name}\n§7${group.soldierIds.length} Soldaten`));
    form.button("§8Zurück");

    const response = await show(form, player);
    if (response.canceled) return;
    if (response.selection === 0) return createGroup(player);
    if (response.selection === groups.length + 1) return openSoldierMenu(player);
    return openGroupActions(player, groups[response.selection - 1]);
}

function nearbySoldiers(player, radius = 16) {
    const r2 = radius * radius;
    return ownedSoldiers(player).filter(s => {
        const p = s.entity.location;
        const dx = p.x - player.location.x;
        const dy = p.y - player.location.y;
        const dz = p.z - player.location.z;
        return dx * dx + dy * dy + dz * dz <= r2;
    });
}

async function createGroup(player) {
    const soldiers = nearbySoldiers(player);
    if (!soldiers.length) {
        player.sendMessage("§cKeine eigenen Soldaten innerhalb von 16 Blöcken.");
        return openGroupMenu(player);
    }

    const groups = ownedGroups(player);
    const name = `Gruppe ${groups.length + 1}`;
    if (createSoldierGroup(player.id, name, soldiers)) {
        player.sendMessage(`§a${name} erstellt (${soldiers.length} Soldaten).`);
    } else {
        player.sendMessage("§cGruppe konnte nicht erstellt werden.");
    }
    return openGroupMenu(player);
}

async function openGroupActions(player, group) {
    if (!group) return openGroupMenu(player);

    const form = new ActionFormData()
        .title(`§b${group.name}`)
        .body(`§7${group.soldierIds.length} Soldaten · Formation: ${group.formation}`)
        .button("§aFolgen")
        .button("§eBleiben")
        .button("§cStoppen")
        .button("§dFormation ändern")
        .button("§cGruppe löschen")
        .button("§8Zurück");

    const response = await show(form, player);
    if (response.canceled) return;

    switch (response.selection) {
        case 0: commandGroupFollow(group.id, player.id); break;
        case 1: commandGroupStay(group.id, player.id); break;
        case 2: commandGroupStop(group.id, player.id); break;
        case 3: return changeFormation(player, group);
        case 4:
            if (deleteSoldierGroup(group.id, player.id)) player.sendMessage(`§a${group.name} gelöscht.`);
            return openGroupMenu(player);
        default: return openGroupMenu(player);
    }

    player.sendMessage("§aGruppenbefehl ausgeführt.");
    return openGroupMenu(player);
}

async function changeFormation(player, group) {
    const formations = [
        ["line", "§dLinie"],
        ["column", "§dKolonne"],
        ["wedge", "§dKeil"]
    ];
    const form = new ActionFormData().title("§dFormation").body("§7Wähle eine Formation.");
    formations.forEach(([, label]) => form.button(label));
    form.button("§8Zurück");

    const response = await show(form, player);
    if (response.canceled || response.selection === formations.length) return openGroupActions(player, group);

    const [formation, label] = formations[response.selection];
    if (setGroupFormation(group.id, player.id, formation, 2)) player.sendMessage(`§aFormation: ${label}`);
    return openGroupMenu(player);
}

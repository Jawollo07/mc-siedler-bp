import { world, system, ItemStack } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { SOLDIERS } from "./config.js";
import { initializeSoldierGroups, getSoldierGroups, createSoldierGroup, addSoldierToGroup, removeSoldierFromGroup, deleteSoldierGroup, commandGroupFollow, commandGroupStay, commandGroupStop, setGroupFormation } from "./groups.js";
import { commandFollow, commandStay, commandAttack, commandDefend, commandStop } from "./command_manager.js";

export const SOLDIER_TOOL_ID = "minecraft:stick";
export const SOLDIER_TOOL_TAG = "siedler_soldier_control";
export const SOLDIER_TOOL_NAME = "§6Soldatenstab";

export function giveSoldierTool(player) {
    const item = new ItemStack(SOLDIER_TOOL_ID, 1);
    item.nameTag = SOLDIER_TOOL_NAME;
    item.setLore(["§7Rechtsklick: Soldatenverwaltung", "§7Soldaten markieren und Gruppen steuern"]);
    item.addTag(SOLDIER_TOOL_TAG);
    player.getComponent("minecraft:inventory")?.container?.addItem(item);
}

world.afterEvents.itemUse.subscribe(event => {
    const item = event.itemStack;
    if (item?.typeId !== SOLDIER_TOOL_ID || !(item.getTags?.() ?? []).includes(SOLDIER_TOOL_TAG)) return;
    system.run(() => openSoldierMenu(event.source));
});

function ownedSoldiers(player) {
    return [...SOLDIERS.values()].filter(s => s?.entity?.isValid && s.ownerId === player.id && s.entity.dimension.id === player.dimension.id);
}
function ownedGroups(player) { initializeSoldierGroups(); return getSoldierGroups(player.id); }
function nameOf(s, i = 0) { return `§e${i + 1}. ${s.type ?? s.soldierType ?? "Soldat"} §7(Lv. ${s.level ?? 1})`; }
function show(form, player) { return form.show(player).catch(e => { console.warn(`[SOLDIER UI] ${e}`); return { canceled: true }; }); }

export async function openSoldierMenu(player) {
    const form = new ActionFormData().title("§6Soldatenverwaltung").body("§7Wähle Einheiten aus, verwalte Gruppen und erteile Befehle.")
        .button("§eSoldaten\n§8Auswählen / Befehle")
        .button("§bGruppen\n§8Erstellen / Verwalten")
        .button("§aAuswahl\n§8Mehrere Soldaten markieren")
        .button("§6Soldatenstab\n§8Einen weiteren erhalten");
    const r = await show(form, player); if (r.canceled) return;
    if (r.selection === 0) return openSoldierSelection(player);
    if (r.selection === 1) return openGroupMenu(player);
    if (r.selection === 2) return openMultiSelection(player);
    if (r.selection === 3) giveSoldierTool(player);
}

async function openSoldierSelection(player) {
    const soldiers = ownedSoldiers(player);
    const form = new ActionFormData().title("§eMeine Soldaten").body(`${soldiers.length} Soldat(en)`);
    soldiers.forEach((s,i) => form.button(nameOf(s,i)));
    form.button("§8Zurück");
    const r = await show(form, player); if (r.canceled) return;
    if (r.selection === soldiers.length) return openSoldierMenu(player);
    return openSoldierActions(player, soldiers[r.selection]);
}

async function openSoldierActions(player, soldier) {
    if (!soldier?.entity?.isValid) return openSoldierSelection(player);
    const form = new ActionFormData().title("§eSoldat").body(`${nameOf(soldier)}\n§7Wähle einen Befehl.`)
        .button("§aFolgen").button("§eBleiben").button("§cAngreifen").button("§6Verteidigen").button("§cStoppen").button("§8Zurück");
    const r = await show(form, player); if (r.canceled) return;
    switch (r.selection) {
        case 0: commandFollow(soldier); break;
        case 1: commandStay(soldier); break;
        case 2: { const target = nearestEnemy(soldier); if (!target || !commandAttack(soldier,target)) player.sendMessage("§cKein gültiges feindliches Ziel."); break; }
        case 3: commandDefend(soldier,soldier.entity.location,8); break;
        case 4: commandStop(soldier); break;
        default: return openSoldierSelection(player);
    }
    player.sendMessage("§aBefehl ausgeführt."); return openSoldierSelection(player);
}

function nearestEnemy(soldier) {
    const e = soldier?.entity; if (!e?.isValid) return null; let best=null,d=Infinity;
    try { for (const x of e.dimension.getEntities({location:e.location,maxDistance:32})) {
        if (!x?.isValid || x.id===e.id || x.typeId==="minecraft:item" || x.typeId==="minecraft:xp_orb") continue;
        if (x.typeId==="minecraft:player" && x.id===soldier.ownerId) continue;
        const dx=x.location.x-e.location.x,dy=x.location.y-e.location.y,dz=x.location.z-e.location.z,n=dx*dx+dy*dy+dz*dz;
        if(n<d){d=n;best=x;}
    }} catch {} return best;
}

async function openMultiSelection(player) {
    const soldiers = ownedSoldiers(player);
    if (!soldiers.length) { player.sendMessage("§cKeine eigenen Soldaten vorhanden."); return; }
    const form = new ModalFormData().title("§6Soldaten auswählen").label("§7Aktiviere die Soldaten, die du gemeinsam steuern möchtest.");
    for (const s of soldiers) form.toggle(nameOf(s), false);
    const r = await show(form, player); if (r.canceled) return openSoldierMenu(player);
    const selected = soldiers.filter((_,i) => r.formValues?.[i] === true);
    return openSelectionActions(player, selected);
}

async function openSelectionActions(player, selected) {
    if (!selected.length) { player.sendMessage("§eKeine Soldaten ausgewählt."); return openSoldierMenu(player); }
    const form = new ActionFormData().title("§6Auswahl").body(`§7${selected.length} Soldaten ausgewählt.`)
        .button("§aFolgen").button("§eBleiben").button("§cStoppen").button("§bNeue Gruppe aus Auswahl").button("§dZu Gruppe hinzufügen").button("§8Auswahl ändern").button("§8Hauptmenü");
    const r = await show(form, player); if (r.canceled) return;
    if (r.selection===0) selected.forEach(s=>commandFollow(s));
    else if (r.selection===1) selected.forEach(s=>commandStay(s));
    else if (r.selection===2) selected.forEach(s=>commandStop(s));
    else if (r.selection===3) { const g=createSoldierGroup(player.id,`Gruppe ${ownedGroups(player).length+1}`,selected); player.sendMessage(g?`§aGruppe erstellt (${selected.length}).`:`§cGruppe konnte nicht erstellt werden.`); }
    else if (r.selection===4) return addSelectionToGroup(player,selected);
    else if (r.selection===5) return openMultiSelection(player);
    else return openSoldierMenu(player);
    player.sendMessage("§aBefehl auf Auswahl angewendet."); return openSoldierMenu(player);
}

async function addSelectionToGroup(player, selected) {
    const groups=ownedGroups(player); if(!groups.length){player.sendMessage("§cKeine Gruppe vorhanden.");return openGroupMenu(player);}
    const form=new ActionFormData().title("§dGruppe wählen").body("§7Soldaten werden dieser Gruppe hinzugefügt.");
    groups.forEach(g=>form.button(`§b${g.name}\n§7${g.soldierIds.length} Soldaten`)); form.button("§8Zurück");
    const r=await show(form,player); if(r.canceled||r.selection===groups.length)return openSelectionActions(player,selected);
    let count=0; for(const s of selected) if(addSoldierToGroup(groups[r.selection].id,player.id,s))count++;
    player.sendMessage(`§a${count} Soldaten zur Gruppe hinzugefügt.`); return openSoldierMenu(player);
}

async function openGroupMenu(player) {
    const groups=ownedGroups(player); const form=new ActionFormData().title("§bSoldatengruppen").body("§7Gruppen verwalten.").button("§aNeue Gruppe");
    groups.forEach(g=>form.button(`§b${g.name}\n§7${g.soldierIds.length} Soldaten · ${g.formation}`)); form.button("§8Zurück");
    const r=await show(form,player); if(r.canceled)return;
    if(r.selection===0)return createGroup(player); if(r.selection===groups.length+1)return openSoldierMenu(player); return openGroupActions(player,groups[r.selection-1]);
}

async function createGroup(player) {
    const soldiers=ownedSoldiers(player); if(!soldiers.length){player.sendMessage("§cKeine Soldaten vorhanden.");return openGroupMenu(player);}
    const form=new ModalFormData().title("§aGruppe erstellen").textField("Name","z.B. Erste Garde","Gruppe 1").slider("Soldatenradius",2,32,2,16);
    const r=await show(form,player); if(r.canceled)return openGroupMenu(player);
    const name=String(r.formValues?.[0]||`Gruppe ${ownedGroups(player).length+1}`).trim(); const radius=Number(r.formValues?.[1]??16); const r2=radius*radius;
    const selected=soldiers.filter(s=>{const p=s.entity.location,dx=p.x-player.location.x,dy=p.y-player.location.y,dz=p.z-player.location.z;return dx*dx+dy*dy+dz*dz<=r2;});
    const g=createSoldierGroup(player.id,name,selected); player.sendMessage(g?`§a${name} erstellt (${selected.length}).`:`§cGruppe konnte nicht erstellt werden.`); return openGroupMenu(player);
}

async function openGroupActions(player,group) {
    if(!group)return openGroupMenu(player);
    const form=new ActionFormData().title(`§b${group.name}`).body(`§7${group.soldierIds.length} Soldaten · Formation: ${group.formation}`)
        .button("§aFolgen").button("§eBleiben").button("§cStoppen").button("§dFormation").button("§eMitglieder").button("§cGruppe löschen").button("§8Zurück");
    const r=await show(form,player);if(r.canceled)return;
    if(r.selection===0)commandGroupFollow(group.id,player.id); else if(r.selection===1)commandGroupStay(group.id,player.id); else if(r.selection===2)commandGroupStop(group.id,player.id); else if(r.selection===3)return changeFormation(player,group); else if(r.selection===4)return manageMembers(player,group); else if(r.selection===5){if(deleteSoldierGroup(group.id,player.id))player.sendMessage("§aGruppe gelöscht.");return openGroupMenu(player);} else return openGroupMenu(player);
    player.sendMessage("§aGruppenbefehl ausgeführt.");return openGroupMenu(player);
}

async function manageMembers(player,group) {
    const soldiers=ownedSoldiers(player); const form=new ModalFormData().title(`§eMitglieder: ${group.name}`).label("§7Aktiviere Mitglieder, die in der Gruppe bleiben sollen.");
    for(const s of soldiers)form.toggle(nameOf(s),group.soldierIds.includes(s.entity.id));
    const r=await show(form,player);if(r.canceled)return openGroupActions(player,group);
    const wanted=new Set(soldiers.filter((_,i)=>r.formValues?.[i]===true).map(s=>s.entity.id));
    for(const s of soldiers){const inside=group.soldierIds.includes(s.entity.id);if(wanted.has(s.entity.id)&&!inside)addSoldierToGroup(group.id,player.id,s);if(!wanted.has(s.entity.id)&&inside)removeSoldierFromGroup(group.id,player.id,s);}
    player.sendMessage("§aGruppenmitglieder aktualisiert.");return openGroupMenu(player);
}

async function changeFormation(player,group) {
    const form=new ActionFormData().title("§dFormation").body("§7Wähle die Formation.").button("§dLinie").button("§dKolonne").button("§dKeil").button("§8Zurück");
    const r=await show(form,player);if(r.canceled||r.selection===3)return openGroupActions(player,group);
    const f=["line","column","wedge"][r.selection];if(setGroupFormation(group.id,player.id,f,2))player.sendMessage(`§aFormation geändert: ${f}`);return openGroupMenu(player);
}

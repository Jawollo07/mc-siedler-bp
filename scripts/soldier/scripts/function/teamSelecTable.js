import { world, ItemStack, EquipmentSlot } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { getDPData, setDPData, syncDisplay } from "./identificationOwner.js";

const teamDisplayNames = { "blue": "§9Blue Team Soldiers", "red": "§cRed Team Soldiers", "grey": "§7Grey Team Soldiers", "yellow": "§eYellow Team Soldiers", "green": "§aGreen Team Soldiers", "black": "§0Black Team Soldiers", "brown": "§6Brown Team Soldiers", "white": "§fWhite Team Soldiers", "purple": "§5Purple Team Soldiers", "cyan": "§3Cyan Team Soldiers", "lime": "§aLime Team Soldiers", "pink": "§dPink Team Soldiers", "orange": "§6Orange Team Soldiers", "light_blue": "§bLight Blue Team Soldiers" };
const teams = Object.keys(teamDisplayNames);
const teamColors = { "blue": "§9", "red": "§c", "grey": "§7", "yellow": "§e", "green": "§a", "black": "§0", "brown": "§6", "white": "§f", "purple": "§5", "cyan": "§3", "lime": "§a", "pink": "§d", "orange": "§6", "light_blue": "§b" };

function getPlainName(name) { return name.replace(/\s/g, "_"); }

function modifyTeamData(teamId, amount) {
    const key = `teamScore:${teamId}`;
    const newValue = Math.max(0, getDPData(key) + amount);
    setDPData(key, newValue);
    syncDisplay(teamDisplayNames[teamId], newValue);
}

function processSoldiers(player, teamId, isJoin) {
    const pName = getPlainName(player.name);
    const ownerTag = `owner_${pName}`;
    const ents = player.dimension.getEntities({ location: player.location, maxDistance: 32, families: ["irongolem"] });

    ents.forEach(ent => {
        if (ent.isValid && ent.hasTag(ownerTag)) {
            const oldT = teams.find(t => ent.hasTag(t));
            if (isJoin) {
                if (oldT === teamId) return;
                if (oldT) {
                    modifyTeamData(oldT, -1);
                    ent.removeTag(oldT);
                }
                ent.addTag(teamId);
                ent.nameTag = `${teamColors[teamId]}[${teamId} team] ${player.name} soldier`;
                modifyTeamData(teamId, 1);
            } else if (oldT === teamId) {
                ent.removeTag(teamId);
                ent.nameTag = `${player.name} soldier`;
                modifyTeamData(teamId, -1);
            }
        }
    });
}

world.afterEvents.itemUse.subscribe(ev => {
    const p = ev.source;
    if (!ev.itemStack) return;
    const id = ev.itemStack.typeId;

    if (id === "fv:team_book_default") {
        const curT = teams.find(t => p.hasTag(t));
        if (curT) {
            p.getComponent("minecraft:equippable")?.setEquipment(EquipmentSlot.Mainhand, new ItemStack(`fv:team_book_${curT}`, 1));
            return;
        }
        const form = new ActionFormData().title({ translate: "gui.team_book.select_title" }).body({ translate: "gui.team_book.select_body" });
        teams.forEach(t => form.button({ translate: `team.${t}` }));
        form.show(p).then(res => {
            if (res.selection !== undefined) {
                const team = teams[res.selection];
                p.addTag(team);
                p.nameTag = `${teamColors[team]}[${team} team] ${p.name}`;
                p.getComponent("minecraft:equippable")?.setEquipment(EquipmentSlot.Mainhand, new ItemStack(`fv:team_book_${team}`, 1));
            }
        });
        return;
    }

    if (id.startsWith("fv:team_book_")) {
        const team = id.replace("fv:team_book_", "");
        if (!p.hasTag(team)) return;

        const totalTeam = getDPData(`teamScore:${team}`);
        const pName = getPlainName(p.name);
        const nearCount = p.dimension.getEntities({ location: p.location, maxDistance: 32, families: ["irongolem"], tags: [`owner_${pName}`, team] }).length;

        new ActionFormData()
            .title({ translate: "gui.team_book.menu_title", with: [team] })
            .body({ translate: "gui.team_book.stats_body", with: [totalTeam.toString(), nearCount.toString()] })
            .button({ translate: "gui.team_book.button.join" })
            .button({ translate: "gui.team_book.button.leave" })
            .show(p).then(res => {
                if (res.selection === 0) processSoldiers(p, team, true);
                else if (res.selection === 1) {
                    teams.forEach(t => p.removeTag(t));
                    p.nameTag = p.name;
                    processSoldiers(p, team, false);
                    p.getComponent("minecraft:equippable")?.setEquipment(EquipmentSlot.Mainhand, new ItemStack("fv:team_book_default", 1));
                }
            });
    }
});
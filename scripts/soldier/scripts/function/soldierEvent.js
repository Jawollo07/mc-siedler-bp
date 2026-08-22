import { world, system } from "@minecraft/server";
import { getDPData, setDPData, syncDisplay } from "./identificationOwner.js";

const teamDisplayNames = { "blue": "§9Blue Team Soldiers", "red": "§cRed Team Soldiers", "grey": "§7Grey Team Soldiers", "yellow": "§eYellow Team Soldiers", "green": "§aGreen Team Soldiers", "black": "§0Black Team Soldiers", "brown": "§6Brown Team Soldiers", "white": "§fWhite Team Soldiers", "purple": "§5Purple Team Soldiers", "cyan": "§3Cyan Team Soldiers", "lime": "§aLime Team Soldiers", "pink": "§dPink Team Soldiers", "orange": "§6Orange Team Soldiers", "light_blue": "§bLight Blue Team Soldiers" };

function handleSoldierRemoval(entity) {
    if (!entity) return;
    const tags = entity.getTags();
    const ownerTag = tags.find(t => t.startsWith("owner_"));
    if (!ownerTag) return;

    // Lấy tên chủ nhân từ Tag
    const playerName = ownerTag.replace("owner_", "");

    system.run(() => {
        // 1. TRỪ DATA GỐC CỦA PLAYER
        const currentScore = getDPData(`score:${playerName}`);
        const newScore = Math.max(0, currentScore - 1);
        setDPData(`score:${playerName}`, newScore);

        // Cập nhật nếu online
        let isOnline = false;
        const players = world.getAllPlayers();
        for (const p of players) {
            if (p.name.replace(/\s/g, "_") === playerName) {
                syncDisplay(p.name, newScore, true);
                isOnline = true;
                break;
            }
        }

        // Báo cáo nếu offline
        if (!isOnline) {
            const propKey = `fv_loss:${playerName}`;
            setDPData(propKey, getDPData(propKey) + 1);
        }

        // 2. TRỪ DATA GỐC CỦA TEAM (Đếm lại cho an toàn)
        const teams = Object.keys(teamDisplayNames);
        const soldierTeam = teams.find(t => tags.includes(t));

        if (soldierTeam) {
            const teamKey = `teamScore:${soldierTeam}`;
            const currentTeamScore = getDPData(teamKey);
            const newTeamScore = Math.max(0, currentTeamScore - 1);

            setDPData(teamKey, newTeamScore);
            syncDisplay(teamDisplayNames[soldierTeam], newTeamScore);
        }
    });
}

world.beforeEvents.entityRemove.subscribe((ev) => {
    handleSoldierRemoval(ev.removedEntity);
});
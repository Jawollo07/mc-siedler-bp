import { world, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { getDPData } from "./identificationOwner.js";

const teams = ["blue", "red", "grey", "yellow", "green", "black", "brown", "white", "purple", "cyan", "lime", "pink", "orange", "light_blue"];
const teamDisplayNames = { "blue": "§9Blue Team", "red": "§cRed Team", "grey": "§7Grey Team", "yellow": "§eYellow Team", "green": "§aGreen Team", "black": "§0Black Team", "brown": "§6Brown Team", "white": "§fWhite Team", "purple": "§5Purple Team", "cyan": "§3Cyan Team", "lime": "§aLime Team", "pink": "§dPink Team", "orange": "§6Orange Team", "light_blue": "§bLight Blue Team" };

function getPlainName(name) { return name.replace(/\s/g, "_"); }

world.afterEvents.itemUse.subscribe((ev) => {
    const { source: player, itemStack } = ev;

    if (itemStack.typeId !== "fv:army_book") return;

    const pName = getPlainName(player.name);

    // 1. Dữ liệu cá nhân
    const myScore = getDPData(`score:${pName}`);

    // 2. Dữ liệu lính ở gần
    const nearbyEnts = player.dimension.getEntities({
        location: player.location,
        maxDistance: 32,
        families: ["irongolem"] // Nhớ đổi thành family của lính ông
    });

    let nearbyCount = 0;
    for (const ent of nearbyEnts) {
        if (ent.isValid && ent.getTags().some(t => t.startsWith("owner_"))) {
            nearbyCount++;
        }
    }

    // 3. Quét điểm các đội (Chỉ nối chuỗi khi có điểm > 0)
    let teamInfo = "";
    for (const tId of teams) {
        const tScore = getDPData(`teamScore:${tId}`);
        if (tScore > 0) {
            teamInfo += `${teamDisplayNames[tId]}: §c${tScore}§r\n`;
        }
    }

    // 4. Quét điểm người chơi khác (Chỉ lấy người > 0)
    let otherPlayersInfo = "";
    const allKeys = world.getDynamicPropertyIds();

    for (const key of allKeys) {
        if (key.startsWith("score:")) {
            const otherName = key.replace("score:", "");
            if (otherName !== pName) {
                const otherScore = getDPData(key);
                if (otherScore > 0) {
                    const displayName = otherName.replace(/_/g, " ");
                    otherPlayersInfo += `§b${displayName}§r: §c${otherScore}§r\n`;
                }
            }
        }
    }

    // --- TẠO GIAO DIỆN CHUẨN ĐA NGÔN NGỮ ---
    const form = new ActionFormData()
        .title({ translate: "title.army_book.name" })
        .body({
            translate: "des.army_book.name",
            // Truyền 4 biến vào file .lang: [Lính của mình, Lính ở gần, Danh sách Team, Danh sách Người chơi]
            with: [
                String(myScore),
                String(nearbyCount),
                teamInfo,
                otherPlayersInfo
            ]
        })
        .button({ translate: "button.army_book.close" }); // Nút đóng sách

    system.run(() => {
        form.show(player);
    });
});
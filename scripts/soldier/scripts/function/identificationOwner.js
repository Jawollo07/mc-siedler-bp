import { world, system, EquipmentSlot } from "@minecraft/server";

function getPlainName(name) { return name.replace(/\s/g, "_"); }

// --- HỆ THỐNG DATA GỐC ---
export function getDPData(key) { return world.getDynamicProperty(key) ?? 0; }
export function setDPData(key, value) { world.setDynamicProperty(key, Math.max(0, value)); }

// HÀM ẢO: Giữ lại để các file khác (soldierEvent...) không bị lỗi sập Script
export function syncDisplay(displayName, score) { }

function countRealSoldiers(playerName) {
    let count = 0;
    const pName = getPlainName(playerName);

    const newTag = `owner_${pName}`;
    const oldTagPrefix = `owner_${playerName}_`; // Dấu hiệu nhận biết Tag cũ (có chứa ID phía sau)

    const entities = world.getDimension("overworld").getEntities({ families: ["irongolem"] });
    for (const ent of entities) {
        if (!ent.isValid) continue;

        const tags = ent.getTags();
        if (tags.includes(newTag)) {
            count++; // Lính đã dùng Tag mới
        } else if (tags.some(t => t.startsWith(oldTagPrefix))) {
            // Phát hiện lính mang Tag cũ -> TỰ ĐỘNG NÂNG CẤP
            tags.forEach(t => { if (t.startsWith("owner_")) ent.removeTag(t); });
            ent.addTag(newTag);
            count++;
        }
    }
    return count;
}

// --- CỖ MÁY DỌN DẸP HẠNG NẶNG (XÓA SẠCH BẢNG ĐIỂM CŨ) ---
// Thay vì chạy 1 lần, nó sẽ quét liên tục lúc mới vào thế giới cho đến khi chắc chắn đã xóa xong
let isCleanedUp = false;
system.runInterval(() => {
    if (isCleanedUp) return;

    try {
        const scoreboard = world.scoreboard;

        // 1. Gỡ hiển thị ở bên phải màn hình
        scoreboard.clearObjectiveAtDisplaySlot("sidebar");

        // 2. Xóa tận gốc 2 bảng điểm cũ (Nếu tồn tại)
        const obj1 = scoreboard.getObjective("fv_stats");
        if (obj1) scoreboard.removeObjective("fv_stats");

        const obj2 = scoreboard.getObjective("fv_team_stats");
        if (obj2) scoreboard.removeObjective("fv_team_stats");

        // Đã dọn xong thì khóa lại, không chạy vòng lặp này nữa cho nhẹ máy
        isCleanedUp = true;
    } catch (error) { }
}, 20); // Quét mỗi giây 1 lần lúc mới vào

// --- LOGIC KHI JOIN WORLD ---
world.afterEvents.playerSpawn.subscribe((ev) => {
    const { player, initialSpawn } = ev;
    if (!player.isValid || !initialSpawn) return;

    const pName = getPlainName(player.name);

    system.runTimeout(() => {
        if (!player.isValid) return;

        // Xóa luôn chữ đang kẹt trên thanh Action Bar (nếu có)
        player.onScreenDisplay.setActionBar("");

        // Phục hồi điểm cá nhân nếu bị mất
        let myRealScore = getDPData(`score:${pName}`);
        if (myRealScore === 0) {
            const actualCount = countRealSoldiers(player.name);
            if (actualCount > 0) {
                myRealScore = actualCount;
                setDPData(`score:${pName}`, myRealScore);
            }
        }

        // Báo cáo offline
        const propKey = `fv_loss:${pName}`;
        const lossCount = getDPData(propKey);
        if (lossCount > 0) {
            player.sendMessage({
                translate: "message.soldier.offline_report",
                with: [lossCount.toString()]
            });
            setDPData(propKey, 0);
        }
    }, 40);
});

// >>> (ĐÃ XÓA HOÀN TOÀN ĐOẠN CODE SYSTEM.RUNINTERVAL CỦA ACTIONBAR) <<<

// --- LOGIC ĐỊNH DANH LÍNH ---
world.afterEvents.playerInteractWithEntity.subscribe((event) => {
    const { player, target: soldier } = event;
    if (!soldier?.isValid || !player?.isValid || !soldier.hasComponent("minecraft:is_tamed")) return;

    const mainSlot = player.getComponent("minecraft:equippable")?.getEquipmentSlot(EquipmentSlot.Mainhand);
    const item = mainSlot?.getItem();
    if (!item || item.typeId !== "fv:identification_soldier_card") return;

    const pName = getPlainName(player.name);
    const ownerTag = `owner_${pName}`;

    if (!soldier.getTags().includes(ownerTag)) {
        const tags = soldier.getTags();
        tags.forEach(t => { if (t.startsWith("owner_")) soldier.removeTag(t); });

        soldier.addTag(ownerTag);
        const newData = getDPData(`score:${pName}`) + 1;
        setDPData(`score:${pName}`, newData);
    }

    soldier.nameTag = `${player.name} soldier`;
    player.sendMessage({ translate: "message.soldier.assign_owner" });
});
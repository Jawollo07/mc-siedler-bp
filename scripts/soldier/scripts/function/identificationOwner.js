import { world, system, EquipmentSlot } from "@minecraft/server";

function getPlainName(name) { return name.replace(/\s/g, "_"); }

// --- ORIGINAL DATA system ---
export function getDPData(key) { return world.getDynamicProperty(key) ?? 0; }
export function setDPData(key, value) { world.setDynamicProperty(key, Math.max(0, value)); }

// STUB FUNCTION: Kept for other files (soldierEvent...) so the script does not crash
export function syncDisplay(displayName, score) { }

function countRealSoldiers(playerName) {
    let count = 0;
    const pName = getPlainName(playerName);

    const newTag = `owner_${pName}`;
    const oldTagPrefix = `owner_${playerName}_`; // Old tag detection marker (contains the ID suffix)

    const entities = world.getDimension("overworld").getEntities({ families: ["irongolem"] });
    for (const ent of entities) {
        if (!ent.isValid) continue;

        const tags = ent.getTags();
        if (tags.includes(newTag)) {
            count++; // Soldier already using the new tag
        } else if (tags.some(t => t.startsWith(oldTagPrefix))) {
            // launch perform soldier carrying tag old -> AUTO-UPGRADE
            tags.forEach(t => { if (t.startsWith("owner_")) ent.removeTag(t); });
            ent.addTag(newTag);
            count++;
        }
    }
    return count;
}

// --- HEAVY CLEANUP MACHINE (REMOVE OLD SCOREBOARDS) ---
// Instead of running once, it scans continuously after joining until deletion is confirmed complete
let isCleanedUp = false;
system.runInterval(() => {
    if (isCleanedUp) return;

    try {
        const scoreboard = world.scoreboard;

        // 1. Remove the display on the right side of the screen
        scoreboard.clearObjectiveAtDisplaySlot("sidebar");

        // 2. Completely remove 2 table score old (if they exist)
        const obj1 = scoreboard.getObjective("fv_stats");
        if (obj1) scoreboard.removeObjective("fv_stats");

        const obj2 = scoreboard.getObjective("fv_team_stats");
        if (obj2) scoreboard.removeObjective("fv_team_stats");

        // Once cleanup is complete, disable it and stop running this loop to reduce load
        isCleanedUp = true;
    } catch (error) { }
}, 20); // scan once per second after initial join

// --- world join logic ---
world.afterEvents.playerSpawn.subscribe((ev) => {
    const { player, initialSpawn } = ev;
    if (!player.isValid || !initialSpawn) return;

    const pName = getPlainName(player.name);

    system.runTimeout(() => {
        if (!player.isValid) return;

        // Also remove any stuck text from the Action Bar
        player.onScreenDisplay.setActionBar("");

        // Restore personal score if missing
        let myRealScore = getDPData(`score:${pName}`);
        if (myRealScore === 0) {
            const actualCount = countRealSoldiers(player.name);
            if (actualCount > 0) {
                myRealScore = actualCount;
                setDPData(`score:${pName}`, myRealScore);
            }
        }

        // Report offline
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

// >>> (COMPLETELY REMOVED system.RUNINTERVAL ACTIONBAR CODE) <<<

// --- SOLDIER IDENTIFICATION logic ---
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
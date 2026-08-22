import { system, world, ItemStack } from "@minecraft/server";

// --- CONFIGURATION ---
const SELECTIVE_FLAGS = ["fv:melee_banner_tp", "fv:ranged_banner_tp"];
const ALL_FLAGS = ["fv:command_flag", ...SELECTIVE_FLAGS];

// --- REGISTER custom component (V2) ---
system.beforeEvents.startup.subscribe((initEvent) => {
    // 1. General command flag (TP all can_tp)
    initEvent.itemComponentRegistry.registerCustomComponent("fv:command_flag_logic", {
        onUseOn(event) {
            const { source: player, block } = event;
            handleTeleportAction(player, block, "ALL", false);
        }
    });

    // 2. flag Melee (TP Melee + Cavalry)
    initEvent.itemComponentRegistry.registerCustomComponent("fv:melee_banner_tp_logic", {
        onUseOn(event) {
            const { source: player, block } = event;
            handleTeleportAction(player, block, "MELEE_CAVALRY", true);
        }
    });

    // 3. flag ranged (TP ranged)
    initEvent.itemComponentRegistry.registerCustomComponent("fv:ranged_banner_tp_logic", {
        onUseOn(event) {
            const { source: player, block } = event;
            handleTeleportAction(player, block, "RANGED", true);
        }
    });
});

// --- SECTION 1: SELECT SOLDIERS BY ID (INTERACT) ---
world.afterEvents.playerInteractWithEntity.subscribe((event) => {
    const { target: soldier, player, itemStack } = event;

    // block if not holding the appropriate flag or interact with player
    if (!itemStack || !SELECTIVE_FLAGS.includes(itemStack.typeId)) return;
    if (soldier.typeId === "minecraft:player") return;

    // Check the correct military branch (Family)
    let isRightFamily = false;
    if (itemStack.typeId === "fv:melee_banner_tp") {
        if (soldier.matches({ families: ["can_tp", "melee"] }) || soldier.matches({ families: ["can_tp", "cavalry"] })) isRightFamily = true;
    } else if (itemStack.typeId === "fv:ranged_banner_tp") {
        if (soldier.matches({ families: ["can_tp", "ranged"] })) isRightFamily = true;
    }

    if (!isRightFamily) return;

    let lore = itemStack.getLore();
    // If the soldier ID is already in the list, do not load it again
    if (lore.includes(soldier.id)) return;

    let newLore = [];
    if (lore.length === 0 || lore[0] === "0") {
        newLore = ["1", soldier.id];
    } else {
        const count = parseInt(lore[0]) + 1;
        newLore = [count.toString(), ...lore.slice(1), soldier.id];
    }

    itemStack.setLore(newLore);

    const equippable = player.getComponent("minecraft:equippable");
    equippable.setEquipment("Mainhand", itemStack);

    // Send translation message: Selected soldier # %s
    player.onScreenDisplay.setActionBar({
        translate: "fv.notification.selected",
        with: [newLore[0]]
    });
    player.playSound("note.pling");
});

// --- SECTION 2: SUMMON (TELEPORT) ---
function handleTeleportAction(player, targetBlock, mode, useSelective) {
    const equippable = player.getComponent("minecraft:equippable");
    const itemStack = equippable.getEquipment("Mainhand");
    if (!itemStack) return;

    const lore = itemStack.getLore();
    const isTargetedMode = useSelective && (lore.length > 1 && lore[0] !== "0");
    const dimension = player.dimension;

    let soldiersToTp = [];
    let hasCavalry = false;

    if (isTargetedMode) {
        // SELECTIVE MODE: take specific entity qua ID
        const targetIds = lore.slice(1);
        const foundEntities = dimension.getEntities({
            ids: targetIds,
            families: ["can_tp"],
            excludeTypes: ["minecraft:player"]
        });

        for (const s of foundEntities) {
            // Double verification: Check ID perform entity matches ID in Lore
            if (targetIds.includes(s.id) && s.id !== player.id) {
                soldiersToTp.push(s);
                if (s.matches({ families: ["cavalry"] })) hasCavalry = true;
            }
        }
    } else {
        // BATCH MODE (BATCH): Wide-area scan 64 slot
        const potentialSoldiers = dimension.getEntities({
            location: player.location,
            maxDistance: 64,
            families: ["can_tp"],
            excludeTypes: ["minecraft:player"]
        });

        for (const s of potentialSoldiers) {
            if (s.id === player.id) continue;
            // Only TP untamed soldiers in batch mode
            if (s.getProperty("fv:tamed") !== false) continue;

            let match = false;
            if (mode === "ALL") match = true;
            else if (mode === "MELEE_CAVALRY") {
                if (s.matches({ families: ["melee"] }) || s.matches({ families: ["cavalry"] })) match = true;
            } else if (mode === "RANGED") {
                if (s.matches({ families: ["ranged"] })) match = true;
            }

            if (match) {
                soldiersToTp.push(s);
                if (s.matches({ families: ["cavalry"] })) hasCavalry = true;
            }
        }
    }

    if (soldiersToTp.length === 0) {
        player.onScreenDisplay.setActionBar({ translate: "fv.notification.no_soldier" });
        return;
    }

    // DYNAMIC SAFE HEIGHT CHECK (soldier infantry 2, cavalry binh 4)
    const requiredHeight = hasCavalry ? 4 : 2;
    for (let i = 1; i <= requiredHeight; i++) {
        if (!targetBlock.above(i).isAir) {
            player.onScreenDisplay.setActionBar({
                translate: "fv.notification.no_space",
                with: [requiredHeight.toString()]
            });
            return;
        }
    }

    const tpLocation = {
        x: targetBlock.location.x + 0.5,
        y: targetBlock.location.y + 1,
        z: targetBlock.location.z + 0.5
    };

    // PERFORM TELEPORT
    for (const s of soldiersToTp) {
        try { s.teleport(tpLocation, { dimension, checkForBlocks: false }); } catch (e) { }
    }

    // reset flag after when TP selective filter successful
    if (isTargetedMode) {
        itemStack.setLore(["0"]);
        equippable.setEquipment("Mainhand", itemStack);
    }

    // Translation message: Summoned %s soldier(s)
    player.onScreenDisplay.setActionBar({
        translate: "fv.notification.hastp",
        with: [soldiersToTp.length.toString()]
    });
    dimension.runCommand(`playsound mob.endermen.portal @a ${tpLocation.x} ${tpLocation.y} ${tpLocation.z} 0.5 1`);
}
import { world, system, EquipmentSlot, GameMode } from "@minecraft/server";

// Configure Item ID -> Entity ID to spawn
const SPAWN_MAPPING = {
    "fv:golden_lucky_chest": "fv:normal_lucky_chest",
    "fv:diamond_lucky_chest": "fv:good_lucky_chest",
    "fv:shooter": "fv:shooter",
    "fv:bamboo_turret": "fv:bamboo_turret",
    "fv:copper_watcher": "fv:copper_watcher",
    "fv:melon_golem": "fv:melon_golem",
    "fv:catapult": "fv:catapult",
    "fv:catapult_structure": "fv:catapult_structure",
    "fv:potato_cannon": "fv:potato_cannon",
    "fv:big_potato_cannon": "fv:big_potato_cannon",
    "fv:ballista": "fv:ballista",
    "fv:ballista_structure": "fv:ballista_structure" // <-- ADD THIS LINE HERE
};

const LuckyChestComponent = {
    onUseOn(event) {
        const { source: player, itemStack, block, blockFace } = event;

        if (!player || !block) return;

        const entityIdToSpawn = SPAWN_MAPPING[itemStack.typeId];
        if (!entityIdToSpawn) return;

        // 1. Calculate spawn position based on the block face
        let targetLoc = {
            x: block.location.x + 0.5,
            y: block.location.y,
            z: block.location.z + 0.5
        };

        switch (blockFace) {
            case "Up": targetLoc.y += 1; break;
            case "Down": targetLoc.y -= 1; break;
            case "North": targetLoc.z -= 1; break;
            case "South": targetLoc.z += 1; break;
            case "West": targetLoc.x -= 1; break;
            case "East": targetLoc.x += 1; break;
            default: targetLoc.y += 1; break;
        }

        // 2. spawn perform entity and rotate direction
        try {
            const spawnedEntity = player.dimension.spawnEntity(entityIdToSpawn, targetLoc);
            if (spawnedEntity) {
                const playerRot = player.getRotation();
                // perform entity roll face toward toward player
                spawnedEntity.setRotation({ x: 0, y: playerRot.y + 180 });
            }
        } catch (err) {
            return;
        }

        // 3. Remove item (only deduct in Survival)
        if (player.getGameMode() !== GameMode.creative) {
            const eq = player.getComponent("minecraft:equippable");
            if (eq) {
                const currentItem = eq.getEquipment(EquipmentSlot.Mainhand);
                if (currentItem && currentItem.typeId === itemStack.typeId) {
                    if (currentItem.amount > 1) {
                        currentItem.amount -= 1;
                        eq.setEquipment(EquipmentSlot.Mainhand, currentItem);
                    } else {
                        eq.setEquipment(EquipmentSlot.Mainhand, undefined);
                    }
                }
            }
        }
    }
};

// Register component
system.beforeEvents.startup.subscribe((event) => {
    event.itemComponentRegistry.registerCustomComponent("fv:lucky_chest_place", LuckyChestComponent);
});
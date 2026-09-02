import {
    system,
    world,
    EquipmentSlot,
    ItemStack
} from "@minecraft/server";

const SOLDIER_TYPE = "siedler:soldier";

function testEquipment() {
    try {
        let soldier = null;

        for (const player of world.getAllPlayers()) {
            const entities = player.dimension.getEntities({
                type: SOLDIER_TYPE,
                location: player.location,
                maxDistance: 32
            });

            if (entities.length > 0) {
                soldier = entities[0];
                break;
            }
        }

        if (!soldier) {
            console.log(
                "[EquipmentTest] Kein Soldier gefunden."
            );
            return;
        }

        console.log(
            `[EquipmentTest] Soldier gefunden: ${soldier.id}`
        );

        const equippable =
            soldier.getComponent(
                "minecraft:equippable"
            );

        if (!equippable) {
            console.warn(
                "[EquipmentTest] FEHLER: Soldier besitzt keinen minecraft:equippable Component!"
            );
            return;
        }

        console.log(
            "[EquipmentTest] minecraft:equippable gefunden."
        );

        const sword = new ItemStack(
            "minecraft:iron_sword",
            1
        );

        equippable.setEquipment(
            EquipmentSlot.Mainhand,
            sword
        );

        console.log(
            "[EquipmentTest] Eisenschwert wurde in die Mainhand gesetzt."
        );

        const result =
            equippable.getEquipment(
                EquipmentSlot.Mainhand
            );

        if (!result) {
            console.warn(
                "[EquipmentTest] FEHLER: Mainhand ist nach setEquipment() leer!"
            );
            return;
        }

        console.log(
            `[EquipmentTest] Mainhand enthält jetzt: ${result.typeId}`
        );

        console.log(
            "[EquipmentTest] TEST ERFOLGREICH."
        );

    } catch (error) {
        console.warn(
            `[EquipmentTest] TEST FEHLGESCHLAGEN: ${error}`
        );
    }
}

system.runTimeout(() => {
    testEquipment();
}, 4000);
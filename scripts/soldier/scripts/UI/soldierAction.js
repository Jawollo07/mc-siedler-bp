import { world, system, EquipmentSlot } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";

// Function to display the modal form
function showInteractionForm(player, target) {
    // Check validity
    if (!player || !player.isValid || !target || !target.isValid) return;

    // take raw value from Property
    const rawStay = target.getProperty("fv:stay_mode");
    const rawKill = target.getProperty("fv:kill_player_mode");

    // Safely cast to boolean safe
    const stayMode = (typeof rawStay === 'boolean') ? rawStay : false;
    const killPlayerMode = (typeof rawKill === 'boolean') ? rawKill : false;

    // Create form
    const modalForm = new ModalFormData()
        .title({ translate: 'title.interaction.soldier' })

        // FIX UI v2 BUG: The second parameter must be an Object containing defaultValue
        .toggle({ translate: 'buttom.stay.name' }, { defaultValue: stayMode })
        .toggle({ translate: 'buttom.kill_player_mode.name' }, { defaultValue: killPlayerMode });

    // Display form
    modalForm.show(player).then((formData) => {
        if (formData.canceled) {
            return;
        }

        const [stayModeSelected, killPlayerModeSelected] = formData.formValues;

        // Check that the target still exists before calling setProperty
        if (target.isValid) {
            try {
                // Update the property
                target.setProperty("fv:stay_mode", stayModeSelected);
                target.setProperty("fv:kill_player_mode", killPlayerModeSelected);

                // (Optional) Success notification
                // player.sendMessage({ translate: 'message.settings_saved' });
            } catch (e) {
                console.warn("setProperty error. Check whether the entity JSON file declares the property.");
            }
        }
    }).catch((error) => {
        // Ignored (bug when player close form or disappear connection connect)
    });
}

// Register event playerInteractWithEntity
world.afterEvents.playerInteractWithEntity.subscribe((event) => {
    const player = event.player;
    const target = event.target;

    // Check basic validity
    if (!player || !player.isValid || !target || !target.isValid) return;

    try {
        const equippable = player.getComponent("minecraft:equippable");
        if (!equippable) return;

        const mainHandItem = equippable.getEquipment(EquipmentSlot.Mainhand);

        // Check the triggering item
        if (mainHandItem && mainHandItem.typeId === 'fv:command_flag') {

            // Defer to system.run to ensure security UI appear on the next tick
            system.run(() => {
                // Check isValid again because everything may change after 1 tick
                if (player.isValid && target.isValid) {
                    showInteractionForm(player, target);
                }
            });
        }
    } catch (error) {
        // Ignored
    }
});
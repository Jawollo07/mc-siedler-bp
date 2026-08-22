import { world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

function showGuardMenu(player, target) {
    const killMode = target.getProperty("fv:kill_player_mode") || false;

    const form = new ActionFormData()
        .title("§6Guard Management")
        .body("Choose an action:")
        .button({
            translate: "gui.guard_menu.button.kill_mode",
            with: [killMode ? "§a✓" : "§c✗"]
        })
        .button({ translate: "gui.guard_menu.button.set_home" });

    form.show(player).then(res => {
        if (res.canceled) return;

        if (res.selection === 0) {
            target.setProperty("fv:kill_player_mode", !killMode);
        } else if (res.selection === 1) {
            target.triggerEvent("fv:set_home");
        }
    });
}

world.afterEvents.playerInteractWithEntity.subscribe(event => {
    const { player, target } = event;
    if (player.isSneaking && target.typeId === "fv:iron_golem_guard") {
        showGuardMenu(player, target);
    }
});

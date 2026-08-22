import { world, system, Player } from "@minecraft/server";

system.beforeEvents.startup.subscribe(({ itemComponentRegistry }) => {
    itemComponentRegistry.registerCustomComponent("fv:team_stand_horn", {
        onUse(event) {
            const player = event.source;
            if (!(player instanceof Player) || !player.isValid) return;

            const origin = player.location;
            const pName = player.name.replace(/\s/g, "_");
            const newTag = `owner_${pName}`;
            const oldTagPrefix = `owner_${player.name}_`;

            let targetPropertyModeValue = player.isSneaking;
            let setPropertyToValue = !player.isSneaking;

            system.run(() => {
                if (!player.isValid) return;

                const nearbyEntities = player.dimension.getEntities({
                    location: origin, maxDistance: 40, families: ["irongolem"],
                    propertyOptions: [{ propertyId: "fv:stay_mode", value: { equals: targetPropertyModeValue } }]
                });

                for (const ent of nearbyEntities) {
                    if (!ent.isValid || !ent.hasComponent("minecraft:is_tamed")) continue;

                    const tags = ent.getTags();
                    let isMine = tags.includes(newTag);
                    if (!isMine && tags.some(t => t.startsWith(oldTagPrefix))) {
                        tags.forEach(t => { if (t.startsWith("owner_")) ent.removeTag(t); });
                        ent.addTag(newTag);
                        isMine = true;
                    }

                    if (isMine) {
                        try { ent.setProperty("fv:stay_mode", setPropertyToValue); } catch (e) { }
                    }
                }

                try { player.runCommand(`playsound villager_call_horn @a ${origin.x} ${origin.y} ${origin.z} 4`); } catch (e) { }
            });
        }
    });
});
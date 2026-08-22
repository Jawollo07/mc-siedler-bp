import { world, system } from "@minecraft/server";

system.beforeEvents.startup.subscribe(({ itemComponentRegistry }) => {
    itemComponentRegistry.registerCustomComponent("fv:team_call_horn", {
        onUse(event) {
            const player = event.source;
            if (!player || !player.isValid) return;

            const origin = player.location;
            const pName = player.name.replace(/\s/g, "_");
            const newTag = `owner_${pName}`;
            const oldTagPrefix = `owner_${player.name}_`;

            system.run(() => {
                if (!player.isValid) return;

                // Quét lính không cần chỉ định tag
                const nearby = player.dimension.getEntities({
                    location: origin, maxDistance: 60,
                    families: ["irongolem", "can_tp"],
                    propertyOptions: [{ propertyId: "fv:tamed", value: { equals: true } }]
                });

                for (const ent of nearby) {
                    if (!ent.isValid) continue;
                    const tags = ent.getTags();

                    let isMine = tags.includes(newTag);
                    if (!isMine && tags.some(t => t.startsWith(oldTagPrefix))) {
                        // Nâng cấp Tag cũ lên mới
                        tags.forEach(t => { if (t.startsWith("owner_")) ent.removeTag(t); });
                        ent.addTag(newTag);
                        isMine = true;
                    }

                    if (isMine) ent.teleport(origin);
                }

                try { player.runCommand(`playsound villager_call_horn @a ${origin.x} ${origin.y} ${origin.z} 4`); } catch (e) { }
            });
        }
    });
});
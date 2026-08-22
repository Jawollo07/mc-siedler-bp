import { world } from "@minecraft/server";

const FAMILY = "hitsuckblood";

world.afterEvents.entityHurt.subscribe((ev) => {
    const attacker = ev.damageSource?.damagingEntity;

    // 1. Check exists
    if (!attacker) return;

    // 2. FIX InvalidEntityError: Check isValid before interacting with the component
    if (!attacker.isValid) return;

    // 3. Check Family by component
    const familyComp = attacker.getComponent("minecraft:type_family");
    if (!familyComp || !familyComp.hasTypeFamily(FAMILY)) return;

    // 4. Handle healing
    const health = attacker.getComponent("minecraft:health");
    if (!health) return;

    const cur = health.currentValue;
    const max = health.effectiveMax;

    if (cur < max) {
        const healAmount = ev.damage;
        health.setCurrentValue(Math.min(cur + healAmount, max));
    }
});
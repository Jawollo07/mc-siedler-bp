import { world } from "@minecraft/server";

const FAMILY = "suckblood";
const HEAL_PERCENT = 0.8; // 80%

world.afterEvents.entityDie.subscribe((ev) => {
    const attacker = ev.damageSource?.damagingEntity;

    // 1. Check exists
    if (!attacker) return;

    // 2. IMPORTANT: Check validity (API v2 uses a property, not a function)
    // If the attacker dies or disconnects while killing a mob, this line prevents a crash
    if (!attacker.isValid) return;

    // 3. Check Family
    const familyComp = attacker.getComponent("minecraft:type_family");
    if (!familyComp || !familyComp.hasTypeFamily(FAMILY)) return;

    // 4. Heal
    const health = attacker.getComponent("minecraft:health");
    if (!health) return;

    const cur = health.currentValue;
    const max = health.effectiveMax;

    // Calculate required healing = 80% of max
    const healAmount = max * HEAL_PERCENT;
    const next = Math.min(cur + healAmount, max);

    health.setCurrentValue(next);
});
import { world } from "@minecraft/server";

const FAMILY = "hitsuckblood";

world.afterEvents.entityHurt.subscribe((ev) => {
    const attacker = ev.damageSource?.damagingEntity;

    // 1. Kiểm tra tồn tại
    if (!attacker) return;

    // 2. FIX LỖI InvalidEntityError: Kiểm tra isValid trước khi thao tác component
    if (!attacker.isValid) return;

    // 3. Kiểm tra Family bằng Component
    const familyComp = attacker.getComponent("minecraft:type_family");
    if (!familyComp || !familyComp.hasTypeFamily(FAMILY)) return;

    // 4. Xử lý Hồi máu
    const health = attacker.getComponent("minecraft:health");
    if (!health) return;

    const cur = health.currentValue;
    const max = health.effectiveMax;

    if (cur < max) {
        const healAmount = ev.damage;
        health.setCurrentValue(Math.min(cur + healAmount, max));
    }
});
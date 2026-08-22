import { world } from "@minecraft/server";

const FAMILY = "suckblood";
const HEAL_PERCENT = 0.8; // 80%

world.afterEvents.entityDie.subscribe((ev) => {
    const attacker = ev.damageSource?.damagingEntity;

    // 1. Kiểm tra tồn tại
    if (!attacker) return;

    // 2. QUAN TRỌNG: Kiểm tra tính hợp lệ (API v2 dùng property, không dùng hàm)
    // Nếu attacker đã chết hoặc ngắt kết nối ngay lúc giết mob, dòng này sẽ chặn lỗi crash
    if (!attacker.isValid) return;

    // 3. Kiểm tra Family
    const familyComp = attacker.getComponent("minecraft:type_family");
    if (!familyComp || !familyComp.hasTypeFamily(FAMILY)) return;

    // 4. Hồi máu
    const health = attacker.getComponent("minecraft:health");
    if (!health) return;

    const cur = health.currentValue;
    const max = health.effectiveMax;

    // Tính lượng máu cần hồi = 80% của max
    const healAmount = max * HEAL_PERCENT;
    const next = Math.min(cur + healAmount, max);

    health.setCurrentValue(next);
});
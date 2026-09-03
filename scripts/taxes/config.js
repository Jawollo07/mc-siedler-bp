/**
 * Central configuration for the TaxBonus system.
 *
 * The system combines a manually assigned team bonus with a small
 * population-based bonus. This keeps taxation useful without allowing
 * population growth to create an uncontrolled economy.
 */
export const TAX_BONUS_CONFIG = Object.freeze({
    MAX_FIXED_BONUS: 64,
    MAX_TOTAL_BONUS: 64,
    MAX_DAILY_PAYOUT: 256,
    POPULATION_BONUS_TIERS: Object.freeze([
        { minVillagers: 40, bonus: 15 },
        { minVillagers: 20, bonus: 10 },
        { minVillagers: 10, bonus: 5 },
        { minVillagers: 5, bonus: 2 },
        { minVillagers: 0, bonus: 0 }
    ])
});

export function normalizeTaxBonus(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(
        TAX_BONUS_CONFIG.MAX_FIXED_BONUS,
        Math.floor(number)
    ));
}

export function getPopulationTaxBonus(villagerCount) {
    const count = Math.max(0, Math.floor(Number(villagerCount) || 0));

    for (const tier of TAX_BONUS_CONFIG.POPULATION_BONUS_TIERS) {
        if (count >= tier.minVillagers) return tier.bonus;
    }

    return 0;
}

export function calculateTax(villagerCount, fixedBonus) {
    const villagers = Math.max(0, Math.floor(Number(villagerCount) || 0));
    const fixed = normalizeTaxBonus(fixedBonus);
    const populationBonus = getPopulationTaxBonus(villagers);
    const totalBonus = Math.min(
        TAX_BONUS_CONFIG.MAX_TOTAL_BONUS,
        fixed + populationBonus
    );
    const total = Math.min(
        TAX_BONUS_CONFIG.MAX_DAILY_PAYOUT,
        villagers + totalBonus
    );

    return {
        villagers,
        fixedBonus: fixed,
        populationBonus,
        totalBonus,
        total
    };
}

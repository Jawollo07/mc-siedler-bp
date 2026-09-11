/**
 * Central configuration for the persistent TaxBonus multiplier.
 *
 * TaxBonus is the number of Emeralds paid per villager per day.
 * The normal baseline is 1: one villager costs 1 Emerald/day.
 * Token and Outpost rewards increase this multiplier by their configured amount.
 */
export const TAX_BONUS_CONFIG = Object.freeze({
    /** Base multiplier when a team has no TaxBonus yet. */
    BASE_TAX_MULTIPLIER: 1,

    /** Maximum tax multiplier per team. */
    MAX_BONUS: 10000,

    /** Maximum total tax payout for one team and day. */
    MAX_DAILY_PAYOUT: 10000,

    /** Every defeated monster token increases the multiplier by 1. */
    TOKEN_REWARD: 1,

    /** Every successfully captured outpost increases the multiplier by 1. */
    OUTPOST_REWARD: 1
});

export function normalizeTaxBonus(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return TAX_BONUS_CONFIG.BASE_TAX_MULTIPLIER;

    return Math.max(
        TAX_BONUS_CONFIG.BASE_TAX_MULTIPLIER,
        Math.min(TAX_BONUS_CONFIG.MAX_BONUS, Math.floor(number))
    );
}

/**
 * Adds to the team's permanent TaxBonus multiplier.
 * A team starts at multiplier 1; +1 therefore changes 1x -> 2x.
 */
export function addTaxBonus(teamData, amount = 1) {
    if (!teamData || typeof teamData !== "object") return TAX_BONUS_CONFIG.BASE_TAX_MULTIPLIER;

    const current = normalizeTaxBonus(teamData.taxBonus);
    const reward = Math.max(0, Math.floor(Number(amount) || 0));
    const next = Math.min(TAX_BONUS_CONFIG.MAX_BONUS, current + reward);

    teamData.taxBonus = next;
    return next;
}

/** Backwards-compatible token helper. */
export function addTokenTaxBonus(teamData, amount = TAX_BONUS_CONFIG.TOKEN_REWARD) {
    return addTaxBonus(teamData, amount);
}

/**
 * Calculates the complete daily tax.
 * TaxBonus is a multiplier, not an additive Emerald amount.
 */
export function calculateTax(villagerCount, taxBonus) {
    const villagers = Math.max(0, Math.floor(Number(villagerCount) || 0));
    const bonus = normalizeTaxBonus(taxBonus);

    return {
        villagers,
        bonus,
        perVillager: bonus,
        total: Math.min(
            TAX_BONUS_CONFIG.MAX_DAILY_PAYOUT,
            villagers * bonus
        )
    };
}

/**
 * Configuration for the persistent TaxBonus.
 *
 * TaxBonus is a permanent daily addition to the team's normal tax.
 * It can be increased by defeating monster tokens and capturing outposts.
 */
export const TAX_BONUS_CONFIG = Object.freeze({
    /** Base daily tax per villager. */
    VILLAGER_REWARD: 2,

    /** Maximum permanent daily bonus per team. */
    MAX_BONUS: 10000,

    /** Maximum total tax payout for one team and day. */
    MAX_DAILY_PAYOUT: 10000,

    /** Every defeated monster token increases the daily tax by 1 Emerald. */
    TOKEN_REWARD: 1,

    /** Every successfully captured outpost increases the daily tax by 1 Emerald. */
    OUTPOST_REWARD: 1
});

export function normalizeTaxBonus(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;

    return Math.max(0, Math.min(TAX_BONUS_CONFIG.MAX_BONUS, Math.floor(number)));
}

/**
 * Adds a permanent daily TaxBonus to a team.
 * Kept as the shared implementation for all TaxBonus sources.
 */
export function addTaxBonus(teamData, amount = 1) {
    if (!teamData || typeof teamData !== "object") return 0;

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

export function calculateTax(villagerCount, taxBonus) {
    const villagers = Math.max(0, Math.floor(Number(villagerCount) || 0));
    const bonus = normalizeTaxBonus(taxBonus);

    return {
        villagers,
        bonus,
        total: Math.min(
            TAX_BONUS_CONFIG.MAX_DAILY_PAYOUT,
            villagers * TAX_BONUS_CONFIG.VILLAGER_REWARD + bonus
        )
    };
}

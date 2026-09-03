/**
 * Configuration for the persistent monster-token TaxBonus.
 *
 * TaxBonus is a permanent daily addition to the team's normal tax.
 * It is increased exclusively by defeating monster tokens.
 */
export const TAX_BONUS_CONFIG = Object.freeze({
    /** Maximum permanent daily bonus per team. */
    MAX_BONUS: 64,

    /** Maximum total tax payout for one team and day. */
    MAX_DAILY_PAYOUT: 256,

    /** Every defeated monster token increases the daily tax by 1 Emerald. */
    TOKEN_REWARD: 1
});

export function normalizeTaxBonus(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;

    return Math.max(0, Math.min(TAX_BONUS_CONFIG.MAX_BONUS, Math.floor(number)));
}

export function addTokenTaxBonus(teamData, amount = TAX_BONUS_CONFIG.TOKEN_REWARD) {
    if (!teamData || typeof teamData !== "object") return 0;

    const current = normalizeTaxBonus(teamData.taxBonus);
    const reward = Math.max(0, Math.floor(Number(amount) || 0));
    const next = Math.min(TAX_BONUS_CONFIG.MAX_BONUS, current + reward);

    teamData.taxBonus = next;
    return next;
}

export function calculateTax(villagerCount, taxBonus) {
    const villagers = Math.max(0, Math.floor(Number(villagerCount) || 0));
    const bonus = normalizeTaxBonus(taxBonus);

    return {
        villagers,
        bonus,
        total: Math.min(TAX_BONUS_CONFIG.MAX_DAILY_PAYOUT, villagers + bonus)
    };
}

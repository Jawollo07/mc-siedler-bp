import { system, world } from "@minecraft/server";

const SOLDIER_ID = "siedler:soldier";
const MIN_MELEE_RANGE = 1.45;
const ARCHER_TYPES = new Set(["archer", "archer_soldier"]);

/**
 * Keeps melee soldiers inside a reachable combat range.
 * Entity collision can keep two entities about one block apart, so the old
 * level ranges of 0.5–0.9 could prevent the AI from ever entering attack.
 */
function normalizeSoldierRanges() {
    for (const dimensionId of ["overworld", "nether", "the_end"]) {
        try {
            const dimension = world.getDimension(dimensionId);
            for (const entity of dimension.getEntities({ type: SOLDIER_ID })) {
                try {
                    const type = entity.getDynamicProperty("soldier:type");
                    if (typeof type === "string" && ARCHER_TYPES.has(type)) continue;

                    const range = Number(entity.getDynamicProperty("soldier:attackRange"));
                    if (!Number.isFinite(range) || range < MIN_MELEE_RANGE) {
                        entity.setDynamicProperty("soldier:attackRange", MIN_MELEE_RANGE);
                    }
                } catch {}
            }
        } catch {}
    }
}

export function startCombatRangeFix() {
    normalizeSoldierRanges();
    system.runInterval(normalizeSoldierRanges, 20);
}

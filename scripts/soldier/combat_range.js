import { system } from "@minecraft/server";

const SOLDIER_ID = "siedler:soldier";
const MIN_MELEE_RANGE = 1.45;
const ARCHER_TYPES = new Set(["archer", "archer_soldier"]);

/**
 * Normalizes melee attack ranges for existing and newly spawned soldiers.
 *
 * Entity collision can keep two entities roughly one block apart. The old
 * level ranges (0.5–0.9) were therefore unreachable for the AI: the soldier
 * kept trying to move into the enemy and never entered its attack state.
 */
function normalizeSoldierRanges() {
    for (const dimensionId of ["overworld", "nether", "the_end"]) {
        try {
            const dimension = system.currentTick % 2 === 0
                ? globalThis.__siedlerWorld?.getDimension?.(dimensionId)
                : null;
            if (!dimension) continue;

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

// The world object is injected by index.js before this module starts.
export function startCombatRangeFix(world) {
    globalThis.__siedlerWorld = world;
    normalizeSoldierRanges();
    system.runInterval(normalizeSoldierRanges, 20);
}

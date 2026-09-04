import "./archer.js";
import "./cavalry.js";
import "./commands.js";
import "./ui.js";
import "./level.js";
import { startSoldierAI } from "./ai.js";
import { startCombatRangeFix } from "./combat_range.js";
import { startRangedAI } from "./ranged_ai.js";

startSoldierAI();
startCombatRangeFix();
startRangedAI();

console.log("[SOLDIER] Loaded");

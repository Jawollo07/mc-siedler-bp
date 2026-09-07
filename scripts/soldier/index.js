import { createLogger } from "../core/logger.js";
import "./archer.js";
import "./cavalry.js";
import "./commands.js";
import "./ui.js";
import "./level.js";
import { startSoldierAI } from "./ai.js";
import { startCombatRangeFix } from "./combat_range.js";
import { startRangedAI } from "./ranged_ai.js";

const logger = createLogger("Soldier");

startSoldierAI();
startCombatRangeFix();
startRangedAI();

logger.success("Soldier-System geladen (AI, Nahkampf, Fernkampf und Kavallerie).");

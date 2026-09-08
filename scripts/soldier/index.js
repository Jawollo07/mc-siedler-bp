import { createLogger } from "../core/logger.js";
import "./archer.js";
import "./cavalry.js";
import "./commands.js";
import "./ui.js";
import "./level.js";
import "./registry.js";
import { startSoldierAI } from "./ai.js";
import { startCombatRangeFix } from "./combat_range.js";
import { startRangedAI } from "./ranged_ai.js";
import { startSoldierTerrainMovement } from "./terrain_movement.js";
import { startSoldierPathfinding } from "./pathfinding.js";

const logger = createLogger("Soldier");

startSoldierAI();
startCombatRangeFix();
startRangedAI();
startSoldierTerrainMovement();
startSoldierPathfinding();

logger.success("Soldier-System geladen (AI, Nahkampf, Fernkampf, Kavallerie, Terrain-Bewegung und A*-Wegfindung).");

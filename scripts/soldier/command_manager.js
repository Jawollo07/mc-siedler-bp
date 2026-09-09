import { world, system, CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus } from "@minecraft/server";
import { SOLDIERS, SOLDIER_CONFIG } from "./config.js";

export const SOLDIER_COMMANDS = Object.freeze({
    IDLE: "idle",
    FOLLOW: "follow",
    STAY: "stay",
    MOVE: "move",
    ATTACK: "attack",
    DEFEND: "defend",
    PATROL: "patrol",
    STOP: "stop"
});

export const SOLDIER_MODES = Object.freeze({
    NONE: 0,
    MONSTERS: 1,
    ENEMY_SOLDIERS: 2,
    ANIMALS: 3,
    ENEMY_VILLAGERS: 4,
    EVERYTHING: 5
});

const SOLDIER_MODE_PROPERTY = "soldier:mode";
const DEFAULT_SOLDIER_MODE = SOLDIER_MODES.MONSTERS;
const SOLDIER_MODE_SEARCH_RADIUS = 32;
const SELECTED_SOLDIER_PROPERTY = "siedler:selected_soldier";
const SOLDIER_TYPES = new Set(["siedler:soldier", "siedler:infantry", "siedler:archer", "siedler:cavalry"]);
const VILLAGER_TYPES = new Set(["minecraft:villager", "minecraft:villager_v2"]);

export function setSoldierCommand(soldier, command, data = {}) {
    const soldierData = getSoldierData(soldier);
    if (!soldierData?.entity?.isValid) return false;

    command = normalizeCommand(command);
    if (!isValidCommand(command)) return false;

    soldierData.command = {
        type: command,
        issuedAt: world.getAbsoluteTime(),
        ...data
    };

    if (command === SOLDIER_COMMANDS.ATTACK) {
        soldierData.targetId = data.targetId ?? null;
    } else {
        soldierData.targetId = null;
    }

    return true;
}

export function getSoldierCommand(soldier) {
    const soldierData = getSoldierData(soldier);
    if (!soldierData) return null;

    // Explicit player commands always have priority over autonomous mode.
    if (soldierData.command) return soldierData.command;

    const mode = getSoldierMode(soldierData);

    if (mode === SOLDIER_MODES.NONE) {
        return {
            type: SOLDIER_COMMANDS.STOP,
            issuedAt: world.getAbsoluteTime(),
            autonomousMode: true
        };
    }

    const target = findModeTarget(soldierData, mode);
    if (!target) {
        return {
            type: SOLDIER_COMMANDS.STOP,
            issuedAt: world.getAbsoluteTime(),
            autonomousMode: true
        };
    }

    // IDLE deliberately returns false from ai.js, allowing the normal AI to
    // fight the target stored here. This also keeps archers on ranged_ai.js.
    soldierData.targetId = target.id;
    return {
        type: SOLDIER_COMMANDS.IDLE,
        issuedAt: world.getAbsoluteTime(),
        autonomousMode: true,
        targetId: target.id
    };
}

export function clearSoldierCommand(soldier) {
    const soldierData = getSoldierData(soldier);
    if (!soldierData) return false;

    soldierData.command = null;
    soldierData.targetId = null;
    soldierData.phase = SOLDIER_CONFIG.STATES.IDLE;
    return true;
}

export function hasCommand(soldier, command) {
    return getSoldierCommand(soldier)?.type === normalizeCommand(command);
}

export function commandMove(soldier, position) {
    if (!isValidPosition(position)) return false;
    return setSoldierCommand(soldier, SOLDIER_COMMANDS.MOVE, {
        position: copyPosition(position)
    });
}

export function commandFollow(soldier) {
    return setSoldierCommand(soldier, SOLDIER_COMMANDS.FOLLOW);
}

export function commandStay(soldier) {
    const data = getSoldierData(soldier);
    if (!data?.entity?.isValid) return false;

    return setSoldierCommand(soldier, SOLDIER_COMMANDS.STAY, {
        position: copyPosition(data.entity.location)
    });
}

export function commandAttack(soldier, target) {
    const data = getSoldierData(soldier);
    if (!data?.entity?.isValid || !target?.isValid) return false;

    return setSoldierCommand(soldier, SOLDIER_COMMANDS.ATTACK, {
        targetId: target.id
    });
}

export function commandDefend(soldier, position, radius = 8) {
    if (!isValidPosition(position)) return false;
    radius = Number(radius);
    if (!Number.isFinite(radius) || radius <= 0) radius = 8;

    return setSoldierCommand(soldier, SOLDIER_COMMANDS.DEFEND, {
        position: copyPosition(position),
        radius
    });
}

export function commandPatrol(soldier, positions) {
    if (!Array.isArray(positions)) return false;
    const valid = positions.filter(isValidPosition);
    if (valid.length < 2) return false;

    return setSoldierCommand(soldier, SOLDIER_COMMANDS.PATROL, {
        positions: valid.map(copyPosition),
        patrolIndex: 0
    });
}

export function commandStop(soldier) {
    return setSoldierCommand(soldier, SOLDIER_COMMANDS.STOP);
}

export function getSoldierMode(soldier) {
    const data = getSoldierData(soldier);
    if (!data?.entity?.isValid) return DEFAULT_SOLDIER_MODE;

    try {
        const value = Number(data.entity.getDynamicProperty(SOLDIER_MODE_PROPERTY));
        return Number.isInteger(value) && value >= SOLDIER_MODES.NONE && value <= SOLDIER_MODES.EVERYTHING
            ? value
            : DEFAULT_SOLDIER_MODE;
    } catch {
        return DEFAULT_SOLDIER_MODE;
    }
}

export function setSoldierMode(soldier, mode) {
    const data = getSoldierData(soldier);
    if (!data?.entity?.isValid) return false;

    mode = Number(mode);
    if (!Number.isInteger(mode) || mode < SOLDIER_MODES.NONE || mode > SOLDIER_MODES.EVERYTHING) {
        return false;
    }

    try {
        data.entity.setDynamicProperty(SOLDIER_MODE_PROPERTY, mode);
        data.targetId = null;
        data.command = null;
        data.phase = SOLDIER_CONFIG.STATES.IDLE;
        return true;
    } catch {
        return false;
    }
}

export function getSoldierModeName(mode) {
    switch (Number(mode)) {
        case SOLDIER_MODES.NONE: return "Nichts angreifen";
        case SOLDIER_MODES.MONSTERS: return "Monster in der Nähe";
        case SOLDIER_MODES.ENEMY_SOLDIERS: return "Feindliche Soldaten";
        case SOLDIER_MODES.ANIMALS: return "Tiere";
        case SOLDIER_MODES.ENEMY_VILLAGERS: return "Feindliche Dorfbewohner";
        case SOLDIER_MODES.EVERYTHING: return "Alles";
        default: return "Unbekannt";
    }
}

function findModeTarget(soldier, mode) {
    const entity = soldier?.entity;
    if (!entity?.isValid) return null;

    let best = null;
    let bestDistance = Infinity;

    try {
        for (const candidate of entity.dimension.getEntities({
            location: entity.location,
            maxDistance: SOLDIER_MODE_SEARCH_RADIUS
        })) {
            if (!isValidTarget(candidate, entity)) continue;
            if (!isTargetAllowedByMode(soldier, candidate, mode)) continue;

            const distance = distanceSquared(entity.location, candidate.location);
            if (distance < bestDistance) {
                best = candidate;
                bestDistance = distance;
            }
        }
    } catch (error) {
        if (SOLDIER_CONFIG.debug) console.info(`[Soldier Mode] Target search failed: ${error}`);
    }

    return best;
}

function isValidTarget(candidate, soldierEntity) {
    if (!candidate?.isValid || candidate.id === soldierEntity.id) return false;
    if (candidate.typeId === "minecraft:item" || candidate.typeId === "minecraft:xp_orb") return false;
    if (candidate.typeId === "minecraft:armor_stand") return false;
    if (candidate.hasTag?.("soldier_mount")) return false;

    try {
        const health = candidate.getComponent("minecraft:health");
        if (!health || health.currentValue <= 0) return false;
    } catch {
        return false;
    }

    return true;
}

function isTargetAllowedByMode(soldier, target, mode) {
    if (mode === SOLDIER_MODES.NONE) return false;

    const typeId = target.typeId;
    const isPlayer = typeId === "minecraft:player";
    const isSoldier = SOLDIER_TYPES.has(typeId) || target.hasTag?.("soldier");
    const isVillager = VILLAGER_TYPES.has(typeId);
    const isMonster = hasFamily(target, "monster");
    const isAnimal = hasFamily(target, "animal");

    // Players and soldiers are only attackable when their team is hostile.
    if (isPlayer) return isHostilePlayer(soldier, target) && mode === SOLDIER_MODES.EVERYTHING;
    if (isSoldier) return isHostileSoldier(soldier, target) && (
        mode === SOLDIER_MODES.ENEMY_SOLDIERS || mode === SOLDIER_MODES.EVERYTHING
    );

    if (isVillager) {
        if (mode === SOLDIER_MODES.ENEMY_VILLAGERS) return isHostileVillager(soldier, target);
        return mode === SOLDIER_MODES.EVERYTHING;
    }

    if (isMonster) return mode === SOLDIER_MODES.MONSTERS || mode === SOLDIER_MODES.EVERYTHING;
    if (isAnimal) return mode === SOLDIER_MODES.ANIMALS || mode === SOLDIER_MODES.EVERYTHING;

    return mode === SOLDIER_MODES.EVERYTHING;
}

function isHostilePlayer(soldier, player) {
    const ownTeam = getSoldierOwnerTeam(soldier);
    const targetTeam = getPlayerTeamFromWorld(player);
    return !!ownTeam && !!targetTeam && areTeamsHostile(ownTeam, targetTeam);
}

function isHostileSoldier(soldier, target) {
    const ownTeam = getSoldierOwnerTeam(soldier);
    const targetOwnerId = getDynamicString(target, "soldier:ownerId", null);
    const targetTeam = targetOwnerId ? getTeamForPlayerId(targetOwnerId) : null;
    return !!ownTeam && !!targetTeam && areTeamsHostile(ownTeam, targetTeam);
}

function isHostileVillager(soldier, villager) {
    const ownTeam = getSoldierOwnerTeam(soldier);
    const targetClaim = getClaimAtLocation(villager.location);
    const targetTeam = targetClaim?.team ?? null;
    return !!ownTeam && !!targetTeam && areTeamsHostile(ownTeam, targetTeam);
}

function getSoldierOwnerTeam(soldier) {
    const ownerId = soldier?.ownerId ?? getDynamicString(soldier?.entity, "soldier:ownerId", null);
    return ownerId ? getTeamForPlayerId(ownerId) : null;
}

function getPlayerTeamFromWorld(player) {
    return getTeamForPlayerId(player?.id);
}

function getTeamForPlayerId(playerId) {
    if (!playerId) return null;

    try {
        const raw = world.getDynamicProperty("teams");
        if (typeof raw !== "string" || !raw.length) return null;
        const teams = JSON.parse(raw);

        for (const [teamName, teamData] of Object.entries(teams ?? {})) {
            if (Array.isArray(teamData?.players) && teamData.players.includes(playerId)) return teamName;
        }
    } catch {}

    return null;
}

function areTeamsHostile(teamA, teamB) {
    if (!teamA || !teamB) return false;
    if (teamA === teamB) return false;

    try {
        const raw = world.getDynamicProperty("teams");
        if (typeof raw !== "string" || !raw.length) return false;
        const teams = JSON.parse(raw);
        const relation = teams?.[teamA]?.relations?.[teamB] ?? teams?.[teamB]?.relations?.[teamA] ?? "neutral";
        return relation === "hostile";
    } catch {
        return false;
    }
}

function getClaimAtLocation(location) {
    if (!location) return null;

    try {
        const raw = world.getDynamicProperty("claims");
        if (typeof raw !== "string" || !raw.length) return null;
        const claims = JSON.parse(raw);
        const chunkX = Math.floor(Number(location.x) / 16);
        const chunkZ = Math.floor(Number(location.z) / 16);
        return claims?.[`${chunkX},${chunkZ}`] ?? null;
    } catch {
        return null;
    }
}

function hasFamily(entity, family) {
    try {
        return entity.getComponent("minecraft:type_family")?.getTypeFamilies?.().includes(family) ?? false;
    } catch {
        return false;
    }
}

function getDynamicString(entity, property, fallback) {
    try {
        const value = entity?.getDynamicProperty(property);
        return typeof value === "string" && value.length ? value : fallback;
    } catch {
        return fallback;
    }
}

function distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
}

function getSoldierData(soldier) {
    if (!soldier) return null;
    if (typeof soldier === "string") return SOLDIERS.get(soldier) ?? null;
    if (soldier.entity) return soldier;
    if (soldier.id) return SOLDIERS.get(soldier.id) ?? null;
    return null;
}

function normalizeCommand(command) {
    return String(command ?? "").trim().toLowerCase();
}

function isValidCommand(command) {
    return Object.values(SOLDIER_COMMANDS).includes(command);
}

function isValidPosition(position) {
    return position &&
        Number.isFinite(Number(position.x)) &&
        Number.isFinite(Number(position.y)) &&
        Number.isFinite(Number(position.z));
}

function copyPosition(position) {
    return {
        x: Number(position.x),
        y: Number(position.y),
        z: Number(position.z)
    };
}

function getSelectedSoldierIds(player) {
    try {
        const raw = player.getDynamicProperty(SELECTED_SOLDIER_PROPERTY);
        if (typeof raw !== "string") return [];
        const ids = JSON.parse(raw);
        return Array.isArray(ids) ? ids.filter(id => typeof id === "string") : [];
    } catch {
        return [];
    }
}

function getOwnedSoldiers(player) {
    return [...SOLDIERS.values()].filter(soldier => {
        try {
            return soldier?.entity?.isValid && soldier.ownerId === player.id && soldier.entity.dimension.id === player.dimension.id;
        } catch {
            return false;
        }
    });
}

function selectSoldiersForMode(player) {
    const selectedIds = new Set(getSelectedSoldierIds(player));
    const owned = getOwnedSoldiers(player);
    const selected = owned.filter(soldier => selectedIds.has(soldier.entity.id));

    if (selected.length) return selected;

    let nearest = null;
    let bestDistance = Infinity;
    for (const soldier of owned) {
        const distance = distanceSquared(player.location, soldier.entity.location);
        if (distance < bestDistance) {
            bestDistance = distance;
            nearest = soldier;
        }
    }

    return nearest ? [nearest] : [];
}

system.beforeEvents.startup.subscribe(event => {
    event.customCommandRegistry.registerCommand({
        name: "siedler:soldier_mode",
        description: "Setzt den Angriffsmodus deiner ausgewählten Soldaten (0-5).",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false,
        mandatoryParameters: [
            { type: CustomCommandParamType.Integer, name: "mode" }
        ]
    }, (origin, args) => {
        const player = origin?.sourceEntity;
        if (player?.typeId !== "minecraft:player") return { status: CustomCommandStatus.Failure };

        const mode = Number(args?.mode);
        if (!Number.isInteger(mode) || mode < SOLDIER_MODES.NONE || mode > SOLDIER_MODES.EVERYTHING) {
            player.sendMessage("§cSoldatenmodus muss zwischen 0 und 5 liegen.");
            return { status: CustomCommandStatus.Failure };
        }

        const soldiers = selectSoldiersForMode(player);
        if (!soldiers.length) {
            player.sendMessage("§cKeine eigenen Soldaten ausgewählt oder gefunden.");
            return { status: CustomCommandStatus.Failure };
        }

        let changed = 0;
        for (const soldier of soldiers) {
            if (setSoldierMode(soldier, mode)) changed++;
        }

        player.sendMessage(`§a${changed} Soldat(en): Modus ${mode} – ${getSoldierModeName(mode)}.`);
        return { status: CustomCommandStatus.Success };
    });
});

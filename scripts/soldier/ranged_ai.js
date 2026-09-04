import { system, world } from "@minecraft/server";

import {
    SOLDIERS,
    SOLDIER_CONFIG
} from "./config.js";

import {
    getPlayerTeam,
    getSoldierTeam
} from "../teams/index.js";

import {
    getTeamRelation,
    TEAM_RELATION
} from "../teams/relations.js";


/* =========================================================
 * CONFIG
 * ========================================================= */

const ARROW_ID = "minecraft:arrow";

const ARCHER_MIN_RANGE = 6;
const ARCHER_PREFERRED_RANGE = 12;
const ARCHER_MAX_RANGE = 28;

const ARROW_SPEED = 2.8;
const AIM_HEIGHT = 0.95;
const ARROW_GRAVITY = 0.05;

const DEFAULT_SHOT_COOLDOWN = 1200;

const TARGET_RECHECK_MS = 500;
const TARGET_MEMORY_MS = 2500;

const VISIBILITY_MARGIN = 0.05;

const ARROW_TRACK_INTERVAL = 1;

const RETREAT_SPEED = 0.20;
const APPROACH_SPEED = 0.18;

const STRAFE_INTERVAL = 1200;
const STRAFE_DURATION = 650;
const STRAFE_STRENGTH = 0.055;


/* =========================================================
 * START
 * ========================================================= */

let started = false;

export function startRangedAI() {
    if (started) return;

    started = true;

    system.runInterval(
        updateArchers,
        2
    );

    system.runInterval(
        updateTrackedArrows,
        ARROW_TRACK_INTERVAL
    );

    console.info("[Soldier Ranged AI] Started");
}


/* =========================================================
 * ARCHER UPDATE
 * ========================================================= */

function updateArchers() {
    const now = Date.now();

    for (const [id, soldier] of SOLDIERS) {
        try {
            if (!isValid(soldier.entity)) {
                SOLDIERS.delete(id);
                continue;
            }

            if (soldier.type !== "archer") {
                continue;
            }

            updateArcher(
                soldier,
                now
            );
        } catch (error) {
            console.warn(
                `[Soldier Ranged AI] Archer update failed: ${formatError(error)}`
            );
        }
    }
}


/* =========================================================
 * ARCHER LOGIC
 * ========================================================= */

function updateArcher(soldier, now) {
    const entity = soldier.entity;

    if (!isValid(entity)) {
        return;
    }

    let target = null;

    // -----------------------------------------------------
    // AKTUELLES ZIEL VALIDIEREN
    // -----------------------------------------------------

    if (soldier.targetId) {
        target = findEntityById(
            entity,
            soldier.targetId
        );

        if (
            !target ||
            !isValid(target) ||
            isDead(target) ||
            !isEnemy(soldier, target)
        ) {
            soldier.targetId = null;
            soldier.rangedTargetSince = 0;
            target = null;
        }
    }

    // -----------------------------------------------------
    // NEUES ZIEL SUCHEN
    // -----------------------------------------------------

    if (
        !target &&
        (
            !soldier.rangedLastTargetSearch ||
            now >= soldier.rangedLastTargetSearch
        )
    ) {
        target = findTarget(soldier);

        soldier.rangedLastTargetSearch =
            now + TARGET_RECHECK_MS;

        if (target) {
            soldier.targetId = target.id;
            soldier.rangedTargetSince = now;
        }
    }

    // -----------------------------------------------------
    // KEIN ZIEL
    // -----------------------------------------------------

    if (!target) {
        soldier.targetId = null;
        soldier.rangedTargetSince = 0;

        cancelMovement(soldier);

        soldier.phase =
            SOLDIER_CONFIG.STATES.IDLE;

        return;
    }

    // -----------------------------------------------------
    // DISTANZ
    // -----------------------------------------------------

    const dx =
        target.location.x -
        entity.location.x;

    const dz =
        target.location.z -
        entity.location.z;

    const distance =
        Math.hypot(dx, dz);

    // -----------------------------------------------------
    // ZIEL ZU WEIT ENTFERNT
    // -----------------------------------------------------

    if (distance > ARCHER_MAX_RANGE) {
        moveTowardTarget(
            soldier,
            target,
            APPROACH_SPEED
        );

        faceTarget(
            entity,
            target
        );

        soldier.phase =
            SOLDIER_CONFIG.STATES.MOVE;

        return;
    }

    // -----------------------------------------------------
    // ZIEL ZU NAH
    // -----------------------------------------------------

    if (distance < ARCHER_MIN_RANGE) {
        moveAwayFromTarget(
            soldier,
            target,
            RETREAT_SPEED
        );

        faceTarget(
            entity,
            target
        );

        soldier.phase =
            SOLDIER_CONFIG.STATES.MOVE;

        return;
    }

    // -----------------------------------------------------
    // LINE OF SIGHT
    // -----------------------------------------------------

    const visible =
        hasLineOfSight(
            entity,
            target
        );

    if (!visible) {
        /*
         * Nicht blind auf den Gegner zulaufen.
         *
         * Wir bewegen uns nur langsam in Richtung
         * Gegner und versuchen dadurch eine neue
         * Schussposition zu bekommen.
         */

        moveTowardTarget(
            soldier,
            target,
            APPROACH_SPEED * 0.65
        );

        faceTarget(
            entity,
            target
        );

        soldier.phase =
            SOLDIER_CONFIG.STATES.MOVE;

        return;
    }

    // -----------------------------------------------------
    // KAMPFPOSITION
    // -----------------------------------------------------

    faceTarget(
        entity,
        target
    );

    /*
     * Wenn wir deutlich weiter als unsere
     * bevorzugte Distanz entfernt sind,
     * nähern wir uns langsam.
     */

    if (
        distance >
        ARCHER_PREFERRED_RANGE + 2
    ) {
        moveTowardTarget(
            soldier,
            target,
            APPROACH_SPEED * 0.55
        );

        soldier.phase =
            SOLDIER_CONFIG.STATES.MOVE;

        return;
    }

    /*
     * Wenn wir etwas zu nah sind,
     * ziehen wir uns zurück.
     */

    if (
        distance <
        ARCHER_PREFERRED_RANGE - 2
    ) {
        moveAwayFromTarget(
            soldier,
            target,
            RETREAT_SPEED * 0.55
        );

        soldier.phase =
            SOLDIER_CONFIG.STATES.MOVE;

        return;
    }

    // -----------------------------------------------------
    // IDEALE SCHUSSDISTANZ
    // -----------------------------------------------------

    soldier.phase =
        SOLDIER_CONFIG.STATES.ATTACK;

    /*
     * Grundbewegung stoppen.
     *
     * Strafe wird separat angewendet.
     */

    cancelMovement(
        soldier
    );

    // -----------------------------------------------------
    // STRAFING
    // -----------------------------------------------------

    updateStrafe(
        soldier,
        target,
        now
    );

    // -----------------------------------------------------
    // SCHIESSEN
    // -----------------------------------------------------

    if (
        !soldier.rangedNextShot ||
        now >= soldier.rangedNextShot
    ) {
        shootArrow(
            soldier,
            target,
            now
        );
    }
}

/* =========================================================
 * TARGET SEARCH
 * ========================================================= */

function findTarget(soldier) {
    const entity = soldier.entity;

    if (!isValid(entity)) {
        return null;
    }

    const candidates =
        entity.dimension.getEntities({
            location: entity.location,
            maxDistance: ARCHER_MAX_RANGE
        });

    let bestTarget = null;
    let bestScore = Infinity;

    for (const candidate of candidates) {
        if (!isValid(candidate)) {
            continue;
        }

        if (
            candidate.id === entity.id
        ) {
            continue;
        }

        if (
            isDead(candidate)
        ) {
            continue;
        }

        /*
         * Besitzer immer ignorieren.
         */

        const ownerId =
            soldier.ownerId ??
            getDynamicString(
                entity,
                "soldier:ownerId",
                null
            );

        if (
            ownerId &&
            candidate.id === ownerId
        ) {
            continue;
        }

        /*
         * Wichtig:
         * Erst Gegnerprüfung, dann Bewertung.
         */

        if (
            !isEnemy(
                soldier,
                candidate
            )
        ) {
            continue;
        }

        const distance =
            Math.sqrt(
                distanceSquared(
                    entity.location,
                    candidate.location
                )
            );

        let score =
            distance;

        /*
         * Direkte Sicht stark bevorzugen.
         */

        if (
            hasLineOfSight(
                entity,
                candidate
            )
        ) {
            score -= 5;
        } else {
            score += 8;
        }

        /*
         * Spieler priorisieren.
         */

        if (
            candidate.typeId ===
            "minecraft:player"
        ) {
            score -= 3;
        }

        /*
         * Feindliche Soldaten ebenfalls priorisieren.
         */

        if (
            candidate.typeId ===
            "siedler:soldier"
        ) {
            score -= 2;
        }

        /*
         * Bevorzugte Bogenschützen-Distanz.
         */

        if (
            distance >= ARCHER_MIN_RANGE &&
            distance <= ARCHER_MAX_RANGE
        ) {
            score +=
                Math.abs(
                    distance -
                    ARCHER_PREFERRED_RANGE
                ) * 0.25;
        }

        if (
            score < bestScore
        ) {
            bestScore = score;
            bestTarget = candidate;
        }
    }

    return bestTarget;
}

/* =========================================================
 * MOVEMENT
 * ========================================================= */

function moveTowardTarget(
    soldier,
    target,
    speed
) {
    const entity = soldier.entity;

    const dx =
        target.location.x -
        entity.location.x;

    const dz =
        target.location.z -
        entity.location.z;

    const distance =
        Math.hypot(
            dx,
            dz
        );

    if (distance <= 0.01) {
        cancelMovement(
            soldier
        );

        return;
    }

    soldier.desiredDirection = {
        x: dx / distance,
        z: dz / distance
    };

    soldier.rangedMovementSpeed =
        speed;
}


function moveAwayFromTarget(
    soldier,
    target,
    speed
) {
    const entity = soldier.entity;

    const dx =
        entity.location.x -
        target.location.x;

    const dz =
        entity.location.z -
        target.location.z;

    const distance =
        Math.hypot(
            dx,
            dz
        );

    if (distance <= 0.01) {
        cancelMovement(
            soldier
        );

        return;
    }

    soldier.desiredDirection = {
        x: dx / distance,
        z: dz / distance
    };

    soldier.rangedMovementSpeed =
        speed;
}


function cancelMovement(soldier) {
    soldier.desiredDirection = {
        x: 0,
        z: 0
    };

    soldier.rangedMovementSpeed = 0;

    if (soldier.velocity) {
        soldier.velocity.x = 0;
        soldier.velocity.z = 0;
    }
}


/* =========================================================
 * STRAFE
 * ========================================================= */

function updateStrafe(
    soldier,
    target,
    now
) {
    if (!soldier.rangedStrafe) {
        soldier.rangedStrafe = {
            x: 0,
            z: 0,
            until: 0,
            next: now
        };
    }

    const strafe =
        soldier.rangedStrafe;

    /*
     * Neue Strafe-Richtung wählen.
     */

    if (
        now >= strafe.next
    ) {
        const dx =
            target.location.x -
            soldier.entity.location.x;

        const dz =
            target.location.z -
            soldier.entity.location.z;

        const distance =
            Math.hypot(dx, dz);

        if (distance <= 0.01) {
            return;
        }

        const direction =
            Math.random() < 0.5
                ? -1
                : 1;

        /*
         * Senkrechte zum Gegner.
         */

        strafe.x =
            (-dz / distance) *
            direction;

        strafe.z =
            (dx / distance) *
            direction;

        strafe.until =
            now + STRAFE_DURATION;

        strafe.next =
            now + STRAFE_INTERVAL +
            Math.random() * 500;
    }

    /*
     * Strafe ist noch aktiv.
     */

    if (
        now < strafe.until
    ) {
        soldier.desiredDirection = {
            x:
                strafe.x *
                STRAFE_STRENGTH,

            z:
                strafe.z *
                STRAFE_STRENGTH
        };

        soldier.rangedMovementSpeed =
            STRAFE_STRENGTH;

        return;
    }

    /*
     * Strafe beendet.
     */

    soldier.desiredDirection = {
        x: 0,
        z: 0
    };

    soldier.rangedMovementSpeed = 0;
}

/* =========================================================
 * SHOOT
 * ========================================================= */

function shootArrow(
    soldier,
    target,
    now
) {
    const entity = soldier.entity;

    if (
        !isValid(entity) ||
        !isValid(target)
    ) {
        return;
    }

    const origin = {
        x: entity.location.x,
        y: entity.location.y + AIM_HEIGHT,
        z: entity.location.z
    };

    const targetPosition = {
        x: target.location.x,
        y: target.location.y + AIM_HEIGHT,
        z: target.location.z
    };

    const dx =
        targetPosition.x -
        origin.x;

    const dy =
        targetPosition.y -
        origin.y;

    const dz =
        targetPosition.z -
        origin.z;

    const horizontalDistance =
        Math.hypot(
            dx,
            dz
        );

    if (
        horizontalDistance <= 0.01
    ) {
        return;
    }

    /*
     * Ballistische Kompensation
     */
    const flightTime =
        horizontalDistance /
        ARROW_SPEED;

    const gravityCorrection =
        0.5 *
        ARROW_GRAVITY *
        flightTime *
        flightTime;

    const adjustedDy =
        dy +
        gravityCorrection;

    const length =
        Math.hypot(
            dx,
            adjustedDy,
            dz
        );

    if (length <= 0.01) {
        return;
    }

    const direction = {
        x: dx / length,
        y: adjustedDy / length,
        z: dz / length
    };


    /*
     * Spawn projectile
     */

    let arrow = null;

    try {
        arrow =
            entity.dimension.spawnEntity(
                ARROW_ID,
                origin
            );
    } catch (error) {
        console.warn(
            `[Soldier Ranged AI] Arrow spawn failed: ${formatError(error)}`
        );

        return;
    }

    if (!isValid(arrow)) {
        return;
    }


    /*
     * Projectile velocity
     */

    try {
        const projectile =
            arrow.getComponent(
                "minecraft:projectile"
            );

        if (!projectile) {
            arrow.remove();

            return;
        }

        if (
            typeof projectile.owner ===
            "undefined"
        ) {
            try {
                projectile.owner =
                    entity;
            } catch {}
        }

        projectile.shoot(
            direction,
            {
                speed: ARROW_SPEED,
                uncertainty: 0
            }
        );
    } catch (error) {
        console.warn(
            `[Soldier Ranged AI] Projectile launch failed: ${formatError(error)}`
        );

        try {
            arrow.remove();
        } catch {}

        return;
    }


    /*
     * Dynamic properties
     */

    try {
        arrow.setDynamicProperty(
            "siedler:archerArrow",
            true
        );

        arrow.setDynamicProperty(
            "siedler:ownerId",
            entity.id
        );

        arrow.setDynamicProperty(
            "siedler:level",
            soldier.level ?? 1
        );
    } catch {}


    /*
     * Track projectile
     */

    trackArrow(
        arrow,
        entity.id,
        now
    );


    /*
     * Cooldown
     */

    soldier.rangedNextShot =
        now +
        getShotCooldown(
            soldier
        );


    /*
     * Sound
     */

    try {
        entity.dimension.playSound(
            "random.bow",
            entity.location
        );
    } catch {}
}


/* =========================================================
 * ARROW TRACKING
 * ========================================================= */

const trackedArrows = new Map();

function trackArrow(
    arrow,
    ownerId,
    now
) {
    trackedArrows.set(
        arrow.id,
        {
            arrow,
            ownerId,
            lastPosition: {
                ...arrow.location
            },
            createdAt: now
        }
    );
}


function updateTrackedArrows() {
    const now = Date.now();

    for (
        const [
            id,
            data
        ] of trackedArrows
    ) {
        const arrow =
            data.arrow;

        if (
            !isValid(arrow)
        ) {
            trackedArrows.delete(id);
            continue;
        }

        try {
            const current =
                arrow.location;

            /*
             * Ray zwischen alter und neuer
             * Position verhindert, dass ein
             * schneller Pfeil durch Blöcke tunnelt.
             */
            const dx =
                current.x -
                data.lastPosition.x;

            const dy =
                current.y -
                data.lastPosition.y;

            const dz =
                current.z -
                data.lastPosition.z;

            const distance =
                Math.hypot(
                    dx,
                    dy,
                    dz
                );

            if (distance > 0.01) {
                const hit =
                    hasBlockingRay(
                        arrow.dimension,
                        data.lastPosition,
                        {
                            x: dx / distance,
                            y: dy / distance,
                            z: dz / distance
                        },
                        distance
                    );

                if (hit) {
                    try {
                        arrow.remove();
                    } catch {}

                    trackedArrows.delete(id);
                    continue;
                }
            }

            data.lastPosition = {
                ...current
            };

            if (
                now -
                data.createdAt >
                10000
            ) {
                try {
                    arrow.remove();
                } catch {}

                trackedArrows.delete(id);
            }
        } catch {
            trackedArrows.delete(id);
        }
    }
}


/* =========================================================
 * LINE OF SIGHT
 * ========================================================= */

function hasLineOfSight(
    source,
    target
) {
    const heights = [
        0.25,
        0.65,
        0.95
    ];

    for (const height of heights) {
        const start = {
            x: source.location.x,
            y: source.location.y + 1,
            z: source.location.z
        };

        const end = {
            x: target.location.x,
            y: target.location.y + height,
            z: target.location.z
        };

        const dx =
            end.x - start.x;

        const dy =
            end.y - start.y;

        const dz =
            end.z - start.z;

        const distance =
            Math.hypot(
                dx,
                dy,
                dz
            );

        if (distance <= 0.01) {
            return true;
        }

        const direction = {
            x: dx / distance,
            y: dy / distance,
            z: dz / distance
        };

        if (
            !hasBlockingRay(
                source.dimension,
                start,
                direction,
                Math.max(
                    0,
                    distance -
                    VISIBILITY_MARGIN
                )
            )
        ) {
            return true;
        }
    }

    return false;
}


function hasBlockingRay(
    dimension,
    location,
    direction,
    maxDistance
) {
    try {
        const hit =
            dimension.getBlockFromRay(
                location,
                direction,
                {
                    maxDistance
                }
            );

        return !!hit;
    } catch {
        /*
         * Fail closed:
         * Wenn die Raycast-Prüfung fehlschlägt,
         * wird NICHT geschossen.
         */
        return true;
    }
}


/* =========================================================
 * TARGET / TEAM
 * ========================================================= */

function isEnemy(soldier, entity) {
    if (!isValid(entity)) {
        return false;
    }

    const archer = soldier.entity;

    if (!isValid(archer)) {
        return false;
    }

    // Sich selbst niemals angreifen
    if (entity.id === archer.id) {
        return false;
    }

    // -----------------------------------------------------
    // BESITZER / BOSS
    // -----------------------------------------------------

    const ownerId =
        soldier.ownerId ??
        getDynamicString(
            archer,
            "soldier:ownerId",
            null
        );

    if (
        ownerId &&
        entity.id === ownerId
    ) {
        return false;
    }

    // -----------------------------------------------------
    // AUSDRÜCKLICH FREUNDLICHE SIEDLER-ENTITIES
    // -----------------------------------------------------

    const typeId = entity.typeId ?? "";

    const FRIENDLY_SIEDLER_TYPES = new Set([
        "siedler:trader",
        "siedler:villager",
        "siedler:merchant"
    ]);

    if (
        FRIENDLY_SIEDLER_TYPES.has(typeId)
    ) {
        return false;
    }

    // -----------------------------------------------------
    // SPIELER
    // -----------------------------------------------------

    if (
        typeId === "minecraft:player"
    ) {
        const soldierTeam =
            getSoldierTeam(soldier);

        const playerTeam =
            getPlayerTeam(entity);

        /*
         * Ohne Teams niemals angreifen.
         */

        if (
            !soldierTeam ||
            !playerTeam
        ) {
            return false;
        }

        return (
            getTeamRelation(
                soldierTeam,
                playerTeam
            ) ===
            TEAM_RELATION.HOSTILE
        );
    }

    // -----------------------------------------------------
    // SIEDLER-SOLDAT
    // -----------------------------------------------------

    if (
        typeId === "siedler:soldier"
    ) {
        const soldierTeam =
            getSoldierTeam(soldier);

        const targetSoldier =
            SOLDIERS.get(entity.id);

        const targetTeam =
            targetSoldier
                ? getSoldierTeam(targetSoldier)
                : null;

        if (
            !soldierTeam ||
            !targetTeam
        ) {
            return false;
        }

        return (
            getTeamRelation(
                soldierTeam,
                targetTeam
            ) ===
            TEAM_RELATION.HOSTILE
        );
    }

    // -----------------------------------------------------
    // SIEDLER-ENTITIES
    // -----------------------------------------------------

    /*
     * Andere siedler:* Entities werden NICHT automatisch
     * als feindlich betrachtet.
     *
     * Dadurch werden z.B. Trader, Händler, NPCs usw.
     * nicht versehentlich beschossen.
     */

    if (
        typeId.startsWith("siedler:")
    ) {
        return isExplicitSiedlerEnemy(
            entity
        );
    }

    // -----------------------------------------------------
    // MINECRAFT MONSTER
    // -----------------------------------------------------

    if (
        typeId.startsWith("minecraft:")
    ) {
        try {
            const family =
                entity.getComponent(
                    "minecraft:type_family"
                );

            if (!family) {
                return false;
            }

            const families =
                family.getTypeFamilies();

            /*
             * Nur echte Monster/Hostile-Mobs.
             */

            return (
                families.includes("monster") ||
                families.includes("hostile")
            );
        } catch {
            return false;
        }
    }

    // -----------------------------------------------------
    // ALLES ANDERE
    // -----------------------------------------------------

    return false;
}

/* =========================================================
 * HELPERS
 * ========================================================= */

function findEntityById(
    source,
    id
) {
    if (!id) {
        return null;
    }

    try {
        for (
            const entity
            of source.dimension.getEntities()
        ) {
            if (
                entity.id === id
            ) {
                return entity;
            }
        }
    } catch {}

    return null;
}


function getTypeFamily(
    entity
) {
    try {
        const component =
            entity.getComponent(
                "minecraft:type_family"
            );

        return component?.getTypeFamilies?.() ?? [];
    } catch {
        return [];
    }
}


function getDynamicString(
    entity,
    property,
    fallback = null
) {
    try {
        const value =
            entity.getDynamicProperty(property);

        if (
            typeof value === "string" &&
            value.length > 0
        ) {
            return value;
        }
    } catch {
        // Property existiert nicht
    }

    return fallback;
}


function getShotCooldown(
    soldier
) {
    const level =
        Math.max(
            1,
            Number(
                soldier.level ?? 1
            )
        );

    /*
     * Höheres Level = schnellerer Schuss
     */
    const reduction =
        Math.min(
            0.40,
            (level - 1) * 0.07
        );

    return Math.max(
        600,
        DEFAULT_SHOT_COOLDOWN *
            (1 - reduction)
    );
}


function distanceSquared(
    a,
    b
) {
    const dx =
        a.x - b.x;

    const dy =
        a.y - b.y;

    const dz =
        a.z - b.z;

    return (
        dx * dx +
        dy * dy +
        dz * dz
    );
}


function faceTarget(
    entity,
    target
) {
    try {
        const dx =
            target.location.x -
            entity.location.x;

        const dz =
            target.location.z -
            entity.location.z;

        const horizontal =
            Math.hypot(
                dx,
                dz
            );

        if (
            horizontal <= 0.01
        ) {
            return;
        }

        const yaw =
            Math.atan2(
                -dx,
                dz
            ) *
            180 /
            Math.PI;

        entity.setRotation({
            x: 0,
            y: yaw
        });
    } catch {}
}


function isDead(entity) {
    try {
        const health =
            entity.getComponent(
                "minecraft:health"
            );

        return (
            health &&
            health.currentValue <= 0
        );
    } catch {
        return false;
    }
}


function isValid(entity) {
    try {
        if (!entity) {
            return false;
        }

        return typeof entity.isValid === "function"
            ? entity.isValid()
            : entity.isValid === true;
    } catch {
        return false;
    }
}


function formatError(error) {
    return error instanceof Error
        ? error.message
        : String(error);
}
function distanceBetween(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;

    return Math.sqrt(
        dx * dx +
        dy * dy +
        dz * dz
    );
}
function isExplicitSiedlerEnemy(entity) {
    if (!isValid(entity)) {
        return false;
    }

    const typeId =
        entity.typeId ?? "";

    /*
     * Nur explizit als feindlich definierte
     * Siedler-Entities dürfen angegriffen werden.
     *
     * Hier können später weitere Monster ergänzt werden.
     */

    const hostileTypes = new Set([
        "siedler:monster",
        "siedler:pillager",
        "siedler:raider"
    ]);

    if (
        hostileTypes.has(typeId)
    ) {
        return true;
    }

    try {
        const family =
            entity.getComponent(
                "minecraft:type_family"
            );

        if (!family) {
            return false;
        }

        const families =
            family.getTypeFamilies();

        return (
            families.includes("monster") ||
            families.includes("hostile")
        );
    } catch {
        return false;
    }
}
import {
    system,
    world,
    CommandPermissionLevel,
    CustomCommandParamType,
    CustomCommandStatus
} from "@minecraft/server";

import { createLogger } from "../core/logger.js";
import { getPlayerTeam } from "../teams/index.js";
import { getTeamRelation, TEAM_RELATION } from "../teams/relations.js";

const logger = createLogger("Minefield");

const ITEM_ID = "siedler:mine";
const STORAGE_KEY = "minefield:mines";

const SCAN_INTERVAL = 5;

const ARM_DELAY_TICKS = 20;
const REARM_TICKS = 20 * 15;
const DETONATION_DELAY_TICKS = 20;

const CHAIN_RADIUS = 3.25;
const EXPLOSION_RADIUS = 4;

const MAX_MINES = 2000;

const CONTROL_RADIUS = 8;
const GROUP_RADIUS_DEFAULT = 8;

const MONSTER_TRIGGER_RADIUS = 0.9;

const PLACEMENT_COOLDOWN_TICKS = 4;

const TRIGGER_MODE = Object.freeze({
    HOSTILE: 0,
    HOSTILE_NEUTRAL: 1,
    EVERYONE: 2
});

let mines = [];
let loaded = false;
let saving = false;

const placementCooldown = new Map();

/* -------------------------------------------------------------------------- */
/* Utility                                                                    */
/* -------------------------------------------------------------------------- */

function distanceSquared(a, b) {
    return (
        (a.x - b.x) ** 2 +
        (a.y - b.y) ** 2 +
        (a.z - b.z) ** 2
    );
}

function createMineId() {
    return `m${Date.now().toString(36)}${Math.random()
        .toString(36)
        .slice(2, 8)}`;
}

function cleanGroup(value) {
    return typeof value === "string" && value.length
        ? value.slice(0, 32)
        : null;
}

/* -------------------------------------------------------------------------- */
/* Persistent storage                                                         */
/* -------------------------------------------------------------------------- */

function load() {
    if (loaded) return;

    loaded = true;

    try {
        const raw = world.getDynamicProperty(STORAGE_KEY);

        if (!raw) {
            logger.info("No persistent minefield data found.");
            return;
        }

        const parsed = JSON.parse(String(raw));

        if (!Array.isArray(parsed)) {
            logger.warn("Persistent minefield data is not an array.");
            return;
        }

        mines = parsed
            .filter(
                m =>
                    m &&
                    typeof m.x === "number" &&
                    typeof m.y === "number" &&
                    typeof m.z === "number" &&
                    typeof m.dimension === "string"
            )
            .slice(0, MAX_MINES)
            .map(m => ({
                id:
                    typeof m.id === "string"
                        ? m.id
                        : createMineId(),

                x: Math.floor(m.x) + 0.5,
                y: Math.floor(m.y) + 0.05,
                z: Math.floor(m.z) + 0.5,

                dimension: m.dimension,

                ownerId:
                    typeof m.ownerId === "string"
                        ? m.ownerId
                        : null,

                ownerTeam:
                    typeof m.ownerTeam === "string"
                        ? m.ownerTeam
                        : null,

                group: cleanGroup(m.group),

                triggerMode:
                    Number.isInteger(m.triggerMode) &&
                    m.triggerMode >= 0 &&
                    m.triggerMode <= 2
                        ? m.triggerMode
                        : TRIGGER_MODE.HOSTILE,

                armed: m.armed !== false,

                armAt: Number(m.armAt) || 0,

                rearmAt: Number(m.rearmAt) || 0,

                detonating: false
            }));

        logger.info(
            `Loaded ${mines.length} persistent mines.`
        );
    } catch (error) {
        logger.error(
            "Failed to load persistent mines",
            error
        );

        mines = [];
    }
}

function save() {
    if (saving) return;

    saving = true;

    try {
        const data = mines.map(
            ({ detonating, ...mine }) => mine
        );

        world.setDynamicProperty(
            STORAGE_KEY,
            JSON.stringify(data)
        );
    } catch (error) {
        logger.error(
            "Failed to save mines",
            error
        );
    } finally {
        saving = false;
    }
}

/* -------------------------------------------------------------------------- */
/* Block detection                                                            */
/* -------------------------------------------------------------------------- */

function isEmptyBlock(block) {
    if (!block) return false;

    try {
        if (block.isAir) {
            return true;
        }
    } catch {}

    return (
        block.typeId === "minecraft:air" ||
        block.typeId === "minecraft:cave_air" ||
        block.typeId === "minecraft:void_air"
    );
}

function isLiquidBlock(block) {
    if (!block) return true;

    try {
        if (block.isLiquid) {
            return true;
        }
    } catch {}

    return (
        block.typeId === "minecraft:water" ||
        block.typeId === "minecraft:flowing_water" ||
        block.typeId === "minecraft:lava" ||
        block.typeId === "minecraft:flowing_lava"
    );
}

/**
 * Determines the block directly above the clicked block.
 *
 * IMPORTANT:
 * We deliberately do NOT check the clicked face.
 *
 * This means:
 * - grass works
 * - dirt works
 * - stone works
 * - cobblestone works
 * - deepslate works
 * - wood works
 * - any other solid/non-liquid block works
 *
 * Even if the player clicks the side of the block, the mine
 * is placed on top of that block.
 */
function getPlacementTarget(block) {
    if (!block) return null;

    if (isLiquidBlock(block)) {
        return null;
    }

    try {
        return (
            block.dimension.getBlock({
                x: block.location.x,
                y: block.location.y + 1,
                z: block.location.z
            }) ?? null
        );
    } catch (error) {
        logger.debug(
            `Could not determine mine target: ${error?.message ?? error}`
        );

        return null;
    }
}

/* -------------------------------------------------------------------------- */
/* Mine placement                                                             */
/* -------------------------------------------------------------------------- */

function hasMineAt(location, dimensionId) {
    return mines.some(
        mine =>
            !mine.detonating &&
            mine.dimension === dimensionId &&
            distanceSquared(mine, location) < 0.8 ** 2
    );
}

function canPlaceAt(player, base, target) {
    if (!base || !target) {
        return "§c[Mine] Zielposition konnte nicht ermittelt werden.";
    }

    if (isLiquidBlock(base)) {
        return "§c[Mine] Auf Flüssigkeiten kann keine Mine platziert werden.";
    }

    if (isLiquidBlock(target)) {
        return "§c[Mine] Die Zielposition ist eine Flüssigkeit.";
    }

    if (!isEmptyBlock(target)) {
        return "§c[Mine] Über diesem Block ist kein freier Platz für die Mine.";
    }

    const location = {
        x: base.location.x + 0.5,
        y: base.location.y + 1.05,
        z: base.location.z + 0.5
    };

    if (
        distanceSquared(location, player.location) <
        0.35 ** 2
    ) {
        return "§c[Mine] Du stehst zu nah an der Zielposition.";
    }

    if (
        hasMineAt(
            location,
            player.dimension.id
        )
    ) {
        return "§e[Mine] Hier liegt bereits eine Mine.";
    }

    if (mines.length >= MAX_MINES) {
        return `§c[Mine] Das Limit von ${MAX_MINES} Minen ist erreicht.`;
    }

    return null;
}

function consumeMine(player) {
    try {
        const inventory =
            player
                .getComponent("minecraft:inventory")
                ?.container;

        if (!inventory) {
            logger.warn(
                "Could not access player inventory."
            );

            return false;
        }

        const slot =
            player.selectedSlotIndex;

        const item =
            inventory.getItem(slot);

        if (!item || item.typeId !== ITEM_ID) {
            return false;
        }

        if (item.amount <= 1) {
            inventory.setItem(
                slot,
                undefined
            );
        } else {
            item.amount--;

            inventory.setItem(
                slot,
                item
            );
        }

        return true;
    } catch (error) {
        logger.warn(
            `Could not consume mine item: ${error?.message ?? error}`
        );

        return false;
    }
}

function placeMine(player, baseBlock) {
    if (!player?.isValid) {
        return false;
    }

    if (!baseBlock) {
        return false;
    }

    const now = system.currentTick;

    const last =
        placementCooldown.get(player.id);

    if (
        last !== undefined &&
        now - last < PLACEMENT_COOLDOWN_TICKS
    ) {
        return false;
    }

    placementCooldown.set(
        player.id,
        now
    );

    const target =
        getPlacementTarget(baseBlock);

    const error =
        canPlaceAt(
            player,
            baseBlock,
            target
        );

    if (error) {
        player.sendMessage(error);

        try {
            player.playSound(
                "note.bass",
                {
                    volume: 0.45,
                    pitch: 0.7
                }
            );
        } catch {}

        return false;
    }

    if (!consumeMine(player)) {
        player.sendMessage(
            "§c[Mine] Die Minenladung befindet sich nicht mehr im ausgewählten Slot."
        );

        return false;
    }

    const location = {
        x: Math.floor(
            baseBlock.location.x
        ),
        y:
            Math.floor(
                baseBlock.location.y
            ) + 1,
        z: Math.floor(
            baseBlock.location.z
        )
    };

    const team =
        getPlayerTeam(player);

    const mine = {
        id: createMineId(),

        x: location.x + 0.5,
        y: location.y + 0.05,
        z: location.z + 0.5,

        dimension:
            player.dimension.id,

        ownerId:
            player.id ?? null,

        ownerTeam:
            team ?? null,

        group: null,

        triggerMode:
            TRIGGER_MODE.HOSTILE,

        armed: false,

        armAt:
            system.currentTick +
            ARM_DELAY_TICKS,

        rearmAt: 0,

        detonating: false
    };

    mines.push(mine);

    save();

    try {
        player.playSound(
            "random.click",
            {
                volume: 0.9,
                pitch: 0.8
            }
        );
    } catch {}

    player.sendMessage(
        `§a[Mine] Mine platziert bei §f${location.x} ${location.y} ${location.z}§a` +
        `${team ? ` für Team §f${team}` : ""}. ` +
        `§7Sie wird in 1 Sekunde scharf.`
    );

    logger.info(
        `Mine ${mine.id} placed by ${player.name ?? player.id} at ` +
        `${location.x} ${location.y} ${location.z} (${player.dimension.id})`
    );

    return true;
}

/* -------------------------------------------------------------------------- */
/* Teams / relations                                                          */
/* -------------------------------------------------------------------------- */

function canManage(player, mine) {
    if (!player?.isValid || !mine) {
        return false;
    }

    try {
        if (
            player.commandPermissionLevel >=
            CommandPermissionLevel.GameDirectors
        ) {
            return true;
        }
    } catch {}

    return (
        !!mine.ownerTeam &&
        getPlayerTeam(player) ===
            mine.ownerTeam
    );
}

function canTrigger(player, mine) {
    if (!mine || !player) {
        return false;
    }

    if (!mine.ownerTeam) {
        return true;
    }

    const team =
        getPlayerTeam(player);

    /*
     * Owner team cannot trigger its own mines.
     */
    if (
        team &&
        team === mine.ownerTeam
    ) {
        return false;
    }

    /*
     * Players without a team are treated as hostile.
     */
    if (!team) {
        return true;
    }

    const relation =
        getTeamRelation(
            mine.ownerTeam,
            team
        );

    /*
     * Friendly teams never trigger mines.
     */
    if (
        relation ===
        TEAM_RELATION.FRIENDLY
    ) {
        return false;
    }

    if (
        mine.triggerMode ===
        TRIGGER_MODE.EVERYONE
    ) {
        return true;
    }

    if (
        mine.triggerMode ===
        TRIGGER_MODE.HOSTILE_NEUTRAL
    ) {
        return (
            relation ===
                TEAM_RELATION.HOSTILE ||
            relation ===
                TEAM_RELATION.NEUTRAL
        );
    }

    return (
        relation ===
        TEAM_RELATION.HOSTILE
    );
}

/* -------------------------------------------------------------------------- */
/* Monsters                                                                    */
/* -------------------------------------------------------------------------- */

function isMonster(entity) {
    if (!entity?.isValid) {
        return false;
    }

    if (
        entity.typeId ===
        "siedler:monster"
    ) {
        return true;
    }

    try {
        return (
            entity
                .getComponent(
                    "minecraft:type_family"
                )
                ?.hasTypeFamily(
                    "monster"
                ) === true
        );
    } catch {
        return false;
    }
}

/* -------------------------------------------------------------------------- */
/* Detonation                                                                  */
/* -------------------------------------------------------------------------- */

function warning(mine) {
    try {
        const dimension =
            world.getDimension(
                mine.dimension
            );

        dimension.spawnParticle(
            "minecraft:basic_smoke_particle",
            mine
        );

        for (
            const player of dimension.getPlayers({
                location: mine,
                maxDistance: 6
            })
        ) {
            try {
                player.playSound(
                    "note.pling",
                    {
                        volume: 0.9,
                        pitch: 1.8
                    }
                );
            } catch {}

            player.sendMessage(
                "§c⚠ MINE! §7Explosion in §e1 Sekunde§7!"
            );
        }
    } catch (error) {
        logger.warn(
            `Mine warning failed: ${error?.message ?? error}`
        );
    }
}

function scheduleMine(
    index,
    fromGroup = false
) {
    const mine =
        mines[index];

    if (
        !mine ||
        mine.detonating ||
        !mine.armed
    ) {
        return;
    }

    mine.detonating = true;
    mine.armed = false;

    warning(mine);

    const id = mine.id;

    save();

    system.runTimeout(
        () => detonateById(id),
        DETONATION_DELAY_TICKS
    );

    /*
     * Group mines are triggered together.
     */
    if (
        !fromGroup &&
        mine.group
    ) {
        for (
            let i = 0;
            i < mines.length;
            i++
        ) {
            const other =
                mines[i];

            if (
                i !== index &&
                other?.armed &&
                !other.detonating &&
                other.group ===
                    mine.group &&
                other.dimension ===
                    mine.dimension &&
                other.ownerTeam ===
                    mine.ownerTeam
            ) {
                scheduleMine(
                    i,
                    true
                );
            }
        }
    }
}

function detonateById(id) {
    const index =
        mines.findIndex(
            mine => mine.id === id
        );

    if (index >= 0) {
        detonate(index);
    }
}

function detonate(index) {
    const mine =
        mines[index];

    if (!mine) {
        return;
    }

    try {
        const dimension =
            world.getDimension(
                mine.dimension
            );

        const nearbyMines = [];

        for (
            let i = 0;
            i < mines.length;
            i++
        ) {
            const other =
                mines[i];

            if (
                i !== index &&
                other &&
                !other.detonating &&
                other.armed &&
                other.dimension ===
                    mine.dimension &&
                distanceSquared(
                    other,
                    mine
                ) <=
                    CHAIN_RADIUS ** 2
            ) {
                nearbyMines.push(i);
            }
        }

        /*
         * IMPORTANT:
         * blocks are NOT destroyed.
         */
        dimension.createExplosion(
            mine,
            EXPLOSION_RADIUS,
            {
                breaksBlocks: false,
                causesFire: true
            }
        );

        mine.detonating = false;
        mine.armed = false;

        mine.rearmAt =
            system.currentTick +
            REARM_TICKS;

        /*
         * Trigger nearby mines after
         * this explosion.
         */
        for (
            const nearbyIndex of nearbyMines
        ) {
            scheduleMine(
                nearbyIndex
            );
        }

        save();
    } catch (error) {
        logger.error(
            `Mine detonation failed: ${mine.id}`,
            error
        );

        mine.detonating = false;
        mine.armed = false;

        mine.rearmAt =
            system.currentTick +
            REARM_TICKS;

        save();
    }
}

/* -------------------------------------------------------------------------- */
/* Mine management                                                            */
/* -------------------------------------------------------------------------- */

function controlled(
    player,
    radius = CONTROL_RADIUS
) {
    return mines
        .map(
            (mine, index) => ({
                mine,
                index
            })
        )
        .filter(
            entry =>
                entry.mine.dimension ===
                    player.dimension.id &&
                distanceSquared(
                    entry.mine,
                    player.location
                ) <= radius ** 2 &&
                canManage(
                    player,
                    entry.mine
                )
        )
        .sort(
            (a, b) =>
                distanceSquared(
                    a.mine,
                    player.location
                ) -
                distanceSquared(
                    b.mine,
                    player.location
                )
        );
}

function groupEntries(
    player,
    group
) {
    return mines
        .map(
            (mine, index) => ({
                mine,
                index
            })
        )
        .filter(
            entry =>
                entry.mine.group ===
                    group &&
                entry.mine.dimension ===
                    player.dimension.id &&
                canManage(
                    player,
                    entry.mine
                )
        );
}

function modeText(mode) {
    if (
        mode ===
        TRIGGER_MODE.EVERYONE
    ) {
        return "§cAlle Spieler";
    }

    if (
        mode ===
        TRIGGER_MODE.HOSTILE_NEUTRAL
    ) {
        return "§eFeinde + Neutral";
    }

    return "§cNur Feinde";
}

function list(player) {
    const list =
        controlled(
            player,
            64
        );

    if (!list.length) {
        player.sendMessage(
            "§7[Mine] Keine eigenen/Team-Minen in 64 Blöcken gefunden."
        );

        return;
    }

    player.sendMessage(
        `§6--- Deine Team-Minen (${list.length}) ---`
    );

    for (
        const entry of list.slice(
            0,
            30
        )
    ) {
        const mine =
            entry.mine;

        player.sendMessage(
            `§7${mine.id} §8→ §f` +
            `${mine.x.toFixed(0)}, ` +
            `${mine.y.toFixed(0)}, ` +
            `${mine.z.toFixed(0)} ` +
            `§7| ${modeText(mine.triggerMode)}` +
            `${
                mine.group
                    ? ` §8| ${mine.group}`
                    : ""
            }`
        );
    }
}

function nearest(
    player,
    action
) {
    const entry =
        controlled(player)[0];

    if (!entry) {
        player.sendMessage(
            "§c[Mine] Keine kontrollierbare Mine in 8 Blöcken."
        );

        return;
    }

    const mine =
        entry.mine;

    if (
        action ===
        "remove"
    ) {
        mines.splice(
            entry.index,
            1
        );
    } else if (
        action ===
        "arm"
    ) {
        mine.armed = true;
        mine.armAt = 0;
        mine.rearmAt = 0;
        mine.detonating = false;
    } else {
        mine.armed = false;
        mine.armAt = 0;
        mine.rearmAt = 0;
        mine.detonating = false;
    }

    save();

    player.sendMessage(
        `§a[Mine] ${mine.id}: ${action}.`
    );
}

function clear(player) {
    const before =
        mines.length;

    mines =
        mines.filter(
            mine =>
                !(
                    mine.dimension ===
                        player.dimension.id &&
                    canManage(
                        player,
                        mine
                    )
                )
        );

    save();

    player.sendMessage(
        `§a[Mine] ${
            before - mines.length
        } Mine(n) entfernt.`
    );
}

/* -------------------------------------------------------------------------- */
/* Groups                                                                     */
/* -------------------------------------------------------------------------- */

function createGroup(
    player,
    group,
    radius
) {
    group =
        cleanGroup(group);

    const actualRadius =
        Math.max(
            1,
            Math.min(
                64,
                Number(radius) ||
                    GROUP_RADIUS_DEFAULT
            )
        );

    const entries =
        controlled(
            player,
            actualRadius
        ).filter(
            entry =>
                !entry.mine.detonating
        );

    if (!group) {
        player.sendMessage(
            "§c[Mine] Gruppenname fehlt."
        );

        return;
    }

    if (!entries.length) {
        player.sendMessage(
            "§c[Mine] Keine kontrollierbaren Minen im Radius."
        );

        return;
    }

    for (
        const entry of entries
    ) {
        entry.mine.group =
            group;
    }

    save();

    player.sendMessage(
        `§a[Mine] Gruppe §f${group}§a: ` +
        `${entries.length} Mine(n).`
    );
}

function groupList(player) {
    const groups =
        new Map();

    for (
        const entry of controlled(
            player,
            128
        )
    ) {
        if (
            entry.mine.group
        ) {
            groups.set(
                entry.mine.group,
                (
                    groups.get(
                        entry.mine.group
                    ) || 0
                ) + 1
            );
        }
    }

    if (!groups.size) {
        player.sendMessage(
            "§7[Mine] Keine Minengruppen vorhanden."
        );

        return;
    }

    player.sendMessage(
        "§6--- Minengruppen ---"
    );

    for (
        const [group, count] of
        groups
    ) {
        player.sendMessage(
            `§f${group} §7→ §e${count}§7 Mine(n)`
        );
    }
}

function groupAction(
    player,
    group,
    action
) {
    group =
        cleanGroup(group);

    const entries =
        groupEntries(
            player,
            group
        );

    if (!entries.length) {
        player.sendMessage(
            `§c[Mine] Gruppe §f${group}§c nicht gefunden.`
        );

        return;
    }

    if (
        action ===
        "remove"
    ) {
        mines =
            mines.filter(
                mine =>
                    !(
                        mine.group ===
                            group &&
                        mine.dimension ===
                            player.dimension.id &&
                        canManage(
                            player,
                            mine
                        )
                    )
            );
    } else {
        for (
            const entry of entries
        ) {
            const mine =
                entry.mine;

            mine.armed =
                action === "arm";

            mine.armAt = 0;
            mine.rearmAt = 0;
            mine.detonating = false;
        }
    }

    save();

    player.sendMessage(
        `§a[Mine] ${action} für §f${group}§a auf ${entries.length} Mine(n).`
    );
}

function groupMode(
    player,
    group,
    mode
) {
    const entries =
        groupEntries(
            player,
            cleanGroup(group)
        );

    if (!entries.length) {
        player.sendMessage(
            `§c[Mine] Gruppe §f${group}§c nicht gefunden.`
        );

        return;
    }

    for (
        const entry of entries
    ) {
        entry.mine.triggerMode =
            mode;
    }

    save();

    player.sendMessage(
        `§a[Mine] Modus ${mode} für ${entries.length} Mine(n) gesetzt.`
    );
}

function groupDetonate(
    player,
    group
) {
    const entries =
        groupEntries(
            player,
            cleanGroup(group)
        ).filter(
            entry =>
                entry.mine.armed &&
                !entry.mine.detonating
        );

    if (!entries.length) {
        player.sendMessage(
            `§c[Mine] Keine scharfen Minen in §f${group}§c.`
        );

        return;
    }

    for (
        const entry of entries
    ) {
        scheduleMine(
            entry.index,
            true
        );
    }

    player.sendMessage(
        `§c[Mine] Gruppe §f${group}§c zündet gleichzeitig: ` +
        `§e${entries.length}§c Mine(n).`
    );
}

/* -------------------------------------------------------------------------- */
/* Commands                                                                   */
/* -------------------------------------------------------------------------- */

function registerCommands(
    registry
) {
    const playerOnly =
        origin =>
            origin?.sourceEntity?.typeId ===
            "minecraft:player"
                ? origin.sourceEntity
                : null;

    const register =
        (
            name,
            description,
            parameters,
            handler
        ) => {
            registry.registerCommand(
                {
                    name,
                    description,

                    permissionLevel:
                        CommandPermissionLevel.Any,

                    cheatsRequired: false,

                    ...(parameters.length
                        ? {
                              mandatoryParameters:
                                  parameters
                          }
                        : {})
                },

                (origin, ...args) => {
                    const player =
                        playerOnly(
                            origin
                        );

                    if (!player) {
                        return {
                            status:
                                CustomCommandStatus.Failure
                        };
                    }

                    system.run(() =>
                        handler(
                            player,
                            ...args
                        )
                    );

                    return {
                        status:
                            CustomCommandStatus.Success
                    };
                }
            );
        };

    register(
        "siedler:mine_list",
        "Listet kontrollierbare Minen auf.",
        [],
        list
    );

    register(
        "siedler:mine_status",
        "Zeigt den Minenstatus.",
        [],
        player =>
            player.sendMessage(
                `§6[Mine] Gesamt §e${mines.length}/${MAX_MINES}` +
                `§7 | Kontrollierbar §e${controlled(player, 128).length}`
            )
    );

    register(
        "siedler:mine_arm",
        "Schaltet die nächste Mine scharf.",
        [],
        player =>
            nearest(
                player,
                "arm"
            )
    );

    register(
        "siedler:mine_disarm",
        "Entschärft die nächste Mine.",
        [],
        player =>
            nearest(
                player,
                "disarm"
            )
    );

    register(
        "siedler:mine_remove",
        "Entfernt die nächste Mine.",
        [],
        player =>
            nearest(
                player,
                "remove"
            )
    );

    register(
        "siedler:mine_clear",
        "Entfernt Team-Minen.",
        [],
        clear
    );

    register(
        "siedler:mine_mode",
        "Setzt den Auslösemodus.",
        [
            {
                type:
                    CustomCommandParamType.Integer,
                name: "modus"
            }
        ],
        (player, mode) => {
            mode = Number(mode);

            if (
                ![
                    TRIGGER_MODE.HOSTILE,
                    TRIGGER_MODE.HOSTILE_NEUTRAL,
                    TRIGGER_MODE.EVERYONE
                ].includes(mode)
            ) {
                player.sendMessage(
                    "§c[Mine] 0=Feinde, 1=Feinde+Neutral, 2=Alle."
                );

                return;
            }

            const entry =
                controlled(player)[0];

            if (!entry) {
                player.sendMessage(
                    "§c[Mine] Keine kontrollierbare Mine."
                );

                return;
            }

            entry.mine.triggerMode =
                mode;

            save();
        }
    );

    register(
        "siedler:mine_group_create",
        "Erstellt eine Minengruppe aus Minen im Radius.",
        [
            {
                type:
                    CustomCommandParamType.String,
                name: "gruppe"
            },
            {
                type:
                    CustomCommandParamType.Integer,
                name: "radius"
            }
        ],
        createGroup
    );

    register(
        "siedler:mine_group_list",
        "Listet Minengruppen.",
        [],
        groupList
    );

    register(
        "siedler:mine_group_arm",
        "Schaltet eine Gruppe scharf.",
        [
            {
                type:
                    CustomCommandParamType.String,
                name: "gruppe"
            }
        ],
        (player, group) =>
            groupAction(
                player,
                group,
                "arm"
            )
    );

    register(
        "siedler:mine_group_disarm",
        "Entschärft eine Gruppe.",
        [
            {
                type:
                    CustomCommandParamType.String,
                name: "gruppe"
            }
        ],
        (player, group) =>
            groupAction(
                player,
                group,
                "disarm"
            )
    );

    register(
        "siedler:mine_group_remove",
        "Entfernt eine Gruppe.",
        [
            {
                type:
                    CustomCommandParamType.String,
                name: "gruppe"
            }
        ],
        (player, group) =>
            groupAction(
                player,
                group,
                "remove"
            )
    );

    register(
        "siedler:mine_group_mode",
        "Setzt den Modus einer Gruppe.",
        [
            {
                type:
                    CustomCommandParamType.String,
                name: "gruppe"
            },
            {
                type:
                    CustomCommandParamType.Integer,
                name: "modus"
            }
        ],
        (player, group, mode) => {
            mode = Number(mode);

            if (
                ![
                    TRIGGER_MODE.HOSTILE,
                    TRIGGER_MODE.HOSTILE_NEUTRAL,
                    TRIGGER_MODE.EVERYONE
                ].includes(mode)
            ) {
                player.sendMessage(
                    "§c[Mine] 0=Feinde, 1=Feinde+Neutral, 2=Alle."
                );

                return;
            }

            groupMode(
                player,
                group,
                mode
            );
        }
    );

    register(
        "siedler:mine_group_detonate",
        "Zündet alle scharfen Gruppenminen gleichzeitig.",
        [
            {
                type:
                    CustomCommandParamType.String,
                name: "gruppe"
            }
        ],
        groupDetonate
    );
}

/* -------------------------------------------------------------------------- */
/* Scanning                                                                   */
/* -------------------------------------------------------------------------- */

function scan() {
    const now =
        system.currentTick;

    let changed = false;

    /*
     * Arm / rearm mines.
     */
    for (
        const mine of mines
    ) {
        if (
            !mine.armed &&
            !mine.detonating &&
            mine.armAt > 0 &&
            now >= mine.armAt &&
            mine.rearmAt === 0
        ) {
            mine.armed = true;
            mine.armAt = 0;

            changed = true;
        }

        if (
            !mine.armed &&
            !mine.detonating &&
            mine.rearmAt > 0 &&
            now >= mine.rearmAt
        ) {
            mine.armed = true;
            mine.rearmAt = 0;

            changed = true;
        }
    }

    /*
     * Player triggers.
     */
    for (
        const player of world.getAllPlayers()
    ) {
        if (!player?.isValid) {
            continue;
        }

        for (
            let i = 0;
            i < mines.length;
            i++
        ) {
            const mine =
                mines[i];

            if (
                !mine?.armed ||
                mine.detonating ||
                mine.dimension !==
                    player.dimension.id
            ) {
                continue;
            }

            if (
                distanceSquared(
                    mine,
                    player.location
                ) <=
                    0.75 ** 2 &&
                canTrigger(
                    player,
                    mine
                )
            ) {
                scheduleMine(i);
            }
        }
    }

    /*
     * Monster triggers.
     */
    for (
        const mine of mines
    ) {
        if (
            !mine?.armed ||
            mine.detonating
        ) {
            continue;
        }

        try {
            const dimension =
                world.getDimension(
                    mine.dimension
                );

            const monsters =
                dimension.getEntities({
                    location: mine,
                    maxDistance:
                        MONSTER_TRIGGER_RADIUS,
                    families: ["monster"]
                });

            if (
                monsters.some(
                    isMonster
                )
            ) {
                const index =
                    mines.indexOf(
                        mine
                    );

                if (index >= 0) {
                    scheduleMine(
                        index
                    );
                }

                continue;
            }

            const customMonsters =
                dimension.getEntities({
                    location: mine,
                    maxDistance:
                        MONSTER_TRIGGER_RADIUS,
                    type: "siedler:monster"
                });

            if (
                customMonsters.some(
                    isMonster
                )
            ) {
                const index =
                    mines.indexOf(
                        mine
                    );

                if (index >= 0) {
                    scheduleMine(
                        index
                    );
                }
            }
        } catch (error) {
            logger.debug(
                `Monster scan skipped for mine ${mine.id}: ` +
                `${error?.message ?? error}`
            );
        }
    }

    if (changed) {
        save();
    }
}

/* -------------------------------------------------------------------------- */
/* Mine placement event system                                                */
/* -------------------------------------------------------------------------- */

/**
 * Safely subscribes to a Bedrock event.
 *
 * Every event is registered independently.
 * Therefore one unavailable API event can no longer
 * prevent the other placement mechanisms from loading.
 */
function subscribeMinePlacement(
    eventName,
    callback
) {
    try {
        const event =
            world.afterEvents?.[
                eventName
            ];

        if (
            !event ||
            typeof event.subscribe !==
                "function"
        ) {
            logger.warn(
                `Mine placement event unavailable: ${eventName}`
            );

            return false;
        }

        event.subscribe(
            callback
        );

        logger.info(
            `Mine placement event registered: ${eventName}`
        );

        return true;
    } catch (error) {
        logger.warn(
            `Mine placement event failed: ${eventName}: ` +
            `${error?.message ?? error}`
        );

        return false;
    }
}

/*
 * Method 1:
 *
 * playerInteractWithBlock
 *
 * This is the preferred method if available.
 */
subscribeMinePlacement(
    "playerInteractWithBlock",
    event => {
        try {
            const player =
                event.player;

            if (
                player?.typeId !==
                "minecraft:player"
            ) {
                return;
            }

            const item =
                event.itemStack;

            if (
                item?.typeId !==
                ITEM_ID
            ) {
                return;
            }

            placeMine(
                player,
                event.block
            );
        } catch (error) {
            logger.warn(
                `playerInteractWithBlock mine placement failed: ` +
                `${error?.message ?? error}`
            );
        }
    }
);

/*
 * Method 2:
 *
 * itemUseOn
 *
 * This is a compatibility fallback for older
 * Bedrock API versions.
 */
subscribeMinePlacement(
    "itemUseOn",
    event => {
        try {
            const player =
                event.source;

            if (
                player?.typeId !==
                "minecraft:player"
            ) {
                return;
            }

            const item =
                event.itemStack;

            if (
                item?.typeId !==
                ITEM_ID
            ) {
                return;
            }

            placeMine(
                player,
                event.block
            );
        } catch (error) {
            logger.warn(
                `itemUseOn mine placement failed: ` +
                `${error?.message ?? error}`
            );
        }
    }
);

/*
 * Method 3:
 *
 * itemStartUseOn
 *
 * Available on newer Bedrock Script APIs.
 */
subscribeMinePlacement(
    "itemStartUseOn",
    event => {
        try {
            const player =
                event.source;

            if (
                player?.typeId !==
                "minecraft:player"
            ) {
                return;
            }

            const item =
                event.itemStack;

            if (
                item?.typeId !==
                ITEM_ID
            ) {
                return;
            }

            placeMine(
                player,
                event.block
            );
        } catch (error) {
            logger.warn(
                `itemStartUseOn mine placement failed: ` +
                `${error?.message ?? error}`
            );
        }
    }
);

/*
 * Method 4:
 *
 * itemUse + raycast
 *
 * This is the important final fallback.
 *
 * If the block-interaction events do not fire
 * for the custom item, itemUse still fires when
 * the player uses the item.
 *
 * We then determine the block the player is
 * looking at ourselves.
 */
subscribeMinePlacement(
    "itemUse",
    event => {
        try {
            const player =
                event.source;

            if (
                player?.typeId !==
                "minecraft:player"
            ) {
                return;
            }

            const item =
                event.itemStack;

            if (
                item?.typeId !==
                ITEM_ID
            ) {
                return;
            }

            /*
             * Find the block the player is looking at.
             */
            let hit = null;

            try {
                if (
                    typeof player.getBlockFromViewDirection ===
                    "function"
                ) {
                    hit =
                        player.getBlockFromViewDirection(
                            {
                                maxDistance: 8,
                                includeLiquidBlocks: false,
                                includePassableBlocks: false
                            }
                        );
                }
            } catch (error) {
                logger.debug(
                    `Mine raycast failed: ${error?.message ?? error}`
                );
            }

            /*
             * Depending on the Bedrock API version,
             * the result can be either:
             *
             * { block, face, faceLocation }
             *
             * or another compatible object.
             */
            const block =
                hit?.block ??
                null;

            if (!block) {
                player.sendMessage(
                    "§c[Mine] Kein gültiger Block im Sichtfeld gefunden."
                );

                return;
            }

            placeMine(
                player,
                block
            );
        } catch (error) {
            logger.warn(
                `itemUse mine placement failed: ` +
                `${error?.message ?? error}`
            );
        }
    }
);

/* -------------------------------------------------------------------------- */
/* Commands                                                                   */
/* -------------------------------------------------------------------------- */

try {
    system.beforeEvents.startup.subscribe(
        event => {
            try {
                registerCommands(
                    event.customCommandRegistry
                );

                logger.info(
                    "Minefield commands registered."
                );
            } catch (error) {
                logger.error(
                    "Could not register minefield commands",
                    error
                );
            }
        }
    );
} catch (error) {
    logger.error(
        "Could not initialize minefield commands",
        error
    );
}

/* -------------------------------------------------------------------------- */
/* Startup                                                                    */
/* -------------------------------------------------------------------------- */

system.runTimeout(
    load,
    1
);

system.runInterval(
    scan,
    SCAN_INTERVAL
);

logger.success(
    "Minefield loaded: robust placement events + raycast fallback, " +
    "solid-block support, teams, diplomacy, persistent groups and synchronized detonation."
);
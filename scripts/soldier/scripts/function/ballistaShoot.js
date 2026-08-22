import { world, system } from "@minecraft/server";

// --- STAT CONFIGURATION (Bro can be adjusted here) ---
const BALLISTA_ID = "fv:ballista";
const SHOOT_FORCE = 3.2; // Firing force as requested

// spawn offset of arrow name relative to the position Ballista { x, y, z }
// Adjust for arrow name flying ra from correct slide track of Ballista
const PROJECTILE_OFFSET = { x: 0, y: 1.8, z: 0 };

// Mapping table Property -> Projectile entity interact corresponding
const ARROW_TYPE_MAP = {
    1: "fv:throw_copper_ballista_arrow",
    2: "fv:throw_iron_ballista_arrow",
    3: "fv:throw_gold_ballista_arrow",
    4: "fv:throw_diamond_ballista_arrow",
    5: "fv:throw_netherite_ballista_arrow"
};

// --- FIRING logic ---
world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
    const { player, target: ballista } = event;

    // 1. Check has is actually Ballista not
    if (ballista.typeId !== BALLISTA_ID) return;

    // 2. Check firing condition from Property (Matches the JSON logic of bro)
    const status = ballista.getProperty("fv:ballista_status");
    const arrowType = ballista.getProperty("fv:type_arrow");

    // only perform perform script when Ballista is in the state 'ready' and has ammunition (arrowType > 0)
    // and important: player right is riding Ballista (Check rider)
    if (status === "ready" && arrowType > 0) {

        // Check whether the player is the correct rider on the Ballista
        const rideable = ballista.getComponent("minecraft:rideable");
        const riders = rideable.getRiders();
        const isRider = riders.some(r => r.id === player.id);

        if (isRider) {
            // Run logic shoot in system.run to avoid synchronization errors (because this is a beforeEvent)
            system.run(() => {
                shootBallista(ballista, player, arrowType);
            });
        }
    }
});

/**
 * Hàm thực hiện triệu hồi và bắn mũi tên
 */
function shootBallista(ballista, shooter, type) {
    const dimension = ballista.dimension;
    const projectileId = ARROW_TYPE_MAP[type];

    if (!projectileId) return;

    // Calculate look direction of Ballista
    const viewDir = ballista.getViewDirection();

    // Calculate spawn position based on Offset
    const spawnLocation = {
        x: ballista.location.x + (viewDir.x * 0.5) + PROJECTILE_OFFSET.x,
        y: ballista.location.y + PROJECTILE_OFFSET.y,
        z: ballista.location.z + (viewDir.z * 0.5) + PROJECTILE_OFFSET.z
    };

    // Summon arrow name
    const arrow = dimension.spawnEntity(projectileId, spawnLocation);

    // Handle Projectile component
    const projectileComp = arrow.getComponent("minecraft:projectile");

    if (projectileComp) {
        // Set owner to the shooter (Extremely important)
        projectileComp.owner = shooter;

        // Calculate Velocity (direction look * Firing force)
        const velocity = {
            x: viewDir.x * SHOOT_FORCE,
            y: viewDir.y * SHOOT_FORCE,
            z: viewDir.z * SHOOT_FORCE
        };

        // Fire!
        projectileComp.shoot(velocity);
    }
}
import { system } from "@minecraft/server";

// 1️⃣ Calculate shooting direction with fixed pitch
function getDirectionWithFixedPitch(baseDirection, pitchDeg) {
    const pitchRad = pitchDeg * (Math.PI / 180);
    const flatLen = Math.sqrt(baseDirection.x ** 2 + baseDirection.z ** 2);

    if (flatLen === 0) return { x: 0, y: Math.sin(pitchRad), z: 0 };

    const xzNorm = {
        x: baseDirection.x / flatLen,
        z: baseDirection.z / flatLen,
    };

    return {
        x: xzNorm.x * Math.cos(pitchRad),
        y: Math.sin(pitchRad),
        z: xzNorm.z * Math.cos(pitchRad),
    };
}

// 2️⃣ Perform shooting (Based entirely on the Property, without using inventory)
function shoot(shooter, power = 1.6, uncertainty = 0) {
    // Get reload state from Property fv:reload
    const reloadState = shooter.getProperty("fv:reload");

    // Only shoot when state is potato or potatoexp
    if (reloadState !== "potato" && reloadState !== "potatoexp") {
        return;
    }

    const baseDirection = shooter.getViewDirection();
    // Fix the firing angle direction up 25 mode as requested
    const direction = getDirectionWithFixedPitch(baseDirection, 25);
    const headPos = shooter.getHeadLocation();

    // spawnOffset = 1.8 to avoid collision with the cannon's own hitbox
    const spawnPos = {
        x: headPos.x + direction.x * 1.8,
        y: headPos.y + 1.2,
        z: headPos.z + direction.z * 1.8,
    };

    // spawn the fv:potato_fly projectile entity
    const potato = shooter.dimension.spawnEntity("fv:potato_fly", spawnPos);

    // Note Module 2.4.0: isValid has no parentheses
    if (!potato || !potato.isValid) return;

    const projectile = potato.getComponent("minecraft:projectile");
    if (projectile && projectile.isValid) {
        try {
            // Assign owner for accurate damage/faction calculation
            projectile.owner = shooter;
        } catch (e) { }

        // Launch the projectile
        projectile.shoot(
            {
                x: direction.x * power,
                y: direction.y * power,
                z: direction.z * power,
            },
            {
                uncertainty: uncertainty,
            }
        );
    }

    // If an explosive potato is loaded, trigger the event potato_exp
    if (reloadState === "potatoexp") {
        potato.triggerEvent("potato_exp");
    }

    // reset PROPERTY: After shooting, set to empty to animation Controller run load ballistic
    shooter.setProperty("fv:reload", "empty");

    // Removed the playSound line as requested because the animation already has sound.
}

// 3️⃣ Listen for the shoot command from Scriptevent
system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id !== "cannon:shoot") return;

    const shooter = event.sourceEntity;

    // Check perform entity (isValid not parentheses)
    if (!shooter || !shooter.isValid) return;

    // Set defaults
    let power = 1.6;
    let uncertainty = 0;

    // Parse the message (VD: /scriptevent cannon:shoot 1.8 0)
    if (event.message) {
        const params = event.message.split(" ");
        const p = parseFloat(params[0]);
        const u = parseFloat(params[1]);

        if (!isNaN(p)) power = p;
        if (!isNaN(u)) uncertainty = u;
    }

    shoot(shooter, power, uncertainty);
});
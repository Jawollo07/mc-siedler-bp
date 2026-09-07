/**
 * Anti-AFK configuration.
 * All durations are milliseconds.
 */

export const ANTI_AFK_CONFIG = Object.freeze({
    enabled: true,
    kickEnabled: true,

    // Player becomes AFK after this period without meaningful activity.
    afkAfterMs: 5 * 60 * 1000,

    // Warning before the kick. The warning is sent once per AFK cycle.
    warningAfterMs: 4 * 60 * 1000,

    // Player is kicked after this period without meaningful activity.
    kickAfterMs: 10 * 60 * 1000,

    // How often players are checked.
    checkIntervalTicks: 20,

    // Minimum movement that counts as activity.
    movementThreshold: 0.75,

    // Repeated status messages are throttled.
    actionBarIntervalMs: 15 * 1000,

    messages: Object.freeze({
        warning: "§e[Anti-AFK] §7Du warst lange inaktiv. Bewege dich oder führe eine Aktion aus, sonst wirst du wegen Inaktivität gekickt.",
        markedAfk: "§e[Anti-AFK] §7Du bist jetzt als §6AFK §7markiert.",
        noLongerAfk: "§a[Anti-AFK] §7Du bist nicht mehr AFK.",
        kicked: "§c[Anti-AFK] §7Du wurdest wegen zu langer Inaktivität gekickt.",
        manuallyAfk: "§e[Anti-AFK] §7Du bist jetzt AFK. Bewege dich oder führe eine Aktion aus, um den Status zu beenden.",
        manuallyActive: "§a[Anti-AFK] §7AFK-Status beendet.",
        disabled: "§c[Anti-AFK] §7Das Anti-AFK-System ist deaktiviert."
    })
});

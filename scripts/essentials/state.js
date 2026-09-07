export const HOMES_KEY = "homes";
export const DEATH_POINTS_KEY = "death_points";
export const TPA_TIMEOUT = 60_000;
export const MAX_HOME_DISTANCE = 30_000_000;

export const homes = new Map();
export const deathPoints = new Map();
export const tpaRequests = new Map(); // targetId -> Map(senderId, request)
export const lastMessagedPlayer = new Map(); // playerId -> playerId
export const godMode = new Set();
export const flyMode = new Set();

export function getHome(player) {
    return homes.get(player.id) ?? null;
}

export function queueTpaRequest(sender, target) {
    let requests = tpaRequests.get(target.id);
    if (!requests) {
        requests = new Map();
        tpaRequests.set(target.id, requests);
    }

    requests.set(sender.id, {
        from: sender.id,
        target: target.id,
        expiresAt: Date.now() + TPA_TIMEOUT
    });
}

export function getLatestTpaRequest(target) {
    const requests = tpaRequests.get(target.id);
    if (!requests) return null;

    const now = Date.now();
    for (const [senderId, request] of requests) {
        if (request.expiresAt <= now) requests.delete(senderId);
    }
    if (requests.size === 0) {
        tpaRequests.delete(target.id);
        return null;
    }

    return [...requests.values()].sort((a, b) => b.expiresAt - a.expiresAt)[0] ?? null;
}

export function removeTpaRequest(targetId, senderId) {
    const requests = tpaRequests.get(targetId);
    if (!requests) return false;

    const removed = requests.delete(senderId);
    if (requests.size === 0) tpaRequests.delete(targetId);
    return removed;
}

export function removePlayerRequests(playerId) {
    let removed = 0;
    if (tpaRequests.delete(playerId)) removed++;

    for (const [targetId, requests] of tpaRequests) {
        if (requests.delete(playerId)) removed++;
        if (requests.size === 0) tpaRequests.delete(targetId);
    }

    lastMessagedPlayer.delete(playerId);
    for (const [id, targetId] of lastMessagedPlayer) {
        if (targetId === playerId) lastMessagedPlayer.delete(id);
    }

    return removed;
}

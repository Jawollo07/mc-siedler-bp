import { world, system } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { spawnSoldier } from "./spawn.js";
import { SOLDIER_TYPES, SOLDIERS } from "./config.js";

const TRADER_TYPE = "siedler:trader";
const SOLDIER_TRADER_TAG = "soldier_trader";
const EMERALD = "minecraft:emerald";

function getInfantryLevel(level) {
    return SOLDIER_TYPES.infantry?.levels?.[level] ?? null;
}

function getSoldierCount(player) {
    let count = 0;
    for (const data of SOLDIERS.values()) {
        if (data?.ownerId === player.id && data.entity?.isValid) count++;
    }
    return count;
}

function countEmeralds(player) {
    try {
        const inventory = player.getComponent("minecraft:inventory")?.container;
        if (!inventory) return 0;

        let total = 0;
        for (let i = 0; i < inventory.size; i++) {
            const item = inventory.getItem(i);
            if (item?.typeId === EMERALD) total += item.amount;
        }
        return total;
    } catch {
        return 0;
    }
}

function removeEmeralds(player, amount) {
    try {
        const inventory = player.getComponent("minecraft:inventory")?.container;
        if (!inventory || countEmeralds(player) < amount) return false;

        let remaining = amount;
        for (let i = 0; i < inventory.size && remaining > 0; i++) {
            const item = inventory.getItem(i);
            if (!item || item.typeId !== EMERALD) continue;

            const remove = Math.min(item.amount, remaining);
            item.amount -= remove;
            remaining -= remove;

            if (item.amount <= 0) inventory.setItem(i, undefined);
            else inventory.setItem(i, item);
        }

        return remaining === 0;
    } catch (error) {
        console.warn(`[Soldier Trader] Failed to remove emeralds: ${error}`);
        return false;
    }
}

function refundEmeralds(player, amount) {
    try {
        const inventory = player.getComponent("minecraft:inventory")?.container;
        if (!inventory) return;

        let remaining = amount;
        for (let i = 0; i < inventory.size && remaining > 0; i++) {
            const existing = inventory.getItem(i);
            if (existing && existing.typeId === EMERALD && existing.amount < 64) {
                const add = Math.min(64 - existing.amount, remaining);
                existing.amount += add;
                remaining -= add;
                inventory.setItem(i, existing);
            }
        }

        while (remaining > 0) {
            let inserted = false;
            for (let i = 0; i < inventory.size; i++) {
                if (inventory.getItem(i)) continue;
                const add = Math.min(64, remaining);
                const { ItemStack } = requireItemStack();
                inventory.setItem(i, new ItemStack(EMERALD, add));
                remaining -= add;
                inserted = true;
                break;
            }
            if (!inserted) break;
        }
    } catch (error) {
        console.warn(`[Soldier Trader] Refund failed: ${error}`);
    }
}

// Kept isolated so the rest of the trader module remains compatible with
// Bedrock versions where ItemStack is available from @minecraft/server.
function requireItemStack() {
    return { ItemStack: globalThis.__siedlerItemStack };
}

function spawnLocationNearTrader(trader, player) {
    const dx = player.location.x - trader.location.x;
    const dz = player.location.z - trader.location.z;
    const length = Math.hypot(dx, dz) || 1;
    return {
        x: trader.location.x + (dx / length) * 2.2,
        y: trader.location.y,
        z: trader.location.z + (dz / length) * 2.2
    };
}

async function openSoldierTrader(player, trader) {
    if (!player?.isValid || !trader?.isValid) return;

    const levels = [1, 2, 3].map((level) => {
        const data = getInfantryLevel(level);
        return { level, data, cost: data?.cost ?? 0 };
    }).filter((entry) => entry.data);

    const form = new ActionFormData()
        .title("§c⚔ Soldatenhändler")
        .body(
            `§7Rekrutiere Infanteristen für deine Armee.\n\n` +
            `§fAktive Soldaten: §e${getSoldierCount(player)}\n` +
            `§fDeine Emeralds: §a${countEmeralds(player)}\n\n` +
            `§8Ein Soldat wird direkt vor dem Händler für dich erstellt.`
        );

    for (const { level, data, cost } of levels) {
        const names = { 1: "Rekrut", 2: "Veteran", 3: "Elite" };
        form.button(`§e${names[level]} §7(Lv. ${level})\n§a${cost} Emeralds`);
    }

    form.button("§8Abbrechen");

    let result;
    try {
        result = await form.show(player);
    } catch {
        return;
    }

    if (result.canceled || result.selection === undefined || result.selection >= levels.length) return;

    const selected = levels[result.selection];
    const cost = selected.cost;

    if (countEmeralds(player) < cost) {
        player.sendMessage(`§8[§cSoldatenhändler§8]§r §cDu benötigst ${cost} Emeralds.`);
        return;
    }

    if (!removeEmeralds(player, cost)) {
        player.sendMessage("§8[§cSoldatenhändler§8]§r §cDie Zahlung konnte nicht durchgeführt werden.");
        return;
    }

    const soldier = spawnSoldier(
        trader.dimension,
        spawnLocationNearTrader(trader, player),
        "infantry",
        selected.level,
        player
    );

    if (!soldier) {
        refundEmeralds(player, cost);
        player.sendMessage("§8[§cSoldatenhändler§8]§r §cDer Soldat konnte nicht rekrutiert werden. Deine Emeralds wurden zurückerstattet.");
        return;
    }

    player.sendMessage(`§8[§cSoldatenhändler§8]§r §a${selected.level === 1 ? "Rekrut" : selected.level === 2 ? "Veteran" : "Elite"} erfolgreich rekrutiert! §7(${cost} Emeralds)`);
    try { player.playSound("random.levelup"); } catch {}
}

world.afterEvents.playerInteractWithEntity.subscribe((event) => {
    const { player, target } = event;
    if (target?.typeId !== TRADER_TYPE) return;
    if (!target.hasTag(SOLDIER_TRADER_TAG)) return;

    system.run(() => openSoldierTrader(player, target));
});

console.info("§a[Soldier Trader] Soldier recruitment trader initialized");

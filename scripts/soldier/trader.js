import { world, system, ItemStack } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { spawnSoldier } from "./spawn.js";
import { SOLDIER_TYPES, SOLDIERS } from "./config.js";

const TRADER_TYPE = "siedler:trader";
const SOLDIER_TRADER_TAG = "soldier_trader";
const EMERALD = "minecraft:emerald";
const TYPE_NAMES = { infantry: "Infanterie", archer: "Bogenschütze", cavalry: "Kavallerie" };
const LEVEL_NAMES = { 1: "Rekrut", 2: "Veteran", 3: "Elite" };

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
    } catch { return 0; }
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
            inventory.setItem(i, item.amount > 0 ? item : undefined);
        }
        return remaining === 0;
    } catch (error) {
        console.warn(`[Soldier Trader] Payment failed: ${error}`);
        return false;
    }
}

function refundEmeralds(player, amount) {
    try {
        const inventory = player.getComponent("minecraft:inventory")?.container;
        if (!inventory) return;
        let remaining = amount;
        for (let i = 0; i < inventory.size && remaining > 0; i++) {
            const item = inventory.getItem(i);
            if (!item || item.typeId !== EMERALD || item.amount >= 64) continue;
            const add = Math.min(64 - item.amount, remaining);
            item.amount += add;
            remaining -= add;
            inventory.setItem(i, item);
        }
        for (let i = 0; i < inventory.size && remaining > 0; i++) {
            if (inventory.getItem(i)) continue;
            const add = Math.min(64, remaining);
            inventory.setItem(i, new ItemStack(EMERALD, add));
            remaining -= add;
        }
        if (remaining > 0) player.dimension.spawnItem(new ItemStack(EMERALD, remaining), player.location);
    } catch (error) {
        console.warn(`[Soldier Trader] Refund failed: ${error}`);
    }
}

function spawnLocationNearTrader(trader, player) {
    const dx = player.location.x - trader.location.x;
    const dz = player.location.z - trader.location.z;
    const length = Math.hypot(dx, dz) || 1;
    return { x: trader.location.x + (dx / length) * 2.2, y: trader.location.y, z: trader.location.z + (dz / length) * 2.2 };
}

async function openSoldierTrader(player, trader) {
    if (!player?.isValid || !trader?.isValid) return;

    const offers = [];
    for (const type of ["infantry", "archer", "cavalry"]) {
        const typeData = SOLDIER_TYPES[type];
        if (!typeData) continue;
        for (const level of [1, 2, 3]) {
            const data = typeData.levels?.[level];
            if (data) offers.push({ type, level, data });
        }
    }

    const form = new ActionFormData()
        .title("§c⚔ Soldatenhändler")
        .body(`§7Rekrutiere Einheiten für deine Armee.\n\n§fAktive Soldaten: §e${getSoldierCount(player)}\n§fDeine Emeralds: §a${countEmeralds(player)}\n\n§8Kavallerie wird auf einem Pferd eingesetzt.`);

    for (const offer of offers) {
        form.button(`§e${TYPE_NAMES[offer.type]} §7${LEVEL_NAMES[offer.level]} (Lv. ${offer.level})\n§a${offer.data.cost} Emeralds`);
    }
    form.button("§8Abbrechen");

    let result;
    try { result = await form.show(player); } catch { return; }
    if (result.canceled || result.selection === undefined || result.selection >= offers.length) return;

    const selected = offers[result.selection];
    const cost = selected.data.cost;
    if (countEmeralds(player) < cost) {
        player.sendMessage(`§8[§cSoldatenhändler§8]§r §cDu benötigst ${cost} Emeralds.`);
        return;
    }
    if (!removeEmeralds(player, cost)) {
        player.sendMessage("§8[§cSoldatenhändler§8]§r §cDie Zahlung konnte nicht durchgeführt werden.");
        return;
    }

    const soldier = spawnSoldier(trader.dimension, spawnLocationNearTrader(trader, player), selected.type, selected.level, player);
    if (!soldier) {
        refundEmeralds(player, cost);
        player.sendMessage("§8[§cSoldatenhändler§8]§r §cDie Einheit konnte nicht rekrutiert werden. Die Emeralds wurden zurückerstattet.");
        return;
    }
    player.sendMessage(`§8[§cSoldatenhändler§8]§r §a${TYPE_NAMES[selected.type]} ${LEVEL_NAMES[selected.level]} erfolgreich rekrutiert! §7(${cost} Emeralds)`);
    try { player.playSound("random.levelup"); } catch {}
}

world.afterEvents.playerInteractWithEntity.subscribe((event) => {
    const { player, target } = event;
    if (target?.typeId !== TRADER_TYPE || !target.hasTag(SOLDIER_TRADER_TAG)) return;
    system.run(() => openSoldierTrader(player, target));
});

console.info("§a[Soldier Trader] Soldier recruitment trader initialized");

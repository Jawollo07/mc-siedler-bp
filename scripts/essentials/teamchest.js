import { system, world, CommandPermissionLevel, CustomCommandStatus, ItemStack } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { getPlayerTeam, getTeams } from "../teams/index.js";
import { createLogger } from "../core/logger.js";

const logger = createLogger("Essentials:TeamChest");
const PROPERTY_KEY = "essentials:teamchests";
const SLOT_COUNT = 54;

function readAll() {
    const raw = world.getDynamicProperty(PROPERTY_KEY);
    if (typeof raw !== "string" || !raw) return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (error) { logger.exception("Teamchests konnten nicht geladen werden", error); return {}; }
}
function writeAll(data) {
    try { world.setDynamicProperty(PROPERTY_KEY, JSON.stringify(data)); return true; }
    catch (error) { logger.exception("Teamchests konnten nicht gespeichert werden", error); return false; }
}
function loadTeamStorage(teamName) {
    const data = readAll()[teamName];
    return Array.from({ length: SLOT_COUNT }, (_, i) => Array.isArray(data) ? (data[i] ?? null) : null);
}
function saveTeamStorage(teamName, storage) { const all = readAll(); all[teamName] = storage; return writeAll(all); }
function inventory(player) { return player.getComponent("minecraft:inventory")?.container; }
function serializeItem(item) {
    if (!item) return null;
    const result = { typeId: item.typeId, amount: item.amount };
    try { if (item.nameTag) result.nameTag = item.nameTag; const lore = item.getLore?.(); if (lore?.length) result.lore = lore; } catch {}
    try { const es = item.getComponent("minecraft:enchantable")?.getEnchantments?.(); if (es?.length) result.enchantments = es.map(e => ({ id: e.type?.id ?? e.typeId ?? e.id, level: e.level })); } catch {}
    try { const d = item.getComponent("minecraft:durability"); if (d) result.durability = d.damage; } catch {}
    try { if (item.keepOnDeath) result.keepOnDeath = true; } catch {}
    return result;
}
function deserializeItem(data) {
    if (!data?.typeId) return undefined;
    try {
        const item = new ItemStack(data.typeId, Math.max(1, Number(data.amount) || 1));
        if (data.nameTag) item.nameTag = data.nameTag;
        if (Array.isArray(data.lore) && data.lore.length) item.setLore(data.lore);
        if (data.keepOnDeath) item.keepOnDeath = true;
        if (Array.isArray(data.enchantments)) {
            const enchantable = item.getComponent("minecraft:enchantable");
            for (const e of data.enchantments) { try { enchantable?.addEnchantment({ type: e.id, level: Number(e.level) }); } catch {} }
        }
        if (Number.isFinite(Number(data.durability))) { const d = item.getComponent("minecraft:durability"); if (d) d.damage = Number(data.durability); }
        return item;
    } catch (error) { logger.exception(`Teamchest-Item konnte nicht rekonstruiert werden: ${data.typeId}`, error); return undefined; }
}
function displayName(item) { return item?.nameTag || item?.typeId?.replace(/^minecraft:/, "") || "Leer"; }
function getTeam(player) { const team = getPlayerTeam(player); return team && getTeams()[team] ? team : null; }
function availableInventoryItems(player) {
    const inv = inventory(player); if (!inv) return [];
    const result = []; for (let slot = 0; slot < inv.size; slot++) { const item = inv.getItem(slot); if (item) result.push({ slot, item }); } return result;
}
async function deposit(player, teamName, slot) {
    const options = availableInventoryItems(player);
    if (!options.length) { player.sendMessage("§cDein Inventar enthält keine Items zum Einlagern."); return; }
    const form = new ModalFormData().title(`§6Team-Doppelchest – Slot ${slot + 1}`).dropdown("Inventar-Slot", options.map(o => `Slot ${o.slot + 1}: ${displayName(o.item)} x${o.item.amount}`), { defaultValueIndex: 0 });
    try {
        const result = await form.show(player); if (result.canceled) return;
        const selected = options[Number(result.formValues?.[0])]; if (!selected) return;
        const inv = inventory(player); const item = inv?.getItem(selected.slot);
        if (!item) { player.sendMessage("§cDas ausgewählte Item ist nicht mehr im Inventar."); return; }
        const storage = loadTeamStorage(teamName);
        if (storage[slot]) { player.sendMessage("§cDieser Teamchest-Slot ist bereits belegt."); return; }
        storage[slot] = serializeItem(item); inv.setItem(selected.slot, undefined);
        if (!saveTeamStorage(teamName, storage)) { inv.setItem(selected.slot, item); storage[slot] = null; return; }
        player.sendMessage(`§a${displayName(item)} x${item.amount} wurde in die Team-Doppelchest gelegt.`);
    } catch (error) { logger.exception(`Teamchest-Einlagerung fehlgeschlagen: ${player.name}`, error); }
}
async function slotMenu(player, teamName, slot) {
    const storage = loadTeamStorage(teamName), stored = deserializeItem(storage[slot]);
    const form = new ActionFormData().title(`§6Team-Doppelchest – Slot ${slot + 1}`);
    if (stored) form.body(`§f${displayName(stored)} x${stored.amount}\n§7Gemeinsamer Team-Speicher.`).button("§aItem herausnehmen").button("§eSlot ersetzen").button("§8Zurück");
    else form.body("§7Dieser Slot ist leer.").button("§aItem einlagern").button("§8Zurück");
    try {
        const result = await form.show(player); if (result.canceled || result.selection === undefined) return;
        if (stored) {
            if (result.selection === 0) {
                const inv = inventory(player); if (!inv) return;
                const leftover = inv.addItem(stored); if (leftover) { player.sendMessage("§cDein Inventar ist voll. Das Item wurde nicht herausgenommen."); return slotMenu(player, teamName, slot); }
                storage[slot] = null; if (!saveTeamStorage(teamName, storage)) { player.sendMessage("§cTeamchest konnte nicht gespeichert werden."); return; }
            } else if (result.selection === 1) await deposit(player, teamName, slot);
            else return openTeamChest(player);
        } else if (result.selection === 0) await deposit(player, teamName, slot);
        else return openTeamChest(player);
        await openTeamChest(player);
    } catch (error) { logger.exception(`Teamchest-Slot-UI fehlgeschlagen: ${player.name}`, error); }
}
async function openTeamChest(player) {
    if (!player?.isValid) return;
    const teamName = getTeam(player); if (!teamName) { player.sendMessage("§cDu bist keinem Team zugeordnet."); return; }
    const storage = loadTeamStorage(teamName);
    const form = new ActionFormData().title(`§6Team-Doppelchest §7[${teamName}]`).body("§7Gemeinsamer 54-Slot-Speicher für alle Mitglieder deines Teams.");
    for (let i = 0; i < SLOT_COUNT; i++) { const item = deserializeItem(storage[i]); form.button(item ? `§fSlot ${i + 1}\n§7${displayName(item)} x${item.amount}` : `§8Slot ${i + 1}\n§7Leer`); }
    try { const result = await form.show(player); if (result.canceled || result.selection === undefined) return; await slotMenu(player, teamName, result.selection); }
    catch (error) { logger.exception(`Teamchest-UI fehlgeschlagen: ${player.name}`, error); }
}
export function registerTeamChestCommand(registry) {
    registry.registerCommand({ name: "siedler:teamchest", description: "Öffnet die gemeinsame Team-Doppelchest.", permissionLevel: CommandPermissionLevel.Any, cheatsRequired: false }, (origin) => {
        const player = origin?.sourceEntity?.typeId === "minecraft:player" ? origin.sourceEntity : undefined; if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => openTeamChest(player)); return { status: CustomCommandStatus.Success };
    });
}

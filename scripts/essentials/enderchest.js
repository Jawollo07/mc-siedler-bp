import { system, CommandPermissionLevel, CustomCommandStatus, ItemStack } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { createLogger } from "../core/logger.js";

const logger = createLogger("Essentials:EnderChest");
const PROPERTY_KEY = "essentials:enderchest";
const SLOT_COUNT = 27;

function getInventory(player) {
    return player.getComponent("minecraft:inventory")?.container;
}

function loadStorage(player) {
    const raw = player.getDynamicProperty(PROPERTY_KEY);
    if (typeof raw !== "string" || !raw) return Array(SLOT_COUNT).fill(null);
    try {
        const data = JSON.parse(raw);
        if (!Array.isArray(data)) return Array(SLOT_COUNT).fill(null);
        return Array.from({ length: SLOT_COUNT }, (_, i) => data[i] ?? null);
    } catch (error) {
        logger.exception(`Enderchest-Daten konnten nicht geladen werden: ${player.name}`, error);
        return Array(SLOT_COUNT).fill(null);
    }
}

function saveStorage(player, storage) {
    try {
        player.setDynamicProperty(PROPERTY_KEY, JSON.stringify(storage));
        return true;
    } catch (error) {
        logger.exception(`Enderchest konnte nicht gespeichert werden: ${player.name}`, error);
        return false;
    }
}

function itemDisplayName(item) {
    if (!item) return "Leer";
    return item.nameTag || item.typeId.replace(/^minecraft:/, "");
}

function serializeItem(item) {
    if (!item) return null;
    const result = { typeId: item.typeId, amount: item.amount };

    try {
        if (item.nameTag) result.nameTag = item.nameTag;
        const lore = item.getLore?.();
        if (lore?.length) result.lore = lore;
    } catch {}

    try {
        const enchantable = item.getComponent("minecraft:enchantable");
        const enchantments = enchantable?.getEnchantments?.();
        if (enchantments?.length) {
            result.enchantments = enchantments.map(e => ({
                id: e.type?.id ?? e.typeId ?? e.id,
                level: e.level
            }));
        }
    } catch (error) {
        logger.debug(`Verzauberungen konnten nicht serialisiert werden: ${item.typeId} (${error}).`);
    }

    try {
        const durability = item.getComponent("minecraft:durability");
        if (durability) result.durability = durability.damage;
    } catch {}

    try {
        if (item.keepOnDeath) result.keepOnDeath = true;
    } catch {}

    return result;
}

function deserializeItem(data) {
    if (!data?.typeId) return undefined;
    try {
        const item = new ItemStack(data.typeId, Math.max(1, Number(data.amount) || 1));
        if (data.nameTag) item.nameTag = data.nameTag;
        if (Array.isArray(data.lore) && data.lore.length) item.setLore(data.lore);
        if (data.keepOnDeath) item.keepOnDeath = true;

        if (Array.isArray(data.enchantments) && data.enchantments.length) {
            const enchantable = item.getComponent("minecraft:enchantable");
            for (const enchantment of data.enchantments) {
                if (!enchantment?.id || !Number.isFinite(Number(enchantment.level))) continue;
                try {
                    enchantable?.addEnchantment({ type: enchantment.id, level: Number(enchantment.level) });
                } catch (error) {
                    logger.debug(`Verzauberung ${enchantment.id} konnte nicht wiederhergestellt werden: ${error}.`);
                }
            }
        }

        if (Number.isFinite(Number(data.durability))) {
            const durability = item.getComponent("minecraft:durability");
            if (durability) durability.damage = Number(data.durability);
        }
        return item;
    } catch (error) {
        logger.exception(`Enderchest-Item konnte nicht rekonstruiert werden: ${data.typeId}`, error);
        return undefined;
    }
}

function inventoryOptions(player) {
    const inventory = getInventory(player);
    if (!inventory) return [];
    const options = [];
    for (let slot = 0; slot < inventory.size; slot++) {
        const item = inventory.getItem(slot);
        if (item) options.push({ slot, item });
    }
    return options;
}

async function openEnderChest(player) {
    if (!player?.isValid) return;
    const storage = loadStorage(player);
    const form = new ActionFormData()
        .title("§5Enderchest")
        .body("§7Persönlicher Speicher – die Items bleiben über Serverneustarts erhalten.");

    for (let i = 0; i < SLOT_COUNT; i++) {
        const item = deserializeItem(storage[i]);
        form.button(item
            ? `§fSlot ${i + 1}\n§7${itemDisplayName(item)} x${item.amount}`
            : `§8Slot ${i + 1}\n§7Leer`);
    }

    try {
        const result = await form.show(player);
        if (result.canceled || result.selection === undefined) return;
        await openSlotMenu(player, result.selection);
    } catch (error) {
        logger.exception(`Enderchest-UI fehlgeschlagen: ${player.name}`, error);
    }
}

async function openSlotMenu(player, slot) {
    const storage = loadStorage(player);
    const stored = deserializeItem(storage[slot]);
    const form = new ActionFormData().title(`§5Enderchest – Slot ${slot + 1}`);

    if (stored) {
        form.body(`§f${itemDisplayName(stored)} x${stored.amount}\n§7Dieser Slot ist belegt.`)
            .button("§aItem herausnehmen")
            .button("§eSlot ersetzen")
            .button("§8Zurück");
    } else {
        form.body("§7Dieser Slot ist leer.")
            .button("§aItem einlagern")
            .button("§8Zurück");
    }

    try {
        const result = await form.show(player);
        if (result.canceled || result.selection === undefined) return;

        if (stored) {
            if (result.selection === 0) {
                const inventory = getInventory(player);
                if (!inventory) return;
                const leftover = inventory.addItem(stored);
                if (leftover) {
                    player.sendMessage("§cDein Inventar ist voll. Das Item wurde nicht herausgenommen.");
                    return openSlotMenu(player, slot);
                }
                storage[slot] = null;
                saveStorage(player, storage);
                player.sendMessage(`§a${itemDisplayName(stored)} wurde aus dem Enderchest genommen.`);
            } else if (result.selection === 1) {
                await depositToSlot(player, slot);
            } else {
                return openEnderChest(player);
            }
        } else if (result.selection === 0) {
            await depositToSlot(player, slot);
        } else {
            return openEnderChest(player);
        }
        await openEnderChest(player);
    } catch (error) {
        logger.exception(`Enderchest-Slot-UI fehlgeschlagen: ${player.name}`, error);
    }
}

async function depositToSlot(player, slot) {
    const options = inventoryOptions(player);
    if (!options.length) {
        player.sendMessage("§cDein Inventar enthält keine Items zum Einlagern.");
        return;
    }

    const form = new ModalFormData()
        .title(`§5Enderchest – Slot ${slot + 1}`)
        .dropdown(
            "Inventar-Slot",
            options.map(({ slot: invSlot, item }) => `Slot ${invSlot + 1}: ${itemDisplayName(item)} x${item.amount}`),
            { defaultValueIndex: 0 }
        );

    try {
        const result = await form.show(player);
        if (result.canceled) return;
        const selected = options[Number(result.formValues?.[0])];
        if (!selected) return;

        const inventory = getInventory(player);
        const item = inventory?.getItem(selected.slot);
        if (!item) {
            player.sendMessage("§cDas ausgewählte Item ist nicht mehr im Inventar.");
            return;
        }

        const storage = loadStorage(player);
        if (storage[slot]) {
            player.sendMessage("§cDieser Enderchest-Slot ist bereits belegt.");
            return;
        }

        const serialized = serializeItem(item);
        storage[slot] = serialized;
        inventory.setItem(selected.slot, undefined);

        if (!saveStorage(player, storage)) {
            inventory.setItem(selected.slot, item);
            storage[slot] = null;
            return;
        }
        player.sendMessage(`§a${itemDisplayName(item)} x${item.amount} eingelagert.`);
    } catch (error) {
        logger.exception(`Item konnte nicht eingelagert werden: ${player.name}`, error);
    }
}

export function registerEnderChestCommand(registry) {
    registry.registerCommand({
        name: "siedler:ec",
        description: "Öffnet deinen persönlichen Enderchest.",
        permissionLevel: CommandPermissionLevel.Any,
        cheatsRequired: false
    }, (origin) => {
        const player = origin?.sourceEntity?.typeId === "minecraft:player" ? origin.sourceEntity : undefined;
        if (!player) return { status: CustomCommandStatus.Failure };
        system.run(() => openEnderChest(player));
        return { status: CustomCommandStatus.Success };
    });
}

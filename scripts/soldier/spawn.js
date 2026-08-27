import { system, world } from "@minecraft/server";
  import { SOLDIER_TYPES, SOLDIER_CONFIG, SOLDIERS } from "./config.js";

/**
 * Spawnt einen Soldaten und registriert ihn für die Script-AI
 * @param {Dimension} dimension
 * @param {Vector3} location
 * @param {string} type - z.B. "infantry"
 * @param {number} level - 1 | 2 | 3
 * @param {Player | null} owner - optionaler Besitzer
 * @returns {Entity | null}
 */
export function spawnSoldier( dimension,location, type = "infantry", level = 1, owner = null) {
  if (!SOLDIER_CONFIG.enabled) return null;
  const typeData = SOLDIER_TYPES[type];
  if (!typeData) {
    console.warn(`[Soldier] Unbekannter Typ: ${type}`);
    return null;
  }

  const levelData = typeData.levels?.[level];
  if (!levelData) {
    console.warn(`[Soldier] Level ${level} existiert nicht für ${type}`);
    return null;
  }

  let entity;
  try {
    // Aktuell Vindicator (gute AI-Basis). Später einfach auf Custom Entity umstellen.
    entity = dimension.spawnEntity("minecraft:vindicator", location, {
      initialPersistence: true
    });
  } catch (e) {
    console.warn(`[Soldier] Spawn fehlgeschlagen: ${e}`);
    return null;
  }

  // === Optik & Identifikation ===
  entity.nameTag = `§e${typeData.displayName} §7Lv. ${level}`;
  entity.addTag("soldier");
  entity.addTag("villager");
  entity.addTag(`soldier_type:${type}`);
  entity.addTag(`soldier_level:${level}`);
  if (owner) {
    entity.addTag(`owner:${owner.name}`);
    entity.setDynamicProperty("soldier:ownerId", owner.id);
  }

  // === Stats speichern ===
  entity.setDynamicProperty("soldier:type", type);
  entity.setDynamicProperty("soldier:level", level);
  entity.setDynamicProperty("soldier:damage", levelData.damage ?? 4);
  entity.setDynamicProperty("soldier:attackRange", levelData.attackRange ?? 1.5);

  // === Equipment setzen ===
  system.runTimeout(() => {
    applyEquipment(entity, levelData.equipment);
  }, 2);

  // === In AI-System registrieren ===
  SOLDIERS.set(entity.id, {
    entity,
    type,
    level,
    ownerId: owner?.id ?? null,
    phase: "idle",                 // idle | follow | attack | retreat
    targetId: null,
    abilities: levelData.abilities ?? [],
    abilityCooldowns: {},          // abilityId → nextUsableTime
    spawnLocation: { ...location },
    createdAt: world.getAbsoluteTime(),
    nextAttack: 0
  });

  return entity;
}

/**
 * Equipment + Verzauberungen setzen (über Commands – am zuverlässigsten)
 */
function applyEquipment(entity, equipment) {
  if (!entity?.isValid || !equipment) return;

  const slotMap = {
    mainhand: "slot.weapon.mainhand",
    offhand:  "slot.weapon.offhand",
    helmet:   "slot.armor.head",
    chestplate: "slot.armor.chest",
    leggings: "slot.armor.legs",
    boots:    "slot.armor.feet"
  };

  for (const [slotName, data] of Object.entries(equipment)) {
    const cmdSlot = slotMap[slotName];
    if (!cmdSlot || !data?.item) continue;

    try {
      entity.runCommand(`replaceitem entity @s ${cmdSlot} ${data.item} ${data.amount ?? 1}`);

      if (Array.isArray(data.enchantments)) {
        for (const ench of data.enchantments) {
          entity.runCommand(`enchant @s ${ench.id} ${ench.level}`);
        }
      }
    } catch (e) {
      // still weiter machen, auch wenn ein Slot fehlschlägt
    }
  }
}
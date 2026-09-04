/**
 * Soldier configuration for Siedler Logic
 */

export const SOLDIER_CONFIG = {
  enabled: true,
  debug: false,
  AI_INTERVAL: 5,
  TARGET_INTERVAL: 10,
  MOVEMENT_INTERVAL: 5,
  SEARCH_RADIUS: 16,
  ATTACK_DISTANCE_PADDING: 0.5,
  DEFAULT_ATTACK_RANGE: 1.5,
  DEFAULT_DAMAGE: 4,
  DEFAULT_SPEED: 0.25,
  STATES: Object.freeze({ IDLE: "idle", ATTACK: "attack", FOLLOW: "follow", MOVE: "move", RETREAT: "retreat" })
};

export const SOLDIERS = new Map(); // entityId → soldierData

export const SOLDIER_TYPES = {
  infantry: {
    id: "soldier:infantry",
    displayName: "Infanterie",
    levels: {
      1: {
        health: 30, attackRange: 0.5, speed: 0.25, damage: 4, knockbackResistance: 0.1, cost: 8, abilities: [],
        equipment: {
          mainhand: { item: "minecraft:iron_sword", amount: 1, enchantments: [{ id: "sharpness", level: 1 }] },
          offhand: { item: "minecraft:shield", amount: 1, enchantments: [] },
          helmet: { item: "minecraft:chainmail_helmet", amount: 1, enchantments: [{ id: "protection", level: 1 }] },
          chestplate: { item: "minecraft:chainmail_chestplate", amount: 1, enchantments: [{ id: "protection", level: 1 }] },
          leggings: { item: "minecraft:chainmail_leggings", amount: 1, enchantments: [] },
          boots: { item: "minecraft:chainmail_boots", amount: 1, enchantments: [{ id: "protection", level: 1 }] }
        }
      },
      2: {
        health: 40, attackRange: 0.6, speed: 0.28, damage: 6, knockbackResistance: 0.2, cost: 18,
        abilities: [
          { id: "battle_cry", name: "Kampfschrei", description: "Erhöht kurzzeitig den Schaden um 30%", cooldown: 25, duration: 8, effect: { type: "damage_boost", value: 1.3 } },
          { id: "shield_bash", name: "Schildstoß", description: "Stoßt Gegner zurück und verursacht leichten Schaden", cooldown: 12, effect: { type: "knockback", strength: 1.8, damage: 2 } }
        ],
        equipment: {
          mainhand: { item: "minecraft:iron_sword", amount: 1, enchantments: [{ id: "sharpness", level: 2 }, { id: "unbreaking", level: 1 }] },
          offhand: { item: "minecraft:shield", amount: 1, enchantments: [{ id: "unbreaking", level: 1 }] },
          helmet: { item: "minecraft:iron_helmet", amount: 1, enchantments: [{ id: "protection", level: 2 }] },
          chestplate: { item: "minecraft:iron_chestplate", amount: 1, enchantments: [{ id: "protection", level: 2 }] },
          leggings: { item: "minecraft:iron_leggings", amount: 1, enchantments: [{ id: "protection", level: 1 }] },
          boots: { item: "minecraft:iron_boots", amount: 1, enchantments: [{ id: "protection", level: 1 }, { id: "feather_falling", level: 1 }] }
        }
      },
      3: {
        health: 55, attackRange: 0.7, speed: 0.32, damage: 8, knockbackResistance: 0.35, cost: 35,
        abilities: [
          { id: "battle_cry", name: "Kampfschrei", description: "Erhöht den Schaden kurzzeitig um 50%", cooldown: 20, duration: 10, effect: { type: "damage_boost", value: 1.5 } },
          { id: "shield_bash", name: "Schildstoß", description: "Starker Rückstoß + Schaden", cooldown: 10, effect: { type: "knockback", strength: 2.4, damage: 4 } },
          { id: "second_wind", name: "Zweiter Wind", description: "Heilt sich selbst um 12 HP", cooldown: 45, effect: { type: "heal", value: 12 } },
          { id: "iron_will", name: "Eiserner Wille", description: "Temporäre Resistenz gegen Schaden und Knockback", cooldown: 50, duration: 6, effect: { type: "resistance", value: 0.4, knockbackResistance: 0.8 } }
        ],
        equipment: {
          mainhand: { item: "minecraft:diamond_sword", amount: 1, enchantments: [{ id: "sharpness", level: 3 }, { id: "unbreaking", level: 2 }, { id: "mending", level: 1 }] },
          offhand: { item: "minecraft:shield", amount: 1, enchantments: [{ id: "unbreaking", level: 2 }, { id: "mending", level: 1 }] },
          helmet: { item: "minecraft:diamond_helmet", amount: 1, enchantments: [{ id: "protection", level: 3 }, { id: "unbreaking", level: 2 }] },
          chestplate: { item: "minecraft:diamond_chestplate", amount: 1, enchantments: [{ id: "protection", level: 3 }, { id: "unbreaking", level: 2 }] },
          leggings: { item: "minecraft:diamond_leggings", amount: 1, enchantments: [{ id: "protection", level: 2 }, { id: "unbreaking", level: 1 }] },
          boots: { item: "minecraft:diamond_boots", amount: 1, enchantments: [{ id: "protection", level: 2 }, { id: "feather_falling", level: 2 }, { id: "unbreaking", level: 1 }] }
        }
      },
      4: {
        health: 65, attackRange: 0.75, speed: 0.34, damage: 10, knockbackResistance: 0.45, cost: 50,
        abilities: [
          { id: "battle_cry", name: "Kampfschrei", description: "Erhöht den Schaden kurzzeitig um 60%", cooldown: 18, duration: 10, effect: { type: "damage_boost", value: 1.6 } },
          { id: "shield_bash", name: "Schildstoß", description: "Starker Rückstoß + Schaden", cooldown: 9, effect: { type: "knockback", strength: 2.7, damage: 5 } },
          { id: "second_wind", name: "Zweiter Wind", description: "Heilt sich selbst um 15 HP", cooldown: 40, effect: { type: "heal", value: 15 } },
          { id: "iron_will", name: "Eiserner Wille", description: "Temporäre Resistenz", cooldown: 45, duration: 7, effect: { type: "resistance", value: 0.45, knockbackResistance: 0.9 } }
        ],
        equipment: {
          mainhand: { item: "minecraft:diamond_sword", amount: 1, enchantments: [{ id: "sharpness", level: 4 }, { id: "unbreaking", level: 3 }, { id: "mending", level: 1 }] },
          offhand: { item: "minecraft:shield", amount: 1, enchantments: [{ id: "unbreaking", level: 3 }, { id: "mending", level: 1 }] },
          helmet: { item: "minecraft:diamond_helmet", amount: 1, enchantments: [{ id: "protection", level: 4 }, { id: "unbreaking", level: 3 }] },
          chestplate: { item: "minecraft:diamond_chestplate", amount: 1, enchantments: [{ id: "protection", level: 4 }, { id: "unbreaking", level: 3 }] },
          leggings: { item: "minecraft:diamond_leggings", amount: 1, enchantments: [{ id: "protection", level: 3 }, { id: "unbreaking", level: 2 }] },
          boots: { item: "minecraft:diamond_boots", amount: 1, enchantments: [{ id: "protection", level: 3 }, { id: "feather_falling", level: 3 }, { id: "unbreaking", level: 2 }] }
        }
      },
      5: {
        health: 75, attackRange: 0.8, speed: 0.36, damage: 12, knockbackResistance: 0.55, cost: 70,
        abilities: [
          { id: "battle_cry", name: "Kampfschrei", description: "Erhöht den Schaden kurzzeitig um 70%", cooldown: 17, duration: 10, effect: { type: "damage_boost", value: 1.7 } },
          { id: "shield_bash", name: "Schildstoß", description: "Sehr starker Rückstoß + Schaden", cooldown: 8, effect: { type: "knockback", strength: 3, damage: 6 } },
          { id: "second_wind", name: "Zweiter Wind", description: "Heilt sich selbst um 18 HP", cooldown: 38, effect: { type: "heal", value: 18 } },
          { id: "iron_will", name: "Eiserner Wille", description: "Starke temporäre Resistenz", cooldown: 42, duration: 8, effect: { type: "resistance", value: 0.5, knockbackResistance: 0.95 } }
        ],
        equipment: {
          mainhand: { item: "minecraft:netherite_sword", amount: 1, enchantments: [{ id: "sharpness", level: 4 }, { id: "unbreaking", level: 3 }, { id: "mending", level: 1 }] },
          offhand: { item: "minecraft:shield", amount: 1, enchantments: [{ id: "unbreaking", level: 3 }, { id: "mending", level: 1 }] },
          helmet: { item: "minecraft:netherite_helmet", amount: 1, enchantments: [{ id: "protection", level: 4 }, { id: "unbreaking", level: 3 }] },
          chestplate: { item: "minecraft:netherite_chestplate", amount: 1, enchantments: [{ id: "protection", level: 4 }, { id: "unbreaking", level: 3 }] },
          leggings: { item: "minecraft:netherite_leggings", amount: 1, enchantments: [{ id: "protection", level: 3 }, { id: "unbreaking", level: 3 }] },
          boots: { item: "minecraft:netherite_boots", amount: 1, enchantments: [{ id: "protection", level: 3 }, { id: "feather_falling", level: 4 }, { id: "unbreaking", level: 3 }] }
        }
      },
      6: {
        health: 85, attackRange: 0.85, speed: 0.38, damage: 14, knockbackResistance: 0.65, cost: 95,
        abilities: [
          { id: "battle_cry", name: "Kriegsschrei", description: "Erhöht den Schaden kurzzeitig um 80%", cooldown: 16, duration: 12, effect: { type: "damage_boost", value: 1.8 } },
          { id: "shield_bash", name: "Schildstoß", description: "Extremer Rückstoß + Schaden", cooldown: 7, effect: { type: "knockback", strength: 3.3, damage: 7 } },
          { id: "second_wind", name: "Zweiter Wind", description: "Heilt sich selbst um 22 HP", cooldown: 35, effect: { type: "heal", value: 22 } },
          { id: "iron_will", name: "Eiserner Wille", description: "Sehr starke temporäre Resistenz", cooldown: 40, duration: 9, effect: { type: "resistance", value: 0.55, knockbackResistance: 1 } }
        ],
        equipment: {
          mainhand: { item: "minecraft:netherite_sword", amount: 1, enchantments: [{ id: "sharpness", level: 5 }, { id: "unbreaking", level: 3 }, { id: "mending", level: 1 }] },
          offhand: { item: "minecraft:shield", amount: 1, enchantments: [{ id: "unbreaking", level: 3 }, { id: "mending", level: 1 }] },
          helmet: { item: "minecraft:netherite_helmet", amount: 1, enchantments: [{ id: "protection", level: 4 }, { id: "unbreaking", level: 3 }, { id: "mending", level: 1 }] },
          chestplate: { item: "minecraft:netherite_chestplate", amount: 1, enchantments: [{ id: "protection", level: 4 }, { id: "unbreaking", level: 3 }, { id: "mending", level: 1 }] },
          leggings: { item: "minecraft:netherite_leggings", amount: 1, enchantments: [{ id: "protection", level: 4 }, { id: "unbreaking", level: 3 }, { id: "mending", level: 1 }] },
          boots: { item: "minecraft:netherite_boots", amount: 1, enchantments: [{ id: "protection", level: 4 }, { id: "feather_falling", level: 4 }, { id: "unbreaking", level: 3 }, { id: "mending", level: 1 }] }
        }
      },
      7: {
        health: 100, attackRange: 0.9, speed: 0.4, damage: 16, knockbackResistance: 0.75, cost: 130,
        abilities: [
          { id: "battle_cry", name: "Marschallsschrei", description: "Erhöht den Schaden kurzzeitig um 100%", cooldown: 15, duration: 12, effect: { type: "damage_boost", value: 2 } },
          { id: "shield_bash", name: "Schildstoß", description: "Maximaler Rückstoß + Schaden", cooldown: 6, effect: { type: "knockback", strength: 3.6, damage: 8 } },
          { id: "second_wind", name: "Zweiter Wind", description: "Heilt sich selbst um 30 HP", cooldown: 30, effect: { type: "heal", value: 30 } },
          { id: "iron_will", name: "Eiserner Wille", description: "Maximale temporäre Resistenz", cooldown: 35, duration: 10, effect: { type: "resistance", value: 0.6, knockbackResistance: 1 } }
        ],
        equipment: {
          mainhand: { item: "minecraft:netherite_sword", amount: 1, enchantments: [{ id: "sharpness", level: 5 }, { id: "unbreaking", level: 3 }, { id: "mending", level: 1 }, { id: "fire_aspect", level: 1 }] },
          offhand: { item: "minecraft:shield", amount: 1, enchantments: [{ id: "unbreaking", level: 3 }, { id: "mending", level: 1 }] },
          helmet: { item: "minecraft:netherite_helmet", amount: 1, enchantments: [{ id: "protection", level: 4 }, { id: "unbreaking", level: 3 }, { id: "mending", level: 1 }, { id: "respiration", level: 3 }] },
          chestplate: { item: "minecraft:netherite_chestplate", amount: 1, enchantments: [{ id: "protection", level: 4 }, { id: "unbreaking", level: 3 }, { id: "mending", level: 1 }] },
          leggings: { item: "minecraft:netherite_leggings", amount: 1, enchantments: [{ id: "protection", level: 4 }, { id: "unbreaking", level: 3 }, { id: "mending", level: 1 }] },
          boots: { item: "minecraft:netherite_boots", amount: 1, enchantments: [{ id: "protection", level: 4 }, { id: "feather_falling", level: 4 }, { id: "unbreaking", level: 3 }, { id: "mending", level: 1 }] }
        }
      }
    }
  }
};

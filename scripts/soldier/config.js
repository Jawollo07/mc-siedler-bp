/**
 * Soldier configuration for Siedler Logic
 */

export const SOLDIER_CONFIG = {
  enabled: true,
  debug: false,
};
export const SOLDIERS = new Map(); // entityId → soldierData
/**
 * Soldier types
 */
export const SOLDIER_TYPES = {
  infantry: {
    id: "soldier:infantry",
    displayName: "Infanterie",

    levels: {
      // ─── Level 1: Rekrut ───────────────────────────────────
      1: {
        health: 30,
        attackRange: 0.5,
        speed: 0.25,
        damage: 4,
        knockbackResistance: 0.1,
        cost: 8, // Emeralds
        abilities: [], // keine Specials
        equipment: {
          mainhand: {
            item: "minecraft:iron_sword",
            amount: 1,
            enchantments: [
              { id: "sharpness", level: 1 }
            ]
          },
          offhand: {
            item: "minecraft:shield",
            amount: 1,
            enchantments: []
          },
          helmet: {
            item: "minecraft:chainmail_helmet",
            amount: 1,
            enchantments: [
              { id: "protection", level: 1 }
            ]
          },
          chestplate: {
            item: "minecraft:chainmail_chestplate",
            amount: 1,
            enchantments: [
              { id: "protection", level: 1 }
            ]
          },
          leggings: {
            item: "minecraft:chainmail_leggings",
            amount: 1,
            enchantments: []
          },
          boots: {
            item: "minecraft:chainmail_boots",
            amount: 1,
            enchantments: [
              { id: "protection", level: 1 }
            ]
          }
        }
      },

      // ─── Level 2: Veteran ──────────────────────────────────
      2: {
        health: 40,
        attackRange: 0.6,
        speed: 0.28,
        damage: 6,
        knockbackResistance: 0.2,
        cost: 18,
        abilities: [
          {
            id: "battle_cry",
            name: "Kampfschrei",
            description: "Erhöht kurzzeitig den Schaden um 30%",
            cooldown: 25, // Sekunden
            duration: 8,
            effect: {
              type: "damage_boost",
              value: 1.3 // 30% mehr Schaden
            }
          },
          {
            id: "shield_bash",
            name: "Schildstoß",
            description: "Stoßt Gegner zurück und verursacht leichten Schaden",
            cooldown: 12,
            effect: {
              type: "knockback",
              strength: 1.8,
              damage: 2
            }
          }
        ],
        equipment: {
          mainhand: {
            item: "minecraft:iron_sword",
            amount: 1,
            enchantments: [
              { id: "sharpness", level: 2 },
              { id: "unbreaking", level: 1 }
            ]
          },
          offhand: {
            item: "minecraft:shield",
            amount: 1,
            enchantments: [
              { id: "unbreaking", level: 1 }
            ]
          },
          helmet: {
            item: "minecraft:iron_helmet",
            amount: 1,
            enchantments: [
              { id: "protection", level: 2 }
            ]
          },
          chestplate: {
            item: "minecraft:iron_chestplate",
            amount: 1,
            enchantments: [
              { id: "protection", level: 2 }
            ]
          },
          leggings: {
            item: "minecraft:iron_leggings",
            amount: 1,
            enchantments: [
              { id: "protection", level: 1 }
            ]
          },
          boots: {
            item: "minecraft:iron_boots",
            amount: 1,
            enchantments: [
              { id: "protection", level: 1 },
              { id: "feather_falling", level: 1 }
            ]
          }
        }
      },

      // ─── Level 3: Elite ────────────────────────────────────
      3: {
        health: 55,
        attackRange: 0.7,
        speed: 0.32,
        damage: 8,
        knockbackResistance: 0.35,
        cost: 35,
        abilities: [
          {
            id: "battle_cry",
            name: "Kampfschrei",
            description: "Erhöht kurzzeitig den Schaden um 50%",
            cooldown: 20,
            duration: 10,
            effect: {
              type: "damage_boost",
              value: 1.5
            }
          },
          {
            id: "shield_bash",
            name: "Schildstoß",
            description: "Starker Rückstoß + Schaden",
            cooldown: 10,
            effect: {
              type: "knockback",
              strength: 2.4,
              damage: 4
            }
          },
          {
            id: "second_wind",
            name: "Zweiter Wind",
            description: "Heilt sich selbst um 12 HP",
            cooldown: 45,
            effect: {
              type: "heal",
              value: 12
            }
          },
          {
            id: "iron_will",
            name: "Eiserner Wille",
            description: "Temporäre Resistenz gegen Schaden und Knockback",
            cooldown: 50,
            duration: 6,
            effect: {
              type: "resistance",
              value: 0.4, // 40% weniger Schaden
              knockbackResistance: 0.8
            }
          }
        ],
        equipment: {
          mainhand: {
            item: "minecraft:diamond_sword",
            amount: 1,
            enchantments: [
              { id: "sharpness", level: 3 },
              { id: "unbreaking", level: 2 },
              { id: "mending", level: 1 }
            ]
          },
          offhand: {
            item: "minecraft:shield",
            amount: 1,
            enchantments: [
              { id: "unbreaking", level: 2 },
              { id: "mending", level: 1 }
            ]
          },
          helmet: {
            item: "minecraft:diamond_helmet",
            amount: 1,
            enchantments: [
              { id: "protection", level: 3 },
              { id: "unbreaking", level: 2 }
            ]
          },
          chestplate: {
            item: "minecraft:diamond_chestplate",
            amount: 1,
            enchantments: [
              { id: "protection", level: 3 },
              { id: "unbreaking", level: 2 }
            ]
          },
          leggings: {
            item: "minecraft:diamond_leggings",
            amount: 1,
            enchantments: [
              { id: "protection", level: 2 },
              { id: "unbreaking", level: 1 }
            ]
          },
          boots: {
            item: "minecraft:diamond_boots",
            amount: 1,
            enchantments: [
              { id: "protection", level: 2 },
              { id: "feather_falling", level: 2 },
              { id: "unbreaking", level: 1 }
            ]
          }
        }
      }
    }
  }
};
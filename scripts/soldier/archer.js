import { SOLDIER_TYPES } from "./config.js";

/**
 * Ranged soldier type.
 * The shared soldier entity is used; the bow and ranged combat values
 * distinguish this type from infantry.
 */
SOLDIER_TYPES.archer = {
    id: "soldier:archer",
    displayName: "Bogenschütze",
    levels: {
        1: {
            health: 24,
            attackRange: 14,
            speed: 0.26,
            damage: 4,
            knockbackResistance: 0.05,
            cost: 10,
            abilities: [],
            equipment: {
                mainhand: { item: "minecraft:bow", amount: 1, enchantments: [] },
                helmet: { item: "minecraft:leather_helmet", amount: 1, enchantments: [] },
                chestplate: { item: "minecraft:leather_chestplate", amount: 1, enchantments: [] },
                leggings: { item: "minecraft:leather_leggings", amount: 1, enchantments: [] },
                boots: { item: "minecraft:leather_boots", amount: 1, enchantments: [] }
            }
        },
        2: {
            health: 32,
            attackRange: 16,
            speed: 0.29,
            damage: 6,
            knockbackResistance: 0.1,
            cost: 22,
            abilities: [
                { id: "focused_shot", name: "Gezielter Schuss", description: "Erhöht den Fernkampfschaden kurzzeitig", cooldown: 25, duration: 8, effect: { type: "damage_boost", value: 1.3 } }
            ],
            equipment: {
                mainhand: { item: "minecraft:bow", amount: 1, enchantments: [{ id: "power", level: 2 }, { id: "unbreaking", level: 1 }] },
                helmet: { item: "minecraft:leather_helmet", amount: 1, enchantments: [{ id: "protection", level: 1 }] },
                chestplate: { item: "minecraft:chainmail_chestplate", amount: 1, enchantments: [{ id: "protection", level: 1 }] },
                leggings: { item: "minecraft:leather_leggings", amount: 1, enchantments: [] },
                boots: { item: "minecraft:leather_boots", amount: 1, enchantments: [] }
            }
        },
        3: {
            health: 42,
            attackRange: 18,
            speed: 0.32,
            damage: 8,
            knockbackResistance: 0.15,
            cost: 40,
            abilities: [
                { id: "focused_shot", name: "Gezielter Schuss", description: "Starker Bonus auf Fernkampfschaden", cooldown: 22, duration: 10, effect: { type: "damage_boost", value: 1.5 } },
                { id: "evasion", name: "Ausweichen", description: "Verbesserte Beweglichkeit im Kampf", cooldown: 35, duration: 6, effect: { type: "speed_boost", value: 1.25 } }
            ],
            equipment: {
                mainhand: { item: "minecraft:bow", amount: 1, enchantments: [{ id: "power", level: 3 }, { id: "punch", level: 1 }, { id: "unbreaking", level: 2 }] },
                helmet: { item: "minecraft:iron_helmet", amount: 1, enchantments: [{ id: "protection", level: 2 }] },
                chestplate: { item: "minecraft:chainmail_chestplate", amount: 1, enchantments: [{ id: "protection", level: 2 }] },
                leggings: { item: "minecraft:chainmail_leggings", amount: 1, enchantments: [{ id: "protection", level: 1 }] },
                boots: { item: "minecraft:iron_boots", amount: 1, enchantments: [{ id: "feather_falling", level: 1 }] }
            }
        },
        4: {
            health: 50,
            attackRange: 19,
            speed: 0.34,
            damage: 10,
            knockbackResistance: 0.2,
            cost: 58,
            abilities: [
                { id: "focused_shot", name: "Gezielter Schuss", description: "Sehr hoher Fernkampfschaden", cooldown: 20, duration: 10, effect: { type: "damage_boost", value: 1.6 } },
                { id: "evasion", name: "Ausweichen", description: "Verbesserte Beweglichkeit", cooldown: 32, duration: 7, effect: { type: "speed_boost", value: 1.3 } }
            ],
            equipment: {
                mainhand: { item: "minecraft:bow", amount: 1, enchantments: [{ id: "power", level: 4 }, { id: "punch", level: 1 }, { id: "unbreaking", level: 3 }] },
                helmet: { item: "minecraft:iron_helmet", amount: 1, enchantments: [{ id: "protection", level: 2 }, { id: "unbreaking", level: 1 }] },
                chestplate: { item: "minecraft:iron_chestplate", amount: 1, enchantments: [{ id: "protection", level: 2 }] },
                leggings: { item: "minecraft:iron_leggings", amount: 1, enchantments: [{ id: "protection", level: 1 }] },
                boots: { item: "minecraft:iron_boots", amount: 1, enchantments: [{ id: "feather_falling", level: 2 }] }
            }
        },
        5: {
            health: 58,
            attackRange: 20,
            speed: 0.36,
            damage: 12,
            knockbackResistance: 0.25,
            cost: 78,
            abilities: [
                { id: "focused_shot", name: "Meisterschuss", description: "Sehr hoher Fernkampfschaden", cooldown: 18, duration: 10, effect: { type: "damage_boost", value: 1.7 } },
                { id: "evasion", name: "Ausweichen", description: "Hohe Beweglichkeit", cooldown: 30, duration: 8, effect: { type: "speed_boost", value: 1.35 } }
            ],
            equipment: {
                mainhand: { item: "minecraft:bow", amount: 1, enchantments: [{ id: "power", level: 5 }, { id: "punch", level: 2 }, { id: "unbreaking", level: 3 }] },
                helmet: { item: "minecraft:diamond_helmet", amount: 1, enchantments: [{ id: "protection", level: 3 }, { id: "unbreaking", level: 2 }] },
                chestplate: { item: "minecraft:diamond_chestplate", amount: 1, enchantments: [{ id: "protection", level: 3 }, { id: "unbreaking", level: 2 }] },
                leggings: { item: "minecraft:iron_leggings", amount: 1, enchantments: [{ id: "protection", level: 2 }, { id: "unbreaking", level: 2 }] },
                boots: { item: "minecraft:diamond_boots", amount: 1, enchantments: [{ id: "protection", level: 2 }, { id: "feather_falling", level: 3 }] }
            }
        },
        6: {
            health: 68,
            attackRange: 21,
            speed: 0.38,
            damage: 14,
            knockbackResistance: 0.3,
            cost: 105,
            abilities: [
                { id: "focused_shot", name: "Meisterschuss", description: "Extremer Fernkampfschaden", cooldown: 17, duration: 12, effect: { type: "damage_boost", value: 1.8 } },
                { id: "evasion", name: "Ausweichen", description: "Sehr hohe Beweglichkeit", cooldown: 28, duration: 9, effect: { type: "speed_boost", value: 1.4 } }
            ],
            equipment: {
                mainhand: { item: "minecraft:bow", amount: 1, enchantments: [{ id: "power", level: 5 }, { id: "punch", level: 2 }, { id: "flame", level: 1 }, { id: "unbreaking", level: 3 }] },
                helmet: { item: "minecraft:diamond_helmet", amount: 1, enchantments: [{ id: "protection", level: 4 }, { id: "unbreaking", level: 3 }] },
                chestplate: { item: "minecraft:diamond_chestplate", amount: 1, enchantments: [{ id: "protection", level: 4 }, { id: "unbreaking", level: 3 }] },
                leggings: { item: "minecraft:diamond_leggings", amount: 1, enchantments: [{ id: "protection", level: 3 }, { id: "unbreaking", level: 2 }] },
                boots: { item: "minecraft:diamond_boots", amount: 1, enchantments: [{ id: "protection", level: 3 }, { id: "feather_falling", level: 4 }] }
            }
        },
        7: {
            health: 78,
            attackRange: 22,
            speed: 0.4,
            damage: 16,
            knockbackResistance: 0.35,
            cost: 140,
            abilities: [
                { id: "focused_shot", name: "Marschallsschuss", description: "Maximaler Fernkampfschaden", cooldown: 15, duration: 12, effect: { type: "damage_boost", value: 2 } },
                { id: "evasion", name: "Ausweichen", description: "Maximale Beweglichkeit", cooldown: 25, duration: 10, effect: { type: "speed_boost", value: 1.45 } }
            ],
            equipment: {
                mainhand: { item: "minecraft:bow", amount: 1, enchantments: [{ id: "power", level: 5 }, { id: "punch", level: 2 }, { id: "flame", level: 1 }, { id: "unbreaking", level: 3 }, { id: "mending", level: 1 }] },
                helmet: { item: "minecraft:diamond_helmet", amount: 1, enchantments: [{ id: "protection", level: 4 }, { id: "unbreaking", level: 3 }, { id: "mending", level: 1 }] },
                chestplate: { item: "minecraft:diamond_chestplate", amount: 1, enchantments: [{ id: "protection", level: 4 }, { id: "unbreaking", level: 3 }, { id: "mending", level: 1 }] },
                leggings: { item: "minecraft:diamond_leggings", amount: 1, enchantments: [{ id: "protection", level: 4 }, { id: "unbreaking", level: 3 }] },
                boots: { item: "minecraft:diamond_boots", amount: 1, enchantments: [{ id: "protection", level: 4 }, { id: "feather_falling", level: 4 }, { id: "unbreaking", level: 3 }] }
            }
        }
    }
};

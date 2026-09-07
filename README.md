# 🏘️ Siedler Logic

> Modulares Minecraft-Bedrock-Behavior-Pack für das Minecraft-Siedler-Projekt.

**Behavior Pack:** https://github.com/Jawollo07/mc-siedler-bp  
**Resource Pack:** https://github.com/Jawollo07/mc-siedler-rp

## 📖 Systeme

- Teams, Diplomatie, Claims und Wirtschaft
- Claim-Protection mit Block-Recovery und Item-Rückgabe
- Zentraler Marktplatz und spezialisierte Händler
- Soldaten mit KI, Leveln, XP, Ausrüstung und Kavallerie
- Bogenschützen mit ballistischer Pfeilphysik
- Essentials und Spieler-Dashboard
- Anti-AFK-System mit Warnung, AFK-Status und Kick

## 🪖 Soldatenhändler

Der Soldatenhändler ist ein `siedler:trader` und verwendet eine eigene `ActionFormData`-Rekrutierungsoberfläche.

Die Interaktion wird über `world.beforeEvents.playerInteractWithEntity` abgefangen. Die normale Vanilla-Interaktion wird beim Soldatenhändler abgebrochen und anschließend die Rekrutierungs-UI geöffnet. Das ist wichtig, weil der Soldatenhändler absichtlich keine Vanilla-`trade_table` benötigt.

Der Händler wird über den Tag `soldier_trader` **oder** über die Variant-ID `6` erkannt. Die Händler-Recovery berücksichtigt diese Variant-ID ebenfalls und wandelt einen bestehenden Soldatenhändler nicht mehr versehentlich in einen Lebensmittelhändler um.

Angeboten werden:

- Infanterie Level 1–3
- Bogenschütze Level 1–3
- Kavallerie Level 1–3
- Emerald-Zahlung aus dem Inventar
- automatische Rückerstattung bei fehlgeschlagenem Soldier-Spawn

## 🐎 Kavallerie

Kavallerie verwendet ein normales erwachsenes `minecraft:horse` und wird über `/ride` auf das Mount gesetzt. Die KI steuert das Mount und verwendet taktische Zustände wie Approach, Charge, Hit und Pass.

## 🏪 Marktplatz

Es gibt einen zentralen Marktplatz mit persistentem Teleportpunkt:

```text
/market_tp_set
/market
```

## 🤝 Diplomatie

Persistente Beziehungen zwischen Teams: Verbündet, Neutral und Feindlich. Das Menü ist über `/diplomacy` für Spieler verfügbar.

## 💤 Anti-AFK

Das Anti-AFK-System erkennt Bewegung, Chat, Interaktionen, Blockänderungen und Kampfaktivität. Es warnt, markiert AFK-Spieler und kann sie automatisch kicken.

## 🧑‍🌾 Händler

Normale spezialisierte Händler verwenden Vanilla-Trade-Tables über Component Groups. Der Soldatenhändler ist davon getrennt und nutzt die eigene Rekrutierungs-UI.

## 💰 Steuern

Die tägliche Steuer wird nur eingezogen, wenn mindestens ein Mitglied des jeweiligen Teams online ist.

## 📦 Installation

| Komponente | Stand |
|---|---|
| Minecraft Bedrock | `1.26.0+` |
| `@minecraft/server` | `2.9.0` |
| `@minecraft/server-ui` | `2.1.0` |
| Entry Point | `scripts/core/main.js` |

Nach Änderungen an Scripts oder Entity-Definitionen muss der Server/die Welt vollständig neu geladen werden.

## 🎮 Wichtige Commands

```text
/diplomacy
/afk
/siedler:stats
/siedler:trader <type>
/siedler:trader_here <type>
/siedler:trader_types
/siedler:trader_remove
/market
/market_tp_set
/siedler:spawn_soldier <type> [level]
```

## 🧩 Architektur

```text
scripts/core/main.js
├── Core
├── Teams
├── Taxes
├── Claims
├── Market
├── Monster
├── Essentials
├── Anti-AFK
└── Soldier
    ├── ai.js
    ├── ranged_ai.js
    ├── cavalry_ai.js
    ├── spawn.js
    ├── config.js
    ├── commands.js
    ├── level.js
    └── trader.js
```

Die detaillierte Planung befindet sich in `plan.md`.

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
- Erweitertes zentralisiertes Logging für alle Behavior-Pack-Module

## 📝 Erweitertes Logging

Das Behavior Pack besitzt ein zentrales Logging-System unter `scripts/core/logger.js`. Es verbessert die normalen Bedrock-Console-Ausgaben und ermöglicht zusätzlich modulbezogene Logger.

Unterstützte Ausgaben:

- `console.log()` → `INFO`
- `console.info()` → `INFO`
- `console.warn()` → `WARN`
- `console.error()` → `ERROR`
- `console.debug()` → `DEBUG`

Die Ausgaben erhalten einen einheitlichen Prefix mit Siedler-Version und Log-Level. Das Standard-Level ist `info`. Debug-Ausgaben können über `globalThis.SIEDLER_LOG_LEVEL = "debug"` aktiviert werden.

### WARN-Rate-Limiting

Wiederholte identische `WARN`-Meldungen werden automatisch gebremst. Standardmäßig wird dieselbe Warnung höchstens einmal innerhalb von **10 Sekunden** ausgegeben. Während der Sperrzeit unterdrückte Wiederholungen werden beim nächsten erlaubten Auftreten als Anzahl zusammengefasst.

Das Verhalten gilt sowohl für `createLogger(...).warn()` als auch für bestehende `console.warn()`-Aufrufe über die Console-Bridge.

Optional kann das Intervall vor dem Laden des Packs angepasst werden:

```js
globalThis.SIEDLER_WARN_RATE_LIMIT_MS = 5000;
```

Mit `0` wird das Rate-Limiting deaktiviert. Laufzeitseitig kann es über `setWarnRateLimit(milliseconds)` geändert werden.

Modulbezogene Logger sind inzwischen auch für die Kernbereiche **Claims, Market, Taxes und Monster** aktiv. Beispiele sind `[Claims]`, `[Market]`, `[Market:Commands]`, `[Taxes]` und `[Monster]`. Häufige Diagnoseinformationen werden bevorzugt als `DEBUG` geloggt; Fehler verwenden `exception()` und erscheinen als `ERROR`.

Weitere bereits migrierte Bereiche sind Soldier-Start/Spawn, Soldatenhändler, Anti-AFK und Diplomatie. Neue Module können `createLogger("Modulname")` verwenden.

## 🪖 Soldatenverwaltung

Der Soldatenstab öffnet eine zentrale Verwaltungsoberfläche für eigene Soldaten. Einzelne Soldaten können ausgewählt und direkt gesteuert werden. Zusätzlich gibt es eine Mehrfachauswahl, Gruppenverwaltung und Formationen.

Die Mehrfachauswahl und die Mitgliederverwaltung verwenden `ModalFormData.toggle()` mit den aktuellen `ModalFormDataToggleOptions` und `defaultValue`.

## 🪖 Soldatenhändler

Der Soldatenhändler ist ein `siedler:trader` und verwendet eine eigene `ActionFormData`-Rekrutierungsoberfläche. Die Interaktion wird über `world.beforeEvents.playerInteractWithEntity` abgefangen.

## 🐎 Kavallerie

Kavallerie verwendet ein normales erwachsenes `minecraft:horse` und wird über `/ride` auf das Mount gesetzt. Die KI verwendet taktische Zustände wie Approach, Charge, Hit und Pass.

## 🏪 Marktplatz

Es gibt einen zentralen Marktplatz mit persistentem Teleportpunkt:

```text
/market_tp_set
/market
```

Der Marktplatz blockiert Blockabbau und Platzierung und entfernt feindliche Monster aus dem Schutzbereich.

## 🤝 Diplomatie

Persistente Beziehungen zwischen Teams: Verbündet, Neutral und Feindlich. Das Menü ist über `/diplomacy` für Spieler verfügbar.

## 💤 Anti-AFK

Das Anti-AFK-System erkennt Bewegung, Chat, Interaktionen, Blockänderungen und Kampfaktivität. Es warnt, markiert AFK-Spieler und kann sie automatisch kicken.

## 💰 Steuern

Die tägliche Steuer wird nur eingezogen, wenn mindestens ein Mitglied des jeweiligen Teams online ist. Die Steuer-Einlagerung verwendet einen eigenen `[Taxes]` Logger.

## 🛡️ Claims

Claims schützen die Team-Gebiete vor unerlaubtem Bauen, Abbauen und Interaktionen. Block-Recovery und Item-Rückgabe sind aktiviert. Claim-Verwaltung und Fehlerdiagnose verwenden einen eigenen `[Claims]` Logger.

## 👹 Monster

Das Monster-System verwaltet Spawn-Filtering, Claims, Pillager, Outposts und die permanente Weakness für Spieler. Konfigurations- und Spawnfehler werden über den `[Monster]` Logger erfasst.

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
├── logger.js
├── dynamic_properties.js
├── Teams
├── Taxes [Logger]
├── Claims [Logger]
├── Market [Logger]
├── Monster [Logger]
├── Essentials
├── Anti-AFK
└── Soldier
    ├── ai.js
    ├── ranged_ai.js
    ├── cavalry_ai.js
    ├── spawn.js
    ├── config.js
    ├── commands.js
    ├── command_manager.js
    ├── groups.js
    ├── ui.js
    ├── level.js
    └── trader.js
```

Die detaillierte Planung befindet sich in `plan.md`.

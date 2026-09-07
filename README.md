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
- Native Chat-Verarbeitung ohne externe ChatSend-API-Abhängigkeit

## 💬 Chat-System

Das Chat-System verwendet die native Bedrock Script API. Eine externe `ChatSend-API` oder ein separates Chat-Plugin wird nicht benötigt.

### Native Chat-Unterstützung

Wenn `world.beforeEvents.chatSend` verfügbar ist, übernimmt Siedler Logic:

- `@team Nachricht` als privaten Team-Chat
- öffentliche Chat-Nachrichten mit Team-Kontext
- zentrale Chat-Logs über `[Essentials:Chat]`
- eigene Formatierung des öffentlichen Chats

Die native Chat-Schnittstelle kann je nach Server-/API-Build fehlen oder als Pre-Release-Funktion eingeschränkt sein. Deshalb besitzt Siedler Logic einen sicheren Fallback.

### Fallback ohne Before-Chat-API

Wenn die native Before-Chat-API nicht vorhanden ist, bleibt der normale Vanilla-Chat unangetastet. Der Team-Chat kann dann über folgende Befehle verwendet werden:

```text
/siedler:teamchat "Nachricht an mein Team"
/siedler:tc "Nachricht an mein Team"
```

Falls `world.afterEvents.chatSend` verfügbar ist, wird der öffentliche Chat weiterhin automatisch über `[Essentials:Chat]` geloggt. Der After-Event wird bewusst nicht verwendet, um `@team` nachträglich zu verstecken, da die Nachricht zu diesem Zeitpunkt bereits gesendet wurde.

Damit gibt es keinen harten Ausfall des Team-Chats, wenn die native Before-Chat-API auf einem bestimmten Bedrock-Server nicht verfügbar ist.

## 📝 Logging

Das zentrale Logging-System liegt unter `scripts/core/logger.js`. Neben der globalen Console-Bridge können Module eigene Logger mit `createLogger("Modulname")` verwenden.

Unterstützte Level:

- `DEBUG` – häufige Diagnose- und Tick-Informationen
- `INFO` – wichtige Zustandsänderungen und Startmeldungen
- `WARN` – behebbare Probleme und API-/Konfigurationswarnungen
- `ERROR` – Fehler und Exceptions

Wichtige Logger-Bereiche sind aktuell:

- `[Claims]` / `[Claims:Protection]`
- `[Market]` / `[Market:Commands]` / `[Market:Trader]`
- `[Taxes]`
- `[Monster]`
- `[Teams]` / `[Teams:Chat]` / `[Diplomacy]`
- `[Essentials]` / `[Essentials:Storage]` / `[Essentials:Players]` / `[Essentials:Teleport]` / `[Essentials:Messaging]` / `[Essentials:Admin]` / `[Essentials:Start]` / `[Essentials:Chat]`
- `[Soldier]` / `[Soldier:Spawn]` / `[Soldier:Trader]` / `[Soldier:Level]`
- `[Anti-AFK]`

### WARN-Rate-Limiting

Wiederholte identische `WARN`-Meldungen werden automatisch gebremst. Standardmäßig wird dieselbe Warnung höchstens einmal innerhalb von **10 Sekunden** ausgegeben. Unterdrückte Wiederholungen werden beim nächsten erlaubten Auftreten zusammengefasst.

Das gilt für `logger.warn()` und für bestehende `console.warn()`-Aufrufe über die Console-Bridge. Das Intervall kann vor dem Laden des Packs angepasst werden:

```js
globalThis.SIEDLER_WARN_RATE_LIMIT_MS = 5000;
```

Mit `0` wird das Rate-Limiting deaktiviert. Laufzeitseitig steht `setWarnRateLimit(milliseconds)` zur Verfügung.

Neue Untermodule sollen möglichst einen eigenen Scoped Logger verwenden und Tick-/Event-Diagnose auf `DEBUG` halten, damit die Serverkonsole nicht unnötig belastet wird.

## 🧰 Essentials

Das Essentials-System ist modular aufgebaut. `scripts/essentials/index.js` dient nur noch als Einstiegspunkt und verdrahtet die einzelnen Bereiche:

- `state.js` – Homes, Todespunkte, TPA-Anfragen, Reply-Ziele sowie God-/Fly-Zustände
- `storage.js` – Laden und Speichern der Dynamic Properties inklusive Validierung
- `players.js` – sichere Spielerauflösung per ID, exaktem Namen oder eindeutigem Prefix
- `teleport.js` – `/siedler:spawn`, Homes, `/siedler:back` und TPA/TPAHere
- `messaging.js` – `/siedler:msg` und `/siedler:reply`
- `admin.js` – Heal, Feed, God, Fly, Kill, Clear sowie Zeit-/Wetterbefehle
- `start.js` – Startsystem
- `player_stats.js` – Spieler-Dashboard und Statistiken
- `../teams/chat.js` – native Public-/Team-Chat-Anbindung, Fallback und Chat-Logging

Die Essentials-Module besitzen jeweils eigene Scoped Logs. Dadurch lassen sich beispielsweise Home-, TPA-, Speicher- und Admin-Probleme getrennt analysieren, ohne die komplette Serverkonsole durchsuchen zu müssen.

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

Claims schützen die Team-Gebiete vor unerlaubtem Bauen, Abbauen und Interaktionen. Block-Recovery und Item-Rückgabe sind aktiviert. Claim-Verwaltung und Schutzereignisse verwenden eigene `[Claims]`-Logger.

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
/siedler:spawn
/siedler:sethome
/siedler:home
/siedler:delhome
/siedler:tpa <spieler>
/siedler:tpahere <spieler>
/siedler:tpaccept
/siedler:tpdeny
/siedler:msg <spieler> <nachricht>
/siedler:reply <nachricht>
/siedler:back
/siedler:teamchat "<nachricht>"
/siedler:tc "<nachricht>"
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
│   ├── index.js [Logger]
│   ├── chat.js [Native Chat Adapter + Fallback + Logger]
│   └── relations.js [Logger]
├── Taxes [Logger]
├── Claims
│   ├── index.js [Logger]
│   └── protection.js [Logger]
├── Market
│   ├── market_place.js [Logger]
│   ├── commands.js [Logger]
│   └── trader_commands.js [Logger]
├── Monster [Logger]
├── Essentials
│   ├── index.js [Orchestrator]
│   ├── state.js
│   ├── storage.js [Logger]
│   ├── players.js [Logger]
│   ├── teleport.js [Logger]
│   ├── messaging.js [Logger]
│   ├── admin.js [Logger]
│   ├── start.js [Logger]
│   └── player_stats.js
├── Anti-AFK [Logger]
└── Soldier
    ├── ai.js
    ├── ranged_ai.js
    ├── cavalry_ai.js
    ├── spawn.js [Logger]
    ├── config.js
    ├── commands.js
    ├── command_manager.js
    ├── groups.js
    ├── ui.js
    ├── level.js [Logger]
    └── trader.js [Logger]
```

Die detaillierte Planung befindet sich in `plan.md`.

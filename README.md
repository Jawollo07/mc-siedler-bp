# 🏘️ Siedler Logic

> Modulares Minecraft-Bedrock-Behavior-Pack für das Minecraft-Siedler-Projekt.

**Behavior Pack:** https://github.com/Jawollo07/mc-siedler-bp  
**Resource Pack:** https://github.com/Jawollo07/mc-siedler-rp

## 📖 Systeme

- Teams, Diplomatie, Claims und Wirtschaft
- Claim-Protection mit Block-Recovery und Item-Rückgabe
- Zentraler Marktplatz und spezialisierte Händler
- **Verzauberungshändler-Villager mit vollständigem Pool aller definierten Angebote**
- Soldaten mit KI, Leveln, XP, Ausrüstung und Kavallerie
- Bogenschützen mit ballistischer Pfeilphysik
- Essentials und Spieler-Dashboard
- Detaillierter Villager-Todeslogger mit Todesursache, Verursacher und Claim-Team
- Anti-AFK-System mit Warnung, AFK-Status und Kick
- Erweitertes zentralisiertes Logging für alle Behavior-Pack-Module
- Native Chat-Verarbeitung ohne externe ChatSend-API-Abhängigkeit

## 🛒 Händler

Das Händler-System verwendet die Entity `siedler:trader` und bietet mehrere spezialisierte Händlerrollen. Der **Verzauberungshändler** verwendet die bestehende Villager-Darstellung des Siedler-Händlers und öffnet beim Interagieren das normale Bedrock-Handelsfenster.

### Verzauberungshändler

Der Typ `enchantments` ist über die bestehenden Trader-Commands verfügbar:

```text
/siedler:trader enchantments
/siedler:trader_here enchantments
```

Der Händler stellt **alle 17 aktuell definierten Angebote des Trade-Pools gleichzeitig** zur Verfügung. Es werden also nicht mehr nur einige Angebote zufällig aus dem Pool ausgewählt. Damit sind sämtliche Preis- und Verzauberungsstufen des Pools im Handelsfenster verfügbar.

Die Verzauberungen werden über die Bedrock-Trade-Table-Funktion `enchant_book_for_trading` erzeugt. Dadurch werden die konkreten Verzauberungen und Stufen von der Handelslogik bestimmt, statt für jedes Buch eine feste Verzauberung einzuprogrammieren.

Der Händler besitzt die Variant-ID `7` und den Tag `trader_enchantments`. Dadurch kann die bestehende Händler-Recovery ihn erkennen und nicht versehentlich wieder zum Lebensmittelhändler machen.

### Händler-Spawn-Kompatibilität

Die Initialisierung nutzt `world.afterEvents.entitySpawn` nur dann, wenn das Event in der aktuell laufenden Bedrock Script API tatsächlich vorhanden ist. Fehlt `entitySpawn`, wird kein `.subscribe()` auf `undefined` ausgeführt. Stattdessen übernimmt die vorhandene periodische Händler-Recovery die Initialisierung neu gespawnter bzw. noch nicht typisierter Händler.

Damit führt eine nicht verfügbare `entitySpawn`-API nicht mehr zum Fehler `TypeError: cannot read property 'subscribe' of undefined` und stoppt nicht mehr die weitere Initialisierung des Händler-Moduls.

## 📝 Logging

Das zentrale Logging-System liegt unter `scripts/core/logger.js`. Neben der globalen Console-Bridge können Module eigene Logger mit `createLogger("Modulname")` verwenden.

Unterstützte Level:

- `DEBUG` – häufige Diagnose- und Tick-Informationen
- `INFO` – wichtige Zustandsänderungen und Startmeldungen
- `WARN` – behebbare Probleme und API-/Konfigurationswarnungen
- `ERROR` – Fehler und Exceptions

### 🧑‍🌾 Villager-Todeslogger

Das Essentials-Modul `scripts/essentials/villager_death_logger.js` überwacht `world.afterEvents.entityDie` und erfasst Vanilla-Villager (`minecraft:villager` und `minecraft:villager_v2`). Für jeden Tod werden möglichst viele direkt aus dem Death-Event verfügbare Informationen protokolliert:

- Villager-Name/NameTag
- Entity-Typ
- Entity-ID
- exakte Position (auf Ganzzahl-Koordinaten gerundet)
- Dimension
- **aktueller Claim und das dem Claim zugeordnete Team**
- Todesursache aus `damageSource.cause`
- verursachende Entity inklusive Typ, NameTag und ID, sofern vorhanden
- verursachendes Projektil inklusive Typ, NameTag und ID, sofern vorhanden

Das Team wird dabei **direkt über den Claim an der Todesposition** (`getClaimAt(villager.location)`) ermittelt. Dadurch wird nicht irgendein Besitzer des Villagers verwendet, sondern das Team, dessen Claim den aktuellen Standort des Villagers abdeckt. Befindet sich der Villager außerhalb eines Claims, wird `Kein Claim` protokolliert.

Beispiel:

```text
[Siedler Logic 2.x.x] [WARN] [Essentials:VillagerDeath] Villager-Tod erkannt | Name: <kein NameTag> | Typ: minecraft:villager | ID: ... | Position: 120, 64, -35 | Dimension: overworld | Aktueller Claim / Team: Rot | Todesursache: entity_attack | Verursacher: Zombie [minecraft:zombie] (ID: ...) | Projektile: keiner
```

Der Logger verwendet bewusst `WARN`, damit Villager-Tode auch beim normalen `INFO`-Log-Level in der Serverkonsole sichtbar sind. Wiederholte identische Warnungen werden durch das zentrale WARN-Rate-Limiting des Loggers gebremst.

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
- `villager_death_logger.js` – detaillierte Protokollierung von Villager-Toden inklusive Claim-Team
- `../teams/chat.js` – native Public-/Team-Chat-Anbindung, Fallback und Chat-Logging

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
│   └── trader_commands.js [Logger + Enchantment Trader + API-Guard]
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
│   ├── player_stats.js
│   └── villager_death_logger.js [Detailed Death Logger + Claim-Team]
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

trading/
└── siedler_trader_enchantments.json [17/17 Pool-Angebote gleichzeitig verfügbar]
```

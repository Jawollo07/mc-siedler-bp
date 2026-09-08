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
- **Beschleunigte Soldier-Bewegung mit Terrain-Unterstützung für Blöcke und Stufen**
- **Erweiterte lokale A*-Wegfindung mit Höhenwechseln, Umwegen und Stuck-Recovery**
- **Automatische Zielsuche für normale passive/neutral Tiere**
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

### Händler-Spawn- und Command-Kompatibilität

Die optionale `world.afterEvents.entitySpawn`-Initialisierung wird nur verwendet, wenn das Event tatsächlich verfügbar ist. Fehlt das Event, übernimmt die periodische Händler-Recovery die Initialisierung.

Die Custom Commands werden korrekt über **`system.beforeEvents.startup`** registriert. `startup` gehört zur `system`-API und darf nicht über `world.beforeEvents` registriert werden. Dadurch starten Händler- und Anti-AFK-Commands mit der aktuellen Bedrock Script API ohne den entsprechenden `subscribe`-Fehler.

### Händler-Commands

```text
/siedler:trader <type>
/siedler:trader_here <type>
/siedler:trader_types
/siedler:trader_remove
```

Verfügbare Typen:

```text
food
building
resources
tools
weapons
supplies
soldiers
enchantments
```

## 🛡️ Anti-AFK

Das Anti-AFK-System liegt unter `scripts/antiafk/` und erkennt Inaktivität über Bewegung sowie relevante Spieleraktionen. Es unterstützt Warnungen, AFK-Markierung, automatische Kicks und manuelle AFK-Steuerung.

Die Custom Commands werden über **`system.beforeEvents.startup`** registriert. Optional fehlende After-/Before-Events werden mit optional chaining abgesichert, damit eine versionsabhängige API nicht mehr den zentralen Loader zum Absturz bringt.

Verfügbare Commands:

```text
/siedler:afk
/siedler:afk_status
/siedler:afk_on
/siedler:afk_off
/siedler:afk_kick_on
/siedler:afk_kick_off
/siedler:afk_kick_time <minuten>
/siedler:afk_reset
```

## ⚔️ Soldier-System

Das Soldier-System befindet sich unter `scripts/soldier/` und unterstützt Infanterie, Bogenschützen und Kavallerie mit Owner-Zuordnung, Leveln, XP, Ausrüstung, KI, Befehlen und Gruppenformationen.

### Persistenz nach Neustarts

Die Soldaten selbst bleiben als Minecraft-Entities erhalten. Die interne JavaScript-Map `SOLDIERS` ist dagegen nur zur Laufzeit vorhanden. `scripts/soldier/registry.js` baut diese Registry nach jedem Serverstart aus den tatsächlich vorhandenen Soldier-Entities und deren Dynamic Properties (`soldier:ownerId`, `soldier:type`, `soldier:level`) wieder auf. Nicht mehr vorhandene Soldaten werden aus der Registry entfernt. Dadurch zeigt der Soldatenstab nach einem Neustart nur die **tatsächlich aktuell vorhandenen eigenen Soldaten** an.

### Bewegung über Gelände

Die Soldier-KI verwendet weiterhin reaktionsschnelle Impulse für Formation und Kampf. `scripts/soldier/terrain_movement.js` ergänzt diese Bewegung um eine Terrain-Schicht:

- höhere Grundgeschwindigkeit und zusätzlicher Vorwärtsimpuls während der Bewegung
- Geschwindigkeitsbonus abhängig vom Soldier-Level
- zusätzlicher Geschwindigkeitsbonus für Kavallerie
- Erkennung eines soliden Blocks direkt vor dem Soldier
- kurzer Sprungimpuls, wenn oberhalb des Hindernisses ausreichend Platz vorhanden ist
- A*-Wegpunkte können einen gezielten Sprung über einen Höhenwechsel anfordern
- dadurch Überwinden von **ein Block hohen Hindernissen und Stufen/Treppen**, während die normale Gravitation das Landen übernimmt

### Erweiterte echte Wegfindung

`scripts/soldier/pathfinding.js` ergänzt die Impulsbewegung um eine **erweiterte lokale A*-Wegfindung**. Der Pathfinder baut aus der Blockwelt ein begehbares Voxel-Raster und sucht darin einen kostengünstigen Weg zum Ziel. Der Suchraum bleibt lokal begrenzt, damit auch größere Soldier-Gruppen keine globalen Suchläufe auslösen.

Die Wegfindung berücksichtigt:

- freie Blöcke für Füße und Kopf
- festen Untergrund
- **Aufwärts-Schritte bis eine Blockhöhe**
- **Abwärts-Schritte bis zwei Blockhöhen**, sofern eine sichere Landefläche vorhanden ist
- Treppen, Slabs und andere begehbare Formen soweit sie über die verfügbare Blockinformation als begehbar erkannt werden
- offene Türen/Trapdoors über deren Blockzustand; unbekannte/geschlossene Zustände werden sicherheitshalber blockiert
- diagonale Bewegung **ohne diagonales Durchschneiden von Blockecken**
- Terrain-Kosten für ungünstige bzw. bevorzugte Bodenarten
- lokale Umwege um Wände und Hindernisse
- regelmäßiges Repathing bei Ziel-/Umgebungsänderungen
- **Stuck-Erkennung und beschleunigtes Repathing**, wenn ein Soldier trotz gültigem Weg nicht vorankommt
- direkte Route als Fast-Path, bevor unnötig A* gesucht wird
- Begrenzung auf maximal 1200 untersuchte Knoten und 64 Wegpunkte pro lokalen Suchlauf

Die A*-Wegfindung ersetzt die bestehende Kampf-KI nicht. Sie liefert die nächste sinnvolle Bewegungsposition an die vorhandene Beschleunigungs-, Formations- und Terrain-Bewegung. Dadurch bleiben Befehle wie `move`, `follow`, `attack`, `defend` und `patrol` kompatibel, sofern die jeweilige KI einen Bewegungsbefehl bzw. ein Ziel setzt.

### Tier-Zielsuche

`scripts/soldier/animal_targeting.js` ergänzt die autonome Zielsuche um eine **explizite Whitelist normaler passiver und neutraler Tiere**. Wenn ein eigener Soldier kein aktuelles Ziel und keinen manuellen Befehl hat, kann er in Reichweite Tiere wie Kühe, Schweine, Schafe, Hühner, Pferde, Ziegen, Wölfe, Katzen, Bienen, Frösche und weitere definierte Vanilla-Tiere als Ziel auswählen.

Bewusst nicht über diese Tier-Zielsuche erfasst werden Spieler, Villager, Händler oder beliebige andere NPCs. Soldier-Mounts mit dem Tag `soldier_mount` werden ebenfalls ignoriert, damit Kavallerie nicht das eigene Reittier als Ziel auswählt. Das bestehende Team-/Feindverhalten für Spieler und andere Soldiers bleibt davon getrennt.

### Soldier-Commands

```text
/siedler:spawn_soldier <Type> [Level]
/siedler:soldier_tool
/siedler:soldier_info
/siedler:soldier_xp <Amount>
/siedler:soldier_tp
```

`/siedler:soldier_tp` teleportiert **alle eigenen, aktuell registrierten Soldaten** zum ausführenden Spieler. Die Soldaten werden dabei in einer kleinen Formation um den Spieler verteilt, damit sie nicht auf derselben Position übereinander spawnen. Bei Kavallerie wird das zugehörige Pferd ebenfalls mit teleportiert.

Der Teleport berücksichtigt die `ownerId`-Zuordnung und kann daher keine fremden Soldaten teleportieren. Die Einheiten können dabei auch aus einer anderen Dimension zum Spieler geholt werden.

### Bewegungs- und Kampf-Commands

```text
/siedler:move <Target>
/siedler:follow
/siedler:stay
/siedler:attack [Radius]
/siedler:defend [Radius]
/siedler:patrol <Target>
/siedler:stop
```

### Gruppen-Commands

```text
/siedler:group_create <Name> [Radius]
/siedler:group_add <Group>
/siedler:group_remove <Group>
/siedler:group_delete <Group>
/siedler:group_move <Group> <Target>
/siedler:group_follow <Group>
/siedler:group_stay <Group>
/siedler:group_defend <Group> <Target> [Radius]
/siedler:group_stop <Group>
/siedler:group_formation <Group> <Formation> [Spacing]
/siedler:group_list
```

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

## 🧰 Essentials

Das Essentials-System ist modular aufgebaut. `scripts/essentials/index.js` dient als Einstiegspunkt und verdrahtet die einzelnen Bereiche.

## 🧩 Architektur

```text
scripts/core/main.js
├── logger.js
├── dynamic_properties.js
├── Teams
├── Taxes
├── Claims
├── Market
│   ├── market_place.js
│   ├── commands.js
│   └── trader_commands.js [API-Guards + system.beforeEvents.startup]
├── Monster
├── Essentials
├── Anti-AFK [system.beforeEvents.startup + Event-Guards]
└── Soldier
    ├── commands.js [inkl. /siedler:soldier_tp]
    ├── registry.js [persistente Entity-Erkennung nach Neustart]
    ├── animal_targeting.js [passive/neutral Tier-Zielsuche]
    ├── pathfinding.js [erweiterte lokale A*-Wegfindung + Stuck-Recovery]
    ├── terrain_movement.js [Speed + Block/Stufen-Überwindung + A*-Sprunghinweise]
    ├── groups.js
    ├── command_manager.js
    └── KI / Nahkampf / Fernkampf / Kavallerie

trading/
└── siedler_trader_enchantments.json [17/17 Pool-Angebote gleichzeitig verfügbar]
```
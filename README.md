# 🏘️ Siedler Logic

> Modulares Minecraft-Bedrock-Behavior-Pack für das Minecraft-Siedler-Projekt.

**Behavior Pack:** https://github.com/Jawollo07/mc-siedler-bp  
**Resource Pack:** https://github.com/Jawollo07/mc-siedler-rp

## 📖 Systeme

- Teams, Diplomatie, Claims und Wirtschaft
- Claim-Protection mit Block-Recovery und Item-Rückgabe
- Zentraler Marktplatz und spezialisierte Händler
- **Automatischer Marktbestand: fehlende Händler werden selbstständig nachgespawnt**
- **Händler bleiben dauerhaft innerhalb des konfigurierten Marktplatzes**
- **Verzauberungshändler-Villager mit vollständigem Pool aller definierten Angebote**
- Soldaten mit KI, Leveln, XP, Ausrüstung und Kavallerie
- **Beschleunigte Soldier-Bewegung mit Terrain-Unterstützung für Blöcke und Stufen**
- **Erweiterte lokale A*-Wegfindung mit Höhenwechseln, Umwegen und Stuck-Recovery**
- **Automatische Zielsuche für nahe feindliche Monster**
- Bogenschützen mit ballistischer Pfeilphysik
- Essentials und Spieler-Dashboard
- Detaillierter Villager-Todeslogger mit Todesursache, Verursacher und Claim-Team
- Anti-AFK-System mit Warnung, AFK-Status und Kick
- Erweitertes zentralisiertes Logging für alle Behavior-Pack-Module
- Native Chat-Verarbeitung ohne externe ChatSend-API-Abhängigkeit
- **Pillager-Squads mit Claim-sicherem Spawn und spielerabhängiger Belagerungslogik**

## 🛒 Händler

Das Händler-System verwendet die Entity `siedler:trader` und bietet mehrere spezialisierte Händlerrollen. Der **Verzauberungshändler** verwendet die bestehende Villager-Darstellung des Siedler-Händlers und öffnet beim Interagieren das normale Bedrock-Handelsfenster.

### Automatischer Händlerbestand

Der zentrale Marktplatz hält den Händlerbestand jetzt **automatisch aufrecht**. Für jeden aktuell definierten Händlertyp wird standardmäßig mindestens **ein Händler** am Marktplatz gehalten:

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

Die Spawnposition liegt im konfigurierten `traderSpawn`-Bereich des Marktplatzes. Die Händler werden leicht verteilt gespawnt, damit nicht alle exakt im selben Block stehen. Die Wartung läuft beim Serverstart nach kurzer Verzögerung und anschließend alle 10 Sekunden.

Wird ein Händler getötet, entfernt oder läuft er aus dem definierten Marktplatzbereich, erkennt die Wartung den fehlenden Bestand und erstellt automatisch einen Ersatz. Bereits vorhandene Händler werden dabei **nicht bei jedem Prüflauf dupliziert**.

### Händler bleiben auf dem Marktplatz

Händler mit einer konfigurierten Händlerrolle werden zusätzlich **jede Sekunde auf ihre Marktzugehörigkeit geprüft**. Sollte die normale Villager-KI einen Händler aus dem Markt herauslaufen lassen, wird er automatisch zur konfigurierten `traderSpawn`-Position des nächstgelegenen Marktes in seiner Dimension zurückteleportiert und dabei abgebremst.

Dadurch bleiben auch Händler, die durch Vanilla-Navigation, Interaktionen oder andere Bewegungsursachen aus dem Bereich gelangen, innerhalb des Marktplatzes. Die automatische Bestandsprüfung zählt die Händler erst innerhalb des Marktes, sodass ein weggelaufener Händler nicht gleichzeitig einen unnötigen Ersatz-Händler erzeugt.

Der `/siedler:trader`- und `/siedler:trader_here`-Command akzeptiert Händler-Spawns außerdem nur noch **innerhalb eines konfigurierten Marktplatzes**.

Die gewünschte Anzahl pro Typ kann direkt am Markt über `traderCountPerType` angepasst werden. Aktuell ist sie auf `1` gesetzt.

Die automatische Wartung ergänzt die bestehende `entitySpawn`-Initialisierung und die periodische Recovery. Damit bleiben die Händler auch auf Bedrock-Script-API-Versionen funktionsfähig, auf denen einzelne Spawn-Events nicht verfügbar sind.

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

Für **Kavallerie** wird der normale Rider-basierte A*-Steuervektor nicht verwendet. `scripts/soldier/cavalry_controller.js` übernimmt die Bewegung direkt am Pferd. Dadurch kann der Pathfinder die Pferderichtung nicht mehr mit einer auf den Reiter bezogenen Bewegung überschreiben. Der Controller übernimmt sanftes Lenken, Geschwindigkeitsbegrenzung und direkte Zielannäherung.

### Monster-Zielsuche

`scripts/soldier/monster_targeting.js` ergänzt die autonome Zielsuche um eine **explizite Whitelist feindlicher Monster**. Wenn ein eigener Soldier keinen manuellen Befehl und kein aktuelles Ziel hat, sucht er innerhalb der konfigurierten Suchreichweite nach nahegelegenen feindlichen Mobs und greift das nächstgelegene gültige Monster an.

Erfasst werden unter anderem Zombies, Zombie-Villager, Husk, Drowned, Skelette, Strays, Bogged, Wither-Skelette, Creeper, Spinnen, Höhlenspinnen, Silberfische, Endermiten, Endermen, Hexen, Phantome, Slimes, Magmawürfel, Blaze, Ghasts, Guardians, Elder Guardians, Shulker, Pillager, Vindicator, Evoker, Vex, Ravager, Piglins, Piglin Brutes, zombifizierte Piglins, Hoglins, Zoglins, Warden und Breeze.

**Passive bzw. neutrale Tiere werden dabei ausdrücklich nicht als autonome Ziele ausgewählt.** Spieler, Villager, Händler, beliebige NPCs und eigene Soldier-Mounts bleiben ebenfalls von dieser Zielsuche ausgeschlossen. Die bestehende Team-/Feinderkennung für Spieler und andere Soldiers bleibt davon getrennt.

### Soldier-Commands

```text
/siedler:spawn_soldier <Type> [Level]
/siedler:soldier_tool
/siedler:soldier_info
/siedler:soldier_xp <Amount>
/siedler:soldier_tp [Target]
```

`/siedler:soldier_tp` unterstützt jetzt mehrere Zielarten. Ohne `Target` werden weiterhin **alle eigenen, aktuell registrierten Soldaten** zum ausführenden Spieler teleportiert. Die Einheiten werden in einer Formation verteilt; bei Kavallerie wird das zugehörige Pferd ebenfalls mit teleportiert.

Unterstützte `Target`-Werte:

```text
/siedler:soldier_tp all
/siedler:soldier_tp selected
/siedler:soldier_tp staff
/siedler:soldier_tp nearest
/siedler:soldier_tp group:<Gruppenname>
/siedler:soldier_tp <Gruppenname>
/siedler:soldier_tp soldier:<Entity-ID>
/siedler:soldier_tp <NameTag>
```

- `all` – alle eigenen Soldaten
- `selected` / `selection` / `staff` – die aktuell mit dem **Soldatenstab** ausgewählten Soldaten
- `nearest` / `single` – der nächste eigene Soldat
- `group:<Name>` oder direkt `<Gruppenname>` – alle Mitglieder der eigenen Gruppe
- `soldier:<Entity-ID>` – ein einzelner eigener Soldier über seine Entity-ID
- `<NameTag>` – ein einzelner eigener Soldier über seinen aktuellen NameTag

Die Auswahl wird immer anhand der `ownerId` geprüft. Fremde Soldaten können dadurch nicht über den Teleport-Command übernommen werden. Gruppen- und Staff-Auswahlen werden nach der Auswahl ebenfalls in Formation teleportiert. Bei einem Cross-Dimension-Teleport wird das Soldier-Mount gemeinsam mit dem Soldier in die Dimension des Spielers versetzt.

### Bewegungs- und Kampf-Commands

```text
/siedler:move <Target>
/siedler:follow

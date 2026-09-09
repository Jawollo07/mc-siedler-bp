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
- **Beschleunigte Soldier-Bewegung mit Level-/Kavallerie-Bonus, Geschwindigkeitslimit und Terrain-Unterstützung**
- **Erweiterte lokale A*-Wegfindung mit Höhenwechseln, Umwegen und Stuck-Recovery**
- **Automatische Zielsuche für nahe feindliche Monster**
- Bogenschützen mit ballistischer Pfeilphysik
- Essentials und Spieler-Dashboard
- Detaillierter Villager-Todeslogger mit Todesursache, Verursacher und Claim-Team
- Anti-AFK-System mit Warnung, AFK-Status und Kick
- Erweitertes zentralisiertes Logging für alle Behavior-Pack-Module
- Native Chat-Verarbeitung ohne externe ChatSend-API-Abhängigkeit
- **Pillager-Squads mit Claim-sicherem Spawn und spielerabhängiger Belagerungslogik**

## ⚔️ Soldier-System

Das Soldier-System befindet sich unter `scripts/soldier/` und unterstützt Infanterie, Bogenschützen und Kavallerie mit Owner-Zuordnung, Leveln, XP, Ausrüstung, KI, Befehlen und Gruppenformationen.

### Schnelle Soldier-Bewegung

`scripts/soldier/terrain_movement.js` ergänzt die normale KI-Bewegung um einen stärkeren, aber begrenzten Vorwärtsimpuls. Die Geschwindigkeit wird dabei nicht unbegrenzt hochgeschaukelt:

- schnellerer Vorwärtsimpuls als zuvor
- Level-Bonus von Level 1–7
- zusätzlicher Geschwindigkeitsbonus für Kavallerie
- horizontale Geschwindigkeit wird auf ca. **0.55 Blöcke/Tick** begrenzt
- Terrain-Erkennung für solide Blöcke direkt vor dem Soldier
- Sprungimpuls für ein Block hohe Hindernisse und Stufen
- A*-Wegpunkte können weiterhin gezielte Sprünge anfordern

Damit sollen Soldiers deutlich zügiger reagieren und Wege ablaufen, ohne durch immer weitere Impulse unkontrolliert beschleunigt zu werden.

### Persistenz nach Neustarts

Die Soldaten selbst bleiben als Minecraft-Entities erhalten. Die interne JavaScript-Map `SOLDIERS` ist dagegen nur zur Laufzeit vorhanden. `scripts/soldier/registry.js` baut diese Registry nach jedem Serverstart aus den tatsächlich vorhandenen Soldier-Entities und deren Dynamic Properties (`soldier:ownerId`, `soldier:type`, `soldier:level`) wieder auf.

### Wegfindung und Terrain

`scripts/soldier/pathfinding.js` ergänzt die Impulsbewegung um lokale A*-Wegfindung. Sie berücksichtigt begehbare Fuß-/Kopfhöhe, festen Untergrund, Höhenwechsel, diagonale Bewegung ohne Corner-Cutting, Terrain-Kosten, Türen/Trapdoors, Umwege und Stuck-Recovery. Für Kavallerie übernimmt `cavalry_controller.js` die Mount-Steuerung direkt.

### Monster-Zielsuche

`scripts/soldier/monster_targeting.js` verwendet eine explizite Whitelist feindlicher Monster. Passive bzw. neutrale Tiere werden ausdrücklich nicht als autonome Ziele ausgewählt. Spieler, Villager, Händler und eigene Soldier-Mounts bleiben ebenfalls ausgeschlossen.

### Soldier-Teleport

```text
/siedler:soldier_tp [Target]
```

Unterstützte Ziele sind `all`, `selected`, `selection`, `staff`, `nearest`, `single`, `group:<Name>`, ein Gruppenname, `soldier:<Entity-ID>` oder ein Soldier-NameTag. Owner-Prüfungen verhindern das Übernehmen fremder Soldaten. Kavallerie-Mounts werden mitgeführt.

### Soldier-Commands

```text
/siedler:spawn_soldier <Type> [Level]
/siedler:soldier_tool
/siedler:soldier_info
/siedler:soldier_xp <Amount>
/siedler:soldier_tp [Target]
/siedler:move <Target>
/siedler:follow
/siedler:stay
/siedler:attack [Radius]
/siedler:defend [Radius]
/siedler:patrol <Target>
/siedler:stop
```

## 🛒 Händler

Das Händler-System verwendet die Entity `siedler:trader` und hält die definierten Händlerrollen automatisch am konfigurierten Marktplatz. Händler, die den Bereich verlassen, werden zurückgesetzt; fehlende Händler werden nachgespawnt.

## 🛡️ Anti-AFK

Das Anti-AFK-System liegt unter `scripts/antiafk/` und erkennt Inaktivität über Bewegung sowie relevante Spieleraktionen. Es unterstützt Warnungen, AFK-Markierung, automatische Kicks und manuelle AFK-Steuerung.

## 🏹 Weitere Systeme

Teams, Diplomatie, Claims, Wirtschaft, Pillager-Squads, Essentials, Villager-Todeslogging, Dashboard, Resource Pack und zentrales Logging sind modular unter `scripts/` organisiert.

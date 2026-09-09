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
- **Verbesserte Kavallerie mit direkter Mount-Steuerung, Charge/Pass-Taktik und Hindernissprüngen**
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

### Kavallerie

Die Kavallerie wird über `cavalry_ai.js` und den dedizierten `cavalry_controller.js` direkt am Pferd gesteuert. Der normale Rider-A*-Steuervektor greift nicht in die Mount-Bewegung ein.

Die Kavallerie:

- nähert sich Gegnern aktiv und hält die Bewegung auch im Nahbereich aufrecht
- startet Charges bereits aus größerer Entfernung
- verursacht beim Charge erhöhten Schaden und zusätzlichen Knockback
- passiert das Ziel nach einem Treffer, statt darin stehenzubleiben
- wechselt bei Blockade die Pass-Seite und versucht die Annäherung erneut
- verwendet eine höhere Höchstgeschwindigkeit als normale Soldiers
- dreht das Pferd weich in Richtung des aktuellen Ziels
- springt bei einem erkannten ein Block hohen Hindernis automatisch
- verfolgt nur echte Feinde: feindliche Spieler/Soldaten sowie die definierte Monster-Whitelist
- greift keine Tiere, Villager, Händler oder eigenen Mounts an

Dadurch verhält sich Kavallerie stärker wie eine mobile Stoßtruppe statt wie ein normaler Soldier auf einem Pferd.

### Schnelle Soldier-Bewegung

Die normale Soldier-Bewegung verwendet einen stärkeren, aber begrenzten Vorwärtsimpuls. Level 1–7 erhöhen die Reaktionsgeschwindigkeit; die horizontale Geschwindigkeit bleibt begrenzt. Terrain-Sprünge und lokale A*-Wegfindung bleiben aktiv.

### Persistenz nach Neustarts

Die Soldier-Registry wird nach Serverstarts aus den vorhandenen Soldier-Entities und Dynamic Properties rekonstruiert.

### Wegfindung und Terrain

`scripts/soldier/pathfinding.js` bietet lokale A*-Wegfindung mit Höhenwechseln, Umwegen, Terrain-Kosten, Türen/Trapdoors, Corner-Cutting-Schutz und Stuck-Recovery. Kavallerie nutzt für die Mount-Bewegung den dedizierten Controller.

### Monster-Zielsuche

`scripts/soldier/monster_targeting.js` verwendet eine explizite Whitelist feindlicher Monster. Passive bzw. neutrale Tiere werden ausdrücklich nicht als autonome Ziele ausgewählt. Spieler, Villager, Händler und eigene Soldier-Mounts bleiben ebenfalls ausgeschlossen.

### Soldier-Teleport

```text
/siedler:soldier_tp [Target]
```

Unterstützte Ziele sind `all`, `selected`, `selection`, `staff`, `nearest`, `single`, `group:<Name>`, ein Gruppenname, `soldier:<Entity-ID>` oder ein Soldier-NameTag. Kavallerie-Mounts werden mitgeführt.

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

Das Händler-System verwendet die Entity `siedler:trader` und hält die definierten Händlerrollen automatisch am konfigurierten Marktplatz.

## 🛡️ Anti-AFK

Das Anti-AFK-System liegt unter `scripts/antiafk/` und erkennt Inaktivität über Bewegung sowie relevante Spieleraktionen.

## 🏹 Weitere Systeme

Teams, Diplomatie, Claims, Wirtschaft, Pillager-Squads, Essentials, Villager-Todeslogging, Dashboard, Resource Pack und zentrales Logging sind modular unter `scripts/` organisiert.

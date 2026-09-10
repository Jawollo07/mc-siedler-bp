# 🏘️ Siedler Logic

> Modulares Minecraft-Bedrock-Behavior-Pack für das Minecraft-Siedler-Projekt.

**Behavior Pack:** https://github.com/Jawollo07/mc-siedler-bp  
**Resource Pack:** https://github.com/Jawollo07/mc-siedler-rp

## 📖 Systeme

- Teams, Diplomatie, Claims und Wirtschaft
- **Team-Eliminierung: konfigurierbarer Eliminationsblock, Team-Out-Broadcast und permanenter Spectator nach dem Tod**
- Claim-Protection mit Block-Recovery und Item-Rückgabe
- Zentraler Marktplatz und spezialisierte Händler
- **Automatischer Marktbestand: fehlende Händler werden selbstständig nachgespawnt**
- **Händler bleiben dauerhaft innerhalb des konfigurierten Marktplatzes und wandern nicht mehr zufällig umher**
- **Verzauberungshändler-Villager mit vollständigem Pool aller definierten Angebote**
- Soldaten mit KI, Leveln, XP, Ausrüstung und Kavallerie
- **Konfigurierbare Soldier-Angriffsmodi 0–5 mit persistenter Speicherung pro Soldier**
- **Soldatenstab-UI für Einzel-/Mehrfachauswahl, Angriffsmodus und Teleport**
- **Gruppen-UI mit Angriffsmodus und Gruppen-Teleport zum Spieler**
- **Beschleunigte Soldier-Bewegung mit Level-/Kavallerie-Bonus, Geschwindigkeitslimit und Terrain-Unterstützung**
- **Watchdog-sichere lokale A*-Wegfindung mit begrenztem Suchbudget, Höhenwechseln, Umwegen und Stuck-Recovery**
- **Verbesserte Kavallerie mit direkter Mount-Steuerung, Charge/Pass-Taktik und Hindernissprüngen**
- **Automatische Zielsuche für nahe feindliche Monster**
- Bogenschützen mit ballistischer Pfeilphysik
- Essentials und Spieler-Dashboard
- **Persönlicher 27-Slot-Enderchest über `/ec` mit persistenter Speicherung pro Spieler**
- **Gemeinsame 54-Slot-Team-Doppelchest über `/teamchest` für alle Mitglieder eines Teams**
- Detaillierter Villager-Todeslogger mit Todesursache, Verursacher und Claim-Team
- Anti-AFK-System mit Warnung, AFK-Status und Kick
- Erweitertes zentralisiertes Logging für alle Behavior-Pack-Module
- Native Chat-Verarbeitung ohne externe ChatSend-API-Abhängigkeit
- **Pillager-Squads mit Claim-sicherem Spawn und spielerabhängiger Belagerungslogik**
- **Robustes tägliches Steuersystem mit Online-Prüfung, Wiederholungsversuchen und Steuerstatistik**
- **Wiederverwendbares Minenfeld mit verzögerter Explosion, Warnsound, Kettenreaktion, Feuer, Team-Schutz und Kontrollsystem**

## 💣 Minenfeld

Das Minenfeld-System befindet sich unter `scripts/minefield/index.js`. Das platzierbare Item ist `siedler:mine`.

- `/give @s siedler:mine` gibt eine Minenladung.
- Mit der Minenladung einen Block anvisieren und benutzen, um dort eine Mine zu platzieren.
- Jede Mine speichert persistent ihre **Mine-ID, Besitzer-ID und das Team des Besitzers**.
- Nach kurzer Aktivierungszeit wird die Mine scharf.
- Standardmäßig lösen **nur feindliche Teams** eine Team-Mine aus.
- Das eigene Team und verbündete Teams können die eigene Mine sicher betreten.
- Neutrale Teams können optional ebenfalls als Auslöser zugelassen werden.
- Spieler ohne Team gelten gegenüber einer Team-Mine als fremd und können sie auslösen.
- Betritt ein erlaubter Auslöser den Bereich der Mine, erscheint die Warnung mit Sound; nach **1 Sekunde** folgt die Explosion.
- Explosionen können weitere scharfe Minen im Umkreis von ca. **3,25 Blöcken** als Kettenreaktion auslösen.
- Die Explosion verursacht **keinen Blockschaden**, darf aber **Feuer erzeugen**.
- Nach der Explosion wird die Mine deaktiviert und nach **15 Sekunden** automatisch wieder scharf.
- Die Minenpositionen und Zustände werden persistent über die World Dynamic Property `minefield:mines` gespeichert.
- Es können bis zu **2000** Minen gleichzeitig gespeichert werden.

### 🎛️ Minen-Kontrolle

Spieler können nur die Minen ihres eigenen Teams kontrollieren; Admins/Game Directors können alle Minen kontrollieren. Die Kontrolle erfolgt für die nächste kontrollierbare Mine innerhalb von **8 Blöcken**.

```text
/siedler:mine_list
/siedler:mine_status
/siedler:mine_arm
/siedler:mine_disarm
/siedler:mine_remove
/siedler:mine_clear
/siedler:mine_mode <0-2>
```

Modi für `/siedler:mine_mode`:

- `0` = nur feindliche Teams auslösen
- `1` = feindliche + neutrale Teams auslösen
- `2` = jeder Spieler kann auslösen

Damit kann ein Team seine Verteidigungsminen gezielt **scharf/entschärfen, entfernen und den Auslösemodus ändern**. Der Zustand bleibt persistent über Neustarts erhalten.

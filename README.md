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
- **Wiederverwendbares Minenfeld mit verzögerter Explosion, Warnsound, Kettenreaktion und automatischem Wiederscharfmachen**

## 💣 Minenfeld

Das Minenfeld-System befindet sich unter `scripts/minefield/index.js`. Das platzierbare Item ist `siedler:mine`.

- `/give @s siedler:mine` gibt eine Minenladung.
- Mit der Minenladung einen Block anvisieren und benutzen, um dort eine Mine zu platzieren.
- Nach kurzer Aktivierungszeit wird die Mine scharf.
- Betritt ein Spieler den Bereich der Mine, wird sie ausgelöst.
- Sofort erscheint eine kurze Warnung und ein Warnsound; nach **1 Sekunde** folgt die Explosion.
- Explosionen können weitere scharfe Minen im Umkreis von ca. **3,25 Blöcken** als Kettenreaktion auslösen.
- Nach der Explosion wird die Mine deaktiviert und nach **15 Sekunden** automatisch wieder scharf.
- Die Minenpositionen und Zustände werden persistent über die World Dynamic Property `minefield:mines` gespeichert.
- Es können bis zu **2000** Minen gleichzeitig gespeichert werden.
- Die Explosion verursacht standardmäßig eine normale Explosion ohne Feuer und kann Blöcke zerstören.

## 📦 Essentials / Lager

### Persönlicher Enderchest

Das persönliche Enderchest-System befindet sich unter `scripts/essentials/enderchest.js`.

- `/ec` öffnet den persönlichen Enderchest.
- Jeder Spieler besitzt **27 persistente Slots**.
- Items können aus dem normalen Inventar eingelagert und wieder herausgenommen werden.
- Die Speicherung erfolgt pro Spieler über Dynamic Properties und ist damit unabhängig von Position, Dimension und Serverneustarts.
- Mengen, Custom-Namen, Lore, Verzauberungen und Haltbarkeit werden soweit API-seitig verfügbar mitgespeichert.

### Team-Doppelchest

Die gemeinsame Team-Doppelchest befindet sich unter `scripts/essentials/teamchest.js`.

- `/siedler:teamchest` bzw. die Kurzform **`/teamchest`** öffnet den gemeinsamen Speicher des eigenen Teams.
- Jedes Team besitzt einen eigenen **54-Slot-Speicher**, entsprechend einer Vanilla-Doppelchest.
- Nur Spieler, die aktuell Mitglied des Teams sind, können auf dessen Speicher zugreifen.
- Alle Teammitglieder teilen sich exakt denselben Inhalt.
- Items können eingelagert, entnommen und ersetzt werden.
- Die Daten werden persistent über die World Dynamic Property `essentials:teamchests` gespeichert.
- Beim Zugriff wird die Teamzugehörigkeit über die persistente Spieler-ID aufgelöst.
- Teamchests sind damit unabhängig von einer tatsächlichen Chest-Blockposition und funktionieren auch nach Serverneustarts.

## ☠️ Team-Eliminierung

Das Eliminationssystem befindet sich unter `scripts/teams/elimination.js`.

- Der aktuell konfigurierte Eliminationsblock ist `minecraft:beacon`.
- Wird dieser Block innerhalb eines Claims abgebaut, wird das zugehörige Claim-Team dauerhaft als **ausgeschieden** markiert.
- Alle Spieler erhalten sofort einen Broadcast über das ausgeschiedene Team.
- Stirbt danach ein Mitglied des ausgeschiedenen Teams, wird seine Spieler-ID dauerhaft als ausgeschieden gespeichert und der Spieler nach dem Tod permanent in den Spectator-Modus gesetzt.
- Beim erneuten Spawn wird der Spectator-Modus erneut gesetzt, sodass er nicht durch Respawn/Serverneustart verloren geht.
- Die Eliminationsdaten werden in World Dynamic Properties gespeichert und sind damit unabhängig von den aktuellen Online-Spielern.
- Der Blocktyp kann direkt über `ELIMINATION_BLOCK_TYPE` in `scripts/teams/elimination.js` geändert werden.

## ⚔️ Soldier-System

Das Soldier-System befindet sich unter `scripts/soldier/` und unterstützt Infanterie, Bogenschützen und Kavallerie mit Owner-Zuordnung, Leveln, XP, Ausrüstung, KI, Befehlen und Gruppenformationen.

### 🎯 Soldier-Angriffsmodi

Jeder Soldier besitzt einen separat gespeicherten Angriffsmodus. Der Modus beeinflusst nur die **autonome Zielsuche**; manuell erteilte Befehle haben weiterhin Vorrang.

| Modus | Verhalten |
|---:|---|
| `0` | **Nichts angreifen** |
| `1` | **Monster in der Nähe** |
| `2` | **Feindliche Soldaten** |
| `3` | **Tiere** |
| `4` | **Feindliche Dorfbewohner** |
| `5` | **Alles** – Spieler/Soldaten weiterhin nur bei feindlicher Beziehung |

Der Standardmodus für neue bzw. bisher nicht gespeicherte Soldiers ist `1` (Monster).

Der Modus kann per Command oder vollständig über den Soldatenstab gesteuert werden:

```text
/siedler:soldier_mode <0-5>
```

## 📡 Essentials / TPA

- `/siedler:tpa <Spieler>` und `/siedler:tpahere <Spieler>` verwenden einen nativen `PlayerSelector`.
- Dadurch wird das Ziel direkt als `Player` an das Script übergeben und nicht mehr als fehleranfälliger String geparst.
- Die Lösung ist auch für Aufrufe über `/execute as ... run` ausgelegt.
- `tpaccept` und `tpdeny` arbeiten weiterhin mit der persistenten Spieler-ID der TPA-Anfrage.

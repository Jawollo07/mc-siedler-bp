# 🏘️ Siedler Logic

> Modulares Minecraft-Bedrock-Behavior-Pack für das Minecraft-Siedler-Projekt.

**Behavior Pack:** https://github.com/Jawollo07/mc-siedler-bp  
**Resource Pack:** https://github.com/Jawollo07/mc-siedler-rp

## 📖 Enduser-Handbuch

➡️ **[USER_GUIDE.md – Commands, Systeme und Funktionsweise](USER_GUIDE.md)**

Dort findest du eine spielerorientierte Übersicht der aktuell implementierten Befehle und Systeme.

## 📖 Systeme

- Teams, Diplomatie, Claims und Wirtschaft
- Team-Eliminierung mit Broadcast und permanentem Spectator nach dem Tod
- Claim-Protection mit Block-Recovery und Item-Rückgabe
- Zentraler Marktplatz und spezialisierte Händler
- Soldaten mit KI, Leveln, XP, Ausrüstung und Kavallerie
- Konfigurierbare Soldier-Angriffsmodi 0–5
- Essentials mit Homes, TPA, Dashboard und persistenten Ender-/Teamchests
- Anti-AFK und zentralisiertes Logging
- Pillager-Squads mit Claim-sicherem Spawn und spielerabhängiger Belagerungslogik
- Robustes tägliches Steuersystem mit Online-Prüfung, Wiederholungsversuchen und Statistik
- **Persistenter TaxBonus durch Monster-Tokens und eroberte Outposts**
- **Minenfeld mit robuster Platzierung, verzögerter Explosion, Warnsound, Kettenreaktion, Feuer, Team-Schutz, Minengruppen, Monster-Auslösung und Verwaltungs-UI**

## 👹 Monster-Token-System

Monster-Tokens sind besondere Monster, deren Besiegen einen **permanenten TaxBonus für das Team des Killers** gewährt.

```text
/siedler:token
/siedler:token_auto
```

`/siedler:token` startet bzw. erweitert eine Token-Runde. `/siedler:token_auto` schaltet das automatische Spawning an bzw. aus.

### Token-Regeln

- Pro besiegtem Token-Mob gibt es standardmäßig **+1 Emerald permanenten TaxBonus pro Tag** für das Team des Spielers, der den Token besiegt.
- Die Teamzuordnung verwendet die **persistente Spieler-ID**, nicht den Spielernamen.
- Der Bonus wird sofort gespeichert und bleibt über Serverneustarts erhalten.
- Ein Team kann den konfigurierten maximalen TaxBonus nicht überschreiten.
- Es können maximal **4 Token-Mobs gleichzeitig** aktiv sein.
- Token-Mobs werden über den Tag `token_monster` eindeutig erkannt.
- Sobald alle aktiven Token-Mobs besiegt wurden, wird die Token-Runde als abgeschlossen gespeichert.

## 🏰 Outpost-Eroberung

Registrierte Outposts können von Teams **erobert und dauerhaft kontrolliert** werden.

```text
/siedler:outpost_register
```

Der Befehl registriert den aktuellen Standort als eroberbaren Outpost. Die Eroberung funktioniert anschließend über die Anwesenheit von Teammitgliedern im Radius.

### Eroberungsregeln

- Eroberungsradius: **12 Blöcke**.
- Ein Team muss den Outpost **10 Sekunden** ununterbrochen halten.
- Sind mehrere Teams gleichzeitig im Radius, ist der Outpost **umkämpft** und der Fortschritt wird zurückgesetzt.
- Der Besitzer wird persistent gespeichert und überlebt Serverneustarts.
- Wird ein fremder Outpost erobert, wechselt der Besitzer zum neuen Team.
- **Jede erfolgreiche Eroberung gewährt dem erobernden Team standardmäßig +1 Emerald permanenten täglichen TaxBonus.**
- Die Outpost-Belohnung verwendet dieselbe zentrale TaxBonus-Logik und dieselbe Obergrenze wie der Token-Bonus.
- Der TaxBonus wird direkt im Team gespeichert und vom normalen täglichen Steuersystem berücksichtigt.

### Beispiel

Team Blau hat 5 Dorfbewohner und bereits einen Token sowie einen Outpost besiegt/erobert:

```text
5 Dorfbewohner × 2 Emeralds = 10 Emeralds
+ 1 Emerald Token-TaxBonus
+ 1 Emerald Outpost-TaxBonus
= 12 Emeralds Tagessteuer
```

Die Belohnung ist **permanent pro Tag** und wird nicht nur einmalig ausgezahlt.

### Gemeinsame TaxBonus-Konfiguration

Die zentrale Konfiguration liegt in `scripts/taxes/config.js`:

- `TOKEN_REWARD` = Bonus pro besiegtem Token
- `OUTPOST_REWARD` = Bonus pro erfolgreicher Outpost-Eroberung
- `MAX_BONUS` = maximale permanente Bonus-Summe pro Team
- `VILLAGER_REWARD` = Grundsteuer pro Dorfbewohner
- `MAX_DAILY_PAYOUT` = maximale Tagesauszahlung

## 💣 Minenfeld

Das komplette Minenfeld-System liegt zentral unter `scripts/minefield/index_v2.js`. Das platzierbare Item ist `siedler:mine`.

- `/give @s siedler:mine` gibt eine Minenladung.
- Mit der Minenladung einen geeigneten Block anvisieren und benutzen, um eine Mine zu platzieren.
- Die Platzierung wird auf einen festen Untergrund und einen **freien Block darüber** geprüft; Flüssigkeiten und ungeeignete Positionen werden abgelehnt.
- Doppelplatzierungen bzw. zu dicht nebeneinander liegende Minen werden verhindert.
- Das Item wird **erst nach erfolgreicher Validierung** verbraucht.
- Nach erfolgreicher Platzierung werden Position und Team direkt bestätigt; die Mine wird nach 1 Sekunde automatisch scharf.
- Eigene und verbündete Teams lösen Team-Minen nicht aus.
- **Monster lösen scharfe Minen unabhängig vom Spieler-Auslösemodus immer aus.**
- Nach dem Betreten gibt es eine Warnung; nach 1 Sekunde explodiert die Mine.
- Explosionen zerstören **keine Blöcke**, dürfen aber Feuer erzeugen.
- Scharfe Minen können eine Kettenreaktion auslösen.
- Nach der Explosion wird die Mine automatisch wieder scharf.

### 🎛️ Minen-UI

Mit

```text
/siedler:mines
```

öffnet sich die grafische **Minenfeld-Verwaltung**.

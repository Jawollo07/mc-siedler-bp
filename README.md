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
- **TaxBonus als Multiplikator pro Dorfbewohner durch Monster-Tokens und eroberte Outposts**
- **Minenfeld mit robuster Platzierung, verzögerter Explosion, Warnsound, Kettenreaktion, Feuer, Team-Schutz, Minengruppen, Monster-Auslösung und Verwaltungs-UI**

## 💰 Steuersystem

Die tägliche Steuer wird pro Dorfbewohner berechnet. Der `taxBonus` ist dabei **kein zusätzlicher fixer Emerald-Betrag**, sondern der Multiplikator für jeden Dorfbewohner.

```text
taxBonus = 1 → 1 Emerald pro Dorfbewohner/Tag
taxBonus = 2 → 2 Emeralds pro Dorfbewohner/Tag
taxBonus = 5 → 5 Emeralds pro Dorfbewohner/Tag
```

Die Formel lautet:

```text
Tagessteuer = Anzahl Dorfbewohner × taxBonus
```

Beispiel mit 5 Dorfbewohnern:

```text
taxBonus=1 → 5 Emeralds/Tag
taxBonus=2 → 10 Emeralds/Tag
taxBonus=5 → 25 Emeralds/Tag
```

Der Standardwert ist `1`. Monster-Tokens und Outpost-Eroberungen erhöhen den permanenten `taxBonus` standardmäßig jeweils um `+1`.

### Gemeinsame TaxBonus-Konfiguration

Die zentrale Konfiguration liegt in `scripts/taxes/config.js`:

- `BASE_TAX_MULTIPLIER` = `1`
- `TOKEN_REWARD` = Erhöhung pro besiegtem Token
- `OUTPOST_REWARD` = Erhöhung pro erfolgreicher Outpost-Eroberung
- `MAX_BONUS` = maximaler TaxBonus-Multiplikator pro Team
- `MAX_DAILY_PAYOUT` = maximale Tagesauszahlung

## 👹 Monster-Token-System

Monster-Tokens sind besondere Monster, deren Besiegen den **permanenten TaxBonus des Teams des Killers** erhöht.

```text
/siedler:token
/siedler:token_auto
```

`/siedler:token` startet bzw. erweitert eine Token-Runde. `/siedler:token_auto` schaltet das automatische Spawning an bzw. aus.

### Token-Regeln

- Pro besiegtem Token-Mob wird der TaxBonus standardmäßig um **+1** erhöht.
- Der TaxBonus wirkt anschließend auf **jeden Dorfbewohner**.
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
- **Jede erfolgreiche Eroberung erhöht den TaxBonus des Teams standardmäßig um +1.**
- Die Outpost-Belohnung verwendet dieselbe zentrale TaxBonus-Logik und dieselbe Obergrenze wie der Token-Bonus.
- Der TaxBonus wird direkt im Team gespeichert und vom normalen täglichen Steuersystem berücksichtigt.

### Beispiel

Team Blau hat 5 Dorfbewohner und `taxBonus=3`:

```text
5 Dorfbewohner × 3 Emeralds = 15 Emeralds Tagessteuer
```

Hat das Team anschließend einen weiteren Token oder Outpost verdient und damit `taxBonus=4`, sind es:

```text
5 Dorfbewohner × 4 Emeralds = 20 Emeralds Tagessteuer
```

Der TaxBonus ist **permanent** und erhöht den täglichen Ertrag für jeden Dorfbewohner.

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

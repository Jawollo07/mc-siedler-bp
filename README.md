# 🏘️ Siedler Logic

> Modulares Minecraft-Bedrock-Behavior-Pack für das Minecraft-Siedler-Projekt.

**Behavior Pack:** https://github.com/Jawollo07/mc-siedler-bp  
**Resource Pack:** https://github.com/Jawollo07/mc-siedler-rp

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
- **Minenfeld mit verzögerter Explosion, Warnsound, Kettenreaktion, Feuer, Team-Schutz, Minengruppen, Monster-Auslösung und Verwaltungs-UI**

## 💣 Minenfeld

Das System liegt unter `scripts/minefield/index_v2.js`. Das platzierbare Item ist `siedler:mine`.

- `/give @s siedler:mine` gibt eine Minenladung.
- Mit der Minenladung einen Block anvisieren und benutzen, um eine Mine zu platzieren.
- Jede Mine speichert persistent **Mine-ID, Besitzer-ID, Besitzer-Team, Auslösemodus und optional eine Gruppe**.
- Eigene und verbündete Teams lösen Team-Minen nicht aus.
- Modus `0` = nur Feinde, `1` = Feinde + Neutral, `2` = alle Spieler.
- **Monster lösen scharfe Minen unabhängig vom Spieler-Auslösemodus immer aus.** Das umfasst normale Bedrock-Monster über die `monster`-Familie sowie das Custom-Entity `siedler:monster`.
- Nach dem Betreten gibt es eine Warnung; nach 1 Sekunde explodiert die Mine.
- Explosionen zerstören **keine Blöcke**, dürfen aber Feuer erzeugen.
- Scharfe Minen in ca. 3,25 Blöcken Entfernung können eine Kettenreaktion auslösen.
- Nach der Explosion wird die Mine nach 15 Sekunden automatisch wieder scharf.
- Der persistente Minenspeicher wird **erst nach der Bedrock-Early-Execution-Phase** gelesen, damit `world.getDynamicProperty()` beim Modulstart keinen Early-Execution-Fehler verursacht.
- Das Minen-Item verwendet die aktuelle Bedrock-Icon-Kurzschreibweise (`"minecraft:icon": "tnt"`) und vermeidet damit veraltete Icon-Felder.

### 🎛️ Minen-UI

Mit

```text
/siedler:mines
```

öffnet sich die grafische **Minenfeld-Verwaltung**. Dort können Einzelminen und Minengruppen ohne manuelle Befehle verwaltet werden.

Die UI bietet:

- Einzelmine scharf/entschärfen/entfernen
- alle eigenen Team-Minen der Dimension löschen
- Mine-Liste und Status
- Minengruppe erstellen und Radius festlegen
- vorhandene Gruppen anzeigen
- Gruppe scharf/entschärfen/entfernen
- Gruppe manuell zünden
- Gruppen-Auslösemodus einstellen
- Auslösemodus einer einzelnen Mine einstellen

### 💣 Minengruppen

Mehrere eigene Team-Minen können zu einer **persistenten Gruppe** zusammengefasst werden. Eine Gruppenzündung startet die Warnung und Explosion für alle Gruppenmitglieder praktisch gleichzeitig. Wird eine Gruppenmine von einem Gegner betreten, wird ebenfalls die gesamte Gruppe synchron gezündet.

```text
/siedler:mine_group_create <gruppe> <radius>
/siedler:mine_group_list
/siedler:mine_group_arm <gruppe>
/siedler:mine_group_disarm <gruppe>
/siedler:mine_group_remove <gruppe>
/siedler:mine_group_mode <gruppe> <0-2>
/siedler:mine_group_detonate <gruppe>
```

Beispiel:

```text
/siedler:mine_group_create mauer 12
/siedler:mine_group_arm mauer
/siedler:mine_group_mode mauer 0
```

Damit kann z. B. ein komplettes Minenfeld entlang einer Mauer als Einheit geschaltet werden. Die Gruppen-Zuordnung bleibt über Neustarts erhalten.

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
- **Minenfeld mit verzögerter Explosion, Warnsound, Kettenreaktion, Feuer, Team-Schutz und Minengruppen**

## 💣 Minenfeld

Das System liegt unter `scripts/minefield/index.js`. Das platzierbare Item ist `siedler:mine`.

- `/give @s siedler:mine` gibt eine Minenladung.
- Mit der Minenladung einen Block anvisieren und benutzen, um eine Mine zu platzieren.
- Jede Mine speichert persistent **Mine-ID, Besitzer-ID, Besitzer-Team, Auslösemodus und optional eine Gruppe**.
- Eigene und verbündete Teams lösen Team-Minen nicht aus.
- Modus `0` = nur Feinde, `1` = Feinde + Neutral, `2` = alle Spieler.
- Nach dem Betreten gibt es eine Warnung; nach 1 Sekunde explodiert die Mine.
- Explosionen zerstören **keine Blöcke**, dürfen aber Feuer erzeugen.
- Scharfe Minen in ca. 3,25 Blöcken Entfernung können eine Kettenreaktion auslösen.
- Nach der Explosion wird die Mine nach 15 Sekunden automatisch wieder scharf.

### 🎛️ Einzelmine

```text
/siedler:mine_list
/siedler:mine_status
/siedler:mine_arm
/siedler:mine_disarm
/siedler:mine_remove
/siedler:mine_clear
/siedler:mine_mode <0-2>
```

### 💣 Minengruppen

Mehrere eigene Team-Minen können zu einer **persistenten Gruppe** zusammengefasst werden. Eine Gruppenzündung startet die Warnung und Explosion für alle Gruppenmitglieder im selben Tick, also praktisch gleichzeitig. Wird eine Gruppenmine von einem Gegner betreten, wird ebenfalls die gesamte Gruppe synchron gezündet.

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

# 🏘️ Siedler Logic – Entwicklungsplan

> Aktueller Entwicklungsstand des Behavior Packs.

**Stand:** 10.09.2026

## 📊 Aktueller Stand

- [x] Zentraler Loader und fehlertolerantes Modul-Laden
- [x] Zentralisiertes erweitertes Logging mit INFO/WARN/ERROR/DEBUG und Console-Bridge
- [x] Teams, Diplomatie, Claims und Wirtschaft
- [x] Team-Eliminierung mit konfigurierbarem Eliminationsblock, Broadcast und permanentem Spectator
- [x] Claim-Block-Recovery und Item-Rückgabe
- [x] Permanenter Monster-Token-TaxBonus
- [x] Tagessteuer nur bei mindestens einem online Teammitglied
- [x] Atomare Steuerbuchung, Retry-Logik und persistente Steuerstatistik
- [x] Händler, Soldatenhändler und Verzauberungshändler
- [x] Soldier-Spawn, Owner-Zuordnung, Level 1–7, XP, Ausrüstung und Registry
- [x] Infanterie, Bogenschütze und Kavallerie
- [x] Soldier-KI, Zielsuche, Gruppenformationen, Teleport und Angriffsmodi 0–5
- [x] Lokale A*-Wegfindung mit Höhenwechseln, Umwegen und Stuck-Recovery
- [x] Kavallerie-Charge/Pass, Hindernissprünge und Stuck-Recovery
- [x] Bogenschützen mit ballistischer Pfeilphysik
- [x] Spieler-Dashboard und Serverstatistiken
- [x] Resource Pack mit Custom-Soldaten
- [x] Essentials mit Homes, Todespunkten, TPA und Startsystem
- [x] Persistenter 27-Slot-Enderchest über `/ec`
- [x] Persistente gemeinsame 54-Slot-Team-Doppelchest über `/teamchest`
- [x] Detaillierter Villager-Todeslogger
- [x] Vollständiges Anti-AFK-System
- [x] Externe ChatSend-API-Abhängigkeit entfernt
- [x] Pillager-Squads mit Claim-sicherem Spawn und Online-Verteidiger-Prüfung
- [x] Robustes tägliches Steuersystem mit Online-Prüfung, Wiederholungsversuchen und Statistik
- [x] Minenfeld-Item `siedler:mine` mit persistenten Minen
- [x] Robuste Mine-Platzierung mit Untergrund-/Freiraumprüfung
- [x] Schutz vor Doppelplatzierung und zu dicht gesetzten Minen
- [x] Item-Verbrauch erst nach erfolgreicher Platzierungsvalidierung
- [x] Platzierungs-Cooldown gegen doppelte Item-Use-Events
- [x] Minen-Auslösung mit Warnung/Sound und 1-Sekunden-Verzögerung
- [x] Kettenreaktion benachbarter scharfer Minen
- [x] Explosion ohne Blockschaden, aber mit Feuer
- [x] Automatisches Wiederscharfmachen nach 15 Sekunden
- [x] Minenkontrollsystem: Status, Liste, Scharf-/Entschärfen, Entfernen und Leeren
- [x] Minen-Auslösemodi 0–2
- [x] Team-Integration über Spieler-ID und Diplomatie
- [x] Eigenes und verbündetes Team vor Minenauslösung geschützt
- [x] **Monster-Auslösung für normale Bedrock-Monster und `siedler:monster`**
- [x] Persistente Minengruppen für mehrere Minen
- [x] Gruppenweise Scharf-/Entschärfen, Entfernen und Auslösemodus
- [x] Synchronisierte Gruppenzündung aller scharfen Gruppenminen
- [x] Automatische Gruppenzündung, wenn eine Gruppenmine durch einen Feind ausgelöst wird
- [x] **Grafische Minenfeld-Verwaltungs-UI über `/siedler:mines`**
- [x] **UI für Einzelminen, Gruppenverwaltung, Auslösemodi und Status**
- [x] **Early-Execution-sicheres Laden des persistenten Minenspeichers**
- [x] **Alte doppelte Minefield-Kernimplementierung entfernt; nur noch die aktive Kernlogik und UI bleiben im Modul**

## 💣 Minenfeld-UI

Mit `/siedler:mines` öffnet sich eine grafische Verwaltung. Die UI bietet Einzelmine-Aktionen, Gruppenverwaltung, Auslösemodi sowie Mine-Liste und Status. Die UI verwendet die bestehenden Minefield-Befehle, sodass die vorhandenen Team- und Berechtigungsregeln erhalten bleiben.

## 💣 Minengruppen

Mehrere Minen können mit einem Namen zu einer Gruppe zusammengefasst werden. Die Gruppenzuordnung wird gemeinsam mit der Mine gespeichert und überlebt Serverneustarts. Eine Gruppe kann als Einheit geschaltet werden; bei einer Gruppenzündung erhalten alle Mitglieder dieselbe 1-Sekunden-Warnphase und werden anschließend gleichzeitig zur Explosion eingeplant.

## 💣 Mine-Platzierung

Die Mine wird über `siedler:mine` platziert. Beim Benutzen wird die Blickrichtung auf einen gültigen Untergrund ausgewertet. Die Zielposition muss frei sein und darf nicht von einer anderen Mine zu dicht belegt sein. Flüssigkeiten und ungeeignete Untergründe werden abgelehnt. Erst wenn alle Prüfungen erfolgreich sind, wird die Ladung aus dem Inventar entfernt und die persistente Mine gespeichert.

## 👹 Minen und Monster

Scharfe Minen prüfen zusätzlich zur Spielerauslösung nahe Entities. Normale Bedrock-Monster werden über die `monster`-Entity-Familie erkannt. Das Custom-Monster `siedler:monster` wird zusätzlich explizit erkannt, falls es die Vanilla-Familie nicht gesetzt hat. Monster ignorieren die Spieler-Auslösemodi 0–2 und können jede scharfe Mine auslösen.

### Befehle

```text
/siedler:mine_group_create <gruppe> <radius>
/siedler:mine_group_list
/siedler:mine_group_arm <gruppe>
/siedler:mine_group_disarm <gruppe>
/siedler:mine_group_remove <gruppe>
/siedler:mine_group_mode <gruppe> <0-2>
/siedler:mine_group_detonate <gruppe>
```

`mine_group_create` nimmt alle kontrollierbaren Minen des Spielers im angegebenen Radius auf und ordnet sie der Gruppe zu. Teammitglieder können nur die Minen ihres Teams verwalten; Game Directors dürfen alle Minen verwalten.

## 👹 Pillager-Squads / Belagerungen

- [x] Pillager-Squads aus Pillagern, optional Vindicators/Ravager und Captain
- [x] Pillager-Squad-Spawn wird niemals innerhalb eines Claims ausgeführt
- [x] Mehrfachsuche nach einem sicheren Spawnpunkt außerhalb aller Claims
- [x] Jeder einzelne Formationsoffset wird vor dem Entity-Spawn nochmals geprüft
- [x] Kein unsicherer Fallback: ohne sicheren Spawnpunkt wird der komplette Squad verworfen
- [x] Belagerungsziele werden nur ausgewählt, wenn ein Mitglied des Zielteams online im Claim steht
- [x] Leere Claims werden bei der Belagerungszielsuche übersprungen
- [x] Belagerungs-Squads bleiben im Staging, solange kein Verteidiger im Ziel-Claim steht
- [x] Wird der Claim während des Angriffs leer, erfolgt sofortiger Wechsel auf Retreat
- [x] Retreat-Squads werden nach dem konfigurierten Retreat-Zeitraum entfernt

## 🎯 Nächster Schwerpunkt

### Soldier-KI v2

1. Erweiterte Wegfindung in realen Serverlogs testen und Performance bei großen Gruppen messen
2. Komplexe Treppen, Slabs, Türen/Trapdoors und weitere Sonderblock-Geometrien im Spiel testen
3. 2-Block-Drops und schwieriges Gelände auf sichere Navigation testen
4. Charge-Lane auf Hindernisse prüfen
5. echte Nahkampf-Hitbox berücksichtigen
6. Kampfpositionen dynamisch verteilen
7. Gruppenformationen stabilisieren
8. Angriffe, Treffer und Animationen synchronisieren
9. Kavallerie auf realen Serverlogs testen
10. Charge/Pass-Verhalten gegen mehrere Gegner testen
11. Bogenschützen-Schaden vollständig mit dem Soldier-Level synchronisieren
12. Pfeilphysik mit Ingame-Flugtests feinjustieren
13. Essentials-Konfiguration aus den Funktionsmodulen herauslösen
14. Essentials optional um Rang-/Team-Limits erweitern
15. Persistentes Claim-Rollback als optionales Admin-System entwickeln
16. Anti-AFK optional um persistente Serverkonfiguration und Ausnahmen erweitern
17. Logging auf weitere große Untermodule wie Teams-Core und Soldier-KI ausweiten
18. Optionales Debug-Level für gezielte KI-/UI-Diagnose einsetzen
19. Logging um strukturierte Fehler-/Kontextdaten für schwer reproduzierbare Probleme erweitern
20. API-Kompatibilitätsguards für weitere optionale/versionsabhängige Bedrock-Events prüfen

### Leitprinzip

> **Soldaten sollen sich wie echte Einheiten verhalten: Ziel erkennen, einen begehbaren Weg berechnen, Gelände überwinden, sinnvoll annähern, eine gute Kampfposition einnehmen und angreifen. Kavallerie soll nicht in Gegnern stecken bleiben, sondern Hindernisse berücksichtigen, chargen, den Gegner passieren und anschließend neu ansetzen.**

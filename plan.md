# 🏘️ Siedler Logic – Entwicklungsplan

> Aktueller Entwicklungsstand des Behavior Packs.

**Stand:** 10.09.2026

## 📊 Aktueller Stand

- [x] Zentraler Loader und fehlertolerantes Modul-Laden
- [x] Zentralisiertes erweitertes Logging mit INFO/WARN/ERROR/DEBUG und Console-Bridge
- [x] Teams, Diplomatie, Claims und Wirtschaft
- [x] **Team-Eliminierung mit konfigurierbarem Eliminationsblock**
- [x] **Broadcast bei Ausscheiden eines Teams**
- [x] **Permanenter Spectator-Modus für ausgeschiedene Teammitglieder nach ihrem Tod**
- [x] **Persistente Eliminationsdaten für Teams und Spieler über World Dynamic Properties**
- [x] Claim-Block-Recovery und Item-Rückgabe
- [x] Permanenter Monster-Token-TaxBonus
- [x] Tagessteuer nur bei mindestens einem online Teammitglied
- [x] **Atomare Steuerbuchung ohne Emerald-Drops bei voller/ungeladener Steuerkiste**
- [x] **Automatische Steuer-Wiederholungsversuche bei temporären Fehlern**
- [x] **Persistente Steuerstatistik mit Gesamtzahlungen, letzter Zahlung und Fehlerzähler**
- [x] **`/siedler:taxinfo` und `/siedler:taxstats` für detaillierte Steuerinformationen**
- [x] Händler und Soldatenhändler
- [x] Handelsfenster für spezialisierte Händler repariert
- [x] Händler-Trade-Tables über Component Groups
- [x] Händler-Spawn-Initialisierung und Recovery
- [x] Verzauberungshändler-Villager mit vollständigem Trade-Pool
- [x] Soldatenhändler mit eigener Rekrutierungs-UI
- [x] Soldier-Spawn, Owner-Zuordnung, Level 1–7 und XP
- [x] Infanterie, Bogenschütze und Kavallerie
- [x] Soldier-Ausrüstung, KI, Befehle und Gruppenformationen
- [x] `/siedler:soldier_tp` mit all / selected / staff / nearest / group / Einzelziel
- [x] Persistente Soldier-Registry nach Serverneustarts
- [x] Soldier-Zielsuche und Team-/Feinderkennung
- [x] **Konfigurierbare autonome Soldier-Angriffsmodi 0–5**
- [x] **Modus 0: keine autonomen Angriffe**
- [x] **Modus 1: Monster-Zielsuche**
- [x] **Modus 2: feindliche Soldier-Zielsuche über Team-Diplomatie**
- [x] **Modus 3: Tier-Zielsuche**
- [x] **Modus 4: feindliche Villager über Claim-Team/Diplomatie**
- [x] **Modus 5: alle geeigneten lebenden Ziele, mit Team-Schutz für Spieler/Soldaten**
- [x] **Persistenter `soldier:mode`-Dynamic-Property pro Soldier**
- [x] **`/siedler:soldier_mode <0-5>` für ausgewählte bzw. nächstgelegene eigene Soldiers**
- [x] **Soldatenstab-UI: Angriffsmodus für Einzel-Soldier und Mehrfachauswahl**
- [x] **Soldatenstab-UI: Einzel-, Mehrfach- und Gruppen-Teleport zum Spieler**
- [x] **Gruppen-UI: Angriffsmodus und Teleport für alle Gruppenmitglieder**
- [x] Explizite autonome Zielsuche für feindliche Monster
- [x] Passive/neutrale Tiere aus autonomer Zielsuche ausgeschlossen
- [x] Nahkampf-, Fernkampf- und Kavallerie-KI
- [x] Lokale A*-Wegfindung mit Höhenwechseln, Umwegen und Stuck-Recovery
- [x] Terrain-Bewegung und Überwindung ein Block hoher Hindernisse
- [x] Deutlich beschleunigte Soldier-Bewegung mit Level- und Kavallerie-Bonus
- [x] Begrenzung der horizontalen Geschwindigkeit gegen unkontrollierte Beschleunigung
- [x] Stärkerer Vorwärtsimpuls für schnelle Reaktion und Marschbewegung
- [x] **Kavallerie-Controller mit direkter Pferdesteuerung und stabiler Kurvenfahrt**
- [x] **Kavallerie-Charge aus größerer Distanz mit erhöhtem Schaden und Knockback**
- [x] **Kavallerie-Pass-Manöver nach Treffern zur Vermeidung von Feststecken im Ziel**
- [x] **Kavallerie-Stuck-Recovery mit wechselnder Pass-Seite**
- [x] **Automatisches Überspringen ein Block hoher Hindernisse**
- [x] **Kavallerie-Zielsuche auf feindliche Spieler/Soldaten und definierte Monster beschränkt**
- [x] Bogenschützen mit ballistischer Pfeilphysik
- [x] Spieler-Dashboard und Serverstatistiken
- [x] Resource Pack mit Custom-Soldaten
- [x] Essentials mit Homes, Todespunkten, TPA und Startsystem
- [x] **TPA/TPAHere mit nativer PlayerSelector-Zielauflösung, auch bei `/execute as ... run`**
- [x] **Essentials-Enderchest mit `/ec` und 27 persistenten persönlichen Slots**
- [x] **Enderchest-Einlagerung und -Entnahme über die bestehende Server-UI**
- [x] **Persistente Speicherung von Mengen, Custom-Namen, Lore, Verzauberungen und Haltbarkeit soweit API-seitig verfügbar**
- [x] **Gemeinsame Team-Doppelchest mit 54 persistenten Slots pro Team**
- [x] **`/siedler:teamchest` bzw. `/teamchest` für den gemeinsamen Team-Speicher**
- [x] **Zugriff auf die Team-Doppelchest ausschließlich für aktuelle Teammitglieder**
- [x] **Minenfeld-Item `siedler:mine` mit platzierbaren persistenten Minen**
- [x] **Minen-Auslösung beim Betreten mit Warnung/Sound und 1-Sekunden-Verzögerung**
- [x] **Kettenreaktion benachbarter scharfer Minen**
- [x] **Automatisches Wiederscharfmachen der Mine nach 15 Sekunden**
- [x] Detaillierter Villager-Todeslogger inklusive Claim-Team
- [x] Vollständiges Anti-AFK-System
- [x] Externe ChatSend-API-Abhängigkeit entfernt

## 👹 Pillager-Squads / Belagerungen

- [x] Pillager-Squads aus Pillagern, optional Vindicators/Ravager und Captain
- [x] Pillager-Squad-Spawn wird niemals innerhalb eines Claims ausgeführt
- [x] Mehrfachsuche nach einem sicheren Spawnpunkt außerhalb aller Claims
- [x] Jeder einzelne Formationsoffset wird vor dem Entity-Spawn nochmals geprüft
- [x] Kein unsicherer Fallback: ohne sicheren Spawnpunkt wird der komplette Squad verworfen
- [x] Belagerungsziele werden nur ausgewählt, wenn ein Mitglied des Zielteams online im Claim steht
- [x] Leere Claims werden bereits bei der Belagerungszielsuche übersprungen
- [x] Belagerungs-Squads bleiben im Staging, solange kein Verteidiger im Ziel-Claim steht
- [x] Wird der Claim während des Angriffs leer, erfolgt sofortiger Wechsel auf Retreat
- [x] Belagerungs-Squads retargeten bei leerem Claim nicht auf Spieler außerhalb des Ziel-Claims
- [x] Schaden wird unmittelbar vor dem Treffer nochmals gegen den aktuellen Claim-Standort geprüft
- [x] Ein Retreat kann nicht automatisch wieder in einen Assault wechseln
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

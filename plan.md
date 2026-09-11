# 🏘️ Siedler Logic – Entwicklungsplan

> Aktueller Entwicklungsstand des Behavior Packs.

**Stand:** 11.09.2026

## 📊 Aktueller Stand

- [x] Zentraler Loader und fehlertolerantes Modul-Laden
- [x] Teams, Diplomatie, Claims und Wirtschaft
- [x] Team-Eliminierung mit konfigurierbarem Eliminationsblock, Broadcast und permanentem Spectator
- [x] Claim-Block-Recovery und Item-Rückgabe
- [x] Permanenter Monster-Token-TaxBonus
- [x] **TaxBonus als Multiplikator pro Dorfbewohner statt als fixer Zusatzbetrag**
- [x] **Outpost-Eroberung mit persistentem Besitzer und Teamprüfung**
- [x] **Outpost-Eroberungen als zweite permanente TaxBonus-Quelle**
- [x] **Gemeinsame zentrale TaxBonus-Logik für Token und Outposts**
- [x] Verbesserte Token-Runde mit persistentem Abschlussstatus
- [x] Token-Runde wird durch neuen Token automatisch zurückgesetzt
- [x] Sicherer Token-Spawn mit freiem Fuß-/Kopfblock, festem Untergrund und mehreren Spawnversuchen
- [x] Token-Erkennung über alle drei Dimensionen
- [x] Konfigurierbarer Token-TaxBonus pro besiegtem Token
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
- [x] Vollständiges Anti-AFK-System
- [x] Externe ChatSend-API-Abhängigkeit entfernt
- [x] Pillager-Squads mit Claim-sicherem Spawn und Online-Verteidiger-Prüfung
- [x] Robustes tägliches Steuersystem mit Online-Prüfung, Wiederholungsversuchen und Statistik
- [x] Minenfeld-Item `siedler:mine` mit persistenten Minen
- [x] Robuste Mine-Platzierung mit Untergrund-/Freiraumprüfung
- [x] Platzierungs-Cooldown gegen doppelte Item-Use-Events
- [x] Minen-Auslösung mit Warnung/Sound und 1-Sekunden-Verzögerung
- [x] Kettenreaktion benachbarter scharfer Minen
- [x] Explosion ohne Blockschaden, aber mit Feuer
- [x] Automatisches Wiederscharfmachen nach 15 Sekunden
- [x] Minenkontrollsystem und grafische Verwaltungs-UI
- [x] Minen-Auslösemodi 0–2
- [x] Team-Integration über Spieler-ID und Diplomatie
- [x] Monster-Auslösung für normale Bedrock-Monster und `siedler:monster`
- [x] Persistente Minengruppen und Gruppenzündung

## 💰 Steuersystem

- `taxBonus=1` bedeutet **1 Emerald pro Dorfbewohner und Tag**.
- `taxBonus=2` bedeutet **2 Emeralds pro Dorfbewohner und Tag**.
- `taxBonus=5` bedeutet **5 Emeralds pro Dorfbewohner und Tag**.
- Die Formel ist: **Tagessteuer = Dorfbewohner × taxBonus**.
- Neue bzw. alte Teams ohne gültigen TaxBonus werden logisch mit dem Basiswert `1` behandelt.
- Monster-Tokens und Outpost-Eroberungen erhöhen den permanenten Multiplikator standardmäßig jeweils um `+1`.
- Die gemeinsame Obergrenze `MAX_BONUS` gilt weiterhin für alle TaxBonus-Quellen.
- Die Tagesabrechnung erfolgt nur bei mindestens einem online Teammitglied.
- Steuerkisten werden atomar beschrieben; bei fehlgeschlagener Zahlung erfolgt ein späterer Retry.

## 👹 Monster-Token-System

- `/siedler:token` startet bzw. erweitert eine Token-Runde.
- `/siedler:token_auto` schaltet das automatische Token-Spawning um.
- Maximal 4 Token-Mobs können gleichzeitig aktiv sein.
- Besiegt ein Spieler einen Token, erhöht sich der TaxBonus seines Teams standardmäßig um **+1**.
- Der Bonus verwendet die gemeinsame zentrale TaxBonus-Konfiguration und die Teamzuordnung über Spieler-ID.

## 🏰 Outpost-Eroberung

- `/siedler:outpost_register` registriert den aktuellen Standort als eroberbaren Outpost.
- Ein Team hält den Outpost 10 Sekunden innerhalb eines Radius von 12 Blöcken.
- Mehrere Teams im Radius setzen den Eroberungsfortschritt zurück und markieren den Outpost als umkämpft.
- Der Besitzer wird persistent gespeichert.
- Eine erfolgreiche Eroberung erhöht den permanenten TaxBonus des neuen Besitzerteams standardmäßig um **+1**.
- Auch bei einer Rückeroberung wird der Bonus vergeben, solange die `MAX_BONUS`-Obergrenze noch nicht erreicht ist.
- Die Belohnung läuft über `addTaxBonus()` und damit über dieselbe zentrale Logik wie der Token-TaxBonus.

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

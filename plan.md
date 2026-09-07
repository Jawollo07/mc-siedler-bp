# 🏘️ Siedler Logic – Entwicklungsplan

> Aktueller Entwicklungsstand des Behavior Packs.

**Stand:** 07.09.2026

## 📊 Aktueller Stand

- [x] Zentraler Loader und fehlertolerantes Modul-Laden
- [x] Zentralisiertes erweitertes Logging mit INFO/WARN/ERROR/DEBUG und Console-Bridge
- [x] Modulbezogene `createLogger()`-Instanzen für Soldier, Soldier-Spawn, Soldatenhändler, Anti-AFK und Diplomatie
- [x] Debug-Ausgaben für gezielte Diagnose von häufigen Soldier-/Anti-AFK-Abläufen vorbereitet
- [x] Teams, Diplomatie, Claims und Wirtschaft
- [x] Diplomatie-UI und `/diplomacy`
- [x] Claim-Block-Recovery und Item-Rückgabe
- [x] Permanenter Monster-Token-TaxBonus
- [x] Tagessteuer nur bei mindestens einem online Teammitglied
- [x] Permanente Weakness gegen Mobs und PvP
- [x] Händler und Soldatenhändler
- [x] Handelsfenster für spezialisierte Händler repariert
- [x] Händler-Trade-Tables über Component Groups
- [x] Händler-Spawn-Initialisierung und Recovery
- [x] Soldatenhändler mit eigener Rekrutierungs-UI
- [x] Soldatenhändler-Interaktion über `beforeEvents.playerInteractWithEntity`
- [x] Vanilla-Interaktion des Soldatenhändlers wird für die eigene UI abgefangen
- [x] Soldatenhändler-Erkennung über `soldier_trader` oder Variant-ID `6`
- [x] Händler-Recovery erhält Variant-ID `6` und überschreibt Soldatenhändler nicht mehr
- [x] Emerald-Zahlung und Rückerstattung bei Recruit-Fehlern
- [x] Soldier-Spawn, Owner-Zuordnung, Level 1–7 und XP
- [x] Infanterie, Bogenschütze und Kavallerie
- [x] Soldier-Ausrüstung und Befehle
- [x] Soldier-Zielsuche und Team-/Feinderkennung
- [x] Nahkampf-KI mit Windup/Cooldown
- [x] Bogenschützen-KI mit echter `minecraft:arrow`-Physik
- [x] Ballistisches Zielen, Gravitation, Drag, Predictive Aim und Swept-Ray
- [x] Spieler-Dashboard und Serverstatistiken
- [x] Resource Pack mit Custom-Soldaten
- [x] Kavallerie mit erwachsenem `minecraft:horse`
- [x] Kavallerie-Mounting über `/ride`
- [x] Taktische Kavallerie-Zustände: Approach, Charge, Hit, Pass
- [x] Charge-Schaden und Knockback
- [x] Pass-Verhalten und Stuck-Erkennung
- [x] Essentials mit Homes, Todespunkten, TPA und Startsystem
- [x] Marktplatz blockiert Abbau und Platzierung
- [x] Zentraler Marktplatz-Teleportpunkt
- [x] `/market_tp_set` und `/market`
- [x] Vollständiges Anti-AFK-System
- [x] Aktivitätserkennung, Warnung, AFK-Status und Kick
- [x] Anti-AFK-Administration und konfigurierbare Kick-Zeit
- [x] Anti-AFK-Kick ohne fehleranfälligen mehrteiligen Kick-Grund
- [x] Soldier-Mehrfachauswahl und Gruppenmitgliederverwaltung
- [x] `ModalFormData.toggle()` auf `ModalFormDataToggleOptions` mit `defaultValue` angepasst
- [x] Native-Type-Conversion-Fehler in `soldier/ui.js` bei Toggle-Formularen behoben

## 🎯 Nächster Schwerpunkt

### Soldier-KI v2

1. echte Wegfindung für Soldiers und Kavallerie
2. Hindernisse und Gelände erkennen
3. Höhen-/Treppenlogik verbessern
4. Charge-Lane auf Hindernisse prüfen
5. echte Nahkampf-Hitbox berücksichtigen
6. Kampfpositionen dynamisch verteilen
7. Gruppenformationen stabilisieren
8. Angriffe, Treffer und Animationen synchronisieren
9. Kavallerie auf realen Serverlogs testen
10. Charge/Pass-Verhalten gegen mehrere Gegner testen
11. Vanilla-Pferd auf Hindernisse und Terrain-Wechsel testen
12. Bogenschützen-Schaden vollständig mit dem Soldier-Level synchronisieren
13. Pfeilphysik mit Ingame-Flugtests feinjustieren
14. Essentials-Konfiguration aus `index.js` herauslösen
15. Essentials optional um Rang-/Team-Limits erweitern
16. Persistentes Claim-Rollback als optionales Admin-System entwickeln
17. Anti-AFK optional um persistente Serverkonfiguration und Ausnahmen erweitern
18. Logging auf weitere Kernmodule wie Claims, Market, Taxes und Monster ausweiten
19. Optionales Debug-Level für gezielte KI-/UI-Diagnose einsetzen
20. Logging um Rate-Limiting bzw. deduplizierte Warnungen für wiederkehrende Fehler erweitern

### Leitprinzip

> **Soldaten sollen sich wie echte Einheiten verhalten: Ziel erkennen, sinnvoll annähern, eine gute Kampfposition einnehmen und angreifen. Kavallerie soll nicht in Gegnern stecken bleiben, sondern chargen, den Gegner passieren und anschließend neu ansetzen.**

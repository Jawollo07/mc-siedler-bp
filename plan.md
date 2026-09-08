# 🏘️ Siedler Logic – Entwicklungsplan

> Aktueller Entwicklungsstand des Behavior Packs.

**Stand:** 08.09.2026

## 📊 Aktueller Stand

- [x] Zentraler Loader und fehlertolerantes Modul-Laden
- [x] Zentralisiertes erweitertes Logging mit INFO/WARN/ERROR/DEBUG und Console-Bridge
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
- [x] Händler-Spawn-Event gegen fehlende `world.afterEvents.entitySpawn`-API abgesichert
- [x] Händler-Custom-Commands über korrektes `system.beforeEvents.startup` registriert
- [x] Verzauberungshändler-Villager mit eigener Trade-Table
- [x] Verzauberungshändler über `/siedler:trader enchantments` und `/siedler:trader_here enchantments` verfügbar
- [x] Verzauberte Bücher über `enchant_book_for_trading` nach Bedrock-Handelslogik
- [x] Verzauberungshändler mit erweitertem Pool aus 17 Angeboten/Preis- und Verzauberungsstufen
- [x] Alle 17 Angebote des Verzauberungshändler-Pools gleichzeitig verfügbar
- [x] Keine zufällige Auswahl mehr aus dem definierten Enchantment-Pool
- [x] Variant-ID `7` und Tag `trader_enchantments` für stabile Händler-Recovery
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
- [x] Vanilla-Pferd auf Hindernisse und Terrain-Wechsel testen
- [x] Essentials mit Homes, Todespunkten, TPA und Startsystem
- [x] Detaillierter Villager-Todeslogger inklusive Claim-Team
- [x] Vollständiges Anti-AFK-System
- [x] Anti-AFK-Custom-Commands auf `system.beforeEvents.startup` korrigiert
- [x] Anti-AFK-Event-Subscriptions gegen fehlende versionsabhängige Events abgesichert
- [x] Externe ChatSend-API-Abhängigkeit entfernt

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

> **Soldaten sollen sich wie echte Einheiten verhalten: Ziel erkennen, sinnvoll annähern, eine gute Kampfposition einnehmen und angreifen. Kavallerie soll nicht in Gegnern stecken bleiben, sondern chargen, den Gegner passieren und anschließend neu ansetzen.**

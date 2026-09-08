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
- [x] **`/siedler:soldier_tp` teleportiert alle eigenen Soldaten zum Spieler**
- [x] **Soldier-Teleport verteilt Einheiten in einer Formation statt auf einer einzigen Position**
- [x] **Kavallerie-Mount wird beim Soldier-Teleport mitgeführt**
- [x] **Persistente Soldier-Registry rekonstruiert vorhandene Soldaten nach Serverneustart**
- [x] **Stale Soldier-Einträge werden aus der Laufzeit-Registry entfernt**
- [x] **Soldier-TP unterstützt einzelne Soldaten über `nearest`, Entity-ID oder NameTag**
- [x] **Soldier-TP unterstützt Gruppen über Gruppenname oder `group:<Name>`**
- [x] **Soldier-TP unterstützt die aktuelle Soldatenstab-Auswahl über `selected` / `staff`**
- [x] **Soldier-TP unterstützt weiterhin `all` bzw. den Aufruf ohne Target**
- [x] **Soldier-TP prüft bei allen Selektoren die `ownerId` und verhindert Fremd-Soldatenzugriff**
- [x] **Soldier-TP kann ausgewählte Gruppen/Soldaten auch dimensionsübergreifend zum Spieler holen**
- [x] Soldier-Zielsuche und Team-/Feinderkennung
- [x] **Explizite autonome Zielsuche für nahe feindliche Monster**
- [x] **Passive/neutral Tiere aus der autonomen Soldier-Zielsuche ausgeschlossen**
- [x] **Explizite Monster-Whitelist für Zombies, Skelette, Creeper, Spinnen, Nether-, End-, Illager- und weitere feindliche Mobs**
- [x] Nahkampf-KI mit Windup/Cooldown
- [x] **Dedizierte mount-basierte Kavallerie-Steuerung gegen Konflikte mit Rider-A*-Bewegung**
- [x] **Kavallerie-Lenkung, Geschwindigkeitsbegrenzung und Zielannäherung stabilisiert**
- [x] **Kavallerie-Pfadfinder greift nicht mehr in die Mount-Steuerung ein**
- [x] **Passive/neutral Tiere werden auch von der Kavallerie-Zielsuche ausgeschlossen**
- [x] **Beschleunigte Soldier-Bewegung mit zusätzlichem Level-/Kavallerie-Boost**
- [x] **Terrain-Erkennung für solide Blöcke vor dem Soldier**
- [x] **Sprunglogik zum Überwinden von ein Block hohen Hindernissen und Stufen/Treppen**
- [x] **Terrain-Bewegung als separates Modul ohne Austausch der bestehenden Kampf-/Formations-KI**
- [x] **Lokale A*-Wegfindung für Soldiers und Kavallerie**
- [x] **Wegfindung berücksichtigt begehbare Fuß-/Kopfhöhe und festen Untergrund**
- [x] **Automatische Umwege um versperrte direkte Wege**
- [x] **Lokale Repath-Suche bei veränderten Zielen oder Hindernissen**
- [x] **Wegfindung unterstützt Höhenwechsel sowie diagonale Bewegung**
- [x] **Aufwärts-Schritte bis eine Blockhöhe und sichere Abwärts-Schritte bis zwei Blockhöhen**
- [x] **Diagonales Corner-Cutting durch zwei angrenzende Hindernisse verhindert**
- [x] **Offene Türen/Trapdoors werden über ihren Blockzustand berücksichtigt; unbekannte Zustände bleiben blockiert**
- [x] **Terrain-Kosten für ungünstige/bevorzugte Bodenarten**
- [x] **Stuck-Erkennung mit beschleunigtem Repathing**
- [x] **A*-Wegpunkte können gezielte Sprunghinweise an die Terrain-Bewegung übergeben**
- [x] **Suchraum auf 1200 Knoten und 64 Wegpunkte begrenzt**
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

1. Erweiterte Wegfindung in realen Serverlogs testen und Performance bei großen Gruppen messen
2. komplexe Treppen, Slabs, Türen/Trapdoors und weitere Sonderblock-Geometrien im Spiel testen
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
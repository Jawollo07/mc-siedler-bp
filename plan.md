# 🏘️ Siedler Logic – Entwicklungsplan

> Aktueller Entwicklungsstand des Behavior Packs.

**Stand:** 07.09.2026

## 📊 Aktueller Stand

- [x] Zentraler Loader und fehlertolerantes Modul-Laden
- [x] Teams, Diplomatie, Claims und Wirtschaft
- [x] Claim-Block-Recovery bei unerlaubtem Abbau
- [x] Rückgabe unerlaubt platzierter Blöcke ins Spielerinventar
- [x] Sicherer Fallback-Drop bei vollem Inventar
- [x] Keine Item-Duplikation beim normalen Before-Event-Cancel
- [x] Permanenter Monster-Token-TaxBonus
- [x] Permanente Vanilla-Weakness für Spieler gegen Mobs und im PvP
- [x] Weakness per Admin-Commands aktivieren/deaktivieren und konfigurieren
- [x] Händler und Soldatenhändler
- [x] Handelsfenster für spezialisierte Händler repariert
- [x] Händler-Trade-Tables werden über Component Groups sicher aktiviert
- [x] Händler-Spawn wird nach dem Entity-Spawn initialisiert
- [x] Alte/rollenlose Händler werden automatisch repariert
- [x] Händler-Recovery setzt bestehende Trade-Nutzungen nicht zurück
- [x] Soldier-Spawn, Owner-Zuordnung, Level 1–7 und XP
- [x] Infanterie, Bogenschütze und Kavallerie
- [x] Soldier-Ausrüstung und Befehle
- [x] Soldier-Zielsuche und Team-/Feinderkennung
- [x] Nahkampf-KI mit Windup/Cooldown
- [x] Eigene Bogenschützen-KI mit echter `minecraft:arrow`-Physik
- [x] Ballistisches Zielen, Gravitation, Drag, Predictive Aim und Swept-Ray
- [x] Spieler-Dashboard und Serverstatistiken
- [x] Resource Pack mit Custom-Soldaten
- [x] Kavallerie verwendet ein normales erwachsenes `minecraft:horse`
- [x] Kavallerie-Mounting über `/ride`
- [x] Vanilla-Rider-Kompatibilität über `baby_undead`
- [x] Eindeutige Mount-Tags und `soldier:riderId`
- [x] Kavallerie bewegt das Mount statt den Reiter direkt
- [x] Taktische Kavallerie-Zustände: Approach, Charge, Hit, Pass
- [x] Charge mit erhöhtem Schaden und Knockback
- [x] Seitliches Passieren statt dauerhaftem Kreisen auf dem Gegner
- [x] Zielpriorität und Target-Hysterese
- [x] Stuck-Erkennung mit automatischem Seitenwechsel
- [x] Eigenes Mount wird bei der Zielsuche ausgeschlossen
- [x] Rideable-API als Mounting-Fallback
- [x] Essentials mit Homes, Todespunkten, TPA und Startsystem
- [x] Marktplatz blockiert Abbau und Platzierung
- [x] Markt-Commands direkt über `customCommandRegistry.registerCommand()` registriert
- [x] Zusätzlichen `registerCommand`-Wrapper aus dem Markt-Command-Modul entfernt
- [x] Markt-Commands verwenden weiterhin `GameDirectors` und `cheatsRequired: false`
- [x] Spieler können sich per `/siedler:market <id>` zu einem aktiven Marktplatz teleportieren
- [x] Markt-Teleport nutzt die Marktmitte und ermittelt automatisch eine sichere Geländehöhe

## 🔴 Phase 1 – Fundament & Stabilität

- [x] Zentraler Loader
- [x] Fehlertolerantes Laden
- [x] Persistente World Dynamic Properties
- [x] aktuelle Bedrock Script API berücksichtigt
- [x] Runtime-Caches werden bereinigt
- [x] Start-/Starterkit-System validiert Teamdaten

## 🔴 Phase 2 – Soldier-System

### 2.1 Einheiten

- [x] Infanterie
- [x] Bogenschütze
- [x] Kavallerie
- [x] Level 1–7
- [x] HP, Schaden, Reichweite und Geschwindigkeit pro Level
- [x] Ausrüstung pro Level
- [x] persistente XP
- [x] automatische Level-Up-Logik
- [x] Rekrutierung über Soldatenhändler
- [x] Vanilla-Pferd als Kavallerie-Mount
- [x] erwachsenes Wild-Pferd als stabiler Mount-Zustand
- [x] Mount-Zuordnung über eindeutige Tags und Rider-ID
- [x] Mounting über `/ride`
- [x] Rider-Kompatibilität mit Vanilla-Horse

### 2.2 Bewegung & Kampf-KI

- [x] Zielsuche
- [x] Feinderkennung
- [x] Move / Follow / Stay / Attack / Retreat-Grundlage
- [x] Nahkampf-Windup und Angriffscooldown
- [x] `applyDamage()`-Schaden
- [x] eigener Fernkampf für Bogenschützen
- [x] echte sichtbare `minecraft:arrow`-Projektile
- [x] ballistisches Schießen mit Gravitation und Luftwiderstand
- [x] vorausschauendes Zielen auf bewegte Ziele
- [x] Pfeilrotation und Swept-Ray
- [x] automatische Pfeil-Bereinigung
- [x] Kavallerie bewegt das Mount statt den Reiter direkt
- [x] taktische Approach-/Charge-/Hit-/Pass-Zustandsmaschine
- [x] Charge-Cooldown und Charge-Timeout
- [x] seitlicher Pass gegen direkte Zielkollision
- [x] Zielprioritäten für Spieler und Soldiers
- [x] Target-Hysterese gegen unnötigen Zielwechsel
- [x] Stuck-Erkennung und automatischer Seitenwechsel
- [x] eindeutige Mount-Zuordnung über Rider-ID
- [ ] echte Wegfindung über Hindernisse
- [ ] Block-/Geländeerkennung
- [ ] bessere Höhen-/Treppenlogik
- [ ] echte Hindernisbewertung für Charge-Lanes
- [ ] Ausweich- und Blockverhalten
- [ ] reale Ingame-Kavallerie-Tests mit Hindernissen, Steigungen und mehreren Zielen

### 2.3 Gruppen & Formationen

- [x] Soldier-Auswahl
- [x] Gruppenverwaltung
- [x] Gruppenbefehle
- [x] Formationsgrundlage
- [ ] dynamische Formation während Bewegung
- [ ] mehrere Gruppen gleichzeitig steuern
- [ ] Formationswechsel im Kampf

## 🟠 Phase 3 – Claims & Territorium

- [x] Chunk-Claims
- [x] Claim-Grenzen
- [x] Claim-Informationen
- [x] Schutz vor unerlaubtem Block-Abbau
- [x] Schutz vor unerlaubtem Block-Platzieren
- [x] automatische Wiederherstellung eines unerlaubt entfernten Blocks
- [x] Recovery-Fallback für Server-Builds ohne zuverlässiges Before-Event
- [x] Dimension und Spieler-ID in Recovery-Einträgen
- [x] Recovery-Scanner mit Queue-Limit und Ablaufbereinigung
- [x] keine Überschreibung einer späteren Platzierung bei der Block-Recovery
- [x] unerlaubt platzierte Blöcke werden im After-Event-Fallback zurückgegeben
- [x] Item-Rückgabe ohne Duplikation beim normalen Before-Event
- [x] Item-Drop als Fallback bei vollem Inventar
- [ ] vollständige Wiederherstellung von Blockzuständen und Block-Entity-Inhalten
- [ ] persistenter Claim-Rollback für bereits vor Claim-Erstellung zerstörte Bereiche

## 🟠 Phase 4 – Diplomatie

- [x] Friendly
- [x] Neutral
- [x] Hostile
- [x] persistente Beziehungen
- [x] Soldiers berücksichtigen Beziehungen
- [x] Bündnisse
- [x] Diplomatie-UI

## 🟡 Phase 5 – Wirtschaft

- [x] Emerald-Währung
- [x] Dorfbewohner-basierte Steuer
- [x] Team-Kasse
- [x] Monster-Token-TaxBonus
- [x] +1 Emerald/Tag je besiegtem Monster-Token
- [x] permanenter Bonus
- [x] maximal 64 TaxBonus Emeralds/Tag
- [x] Bonus nur für Team des Spielerkillers
- [x] bestehende Teams erhalten `taxBonus: 0` bei Migration
- [x] doppelte Tagesauszahlung nach Neustart verhindert
- [x] Tägliche Steuer Übersicht

## 🟡 Phase 6 – Handel & Märkte

- [x] Marktplätze
- [x] Markt-Schutz
- [x] Blöcke im Markt nicht abbaubar
- [x] Blöcke im Markt nicht platzierbar
- [x] spezialisierte Händler
- [x] Soldatenhändler
- [x] funktionierende Trade-UI für Lebensmittel-, Baustoff-, Rohstoff-, Werkzeug-, Waffen- und Versorgungshändler
- [x] Trade-Tables über Component Groups aktiviert
- [x] Händler nach Spawn sicher initialisiert
- [x] bestehende/rollenlose Händler automatisch repariert
- [x] Trade-Nutzungen vor wiederholtem Reset geschützt
- [x] Markt-Commands ohne zusätzlichen Registrierungs-Wrapper
- [x] Spieler-Teleport zu aktiven Marktplätzen per `/siedler:market <id>`
- [x] sichere Teleporthöhe über die Oberkante des Geländes

## 🟢 Phase 7 – Dashboard

- [x] `/siedler:stats`
- [x] Spielerprofil
- [x] Teamübersicht
- [x] Team-Rangliste
- [x] Claims/Bevölkerung
- [x] Steuern/TaxBonus
- [x] Soldaten nach Typ
- [x] Soldier-XP und Level
- [x] Serverstatistiken über Overworld, Nether und End

## 🟢 Phase 8 – Resource Pack

- [x] Custom Soldier Entity
- [x] Soldaten-Typen visuell unterscheiden
- [x] Ausrüstung rendern
- [x] individuelle Laufanimationen
- [x] Idle-/Bewegungsanimationen
- [x] Kampfzustand an RP übergeben
- [x] Kavallerie verwendet Vanilla-Pferd statt Custom-Mount

## 🔵 Phase 9 – Monster & Bedrohungen

- [x] Monster-Konfiguration
- [x] Monster-Tokens
- [x] Pillager-Trupps
- [x] Captains
- [x] Außenposten
- [x] Belagerungsgrundlage
- [x] Verteidigungswarnungen
- [x] Permanente Vanilla-Weakness für Spieler inklusive PvP
- [x] Weakness-Status-Command
- [x] Weakness On/Off-Commands
- [x] Weakness-Level, Dauer und Erneuerungsintervall per Command konfigurierbar

## 🟣 Phase 10 – Essentials

- [x] Spielerfunktionen
- [x] Start- und Starterkit-System
- [x] Admin-Funktionen
- [x] persistente Essentials-Daten
- [x] TPA-Ablauf und Cleanup
- [x] robuste Teleport- und Admin-Fehlerbehandlung

## 🎯 Nächster Schwerpunkt

### Soldier-KI v2

1. echte Wegfindung für Soldiers und Kavallerie
2. Hindernisse und Gelände erkennen
3. Höhen-/Treppenlogik verbessern
4. Charge-Lane auf Hindernisse prüfen
5. echte Nahkampf-Hitbox statt reiner Mittelpunkt-Distanz berücksichtigen
6. Kampfpositionen dynamisch um Ziele verteilen
7. Gruppenformationen stabilisieren
8. Angriffe, Treffer und Animationen synchronisieren
9. Kavallerie auf realen Serverlogs und Ingame-Szenarien testen
10. Charge/Pass-Verhalten gegen mehrere Gegner testen
11. Vanilla-Pferd auf Hindernisse, Steigungen und Terrain-Wechsel testen
12. Bogenschützen-Schaden und Verzauberungen vollständig mit dem Soldier-Level synchronisieren
13. Pfeilphysik mit realen Ingame-Flugtests feinjustieren
14. Essentials-Konfiguration aus `index.js` herauslösen
15. Essentials optional um Rang-/Team-Limits erweitern
16. Claim-Rollback für persistente historische Blockänderungen als optionales Admin-System entwickeln

### Leitprinzip

> **Soldaten sollen sich wie echte Einheiten verhalten: Ziel erkennen, sinnvoll annähern, eine gute Kampfposition einnehmen und angreifen. Kavallerie soll nicht in Gegnern stecken bleiben, sondern mit hoher Geschwindigkeit chargen, den Gegner passieren und anschließend für den nächsten Angriff neu ansetzen.**

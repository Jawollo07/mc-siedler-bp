# 🏘️ Siedler Logic – Entwicklungsplan

> Aktueller Entwicklungsstand des Behavior Packs.

**Stand:** 04.09.2026

## 📊 Aktueller Stand

- [x] Zentraler Loader und fehlertolerantes Modul-Laden
- [x] Teams, Team-Chat, Farben und Diplomatiebeziehungen
- [x] Chunk-Claims und Claim-Grenzen
- [x] Wirtschaft, Steuern und Team-Kassen
- [x] Permanenter Monster-Token-TaxBonus
- [x] Händler und Marktplätze
- [x] Soldatenhändler
- [x] Soldier-Spawn und persistente Owner-Zuordnung
- [x] Soldier-Level 1–7 und XP-System
- [x] Infanterie, Bogenschütze und Kavallerie
- [x] Soldier-Ausrüstung
- [x] Soldier-Befehle und Gruppen-Grundlage
- [x] Soldier-Zielsuche und Team-/Feinderkennung
- [x] Soldier-Nahkampfangriff über `applyDamage()`
- [x] Soldier-Kampfposition korrigiert: kein vorzeitiger Stopp durch großen Arrival-Radius
- [x] Praktische Mindest-Nahkampfreichweite gegen Entity-Collision-Probleme
- [x] Bogenschützen mit echter `minecraft:arrow`-Projectile-KI
- [x] Ballistisches Zielen inklusive diskreter Gravitation-/Drag-Simulation
- [x] Projectile-Owner für korrekte Trefferzuordnung
- [x] Pfeilgeschwindigkeit auf `6.0` korrigiert, damit die erwartete Fernkampfreichweite erreicht wird
- [x] Vorausschauendes Zielen auf bewegte Ziele
- [x] Pfeilstart mit sicherem Vorwärts-Offset gegen Selbstkollision
- [x] Pfeilrotation wird während des Fluges an die Flugrichtung angepasst
- [x] Swept-Ray-Prüfung gegen Block-Tunneling
- [x] Automatische Bereinigung alter Pfeil-Projektile
- [x] Erweiterte Bogenschützen-Zielreichweite auf `40` Blöcke
- [x] Spieler-Dashboard und Soldatenstatistiken
- [x] Serverstatistiken
- [x] Resource Pack mit Custom-Soldaten

## 🔴 Phase 1 – Fundament & Stabilität

- [x] Zentraler Loader
- [x] Fehlertolerantes Laden
- [x] Persistente World Dynamic Properties
- [x] aktuelle Bedrock Script API berücksichtigt

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

### 2.2 Bewegung & Kampf-KI

- [x] Zielsuche
- [x] Feinderkennung
- [x] Move / Follow / Stay / Attack / Retreat-Grundlage
- [x] Nahkampf-Windup
- [x] Angriffscooldown
- [x] `applyDamage()`-Schaden
- [x] Angriff bei praktischer Entity-Kollisionsdistanz
- [x] Kampf-Approach-Position korrigiert
- [x] kleiner Arrival-Radius für die Kampfannäherung
- [x] Soldat läuft nicht mehr dauerhaft zu einem unerreichbaren Zielpunkt
- [x] eigener Fernkampf für Bogenschützen
- [x] echte sichtbare `minecraft:arrow`-Projektile
- [x] Zielgerichtetes ballistisches Schießen
- [x] Gravitation und Luftwiderstand bei der ballistischen Flugbahnberechnung
- [x] flache gültige Flugbahn bevorzugt
- [x] bewegte Ziele werden durch Flugzeit-Prognose berücksichtigt
- [x] Pfeilrichtung wird während des Fluges visuell synchronisiert
- [x] Swept-Ray gegen schnelle Pfeile und Block-Tunneling
- [x] automatische Pfeil-Bereinigung nach langer Flugzeit
- [x] automatische Bogenschützen-Schussintervalle nach Level
- [x] erhöhte Zielreichweite
- [x] Pfeilgeschwindigkeit mit `projectile.shoot()` und ballistischem Solver auf `6.0` synchronisiert
- [ ] echte Wegfindung über Hindernisse
- [ ] Block-/Geländeerkennung
- [ ] bessere Höhen-/Treppenlogik
- [ ] intelligente Zielprioritäten
- [ ] Ausweich- und Blockverhalten
- [ ] Pfeil-/Schadenswerte vollständig an Bogenverzauberungen und Soldier-Level koppeln
- [ ] reale Ingame-Flugdistanz und Treffergenauigkeit nach Geschwindigkeitsanpassung testen

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
- [x] spezialisierte Händler
- [x] Soldatenhändler

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

## 🔵 Phase 9 – Monster & Bedrohungen

- [x] Monster-Konfiguration
- [x] Monster-Tokens
- [x] Pillager-Trupps
- [x] Captains
- [x] Außenposten
- [x] Belagerungsgrundlage
- [x] Verteidigungswarnungen

## 🎯 Nächster Schwerpunkt

### Soldier-KI v2

1. Wegfindung verbessern
2. Hindernisse erkennen
3. echte Nahkampf-Hitbox statt reiner Mittelpunkt-Distanz berücksichtigen
4. Kampfpositionen dynamisch um das Ziel verteilen
5. Gruppenformationen stabilisieren
6. Angriffe, Treffer und Animationen synchronisieren
7. KI mit realen Serverlogs testen
8. Bogenschützen-Schaden und Verzauberungen vollständig mit dem Soldier-Level synchronisieren
9. Pfeilphysik mit realen Ingame-Flugtests feinjustieren
10. Treffer- und Schadenszuordnung bei bewegten Zielen testen
11. Korrigierte Pfeilgeschwindigkeit von `6.0` auf reale Flugdistanz und Treffergenauigkeit testen

### Leitprinzip

> **Soldaten sollen sich wie echte Einheiten verhalten: Ziel erkennen, sinnvoll annähern bzw. Abstand halten, in Reichweite stehen, angreifen und nach dem Angriff weiterkämpfen – ohne in einer Bewegungs-Schleife hängen zu bleiben.**

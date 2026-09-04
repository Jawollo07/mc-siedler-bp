# 🏘️ Siedler Logic – Entwicklungsplan

> Aktueller Entwicklungsstand des Behavior Packs.

**Stand:** 05.09.2026

## 📊 Aktueller Stand

- [x] Zentraler Loader und fehlertolerantes Modul-Laden
- [x] Teams, Team-Chat, Farben und Diplomatiebeziehungen
- [x] Chunk-Claims und Claim-Grenzen
- [x] Wirtschaft, Steuern und Team-Kassen
- [x] Permanenter Monster-Token-TaxBonus
- [x] Händler, Marktplätze und Soldatenhändler
- [x] Soldier-Spawn, Owner-Zuordnung, Level 1–7 und XP-System
- [x] Infanterie, Bogenschütze und Kavallerie
- [x] Soldier-Ausrüstung und Befehle
- [x] Soldier-Zielsuche und Team-/Feinderkennung
- [x] Soldier-Nahkampfangriff mit Windup/Cooldown
- [x] Eigene Bogenschützen-KI mit echter `minecraft:arrow`-Projectile-Physik
- [x] Ballistisches Zielen, Gravitation, Drag, Predictive Aim und Swept-Ray
- [x] Spieler-Dashboard und Serverstatistiken
- [x] Resource Pack mit Custom-Soldaten
- [x] Kavallerie verwendet ein eigenes `siedler:cavalry_horse`-Mount statt Vanilla-Horse
- [x] Custom-Mount besitzt `minecraft:rideable` mit `family_types: ["soldier"]`
- [x] Kavallerie-Soldat wird über `minecraft:rideable.addRider()` auf das Mount gesetzt
- [x] Kein `Entity.startRiding()` mehr
- [x] Custom-Mount wird im Resource Pack als Pferd gerendert
- [x] Kavallerie-Bewegung wird über die zentrale Soldier-Bewegungsroutine auf das Mount ausgeführt
- [x] Kavallerie setzt für Charge/Circle/Pass korrekt den `move`-Zustand
- [x] Eigenes Kavallerie-Mount wird bei der Kavallerie-Zielsuche ausgeschlossen

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
- [x] eigenes Kavallerie-Mount
- [x] stabile Soldier–Mount-Zuordnung

### 2.2 Bewegung & Kampf-KI

- [x] Zielsuche
- [x] Feinderkennung
- [x] Move / Follow / Stay / Attack / Retreat-Grundlage
- [x] Nahkampf-Windup und Angriffscooldown
- [x] `applyDamage()`-Schaden
- [x] Kampf-Approach-Position und kleiner Arrival-Radius
- [x] eigener Fernkampf für Bogenschützen
- [x] echte sichtbare `minecraft:arrow`-Projektile
- [x] ballistisches Schießen mit Gravitation und Luftwiderstand
- [x] vorausschauendes Zielen auf bewegte Ziele
- [x] Pfeilrotation und Swept-Ray gegen Block-Tunneling
- [x] automatische Pfeil-Bereinigung
- [x] Kavallerie bewegt das Mount statt den Reiter direkt
- [x] Kavallerie-Movement-State mit `applyNaturalMovement()` synchronisiert
- [x] Charge- und Pass-Manöver
- [x] eigenes Mount wird nicht als Ziel gewählt
- [x] Rider-Kompatibilität über Custom-Mount statt Vanilla-`family_types`
- [ ] echte Wegfindung über Hindernisse
- [ ] Block-/Geländeerkennung
- [ ] bessere Höhen-/Treppenlogik
- [ ] intelligente Zielprioritäten
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
- [x] Custom-Kavallerie-Mount als Pferd darstellen

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
11. Kavallerie-Mount, Rider-Verbindung, Charge, Passieren und Bewegung real testen
12. Custom-Mount auf Hindernisse, Steigungen und Terrain-Wechsel testen

### Leitprinzip

> **Soldaten sollen sich wie echte Einheiten verhalten: Ziel erkennen, sinnvoll annähern bzw. Abstand halten, in Reichweite stehen, angreifen und nach dem Angriff weiterkämpfen – ohne in einer Bewegungs-Schleife hängen zu bleiben. Kavallerie soll dabei tatsächlich auf einem kompatiblen erwachsenen Mount reiten und dieses zuverlässig steuern.**

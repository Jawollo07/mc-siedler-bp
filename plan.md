# 🏘️ Siedler Logic – Entwicklungsplan

> Aktueller Entwicklungsstand des Behavior Packs.

**Stand:** 05.09.2026

## 📊 Aktueller Stand

- [x] Zentraler Loader und fehlertolerantes Modul-Laden
- [x] Teams, Diplomatie, Claims und Wirtschaft
- [x] Permanenter Monster-Token-TaxBonus
- [x] Händler und Soldatenhändler
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
- [x] Kavallerie-Soldat wird über den nativen `/ride`-Befehl auf das Pferd gesetzt
- [x] Eindeutige Mount-Tags für die Soldier–Horse-Zuordnung
- [x] Kavallerie-Bewegung wird auf das Mount ausgeführt
- [x] Charge- und Pass-Manöver
- [x] Mount wird bei der Zielsuche ausgeschlossen
- [x] Essentials mit Homes, Todespunkten, TPA und Startsystem

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
- [x] Mount-Zuordnung über eindeutige Tags
- [x] Mounting über `/ride`

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
- [x] Charge- und Pass-Manöver
- [x] eigenes Mount wird nicht als Ziel gewählt
- [x] `/ride`-basierte Rider-Zuordnung
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
- [x] bestehende Teams erhalten `taxBonus: 0` bei Migration

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
- [x] Serverstatistiken

## 🟢 Phase 8 – Resource Pack

- [x] Custom Soldier Entity
- [x] Soldaten-Typen visuell unterscheiden
- [x] Ausrüstung rendern
- [x] individuelle Lauf- und Kampfanimationen
- [x] Vanilla-Pillager/Humanoid-Bewegungsbasis
- [x] Kavallerie als Custom-Soldier darstellen
- [x] Custom-Pferde-Entity entfernt
- [x] Pferdedarstellung an Vanilla `minecraft:horse` delegiert

## 🔵 Phase 9 – Monster & Bedrohungen

- [x] Monster-Konfiguration
- [x] Monster-Tokens
- [x] Pillager-Trupps
- [x] Captains
- [x] Außenposten
- [x] Belagerungsgrundlage
- [x] Verteidigungswarnungen

## 🟣 Phase 10 – Essentials

- [x] `/siedler:spawn`
- [x] Homes und Todespunkt
- [x] TPA
- [x] `/msg` und `/reply`
- [x] Admin-Essentials
- [x] Team-Teleport und Spielstart
- [x] Starterkit-Schutz vor automatischer Duplizierung

## 🎯 Nächster Schwerpunkt

### Soldier-KI v2

1. Wegfindung verbessern
2. Hindernisse erkennen
3. Kampfpositionen dynamisch verteilen
4. Gruppenformationen stabilisieren
5. Angriffe, Treffer und Animationen synchronisieren
6. Bogenschützen-Schaden und Verzauberungen vollständig mit dem Soldier-Level synchronisieren
7. Pfeilphysik mit realen Ingame-Flugtests feinjustieren
8. Kavallerie-Mount, `/ride`, Charge, Passieren und Bewegung real testen
9. Vanilla-Pferde auf Hindernisse, Steigungen und Terrain-Wechsel testen
10. Mount-Cleanup bei Soldaten-Tod/Entfernung robust machen
11. Essentials-Konfiguration aus `index.js` herauslösen

### Leitprinzip

> **Soldaten sollen sich wie echte Einheiten verhalten. Kavallerie soll dabei ein normales erwachsenes Minecraft-Pferd verwenden und den Rider über das native `/ride`-System zuverlässig auf- und absetzen können. Eigene Pferde-Geometrien sollen dafür nicht notwendig sein.**

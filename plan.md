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
- [x] Kavallerie verwendet ein normales `minecraft:horse`
- [x] Kavallerie-Mount wird beim Spawn explizit als erwachsenes Vanilla-Pferd initialisiert
- [x] Kavallerie-Soldat wird über den nativen `/ride`-Befehl auf das Pferd gesetzt
- [x] Vanilla-Rider-Kompatibilität über die `baby_undead`-Familie hergestellt
- [x] Eindeutige Mount-Tags für die Soldier–Horse-Zuordnung
- [x] Kavallerie-Bewegung wird auf das Mount ausgeführt
- [x] Charge- und Pass-Manöver
- [x] Mount wird bei der Zielsuche ausgeschlossen
- [x] Rideable-API als kontrollierter Fallback
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
- [x] erwachsenes Wild-Pferd als stabiler Mount-Zustand
- [x] Mount-Zuordnung über eindeutige Tags
- [x] Mounting über `/ride`
- [x] Rider-Kompatibilität mit Vanilla-Horse über unterstützte Entity-Familie

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
- [x] Rider-Kompatibilität für Vanilla-Pferde korrigiert
- [x] erwachsenes Mount gegen zufälliges Fohlen abgesichert
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
- [x] Kavallerie verwendet Vanilla-Pferd statt Custom-Mount

## 🔵 Phase 9 – Monster & Bedrohungen

- [x] Monster-Konfiguration
- [x] Monster-Tokens
- [x] Pillager-Trupps
- [x] Captains
- [x] Außenposten
- [x] Belagerungsgrundlage
- [x] Verteidigungswarnungen

## 🟣 Phase 10 – Essentials

- [x] Spielerfunktionen
- [x] Start- und Starterkit-System
- [x] Admin-Funktionen
- [x] persistente Essentials-Daten
- [x] TPA-Ablauf und Cleanup
- [x] robuste Teleport- und Admin-Fehlerbehandlung

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
12. Vanilla-Pferd auf Hindernisse, Steigungen und Terrain-Wechsel testen
13. Essentials-Konfiguration aus `index.js` herauslösen
14. Essentials optional um Rang-/Team-Limits erweitern

### Leitprinzip

> **Soldaten sollen sich wie echte Einheiten verhalten: Ziel erkennen, sinnvoll annähern bzw. Abstand halten, in Reichweite stehen, angreifen und nach dem Angriff weiterkämpfen – ohne in einer Bewegungs-Schleife hängen zu bleiben. Kavallerie soll dabei tatsächlich auf einem kompatiblen erwachsenen Vanilla-Mount reiten und dieses zuverlässig steuern.**

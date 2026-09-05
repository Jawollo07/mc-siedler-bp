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
- [x] Essentials mit persistenten Homes und Todespunkten
- [x] Essentials `/spawn`, `/home` und `/back`
- [x] Essentials TPA mit `/tpa`, `/tpahere`, `/tpaccept` und `/tpdeny`
- [x] Mehrere gleichzeitige eingehende TPA-Anfragen mit Ablauf nach 60 Sekunden
- [x] TPA-Anfragen werden beim Verlassen von Spielern bereinigt
- [x] Private Nachrichten mit `/msg` und `/reply`
- [x] Spielersuche per ID, exaktem Namen und eindeutigem Namens-Präfix
- [x] Robuster Schutz gegen ungültige persistente Essentials-Daten
- [x] Admin-Essentials für Heal, Feed, Godmode, Fly, Kill, Clear und Wetter/Zeit
- [x] Aktiver Godmode wird beim erneuten Spieler-Spawn wiederhergestellt
- [x] Startsystem mit Team-Teleport und Spielstart
- [x] Starterkit verwendet `ItemStack` statt ungültiger String-/Count-Übergaben
- [x] Starterkit-Duplikate beim automatischen Spielstart verhindert
- [x] Startsystem validiert Teamdaten und überspringt fehlerhafte Teams/Spieler
- [x] Startsystem erkennt teilweise volle Inventare

## 🔴 Phase 1 – Fundament & Stabilität

- [x] Zentraler Loader
- [x] Fehlertolerantes Laden
- [x] Persistente World Dynamic Properties
- [x] aktuelle Bedrock Script API berücksichtigt
- [x] Essentials-Persistenz validiert ungültige Daten statt das Modul abbrechen zu lassen
- [x] Laufzeit-Caches werden bei Spieler-Verlassen bereinigt
- [x] Start-/Starterkit-System behandelt ungültige Teamdaten kontrolliert

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

## 🟣 Phase 10 – Essentials

### 10.1 Spielerfunktionen

- [x] `/siedler:spawn`
- [x] `/siedler:sethome`
- [x] `/siedler:home`
- [x] `/siedler:delhome`
- [x] `/siedler:back`
- [x] `/siedler:tpa`
- [x] `/siedler:tpahere`
- [x] `/siedler:tpaccept`
- [x] `/siedler:tpdeny`
- [x] `/siedler:msg`
- [x] `/siedler:reply`
- [x] Todespunkt wird automatisch gespeichert
- [x] Homes/Todespunkte über Spieler-ID persistiert
- [x] eindeutige Namens-/ID-Suche

### 10.2 Start & Starterkit

- [x] `/siedler:team_tp <spieler>`
- [x] `/siedler:starterkit <spieler>`
- [x] `/siedler:startgame`
- [x] Team-Koordinaten werden vor Teleport geprüft
- [x] Spieler werden per ID aufgelöst
- [x] doppelte Spieler in mehreren Teamlisten werden nur einmal verarbeitet
- [x] automatisches Starterkit nur einmal pro Spieler
- [x] manueller Starterkit-Befehl kann bewusst erneut vergeben werden
- [x] volle Inventare werden erkannt
- [x] Starterkit-Items werden als `ItemStack` hinzugefügt

### 10.3 Admin-Funktionen

- [x] Heal
- [x] Feed
- [x] Godmode
- [x] Fly
- [x] Kill
- [x] Clear
- [x] Tag/Nacht
- [x] Sonne/Regen
- [x] Zielspieler bei Admin-Befehlen optional, wo sinnvoll
- [x] GameDirectors-Berechtigung

### 10.4 Stabilität

- [x] ungültige Dynamic Properties abfangen
- [x] TPA-Ablauf und Cleanup
- [x] Runtime-Caches beim Leave bereinigen
- [x] Teleport- und Admin-Fehler sauber behandeln
- [x] ungültige Team-Startkoordinaten überspringen
- [x] Offline-Spieler beim Spielstart überspringen
- [x] doppelte Starterkits beim normalen Spielstart verhindern
- [ ] Essentials-Konfiguration in ein eigenes Config-Modul auslagern
- [ ] optionale Home-Limits pro Rang/Team
- [ ] optionales `/spawn`-Cooldown-/Combat-Tag-System

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
13. Essentials-Konfiguration aus `index.js` herauslösen
14. Essentials optional um Rang-/Team-Limits erweitern

### Leitprinzip

> **Soldaten sollen sich wie echte Einheiten verhalten: Ziel erkennen, sinnvoll annähern bzw. Abstand halten, in Reichweite stehen, angreifen und nach dem Angriff weiterkämpfen – ohne in einer Bewegungs-Schleife hängen zu bleiben. Kavallerie soll dabei tatsächlich auf einem kompatiblen erwachsenen Mount reiten und dieses zuverlässig steuern. Essentials soll zuverlässig, fehlertolerant und vollständig über Spieler-IDs arbeiten; der Spielstart soll nur valide Teams verarbeiten und Starterkits nicht unkontrolliert duplizieren.**

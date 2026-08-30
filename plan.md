# Siedler Logic – Erweiterungsplan

> Roadmap für `mc-siedler-bp` mit Fokus auf ein Minecraft-Bedrock-Erlebnis, das sich spielerisch an **Die Siedler 3** orientiert. Das Backpack-System soll dabei nicht nur zusätzlicher Speicher sein, sondern als Teil der Logistik und des Siedler-Gameplays funktionieren.

## Ziel

Das Projekt soll sich von einer Sammlung einzelner Server-Systeme zu einem zusammenhängenden Siedler-System entwickeln:

**Siedlung → Wirtschaft → Logistik → Bevölkerung → Militär → Territorium → Diplomatie → Krieg**

Bestehende Systeme wie Teams, Claims, Steuern, Monster/Pillager und das Soldier-System sollen dabei miteinander verbunden werden, statt isolierte Features zu bleiben.

---

# Phase 0 – Fundament und Stabilität

**Priorität: 🔴 sehr hoch**

- [ ] Zentrale Version aus einer einzigen Quelle beziehen
- [ ] Einheitliches Konfigurationssystem für alle Module
- [ ] Zentrale Dynamic-Property-Registrierung
- [ ] Gemeinsame Utility-Funktionen für Teams, Claims, Entities und Spieler
- [ ] Fehlergrenzen zwischen Modulen verbessern
- [ ] Sicherstellen, dass ein fehlerhaftes Modul den Loader nicht stoppt
- [ ] Debug-/Development-Modus zentral steuerbar machen
- [ ] Performance-Telemetrie für wiederkehrende Tasks
- [ ] Cleanup-System für nicht mehr gültige Soldier-/Entity-Einträge
- [ ] Dokumentation der verwendeten Dynamic Properties
- [ ] API-Kompatibilität mit der verwendeten `@minecraft/server`-Version prüfen

**Ergebnis:** Das Pack kann dauerhaft auf einem Server laufen, ohne dass einzelne Systeme das gesamte Pack destabilisieren.

---

# Phase 1 – Backpack als Siedler-Logistik

**Priorität: 🔴 sehr hoch**

Das Backpack soll sich am Siedler-Konzept orientieren und deshalb vor allem die **Logistik zwischen Spieler, Siedlung und Militär** verbessern.

## 1.1 Backpack-Grundsystem

- [ ] Backpack-Definition und eindeutige Identität
- [ ] Sicheres Öffnen/Schließen
- [ ] Persistenter Inhalt
- [ ] Schutz vor Item-Verlust
- [ ] Drop-/Tod-Verhalten definieren
- [ ] Backpack nicht duplizierbar machen
- [ ] Rechteprüfung bei fremden Backpacks

## 1.2 Siedler-Funktionen

- [ ] Unterschiedliche Backpack-Größen/Stufen
- [ ] Upgrade-System
- [ ] Gewichts-/Kapazitätskonzept optional vorbereiten
- [ ] Schnellzugriff für häufig benötigte Siedler-Gegenstände
- [ ] Anzeige von Kapazität und Zustand

## 1.3 Logistik

- [ ] Backpack als persönliches Transportlager
- [ ] Verbindung mit Wirtschafts-/Steuersystem
- [ ] Transport von Ressourcen zwischen Siedlungen
- [ ] Transportaufträge für Spieler/Soldaten vorbereiten
- [ ] Händler-/Handels-Backpack als spätere Erweiterung
- [ ] Ressourcen-Kategorien definieren

## 1.4 Militärische Nutzung

- [ ] Soldaten können Ausrüstung logisch verwalten
- [ ] Versorgung mit Nahrung/Ausrüstung
- [ ] Munitions-/Versorgungskonzept für spätere Fernkampf-Einheiten
- [ ] Feldversorgung und Nachschub
- [ ] Keine direkte Verbindung zwischen Backpack und unbegrenzter Item-Erzeugung

**Ziel:** Das Backpack wird ein Bestandteil des Siedler-Systems und kein gewöhnliches "mehr Inventar"-Feature.

---

# Phase 2 – Siedlung und Bevölkerung

**Priorität: 🔴 sehr hoch**

## 2.1 Bevölkerung

- [ ] Siedler-/Bürgerdatenmodell
- [ ] Bevölkerung pro Siedlung speichern
- [ ] Bevölkerungsgrenzen
- [ ] Zufriedenheit
- [ ] Versorgung
- [ ] Wohnraum
- [ ] Steuerfähigkeit abhängig von der Bevölkerung

## 2.2 Berufe

- [ ] Arbeiter
- [ ] Bauer
- [ ] Holzfäller
- [ ] Steinmetz
- [ ] Bergarbeiter
- [ ] Händler
- [ ] Soldat
- [ ] Spezialisten später ergänzen

## 2.3 Gebäude

- [ ] Rathaus / Siedlungszentrum
- [ ] Wohngebäude
- [ ] Lager
- [ ] Bauernhof
- [ ] Holzfäller
- [ ] Steinbruch
- [ ] Mine
- [ ] Schmiede
- [ ] Kaserne
- [ ] Markt
- [ ] Verteidigungsgebäude

Gebäude sollten langfristig echte Funktionen erhalten und nicht nur Dekoration sein.

---

# Phase 3 – Waren- und Wirtschaftssystem

**Priorität: 🔴 sehr hoch**

Das vorhandene Steuersystem soll zu einer vollständigen Wirtschaft ausgebaut werden.

## 3.1 Ressourcen

- [ ] Holz
- [ ] Stein
- [ ] Eisen
- [ ] Kohle
- [ ] Nahrung
- [ ] Getreide
- [ ] Mehl
- [ ] Brot
- [ ] Werkzeuge
- [ ] Waffen
- [ ] Rüstung
- [ ] Emeralds als Geld-/Steuereinheit

## 3.2 Produktionsketten

Beispiel:

`Getreide → Mehl → Brot → Nahrung`

`Eisenerz → Eisen → Werkzeug/Waffe`

`Holz → Bretter → Gebäude`

- [ ] Produktionszeiten
- [ ] Produktionskapazitäten
- [ ] Lagerbestände
- [ ] Verbrauch
- [ ] Produktionsengpässe

## 3.3 Lager und Logistik

- [ ] Zentrallager
- [ ] Lagerkapazität
- [ ] Ein-/Auslagerung
- [ ] Ressourcen-Sortierung
- [ ] Transport zwischen Lagern
- [ ] Prioritäten für wichtige Ressourcen
- [ ] Verbindung zum Backpack-System

---

# Phase 4 – Soldier-System zu einem vollständigen Militärsystem ausbauen

**Priorität: 🔴 sehr hoch**

Das Soldier-System besitzt bereits eigene AI-, Spawn-, Config- und Command-Strukturen. fileciteturn4file0 fileciteturn4file1 fileciteturn4file2 fileciteturn4file3

## 4.1 Einheiten

- [ ] Nahkämpfer
- [ ] Bogenschütze
- [ ] Schwerer Soldat
- [ ] Spezialeinheiten
- [ ] Unterschiedliche Werte pro Einheit
- [ ] Level/Erfahrung

## 4.2 AI

- [ ] Zielsuche
- [ ] Team-/Feinderkennung
- [ ] Formation
- [ ] Follow-Befehl
- [ ] Move-Befehl
- [ ] Attack-Befehl
- [ ] Hold-Position
- [ ] Patrol
- [ ] Retreat
- [ ] Schutz wichtiger Einheiten
- [ ] Wegfindung verbessern
- [ ] Hinderniserkennung

## 4.3 Kommandos

- [ ] Auswahl von Soldaten
- [ ] Gruppen bilden
- [ ] Befehle an Gruppen
- [ ] Zielposition markieren
- [ ] Angriff auf Entity/Spieler
- [ ] Rückzug
- [ ] Garnison

## 4.4 Versorgung

- [ ] Nahrung
- [ ] Waffen
- [ ] Rüstung
- [ ] Heilung
- [ ] Nachschub
- [ ] Verbindung mit Backpack und Lagern

---

# Phase 5 – Claims als echtes Territorialsystem

**Priorität: 🟠 hoch**

Das vorhandene Claims-System soll stärker mit dem Siedler-Gameplay verbunden werden.

- [ ] Siedlungsgebiet
- [ ] Erweiterbare Grenzen
- [ ] Grenzmarker
- [ ] Grenzstatus
- [ ] Besitzwechsel
- [ ] Neutralgebiet
- [ ] Militärische Besetzung
- [ ] Claims durch Siedlungsfortschritt erweitern
- [ ] Ressourcen innerhalb eines Gebiets erfassen
- [ ] Schutz abhängig von Team-/Diplomatiestatus

## Grenzlogik

`Siedlung → Territorium → Außenposten → Grenzgebiet → feindliches Gebiet`

---

# Phase 6 – Diplomatie und Politik

**Priorität: 🟠 hoch**

Die vorhandenen Teams werden zu politischen Fraktionen erweitert.

- [ ] Bündnisse
- [ ] Kriegserklärungen
- [ ] Neutralität
- [ ] Nichtangriffspakte
- [ ] Handelsabkommen
- [ ] Beziehungen zwischen Teams
- [ ] Diplomatiestatus speichern
- [ ] Kriegsstatus sichtbar machen
- [ ] Bündnis-/Kriegsregeln mit Claims und Soldiers verbinden

---

# Phase 7 – Monster, Plünderer und Weltereignisse

**Priorität: 🟠 hoch**

Das bestehende Monster-/Pillager-System wird zu einem dynamischen PvE-System.

- [ ] Plündererlager
- [ ] Dynamische Raids
- [ ] Außenposten als echte Bedrohung
- [ ] Verstärkungssystem
- [ ] Schwierigkeitsstufen
- [ ] Belohnungen
- [ ] Gebietskontrolle durch Monster
- [ ] Ereignisse/Angriffe auf Siedlungen
- [ ] Eskalation bei schwacher Verteidigung

---

# Phase 8 – Handel

**Priorität: 🟡 mittel**

- [ ] Markt
- [ ] Spielerhandel
- [ ] Teamhandel
- [ ] Ressourcenpreise
- [ ] Handelsaufträge
- [ ] Händler-NPCs
- [ ] Handelsrouten
- [ ] Angebot/Nachfrage
- [ ] Handelsgebühren

Das Handelssystem sollte auf dem Waren-/Lagersystem aufbauen und nicht unabhängig davon entstehen.

---

# Phase 9 – Forschung und Fortschritt

**Priorität: 🟡 mittel**

- [ ] Technologie-/Fortschrittsbaum
- [ ] Militärische Upgrades
- [ ] Wirtschafts-Upgrades
- [ ] Lager-Upgrades
- [ ] Backpack-Upgrades
- [ ] Gebäude-Upgrades
- [ ] neue Einheiten freischalten
- [ ] neue Produktionsketten freischalten

---

# Phase 10 – Spieler-UI und Verwaltung

**Priorität: 🟡 mittel**

- [ ] Siedlungs-Dashboard
- [ ] Wirtschaftsübersicht
- [ ] Steuerübersicht
- [ ] Lagerübersicht
- [ ] Militärübersicht
- [ ] Claims-Karte/Übersicht
- [ ] Diplomatie-Menü
- [ ] Backpack-Menü
- [ ] Produktionsstatus
- [ ] Warnungen bei Ressourcenmangel
- [ ] Warnungen bei Angriffen

Die UI sollte möglichst einheitlich aufgebaut sein und nicht für jedes Modul ein eigenes Bedienkonzept verwenden.

---

# Phase 11 – Spielereignisse und Endgame

**Priorität: 🟡 mittel**

- [ ] Große Raids
- [ ] Grenzkriege
- [ ] Ressourcenkrisen
- [ ] Hungersnöte
- [ ] Handelsereignisse
- [ ] Belohnungsereignisse
- [ ] Eroberung von Schlüsselgebieten
- [ ] Siegbedingungen
- [ ] saisonale/optionale Ereignisse

---

# Phase 12 – Balance und Performance

**Priorität: 🟢 fortlaufend**

- [ ] Tick-Last messen
- [ ] AI-Intervalle optimieren
- [ ] Entity-Suchen minimieren
- [ ] Chunk-/Dimension-Checks
- [ ] unnötige `getEntities()`-Aufrufe reduzieren
- [ ] Daten-Caching
- [ ] regelmäßige Cleanup-Jobs
- [ ] Limits für Soldaten/Entities
- [ ] Limits für Claims
- [ ] Limits für Produktionssysteme
- [ ] Lasttests mit vielen Spielern
- [ ] Lasttests mit vielen Soldaten

---

# Phase 13 – Admin- und Debug-Werkzeuge

**Priorität: 🟢 mittel**

- [ ] `/siedler debug`
- [ ] `/siedler stats`
- [ ] `/siedler reload`
- [ ] Soldier-Debug
- [ ] Claim-Debug
- [ ] Team-Debug
- [ ] Wirtschafts-Debug
- [ ] Dynamic-Property-Diagnose
- [ ] Performance-Report
- [ ] sichere Admin-Rechte

---

# Empfohlene Reihenfolge

## Sprint 1 – Fundament

- [ ] Stabilität
- [ ] zentrale Config
- [ ] Dynamic Properties
- [ ] gemeinsame Utilities
- [ ] Versionierung

## Sprint 2 – Backpack + Logistik

- [ ] Backpack-Grundsystem
- [ ] Persistenz
- [ ] Kapazität/Stufen
- [ ] Lager-Anbindung
- [ ] Ressourcen-Transport

## Sprint 3 – Wirtschaft

- [ ] Ressourcen
- [ ] Produktionsketten
- [ ] Lager
- [ ] Verbrauch
- [ ] Steuern mit Wirtschaft verbinden

## Sprint 4 – Militär

- [ ] Soldier AI stabilisieren
- [ ] Einheitenklassen
- [ ] Gruppen
- [ ] Befehle
- [ ] Versorgung
- [ ] Garnisonen

## Sprint 5 – Territorium

- [ ] Siedlungsgebiete
- [ ] Grenzerweiterung
- [ ] Außenposten
- [ ] Gebietskontrolle

## Sprint 6 – Diplomatie + Krieg

- [ ] Beziehungen
- [ ] Bündnisse
- [ ] Krieg
- [ ] Belagerung
- [ ] Eroberung

## Sprint 7 – PvE + Events

- [ ] Plündererlager
- [ ] dynamische Raids
- [ ] Weltereignisse
- [ ] Belohnungen

## Sprint 8 – Polish

- [ ] UI
- [ ] Balance
- [ ] Performance
- [ ] Admin-Tools
- [ ] Dokumentation

---

# Architektur-Ziel

Langfristig sollte die Struktur ungefähr so aussehen:

```text
scripts/
├── core/
│   ├── config.js
│   ├── database.js
│   ├── dynamic_properties.js
│   ├── events.js
│   └── utils.js
│
├── settlement/
│   ├── index.js
│   ├── population.js
│   ├── buildings.js
│   └── professions.js
│
├── economy/
│   ├── resources.js
│   ├── production.js
│   ├── storage.js
│   ├── logistics.js
│   └── trade.js
│
├── backpack/
│   ├── index.js
│   ├── storage.js
│   ├── upgrades.js
│   └── logistics.js
│
├── teams/
├── claims/
├── diplomacy/
├── soldier/
├── monster/
├── taxes/
├── essentials/
└── ui/
```

Die tatsächliche Umstrukturierung sollte erst erfolgen, wenn die bestehenden Systeme stabil sind. Nicht funktionierende Module sollten nicht nur wegen einer schöneren Ordnerstruktur verschoben werden.

---

# Wichtigste Gameplay-Verknüpfungen

Die folgenden Verbindungen haben höchste Priorität:

```text
Backpack
   ↓
Logistik
   ↓
Lager ───→ Produktion
   ↓             ↓
Wirtschaft ←── Steuern
   ↓
Siedlung
   ↓
Bevölkerung
   ↓
Militär ───→ Soldier AI
   ↓
Claims
   ↓
Diplomatie
   ↓
Krieg
```

Damit entsteht ein Kreislauf, bei dem jedes große System einen Grund hat, mit den anderen Systemen zu interagieren.

---

# Definition of Done

Ein Feature gilt erst als fertig, wenn:

- [ ] Funktional implementiert
- [ ] Persistenz getestet
- [ ] Fehlerfälle behandelt
- [ ] Rechte geprüft
- [ ] Performance geprüft
- [ ] Mit bestehenden Systemen integriert
- [ ] UI/Feedback vorhanden, falls erforderlich
- [ ] Debug-Möglichkeit vorhanden
- [ ] Dokumentation aktualisiert

---

# Leitprinzipien

1. **Siedler-Gameplay vor Einzel-Features.**
2. **Backpack = Logistik, nicht einfach mehr Inventar.**
3. **Wirtschaft muss Ressourcen verbrauchen und produzieren.**
4. **Soldaten müssen Teil der Wirtschaft und Versorgung sein.**
5. **Claims müssen mit Siedlungen und Diplomatie verbunden sein.**
6. **Teams bilden die Grundlage für politische Beziehungen.**
7. **PvE soll die Spieler zu Expansion und Verteidigung zwingen.**
8. **Keine unnötige Tick-Last.**
9. **Persistenz und Fehlerbehandlung sind bei jedem System Pflicht.**
10. **Erst Kernmechaniken stabilisieren, dann Content und Polish hinzufügen.**

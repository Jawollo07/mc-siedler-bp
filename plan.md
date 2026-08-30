# 🏘️ Siedler Logic – Entwicklungsplan

> Roadmap für das Minecraft-Bedrock-Behavior-Pack `mc-siedler-bp`, ausgerichtet auf die Spielidee von Minecraft Siedler 3: Dorf-/Gebietsausbau, Steuereinnahmen, Rohstoff- und Ausrüstungsfortschritt, Truppen, Eroberungen und Multiplayer-Diplomatie.

Das aktuelle Projekt deckt bereits **Teams, Claims, Steuern, Spieler-Dashboard, Essentials, Monster/Pillager-System und erste Soldaten-KI** ab. Die Roadmap baut darauf auf, statt die vorhandenen Systeme parallel doppelt zu implementieren.

Die Grundidee des zugrunde liegenden Minecraft-Siedler-3-Projekts umfasst Dorfaufbau, Steuereinnahmen, Rohstoffkauf, Truppenaushebung/Ausrüstung sowie das Befreien von Räubergebieten und Angriffe zwischen Spielern. citehttps://www.youtube.com/watch?v=jJU4hFxKgUohttps://www.youtube.com/watch?v=13XBW9N57Mk

---

## 🎯 1. Gesamtziel

Siedler Logic soll sich zu einem modularen **Siedlungs-, Wirtschafts-, Militär- und Diplomatiesystem** für Minecraft Bedrock entwickeln.

Zielbild:

```text
                 SIEDLER LOGIC
                       │
       ┌───────────────┼────────────────┐
       ▼               ▼                ▼
    Siedlung         Wirtschaft       Diplomatie
       │               │                │
       ▼               ▼                ▼
    Claims          Steuern          Friendly
    Gebäude         Handel           Neutral
    Bevölkerung     Rohstoffe        Hostile
       │               │                │
       └──────────┬────┴─────────┬──────┘
                  ▼              ▼
               Militär       PvE/Events
                  │              │
           Soldaten/AI       Räuber/Monster
           Einheiten         Belagerungen
                  │
                  ▼
              Eroberung
```

---

# 📌 2. Aktueller Stand

## ✅ Bereits vorhanden

- Teams mit dauerhafter Speicherung
- Team-Mitglieder über Player-IDs
- Team-UI
- Team-Chat
- Team-Diplomatie-Grundlage (`friendly`, `neutral`, `hostile`)
- Claims und Claim-Schutz
- Claim-Grenzanzeige
- Steuerkisten und tägliche Steuern
- Spieler-Dashboard
- Homes, TPA, Spawn, Back und Admin-Essentials
- konfigurierbares Monster-System
- Pillager-Trupps
- Pillager-Außenposten-Raids
- Belagerungslogik
- erste eigene Soldier-Registry
- Soldier-Spawning
- Soldier-Level 1–3
- Soldier-Ausrüstung
- Soldier-Dynamic-Properties
- erste Soldier-AI mit Targeting, Bewegung und Angriff
- vorbereitete Ability-Cooldowns

## ⚠️ Technische Baustellen vor größeren Features

- UI und Team-Kernlogik vollständig sauber trennen
- alle Team-Abfragen zentralisieren
- vorhandene Module vollständig auf Player-IDs umstellen
- `claims/utils.js`, `taxes/*` und `teams/chat.js` von alten Name-Vergleichen bereinigen
- Diplomatie wirklich an Combat/Claims/Pillager anbinden
- Dynamic-Property-/Persistenzschema versionieren
- Modul-/Versionsverwaltung zentralisieren
- README und Projektstruktur nach jedem größeren Meilenstein aktualisieren

---

# 🧱 3. Phase I – Architektur & Stabilität

## 3.1 Zentrale Core-Services

[ ] `core/storage.js` für einheitliches Lesen/Schreiben

[ ] `core/player.js` für Player-ID, Online-Status und Hilfsfunktionen

[ ] `core/entity.js` für sichere Entity-Zugriffe

[ ] `core/time.js` für Tages-/Tick-Zeit

[ ] `core/logger.js` für einheitliche Logs und Debug-Level

[ ] Persistenzschema mit Versionsnummer

Beispiel:

```js
{
    version: 2,
    teams: {},
    relations: {},
    claims: {},
    economy: {},
    settlements: {},
    soldiers: {}
}
```

## 3.2 Datenmigration

[ ] Legacy-Teamnamen → Player-IDs vollständig migrieren

[ ] bestehende Welten sicher weiterladen können

[ ] Migrationen idempotent machen

[ ] Backup-/Rollback-Mechanismus für kritische Speicheränderungen

---

# 👥 4. Phase II – Teams & Diplomatie

## 4.1 Diplomatiesystem fertigstellen

[ ] `relations.js` als zentrale Diplomatie-API

[ ] Beziehungen symmetrisch speichern

[ ] `friendly`, `neutral`, `hostile`

[ ] Standardbeziehung = `neutral`

[ ] Beziehung zu sich selbst = `friendly`

[ ] UI für Beziehungsänderungen

[ ] Diplomatie-Befehle für Admins

Beispiele:

```text
/siedler:team_relation Rot Blau friendly
/siedler:team_relation Rot Grün neutral
/siedler:team_relation Blau Grün hostile
```

## 4.2 Diplomatie in alle Systeme integrieren

[ ] Soldier-AI greift nur `hostile` Ziele an

[ ] Claims respektieren Teambeziehungen

[ ] Handel nur bei erlaubter Beziehung

[ ] Team-Chat unabhängig von Diplomatie

[ ] PvP-Regeln anhand der Diplomatie

[ ] Pillager-/Raid-Ziele nicht gegen verbündete Teams richten

## 4.3 Spätere Diplomatieerweiterungen

[ ] Allianzen

[ ] Kriegserklärung

[ ] Waffenstillstand

[ ] Friedensvertrag

[ ] Bündnisbruch / Cooldown

[ ] Diplomatie-Historie

[ ] optional versteckte/öffentliche Beziehungen

---

# 🏠 5. Phase III – Siedlungen & Bevölkerung

Das ist eine der wichtigsten Erweiterungen, damit das Pack stärker nach einem Siedler-Spiel wirkt.

## 5.1 Siedlungen

[ ] Siedlung als eigene Datenstruktur

[ ] Siedlungsname

[ ] Siedlungszentrum

[ ] zugehöriges Team

[ ] Bevölkerung

[ ] Siedlungslevel

[ ] Besitzer/Verwalter

[ ] Siedlungsstatus

Beispiel:

```js
{
    id: "settlement-001",
    team: "Rot",
    name: "Neuhausen",
    center: { x: 100, y: 70, z: 100 },
    level: 2,
    population: 18
}
```

## 5.2 Bevölkerung

[ ] aktive Villager zählen

[ ] Bevölkerung je Siedlung

[ ] Bevölkerungswachstum

[ ] Wohnraum

[ ] Nahrungsversorgung

[ ] Bevölkerung als Basis für Steuern und Produktion

[ ] Bevölkerungs-Limits

## 5.3 Siedlungsrang

[ ] Außenposten

[ ] Dorf

[ ] größere Siedlung

[ ] Stadt

[ ] Festung

Jede Stufe kann zusätzliche Features freischalten.

---

# 🏗️ 6. Phase IV – Gebäude & Entwicklung

Das Vanilla-Minecraft-Bauen bleibt bestehen; das Pack ergänzt eine **logische Wirtschaftsschicht**.

## 6.1 Gebäude-System

[ ] Gebäude registrieren

[ ] Gebäude-ID

[ ] Gebäudetyp

[ ] Besitzerteam

[ ] Position

[ ] Level

[ ] Aktiv/Inaktiv

[ ] Produktionsfunktion

## 6.2 Sinnvolle Gebäude

[ ] Rathaus

[ ] Wohnhaus

[ ] Lager

[ ] Markt

[ ] Schmiede

[ ] Kaserne

[ ] Stall

[ ] Mühle

[ ] Bauernhof

[ ] Mine

[ ] Holzfäller

[ ] Steinbruch

[ ] Wachturm

[ ] Mauer-/Festungsmodul

## 6.3 Upgrade-System

[ ] Gebäudelevel

[ ] Baukosten

[ ] Upgrade-Kosten

[ ] Voraussetzungen

[ ] Freischaltungen

---

# 💰 7. Phase V – Wirtschaft

Das vorhandene Steuersystem soll zu einer vollständigen Team-Wirtschaft ausgebaut werden. Aktuell basieren Steuern bereits auf Dorfbewohnern in Team-Claims. citehttps://github.com/Jawollo07/mc-siedler-bp/blob/main/scripts/taxes/index.jshttps://github.com/Jawollo07/mc-siedler-bp/blob/main/scripts/taxes/taxes.js

## 7.1 Währung

[ ] Emerald als Primärwährung standardisieren

[ ] optional internes Konto ergänzen

[ ] Kontostand

[ ] Transaktionen

[ ] Ein-/Ausgabenlog

## 7.2 Rohstoffe

[ ] Holz

[ ] Stein

[ ] Kohle

[ ] Eisen

[ ] Gold

[ ] Redstone

[ ] Nahrung

[ ] Waffen-/Rüstungsressourcen

## 7.3 Handel

[ ] Team → Team Handel

[ ] Markt-UI

[ ] Kaufangebote

[ ] Verkaufsangebote

[ ] Handel nur gemäß Diplomatie

[ ] Transaktionshistorie

[ ] optional Gebühren

## 7.4 Produktionsketten

[ ] Rohstoff → Verarbeitung → Endprodukt

[ ] Produktionsgebäude

[ ] Ressourcenverbrauch

[ ] Produktionszeit

[ ] Lagerbestand

---

# ⚔️ 8. Phase VI – Militärsystem

Die Soldier-Struktur existiert bereits und enthält Level, Stats, Ausrüstung, Owner-ID und Ability-Cooldowns. citehttps://github.com/Jawollo07/mc-siedler-bp/blob/main/scripts/soldier/config.jshttps://github.com/Jawollo07/mc-siedler-bp/blob/main/scripts/soldier/spawn.js

## 8.1 Einheitenklassen

[ ] Infanterie

[ ] Speerträger

[ ] Schwertkämpfer

[ ] Bogenschütze

[ ] Armbrustschütze

[ ] Kavallerie

[ ] schwere Infanterie

[ ] Belagerungseinheiten

## 8.2 Militär-Ränge

[ ] Rekrut

[ ] Veteran

[ ] Elite

[ ] Offizier

[ ] Hauptmann

[ ] General

## 8.3 Truppen-/Squad-System

[ ] Squad-ID

[ ] Squad-Anführer

[ ] Formation

[ ] gemeinsame Zielsuche

[ ] Befehle an komplette Truppen

[ ] Zusammenhalten / Regroup

[ ] Moral

## 8.4 Befehle

[ ] Folgen

[ ] Halten

[ ] Angreifen

[ ] Verteidigen

[ ] Rückzug

[ ] Patrouille

[ ] Position halten

[ ] Eskorte

## 8.5 Kampf

[ ] Friendly-Fire-Schutz

[ ] Diplomatie-basierte Ziele

[ ] Reichweitenlogik

[ ] Schaden/Rüstung sauber abstrahieren

[ ] Knockback

[ ] Treffer-/Angriffsanimationen

[ ] Aggro-System

---

# ✨ 9. Phase VII – Soldier Abilities

[ ] eigenes Ability-Registry-System

[ ] aktive Abilities

[ ] passive Abilities

[ ] Cooldowns

[ ] Ability-Zustände

[ ] Level-Freischaltungen

Sinnvolle erste Abilities:

```text
Charge
Battle Cry
Shield Bash
Second Wind
Iron Will
Sprint
Heal
Taunt
Volley
Area Attack
```

## 9.1 Ability-Architektur

```text
config.js
   ↓
ability ID
   ↓
abilities/registry.js
   ↓
ability implementation
   ↓
Soldier AI / Player Command
```

## 9.2 Später

[ ] Ability-Upgrades

[ ] Klassen-spezifische Abilities

[ ] passive Skill-Bäume

[ ] Erfahrungspunkte

[ ] Freischaltbedingungen

---

# 🧠 10. Phase VIII – Bessere Soldier-AI

Die aktuelle AI besitzt bereits Targeting, Bewegung, Angriff und vorbereitete Zustände. citehttps://github.com/Jawollo07/mc-siedler-bp/blob/main/scripts/soldier/ai.js

## 10.1 Decision Engine

[ ] HP berücksichtigen

[ ] Distanz berücksichtigen

[ ] Anzahl Gegner berücksichtigen

[ ] Teambeziehung berücksichtigen

[ ] Abilities berücksichtigen

[ ] Claim-Kontext berücksichtigen

[ ] Zielprioritäten

## 10.2 Pathfinding

[ ] Hindernisse erkennen

[ ] Höhenunterschiede berücksichtigen

[ ] Wasser berücksichtigen

[ ] Türen/Engstellen berücksichtigen

[ ] Fallback bei nicht erreichbarem Ziel

## 10.3 Verhalten

[ ] Formation halten

[ ] Ziel nicht ständig wechseln

[ ] Verwundete Einheiten zurückziehen

[ ] Schutz eigener Spieler

[ ] Verteidigung eigener Claims

[ ] Angriff feindlicher Claims

---

# 🏰 11. Phase IX – Claims als strategische Gebiete

Die Claims sollen von einem reinen Schutzsystem zu einer strategischen Gebietsschicht werden.

[ ] Claim-Level

[ ] Claim-Kategorie

[ ] Grenz-/Frontstatus

[ ] militärische Präsenz

[ ] Verteidigungswert

[ ] wirtschaftlicher Wert

[ ] Ressourcen im Gebiet

[ ] Gebietsboni

[ ] strategische Punkte

## 11.1 Eroberung

[ ] Claim kann umkämpft sein

[ ] Angreifer-/Verteidigerstatus

[ ] Belagerungsphase

[ ] Eroberungsfortschritt

[ ] Siegbedingungen

[ ] Eroberung abbrechen

[ ] Cooldown nach Eroberung

---

# 🏴 12. Phase X – Räuber & PvE-Ereignisse

Das vorhandene Monster-/Pillager-System bietet bereits Trupps, Außenposten und Belagerungslogik. citehttps://github.com/Jawollo07/mc-siedler-bp/blob/main/scripts/monster/config.jshttps://github.com/Jawollo07/mc-siedler-bp/blob/main/scripts/monster/pillager_squads.jshttps://github.com/Jawollo07/mc-siedler-bp/blob/main/scripts/monster/outpost_raids.js

## 12.1 Räuber-System

[ ] Räuber als eigene Fraktion

[ ] neutrale Räuber

[ ] Räuberlager

[ ] Räuberhauptlager

[ ] Räuberpatrouillen

[ ] Beute

[ ] Gefangene / Befreiung

## 12.2 Ereignisse

[ ] Räuberangriff

[ ] Karawane

[ ] Händler

[ ] Rohstoffvorkommen

[ ] Seuche / Versorgungskrise

[ ] Hungersnot

[ ] Überfall

[ ] seltene Welt-Events

---

# 🚢 13. Phase XI – Handel & Transport

Optional als spätere große Erweiterung.

[ ] Handelsrouten

[ ] Transportaufträge

[ ] Karawanen

[ ] Marktzentren

[ ] Hafen-/Schiffssystem, falls das zugrunde liegende Serverprojekt dies benötigt

[ ] Handelsrisiko

[ ] Eskorte durch Soldaten

---

# 📊 14. Phase XII – Fortschritt & Forschung

[ ] Technologie-/Entwicklungsbaum

[ ] Militärtechnologie

[ ] Wirtschaftstechnologie

[ ] Verteidigungstechnologie

[ ] Landwirtschaft

[ ] Handel

[ ] freischaltbare Gebäude

[ ] freischaltbare Einheiten

[ ] freischaltbare Abilities

---

# 🖥️ 15. Phase XIII – Zentrales Siedler-UI

Das bestehende Spieler-Dashboard soll zur zentralen Oberfläche ausgebaut werden. Aktuell existieren bereits Profil-, Team-, Claim-, Steuer- und Server-Statistikseiten. citehttps://github.com/Jawollo07/mc-siedler-bp/blob/main/scripts/essentials/player_stats.js

Ziel:

```text
/siedler:menu
│
├── Mein Profil
├── Meine Siedlung
├── Team
│   ├── Mitglieder
│   ├── Diplomatie
│   └── Verwaltung
├── Wirtschaft
│   ├── Konto
│   ├── Steuern
│   ├── Rohstoffe
│   └── Handel
├── Militär
│   ├── Truppen
│   ├── Soldaten
│   └── Befehle
├── Gebiete
│   ├── Claims
│   ├── Grenzen
│   └── Eroberungen
├── Ereignisse
└── Statistik
```

## 15.1 UI-Grundsätze

[ ] keine Logik in UI-Dateien

[ ] UI greift nur auf Services zu

[ ] Dropdowns für Teams/Spieler

[ ] klare Farbkonventionen

[ ] Fehlerbehandlung bei geschlossenen/ungültigen Forms

[ ] Zurück-Navigation

[ ] Aktualisieren-Buttons

---

# 🔐 16. Phase XIV – Rechte & Rollen

[ ] Owner

[ ] Bürgermeister / Leader

[ ] Offizier

[ ] Bürger

[ ] Soldat

[ ] Gast

[ ] Admin

Rechte sollen getrennt sein von Minecraft-OP-Rechten.

Beispiel:

```text
Team
├── Leader
│   ├── Diplomatie
│   ├── Claims
│   ├── Wirtschaft
│   └── Militär
├── Officer
│   ├── Militär
│   └── Verteidigung
└── Member
    ├── Team-Info
    └── Team-Chat
```

---

# 📈 17. Phase XV – Statistik & Logging

[ ] Kills

[ ] Tode

[ ] gesammelte Ressourcen

[ ] gezahlte Steuern

[ ] erhaltene Steuern

[ ] gewonnene Schlachten

[ ] verlorene Schlachten

[ ] eroberte Claims

[ ] verlorene Claims

[ ] Soldaten rekrutiert

[ ] Soldaten verloren

[ ] Handelsvolumen

[ ] Event-Historie

---

# 🛠️ 18. Phase XVI – Admin- und Debug-Werkzeuge

[ ] `/siedler:debug`

[ ] Team-Daten anzeigen

[ ] Diplomatie anzeigen

[ ] Claim-Daten anzeigen

[ ] Economy-Daten anzeigen

[ ] Soldier-Daten anzeigen

[ ] Entity-/Registry-Status

[ ] Dynamic-Property-Status

[ ] AI-Debug-Overlay

[ ] Test-Spawns

[ ] Test-Events

[ ] Test-Reset für einzelne Systeme

---

# ⚡ 19. Phase XVII – Performance

Da mehrere Systeme regelmäßig Entities und Claims scannen, ist Performance ein eigenes Arbeitspaket. Beispiele dafür finden sich bereits in Claim- und Pillager-Logik. citehttps://github.com/Jawollo07/mc-siedler-bp/blob/main/scripts/claims/utils.jshttps://github.com/Jawollo07/mc-siedler-bp/blob/main/scripts/monster/pillager_squads.js

[ ] Entity-Scans zentralisieren

[ ] räumliche Caches

[ ] Target-Caches

[ ] Claims cachen

[ ] nur geänderte Daten speichern

[ ] Intervalle staffeln

[ ] große Scans zeitlich verteilen

[ ] maximale Entity-/Squad-Limits

[ ] Memory-Leaks prüfen

[ ] ungültige Entity-Referenzen regelmäßig bereinigen

---

# 🧪 20. Phase XVIII – Testsystem

[ ] Unit-nahe Tests für pure Utilities

[ ] Testwelt für Teams

[ ] Testwelt für Claims

[ ] Testwelt für Soldaten

[ ] Diplomatie-Tests

[ ] Respawn-/Disconnect-Tests

[ ] Offline-Spieler-Tests

[ ] Migrationstests

[ ] Server-Neustarttests

[ ] große Spieler-/Entity-Zahlen testen

---

# 📚 21. Phase XIX – Dokumentation

[ ] README aktualisieren

[ ] Architekturdiagramm

[ ] Datenmodell dokumentieren

[ ] Command-Referenz

[ ] UI-Referenz

[ ] Config-Referenz

[ ] API-/Service-Referenz

[ ] Migrationen dokumentieren

[ ] Changelog

[ ] Versionsschema vereinheitlichen

---

# 🚀 22. Empfohlene Reihenfolge

Nicht alles gleichzeitig entwickeln. Die folgende Reihenfolge minimiert spätere Umbauten:

### Milestone A – Grundlage

[ ] Core Storage

[ ] Player-ID überall

[ ] Team-Service

[ ] Diplomatie-Service

[ ] UI/Kernlogik trennen

### Milestone B – Militär-Grundlage

[ ] Soldier-Service

[ ] Soldier Teams

[ ] Friendly/Neutral/Hostile in AI

[ ] Squad-System

[ ] Basis-Abilities

### Milestone C – Siedlung

[ ] Siedlungen

[ ] Bevölkerung

[ ] Gebäude-Registry

[ ] Siedlungslevel

### Milestone D – Wirtschaft

[ ] Konten

[ ] Ressourcen

[ ] Handel

[ ] Produktionsketten

### Milestone E – Krieg

[ ] Claim-Eroberung

[ ] Belagerungen

[ ] militärische Befehle

[ ] Verteidigungslogik

### Milestone F – PvE

[ ] Räuberfraktion

[ ] Ereignisse

[ ] Belohnungen

### Milestone G – Polish

[ ] Zentrales UI

[ ] Statistiken

[ ] Admin-Tools

[ ] Performance

[ ] Tests

[ ] Dokumentation

---

# 🏆 23. Prioritäten

## 🔴 Sehr wichtig

- Teams + Player-IDs vollständig zentralisieren
- Diplomatie
- Soldier-Team-Zuordnung
- Friendly/Neutral/Hostile
- Soldier-Abilities
- Squad-/Befehls-System
- Siedlungen
- Bevölkerung
- Wirtschaft
- Claim-Eroberung

## 🟠 Wichtig

- Gebäude-Registry
- Ressourcen-/Produktionssystem
- Handel
- Räuberfraktion
- Events
- Rollen/Rechte
- zentrales UI

## 🟡 Später

- Technologiebaum
- Handelsrouten
- Karawanen
- Schiffe
- komplexe Belagerungswaffen
- umfangreiche Statistiken

## 🟢 Optional

- saisonale Events
- Achievements
- Ranglisten
- kosmetische UI-Erweiterungen

---

# ✅ Definition of Done pro Feature

Ein Feature gilt erst als fertig, wenn:

[ ] Funktion implementiert

[ ] Persistenz implementiert

[ ] Fehlerfälle behandelt

[ ] Offline-/Reconnect-Verhalten geprüft

[ ] UI/Befehl vorhanden, sofern erforderlich

[ ] Berechtigungen geprüft

[ ] Performance geprüft

[ ] Logs sinnvoll

[ ] bestehende Systeme nicht gebrochen

[ ] README/Changelog aktualisiert

---

# 🔗 Relevante Projektquellen

- Repository: https://github.com/Jawollo07/mc-siedler-bp
- Aktuelle Architektur und Features: README.md
- Minecraft Siedler 3 Projektbeschreibung von Crocodileandy: urlYouTube – Ein neuer Anfanghttps://www.youtube.com/watch?v=jJU4hFxKgUo
- Minecraft Siedler 3 Projektbeschreibung / Räuber: urlYouTube – Die Raubritterhttps://www.youtube.com/watch?v=13XBW9N57Mk

> Hinweis: Diese Roadmap ist bewusst auf das beobachtbare Spielkonzept ausgerichtet und soll die bestehenden Systeme des Repositories schrittweise zu einem zusammenhängenden Siedler-Gameplay ausbauen.

# 🏘️ Siedler Logic

> Modulares Minecraft-Bedrock-Behavior-Pack für das Minecraft-Siedler-Projekt – mit Teams, Claims, Wirtschaft, Märkten, Händlern, Monstern und Soldaten.

[![Minecraft Bedrock](https://img.shields.io/badge/Minecraft%20Bedrock-1.26.0%2B-62B47A?logo=minecraft)](https://www.minecraft.net/)
[![API](https://img.shields.io/badge/%40minecraft%2Fserver-2.9.0-5C5CFF)](https://learn.microsoft.com/minecraft/creator/scriptapi/minecraft/server/minecraft-server)
[![UI API](https://img.shields.io/badge/%40minecraft%2Fserver--ui-2.1.0-5C5CFF)](https://learn.microsoft.com/minecraft/creator/scriptapi/minecraft/server-ui/minecraft-server-ui)

## 📖 Übersicht

**Siedler Logic** ist die Gameplay- und Serverlogik des Minecraft-Siedler-Projekts. Das Behavior Pack ist modular aufgebaut und wird über einen zentralen, fehlertoleranten Loader gestartet.

Aktuelle Systeme:

- 👥 Teams und Team-Chat
- 🏠 Claims und Gebietsschutz
- 💰 Steuern und Emerald-basierte Wirtschaft
- 🏪 rechteckige Marktplätze mit Monster-Schutz
- 🧑‍🌾 vordefinierte Händler und Handelstabellen
- 👹 konfigurierbares Monster-System
- 🏴 Pillager-Trupps, Außenposten-Raids und Belagerungen
- ⚔️ Soldaten-System mit KI, Befehlen, Leveln, XP und Ausrüstung
- 🧰 Essentials, Homes, TPA und Spieler-Dashboard
- 💾 persistente Speicherung über World Dynamic Properties

Das Repository enthält die **Behavior-Pack-/Script-Seite**. Die sichtbare Darstellung eigener Entities wird vom separaten Resource Pack übernommen.

**Resource Pack:** https://github.com/Jawollo07/mc-siedler-rp

---

## ✨ Systeme

### 👥 Teams

- Teams erstellen, löschen und verwalten
- Spieler Teams zuordnen und entfernen
- Teamfarben
- Team-Chat über `@team`
- Teaminformationen und Dashboard
- persistente Speicherung
- Teambeziehungen als Grundlage für Kampf- und Soldatenlogik

### 🏠 Claims

- Gebietsschutz auf Chunk-Basis
- Claim-Limit pro Team
- Prüfung bereits belegter Chunks
- Claim-Informationen
- Verwaltung über Forms und Commands
- visuelle Claim-Grenzen
- persistente Speicherung

### 💰 Steuern & Wirtschaft

**Emeralds** sind die Standardwährung.

- Steuerkiste pro Team
- Steuerberechnung anhand der Dorfbewohner in Team-Claims
- optional fester Steuerbetrag
- automatische Auszahlung nach Minecraft-Tagen
- Benachrichtigung der Teammitglieder

### 🏪 Marktplätze

Marktplätze sind rechteckige, konfigurierbare Gebiete. Aktive Marktplätze sind von feindlichen Monstern geschützt: Monster werden beim Spawn erkannt und zusätzlich regelmäßig entfernt, wenn sie in einen Markt gelangen.

Die Konfiguration befindet sich aktuell in:

```text
scripts/market/market_place.js
```

Verwaltung:

```text
/siedler:market_status
/siedler:market_enable <id>
/siedler:market_disable <id>
/siedler:market_setcorner1 <id>
/siedler:market_setcorner2 <id>
/siedler:market_cleanup
```

### 🧑‍🌾 Händler

Händler werden als `siedler:trader` gespawnt und erhalten abhängig vom Typ ihre jeweilige Handelstabelle.

| Typ | Händler |
|---|---|
| `food` | Lebensmittelhändler |
| `building` | Baustoffhändler |
| `resources` | Rohstoffhändler |
| `tools` | Werkzeughändler |
| `weapons` | Waffenhändler |
| `supplies` | Versorgungshändler |

Commands:

```text
/siedler:trader <type>
/siedler:trader_here <type>
/siedler:trader_types
/siedler:trader_remove
```

Die Handelstabellen liegen unter `trading/`.

### ⚔️ Soldaten

Das Soldaten-System stellt steuerbare `siedler:soldier`-Einheiten mit eigener KI bereit.

Aktuell vorhanden:

- Besitzerzuordnung über `player.id`
- Zielsuche und Kampf-KI
- Teambeziehungen bei der Zielauswahl
- Zustände `idle`, `attack`, `follow`, `move`, `retreat`
- Bewegungs- und Befehlslogik
- Infanterie als aktueller Einheitentyp
- Level 1–3
- persistente Soldaten-XP über Entity Dynamic Properties
- XP für erfolgreiche Treffer und Kills
- automatische Beförderung bei Erreichen der XP-Schwellen
- Level-Up aktualisiert HP, Schaden, Reichweite, Geschwindigkeit, Fähigkeiten und Ausrüstung
- Beförderungsbenachrichtigung an den Besitzer
- Waffen, Schild und Rüstung
- Fähigkeiten auf höheren Stufen

### ⚔️ Soldaten-Level & Erfahrung

Die aktuelle Infanterie besitzt drei Erfahrungsstufen:

| Level | Bezeichnung | benötigte Gesamt-XP | HP | Schaden | Geschwindigkeit |
|---|---|---:|---:|---:|---:|
| 1 | Rekrut | 0 | 30 | 4 | 0,25 |
| 2 | Veteran | 100 | 40 | 6 | 0,28 |
| 3 | Elite | 300 | 55 | 8 | 0,32 |

XP-Quellen:

- **+5 XP** für einen erfolgreichen Treffer
- **+50 XP** für einen Kill

Die XP werden auf dem Soldaten gespeichert. Dadurch bleibt der Fortschritt auch nach einem Server-/Script-Neustart erhalten. Das aktuell konfigurierte Maximum ist Level 3; weitere Einheitentypen können später eigene Levelkurven erhalten.

Beim Level-Up werden die Werte aus `config.js` übernommen und die Ausrüstung des neuen Levels erneut angewendet.

Beispielbefehle:

```text
/siedler:soldier_info
/siedler:soldier_xp <Amount>
```

`/siedler:soldier_xp` ist primär für Administration und Tests gedacht.

Beispiel:

```text
/siedler:spawn_soldier infantry 1
```

Weitere Befehle:

```text
/siedler:move <x y z>
/siedler:follow
/siedler:stay
/siedler:attack [Radius]
/siedler:defend [Radius]
/siedler:patrol <x y z>
/siedler:stop
```

Konfiguration:

```text
scripts/soldier/config.js
scripts/soldier/level.js
```

Die Darstellung der Entity kommt aus dem Resource Pack.

### 👹 Monster & Pillager

Das Monster-System besitzt eine zentrale, speicherbare Konfiguration und unterstützt unter anderem:

- globale Spawnrate
- individuelle Spawnchancen
- Nacht-Multiplikator
- Claim-Regeln
- Monster-Tokens
- Pillager-Trupps
- Pillager-Captains
- Vindicators und Ravager
- eigene Pillager-KI
- Außenposten-Raids
- Belagerungen gegnerischer Gebiete
- Laufzeit-Konfiguration

---

## 📦 Installation

### Voraussetzungen

| Komponente | Version |
|---|---|
| Minecraft Bedrock | `1.26.0+` |
| `@minecraft/server` | `2.9.0` |
| `@minecraft/server-ui` | `2.1.0` |
| Script Entry Point | `scripts/core/main.js` |

### Behavior Pack installieren

```bash
git clone https://github.com/Jawollo07/mc-siedler-bp.git
cd mc-siedler-bp
```

Der Repository-Ordner ist das Behavior Pack. Binde ihn in die gewünschte Bedrock-Welt bzw. den Server ein und aktiviere das Pack.

Der **aktuelle** Script-Einstiegspunkt ist:

```text
scripts/core/main.js
```

> Ältere Dokumentation kann noch `scripts/main.js` nennen. Das ist nicht mehr der aktuelle Einstiegspunkt.

Für `siedler:soldier` und `siedler:trader` wird zusätzlich das Resource Pack benötigt:

```text
https://github.com/Jawollo07/mc-siedler-rp
```

Nach Änderungen an Scripts, Custom Commands oder Entity-Definitionen sollte die Welt bzw. der Server vollständig neu geladen werden.

---

## 🧩 Architektur

Der zentrale Loader lädt die Module in definierter Reihenfolge. Dynamic Properties werden vor den Modulen initialisiert, die sie verwenden.

```text
scripts/core/main.js
│
├── Core
│   ├── Dynamic Properties
│   └── Version
│
├── Teams
│   ├── Team-System
│   └── Team-Chat
│
├── Economy
│   └── Steuern
│
├── Claims
│   ├── Verwaltung
│   ├── Schutz
│   └── Anzeige
│
├── Market
│   ├── Marktplätze
│   ├── Monster-Schutz
│   └── Händler
│
├── Monster
│   ├── Konfiguration
│   ├── Tokens
│   ├── Pillager-Trupps
│   ├── Außenposten-Raids
│   └── Commands
│
├── Essentials
│   ├── Spielerfunktionen
│   └── Dashboard
│
└── Soldier
    ├── Commands
    ├── Spawn
    ├── KI
    ├── Command Manager
    ├── Gruppen
    ├── Level / XP
    └── Konfiguration
```

Der Loader schützt die Startup-Sequenz vor nicht-kritischen Fehlern und besitzt einen Watchdog für ungewöhnlich lange Initialisierung.

---

## 🗂️ Projektstruktur

```text
mc-siedler-bp/
├── manifest.json
├── README.md
├── plan.md
├── entities/
│   ├── soldier.json
│   └── trader.json
├── trading/
│   └── siedler_trader_*.json
└── scripts/
    ├── core/
    │   ├── main.js
    │   ├── dynamic_properties.js
    │   └── version.js
    ├── teams/
    ├── claims/
    ├── taxes/
    ├── market/
    ├── monster/
    ├── essentials/
    └── soldier/
        ├── index.js
        ├── ai.js
        ├── commands.js
        ├── command_manager.js
        ├── groups.js
        ├── level.js
        ├── config.js
        ├── spawn.js
        └── ui.js
```

Die README dokumentiert die Architektur auf Modulebene; einzelne Dateien können sich während der Entwicklung weiter verändern.

---

## 🎮 Commands

### Teams

```text
/siedler:team
/siedler:team_create <name> [farbe]
/siedler:team_add <spieler> <team>
/siedler:team_remove <spieler> <team>
/siedler:team_delete <team>
/siedler:team_list
/siedler:team_settax <team> <x> <y> <z> [amount]
```

### Claims

```text
/siedler:claim
/siedler:claim_set <team>
/siedler:claim_remove <team>
/siedler:claim_info
/siedler:claim_list
```

### Essentials

```text
/siedler:stats
/siedler:spawn
/siedler:sethome
/siedler:home
/siedler:delhome
/siedler:tpa
/siedler:tpaccept
/siedler:tpdeny
/siedler:msg
/siedler:back
```

Zusätzlich existieren administrative Funktionen wie Heal, Food, Godmode, Flugmodus, Inventarverwaltung sowie Zeit- und Wettersteuerung.

### Team-Chat

```text
@team Hallo zusammen!
```

### Monster

```text
/siedler:monster_status
/siedler:monster_enable
/siedler:monster_disable
/siedler:monster_pillager on|off
/siedler:monster_outpost on|off
/siedler:monster_siege on|off
/siedler:monster_spawn <1-32>
/siedler:monster_clear
/siedler:monster_reload
/siedler:monster_save
/siedler:monster_get <path>
/siedler:monster_set <path> <value>
```

### Markt

```text
/siedler:market_status
/siedler:market_enable <id>
/siedler:market_disable <id>
/siedler:market_setcorner1 <id>
/siedler:market_setcorner2 <id>
/siedler:market_cleanup
```

### Händler

```text
/siedler:trader <type>
/siedler:trader_here <type>
/siedler:trader_types
/siedler:trader_remove
```

### Soldaten

```text
/siedler:spawn_soldier <type> [level]
/siedler:soldier_info
/siedler:soldier_xp <Amount>
/siedler:move <x y z>
/siedler:follow
/siedler:stay
/siedler:attack [Radius]
/siedler:defend [Radius]
/siedler:patrol <x y z>
/siedler:stop
```

> Administrative Custom Commands verwenden aktuell `GameDirectors` als Berechtigungsebene.

---

## ⚔️ Soldaten – aktuelle Werte

Der derzeit konfigurierte Einheitentyp ist **Infanterie**.

| Level | Bezeichnung | HP | Schaden | Geschwindigkeit | Kosten | XP für Level |
|---|---|---:|---:|---:|---:|---:|
| 1 | Rekrut | 30 | 4 | 0,25 | 8 Emeralds | 0 |
| 2 | Veteran | 40 | 6 | 0,28 | 18 Emeralds | 100 |
| 3 | Elite | 55 | 8 | 0,32 | 35 Emeralds | 300 |

Höhere Stufen erhalten bessere Ausrüstung und zusätzliche Fähigkeiten wie **Kampfschrei**, **Schildstoß**, **Zweiter Wind** und **Eiserner Wille**.

---

## 🏴 Pillager-Trupps

Die Trupp-Konfiguration unterstützt organisierte feindliche Einheiten.

Typische Parameter umfassen:

- Truppgröße
- maximale Anzahl aktiver Trupps
- Spawnchance
- Outpost-Spawnchance
- Mindest-/Maximaldistanz
- Lebensdauer
- KI-Intervall
- Nah- und Fernkampfreichweite
- Zusammensetzung aus Pillagern, Captains, Vindicators und Ravagern

Die zentrale Konfiguration befindet sich im Monster-Modul.

---

## 💾 Speicherung

Persistente Daten werden über **World Dynamic Properties** gespeichert.

Dazu gehören je nach System unter anderem:

- Teams
- Claims
- Homes
- Todespunkte
- Monster-Konfiguration
- Soldaten-XP
- weitere serverweite Zustände

Bei größeren Änderungen an Datenstrukturen sollte ein Server-/Welt-Backup erstellt werden.

---

## 🔐 Berechtigungen

| Bereich | Standardberechtigung |
|---|---|
| Spieler-Dashboard | Spieler |
| Claim-Menü | Spieler |
| Team-Verwaltung | Game Director / OP |
| Claim-Verwaltung per Command | Game Director / OP |
| Marktverwaltung | Game Director / OP |
| Händler spawnen/entfernen | Game Director / OP |
| Soldatenbefehle | Game Director / OP |
| Monsterverwaltung | Game Director / OP |

Die tatsächliche Berechtigung richtet sich nach der jeweiligen Command-Registrierung im aktuellen Code.

---

## 🛠️ Entwicklung

### Technologie

- Minecraft Bedrock Script API
- JavaScript / ECMAScript
- `@minecraft/server`
- `@minecraft/server-ui`
- Entity JSON
- World Dynamic Properties

### Entwicklungsregeln

Neue Systeme sollten möglichst:

1. in einem eigenen Modul unter `scripts/` liegen,
2. einen klaren Einstiegspunkt besitzen,
3. Abhängigkeiten möglichst gering halten,
4. über `scripts/core/main.js` geladen werden,
5. nicht-kritische Fehler lokal behandeln.

### Aktueller Manifeststand

```text
Pack-Version: 1.1.4
@minecraft/server: 2.9.0
@minecraft/server-ui: 2.1.0
Minimum Engine: 1.26.0
Entry Point: scripts/core/main.js
```

Die Script-Version wird zusätzlich über `scripts/core/version.js` geführt.

---

## ⚠️ Hinweise

- Das Projekt befindet sich aktiv in Entwicklung.
- Behavior Pack und Resource Pack müssen bei Custom Entities zusammenpassen.
- Änderungen an Entity-, Command- oder Script-Definitionen erfordern häufig einen vollständigen Reload.
- Die Darstellung von `siedler:soldier` und `siedler:trader` wird vom Resource Pack bestimmt.
- Die README beschreibt den aktuellen Entwicklungsstand und sollte bei größeren Architekturänderungen aktualisiert werden.

---

## 🗺️ Roadmap

Die detaillierte Planung befindet sich in [`plan.md`](plan.md).

Aktuelle Ausbauziele umfassen insbesondere:

- natürlichere Soldatenbewegung und Kampf-KI
- Ausbau des Soldier-XP-Systems um weitere Einheitentypen und Levelkurven
- Beförderungen und später militärische Ränge
- Unterhalt und Versorgung der Soldaten
- vollständige Gruppen-/Auswahlsteuerung
- Ausbau der Teambeziehungen
- weitere Händler und Waren
- stärkeres Siedler-3-inspiriertes Wirtschaftssystem
- Ausbau von Märkten und Handelsrouten
- engere Verbindung von Claims, Wirtschaft und Militär
- Ausbau und Stabilisierung des Resource Packs

---

## 🤝 Mitwirken

Issues, Fehlerberichte und Pull Requests sind willkommen.

Bei Fehlern möglichst angeben:

- Minecraft-Bedrock-Version
- Server-/Client-Umgebung
- Behavior-Pack-Version
- betroffene Funktion bzw. Command
- relevante Logausgabe
- reproduzierbare Schritte

---

## 🔗 Projekte

- **Behavior Pack:** https://github.com/Jawollo07/mc-siedler-bp
- **Resource Pack:** https://github.com/Jawollo07/mc-siedler-rp

---

**Siedler Logic** – Gameplay-, Wirtschafts-, Militär- und Serverlogik für das Minecraft-Siedler-Projekt. 🏘️

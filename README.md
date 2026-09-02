# 🏘️ Siedler Logic

> Modulares Minecraft-Bedrock-Behavior-Pack für das Minecraft-Siedler-Projekt – mit Teams, Claims, Wirtschaft, Märkten, Händlern, Monstern und Soldaten.

**Behavior Pack:** urlmc-siedler-bp auf GitHubhttps://github.com/Jawollo07/mc-siedler-bp  
**Resource Pack:** urlmc-siedler-rp auf GitHubhttps://github.com/Jawollo07/mc-siedler-rp

## 📖 Übersicht

Siedler Logic bildet die Gameplay- und Serverlogik des Projekts. Der aktuelle Fokus liegt auf der Verbindung von Wirtschaft, Territorium, Bevölkerung und Militär.

Aktuelle Systeme:

- 👥 Teams, Team-Chat, Farben und Beziehungen
- 🏠 Claims und visuelle Claim-Grenzen
- 💰 Emerald-basierte Wirtschaft und Steuern
- 🏪 Marktplätze und spezialisierte Händler
- ⚔️ Soldaten mit KI, Befehlen, Leveln, XP und Ausrüstung
- 🧑‍🌾 Soldatenhändler mit direkter Rekrutierungs-UI
- 🐎 Infanterie, Bogenschützen und Kavallerie
- 👹 Monster, Pillager-Trupps, Außenposten und Belagerungen
- 🧰 Essentials, Homes, TPA und Spieler-Dashboard
- 💾 persistente World Dynamic Properties

## 🧑‍🌾 Händler

Händler werden als `siedler:trader` gespawnt.

| Typ | Händler |
|---|---|
| `food` | Lebensmittelhändler |
| `building` | Baustoffhändler |
| `resources` | Rohstoffhändler |
| `tools` | Werkzeughändler |
| `weapons` | Waffenhändler |
| `supplies` | Versorgungshändler |
| `soldiers` | Soldatenhändler |

### ⚔️ Soldatenhändler

Der `soldiers`-Händler öffnet beim Interagieren eine eigene UI. Dort können die aktuell verfügbaren Einheitentypen gegen Emeralds rekrutiert werden:

| Einheit | Level 1 | Level 2 | Level 3 |
|---|---:|---:|---:|
| Infanterie | 8 | 18 | 35 |
| Bogenschütze | 10 | 22 | 40 |
| Kavallerie | 14 | 28 | 48 |

Die Preise sind in Emeralds angegeben. Höhere Level besitzen bessere Werte und Ausrüstung. Kavallerie wird beim Spawn zusätzlich auf einem Pferd erzeugt.

Der gekaufte Soldat wird über das bestehende `spawnSoldier()`-System erstellt und automatisch dem kaufenden Spieler über `player.id` zugeordnet. Bei einem fehlgeschlagenen Spawn werden die Emeralds zurückerstattet.

Soldatenhändler spawnen:

```text
/siedler:trader soldiers
/siedler:trader_here soldiers
```

Die Rekrutierungslogik liegt in:

```text
scripts/soldier/trader.js
```

## ⚔️ Soldaten

Das Soldaten-System stellt steuerbare `siedler:soldier`-Einheiten bereit.

### Einheitentypen

- **Infanterie** – robuster Nahkämpfer mit Schild und schwerer Rüstung
- **Bogenschütze** – Fernkampfeinheit mit hoher Angriffsreichweite und Bogen
- **Kavallerie** – mobiler Nahkämpfer mit Pferd und erhöhter Geschwindigkeit

Alle Typen verwenden die gemeinsame `siedler:soldier`-Entity. Der Typ wird über Konfiguration, Tags und Dynamic Properties festgelegt. Die Kavallerie erhält beim Spawn ein `minecraft:horse`-Reittier.

Gemeinsame Funktionen:

- Besitzerzuordnung über `player.id`
- Zielsuche und Kampf-KI
- Team-/Feinderkennung
- `idle`, `attack`, `follow`, `move`, `retreat`
- Move, Follow und Stay
- Level 1–7
- Soldaten-XP
- XP abhängig vom verursachten Kampfschaden
- Bonus-XP für Kills abhängig von der Gegnerstärke
- unterschiedliche HP, Geschwindigkeit, Schaden und Reichweite
- stufenweise bessere Waffen und Rüstung
- Fähigkeiten auf höheren Stufen
- direkte Rekrutierung über den Soldatenhändler

### Level-System

Soldaten starten auf Level 1 und sammeln dauerhaft XP. Ab bestimmten Gesamt-XP steigen sie automatisch auf das nächste Level auf. Dabei werden Werte, Ausrüstung und Fähigkeiten aktualisiert.

| Level | Bezeichnung | benötigte Gesamt-XP |
|---:|---|---:|
| 1 | Rekrut | 0 |
| 2 | Veteran | 150 |
| 3 | Elite | 400 |
| 4 | Hauptmann | 800 |
| 5 | Kriegsveteran | 1.400 |
| 6 | Kriegsherr | 2.200 |
| 7 | Marschall | 3.500 |

### ⚔️ XP durch Kampf

XP wird anhand des tatsächlich verursachten Schadens und der Gegnerstärke vergeben.

| Ereignis | XP |
|---|---:|
| 1–2 Schaden | 1 XP |
| 3–5 Schaden | 2–4 XP |
| 6–10 Schaden | 5–7 XP |
| 11+ Schaden | 1–8 XP, maximal 8 |
| Kill eines normalen Gegners | 25–50 XP |
| Kill eines starken Gegners | 50–75 XP |
| Kill eines sehr starken Gegners/Bosses | 75–100 XP |

Die XP wird persistent als Dynamic Property `soldier:xp` gespeichert.

Konfiguration und Logik:

```text
scripts/soldier/config.js
scripts/soldier/archer.js
scripts/soldier/cavalry.js
scripts/soldier/level.js
scripts/soldier/spawn.js
scripts/soldier/trader.js
```

## 💰 Wirtschaft & Handel

**Emeralds** sind die Standardwährung. Die Handelstabellen sind zunehmend auf unverarbeitete Waren ausgerichtet:

- Holz und Baumaterialien
- Stein, Cobblestone, Sand, Gravel und Lehm
- Kohle und Erze
- Getreide, Gemüse und Lebensmittel
- Samen und landwirtschaftliche Rohstoffe
- Leder, Wolle, Federn, Eier und weitere Tierprodukte

Ziel der Wirtschaft ist eine Siedler-3-artige Kette:

`Rohstoff → Produktion → Verarbeitung → Handel → Militär / Ausbau`

## 🏠 Claims & Teams

Claims arbeiten auf Chunk-Basis. Teams werden persistent gespeichert und besitzen die Beziehungen `friendly`, `neutral` und `hostile`. Diese Beziehungen bilden die Grundlage für zukünftige Diplomatie und militärische Entscheidungen.

## 👹 Monster & Bedrohungen

Das Monster-System unterstützt Spawn-Konfiguration, Nacht-Multiplikator, Monster-Tokens, Pillager-Trupps, Captains, Vindicators, Ravager, Außenposten-Raids, Belagerungen und Marktplatz-Schutz.

## 📦 Installation

| Komponente | Stand |
|---|---|
| Minecraft Bedrock | `1.26.0+` |
| `@minecraft/server` | `2.9.0` |
| `@minecraft/server-ui` | `2.1.0` |
| Entry Point | `scripts/core/main.js` |

Nach Änderungen an Scripts, Commands oder Entity-Definitionen sollte der Server bzw. die Welt vollständig neu geladen werden.

## 🧩 Architektur

```text
scripts/core/main.js
│
├── Core
├── Teams
├── Economy
├── Claims
├── Market
│   ├── Marktplätze
│   ├── Händler
│   └── Händler-Commands
├── Monster
├── Essentials
└── Soldier
    ├── index.js
    ├── ai.js
    ├── archer.js
    ├── cavalry.js
    ├── commands.js
    ├── command_manager.js
    ├── config.js
    ├── level.js
    ├── spawn.js
    └── trader.js
```

## 🎮 Wichtige Commands

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
/siedler:move <x y z>
/siedler:follow
/siedler:stay
```

Für die Einheitentypen können unter anderem `infantry`, `archer` und `cavalry` verwendet werden.

## 🛠️ Entwicklung

Neue Systeme sollten möglichst in eigenen Modulen unter `scripts/` liegen, über `scripts/core/main.js` geladen werden und bestehende Systeme wiederverwenden. Nicht-kritische Fehler sollen lokal behandelt werden.

Die detaillierte Planung befindet sich in [`plan.md`](plan.md).

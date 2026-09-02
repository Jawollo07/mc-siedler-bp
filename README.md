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

Der `soldiers`-Händler öffnet beim Interagieren eine eigene UI. Der Spieler kann Infanterie direkt gegen Emeralds rekrutieren.

| Einheit | Level | Kosten |
|---|---:|---:|
| Rekrut | 1 | 8 Emeralds |
| Veteran | 2 | 18 Emeralds |
| Elite | 3 | 35 Emeralds |

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

- Besitzerzuordnung über `player.id`
- Zielsuche und Kampf-KI
- Team-/Feinderkennung
- `idle`, `attack`, `follow`, `move`, `retreat`
- Move, Follow und Stay
- Infanterie
- Level 1–7
- Soldaten-XP
- XP abhängig vom verursachten Kampfschaden
- Bonus-XP für Kills abhängig von der Gegnerstärke
- unterschiedliche HP, Geschwindigkeit und Schaden
- stufenweise bessere Waffen, Schilde und Rüstung
- Fähigkeiten auf höheren Stufen
- direkte Rekrutierung über den Soldatenhändler

### Level-System

Soldaten starten auf Level 1 und sammeln dauerhaft XP. Ab bestimmten Gesamt-XP steigen sie automatisch auf das nächste Level auf. Dabei werden Werte, Ausrüstung und Fähigkeiten aktualisiert.

| Level | Bezeichnung | benötigte Gesamt-XP | HP | Schaden | Geschwindigkeit |
|---:|---|---:|---:|---:|---:|
| 1 | Rekrut | 0 | 30 | 4 | 0,25 |
| 2 | Veteran | 150 | 40 | 6 | 0,28 |
| 3 | Elite | 400 | 55 | 8 | 0,32 |
| 4 | Hauptmann | 800 | 65 | 10 | 0,34 |
| 5 | Kriegsveteran | 1.400 | 75 | 12 | 0,36 |
| 6 | Kriegsherr | 2.200 | 85 | 14 | 0,38 |
| 7 | Marschall | 3.500 | 100 | 16 | 0,40 |

### ⚔️ XP durch Kampf

XP wird nicht mehr pauschal pro Treffer vergeben, sondern anhand des tatsächlich verursachten Schadens. Der letzte Treffer eines Gegners wird als Kill gewertet und erhält keine zusätzliche Treffer-XP.

| Ereignis | XP |
|---|---:|
| 1–2 Schaden | 1 XP |
| 3–5 Schaden | 2–4 XP |
| 6–10 Schaden | 5–7 XP |
| 11+ Schaden | 1–8 XP, maximal 8 |
| Kill eines normalen Gegners | 25–50 XP |
| Kill eines starken Gegners | 50–75 XP |
| Kill eines sehr starken Gegners/Bosses | 75–100 XP |

Starke Gegner werden unter anderem über Vindicator, Evoker, Ravager, Warden, Elder Guardian und Piglin Brute erkannt. Ender Dragon und Wither gelten als Bosse. Zusätzlich können eigene Entities über die Tags `soldier_xp_strong`, `strong`, `soldier_xp_boss`, `boss` oder `very_strong` klassifiziert werden. Als Fallback wird die maximale Lebenspunktzahl berücksichtigt.

Die XP wird persistent als Dynamic Property `soldier:xp` gespeichert.

Konfiguration und Logik:

```text
scripts/soldier/config.js
scripts/soldier/level.js
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

Das Monster-System unterstützt unter anderem Spawn-Konfiguration, Nacht-Multiplikator, Monster-Tokens, Pillager-Trupps, Captains, Vindicators, Ravager, Außenposten-Raids, Belagerungen und Marktplatz-Schutz.

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

## 🛠️ Entwicklung

Neue Systeme sollten möglichst in eigenen Modulen unter `scripts/` liegen, über `scripts/core/main.js` geladen werden und bestehende Systeme wiederverwenden. Nicht-kritische Fehler sollen lokal behandelt werden.

Die detaillierte Planung befindet sich in [`plan.md`](plan.md).

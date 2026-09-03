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

Händler werden als `siedler:trader` gespawnt. Es gibt sieben vordefinierte Rollen:

| Typ | Händler | Visual-Tag |
|---|---|---|
| `food` | Lebensmittelhändler | `trader_food` |
| `building` | Baustoffhändler | `trader_building` |
| `resources` | Rohstoffhändler | `trader_resources` |
| `tools` | Werkzeughändler | `trader_tools` |
| `weapons` | Waffenhändler | `trader_weapons` |
| `supplies` | Versorgungshändler | `trader_supplies` |
| `soldiers` | Soldatenhändler | `trader_soldiers` |

Beim Spawnen wird der Variant-Tag automatisch gesetzt. Das Resource Pack verwendet ihn, um die passende Händlerdarstellung auszuwählen.

Die Händler sind nach dem Siedler-3-Prinzip spezialisiert: unverarbeitete Rohstoffe und Versorgungsgüter werden über unterschiedliche Händler gehandelt, während Waffen und Soldaten getrennte militärische Angebote bilden. **Emeralds** sind die Standardwährung.

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

## ⚔️ Soldaten

Das Soldaten-System stellt steuerbare Einheiten bereit.

### Einheitentypen

- **Infanterie** – robuster Nahkämpfer mit Schild und schwerer Rüstung
- **Bogenschütze** – Fernkampfeinheit mit hoher Angriffsreichweite und Bogen
- **Kavallerie** – mobiler Nahkämpfer mit Pferd und erhöhter Geschwindigkeit

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

## 🏠 Claims & Teams

Claims arbeiten auf Chunk-Basis. Teams werden persistent gespeichert und besitzen die Beziehungen `friendly`, `neutral` und `hostile`.

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

Verfügbare Typen: `food`, `building`, `resources`, `tools`, `weapons`, `supplies`, `soldiers`.

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

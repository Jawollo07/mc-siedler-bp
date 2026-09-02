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
- Level 1–3
- Soldaten-XP
- unterschiedliche HP, Geschwindigkeit und Schaden
- Waffen, Schild und Rüstung
- Fähigkeiten auf höheren Stufen
- direkte Rekrutierung über den Soldatenhändler

Konfiguration:

```text
scripts/soldier/config.js
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

### Markt

```text
/siedler:market_status
/siedler:market_enable <id>
/siedler:market_disable <id>
/siedler:market_setcorner1 <id>
/siedler:market_setcorner2 <id>
/siedler:market_cleanup
```

## ⚔️ Soldaten – aktuelle Werte

| Level | Bezeichnung | HP | Schaden | Geschwindigkeit | Kosten |
|---|---|---:|---:|---:|---:|
| 1 | Rekrut | 30 | 4 | 0,25 | 8 Emeralds |
| 2 | Veteran | 40 | 6 | 0,28 | 18 Emeralds |
| 3 | Elite | 55 | 8 | 0,32 | 35 Emeralds |

## 🛠️ Entwicklung

Neue Systeme sollten möglichst in eigenen Modulen unter `scripts/` liegen, über `scripts/core/main.js` geladen werden und bestehende Systeme wiederverwenden. Nicht-kritische Fehler sollen lokal behandelt werden.

Die detaillierte Planung befindet sich in [`plan.md`](plan.md).

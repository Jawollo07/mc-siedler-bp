# 🏘️ Siedler Logic

> Modulares Minecraft-Bedrock-Behavior-Pack für das Minecraft-Siedler-Projekt – mit Teams, Claims, Wirtschaft, Märkten, Händlern, Monstern und Soldaten.

**Behavior Pack:** https://github.com/Jawollo07/mc-siedler-bp  
**Resource Pack:** https://github.com/Jawollo07/mc-siedler-rp

## 📖 Übersicht

Siedler Logic bildet die Gameplay- und Serverlogik des Projekts. Der aktuelle Fokus liegt auf der Verbindung von Wirtschaft, Territorium, Bevölkerung und Militär.

Aktuelle Systeme:

- 👥 Teams, Team-Chat, Farben und Beziehungen
- 🏠 Claims und visuelle Claim-Grenzen
- 💰 Emerald-basierte Wirtschaft, Steuern und TaxBonus-System
- 🏪 Marktplätze und spezialisierte Händler
- ⚔️ Soldaten mit KI, Befehlen, Leveln, XP und Ausrüstung
- 🧑‍🌾 Soldatenhändler mit direkter Rekrutierungs-UI
- 🐎 Infanterie, Bogenschützen und Kavallerie
- 👹 Monster, Pillager-Trupps, Außenposten und Belagerungen
- 🧰 Essentials, Homes, TPA und Spieler-Dashboard
- 💾 persistente World Dynamic Properties

## 💰 Steuern & TaxBonus

Jedes Team kann eine Steuerkiste besitzen. Die tägliche Steuer besteht aus der Bevölkerung des Teams und einem kontrollierten Bonus:

`Tagessteuer = Dorfbewohner + fester TaxBonus + Bevölkerungsbonus`

Der **feste TaxBonus** wird pro Team gespeichert und kann von `0` bis `64` Emeralds pro Tag gesetzt werden. Zusätzlich erhalten größere Siedlungen einen kleinen automatischen **Bevölkerungsbonus**:

| Dorfbewohner | Bevölkerungsbonus |
|---:|---:|
| 0–4 | +0 |
| 5–9 | +2 |
| 10–19 | +5 |
| 20–39 | +10 |
| 40+ | +15 |

Der gesamte Bonus ist auf **64 Emeralds pro Tag** begrenzt. Die komplette Tagesauszahlung eines Teams ist auf **256 Emeralds** begrenzt. Dadurch bleibt die Steuer für große Siedlungen attraktiv, ohne die Emerald-Wirtschaft unkontrolliert wachsen zu lassen.

Die Auszahlung wird außerdem über den Weltzustand gegen doppelte Auszahlungen nach Server-Neustarts abgesichert.

### TaxBonus-Commands

Alle Steuer-Commands benötigen Game-Director-Rechte:

```text
/siedler:settax <team> <x> <y> <z>
/siedler:settaxbonus <team> <bonus>
/siedler:addtaxbonus <team> <betrag>
/siedler:taxinfo <team>
/siedler:countvillagers <team>
```

`settaxbonus` ersetzt den festen Bonus. `addtaxbonus` erhöht oder verringert ihn und hält ihn automatisch innerhalb des erlaubten Bereichs. `taxinfo` zeigt die vollständige aktuelle Berechnung einschließlich Bevölkerungsbonus und Steuerkiste.

Die TaxBonus-Konfiguration befindet sich zentral in `scripts/taxes/config.js`.

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

## ⚔️ Soldaten

Das Soldaten-System stellt steuerbare Einheiten bereit.

- **Infanterie** – robuster Nahkämpfer mit Schild und schwerer Rüstung
- **Bogenschütze** – Fernkampfeinheit mit hoher Angriffsreichweite und Bogen
- **Kavallerie** – mobiler Nahkämpfer mit Pferd und erhöhter Geschwindigkeit

Gemeinsame Funktionen:

- Besitzerzuordnung über `player.id`
- Zielsuche und Kampf-KI
- Team-/Feinderkennung
- `idle`, `attack`, `follow`, `move`, `retreat`
- Level 1–7 und persistente XP
- Schaden-/Gegnerstärke-basierte XP
- unterschiedliche HP, Geschwindigkeit, Schaden und Reichweite
- stufenweise bessere Waffen und Rüstung
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
├── Taxes
│   ├── index.js
│   ├── config.js
│   └── taxes.js
├── Claims
├── Market
├── Monster
├── Essentials
└── Soldier
```

## 🎮 Wichtige Commands

### Steuern

```text
/siedler:settax <team> <x> <y> <z>
/siedler:settaxbonus <team> <bonus>
/siedler:addtaxbonus <team> <betrag>
/siedler:taxinfo <team>
/siedler:countvillagers <team>
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
/siedler:move <x y z>
/siedler:follow
/siedler:stay
```

## 🛠️ Entwicklung

Neue Systeme sollten möglichst in eigenen Modulen unter `scripts/` liegen, über `scripts/core/main.js` geladen werden und bestehende Systeme wiederverwenden. Nicht-kritische Fehler sollen lokal behandelt werden.

Die detaillierte Planung befindet sich in [`plan.md`](plan.md).

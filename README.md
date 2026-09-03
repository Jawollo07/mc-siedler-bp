# 🏘️ Siedler Logic

> Modulares Minecraft-Bedrock-Behavior-Pack für das Minecraft-Siedler-Projekt – mit Teams, Claims, Wirtschaft, Märkten, Händlern, Monstern und Soldaten.

**Behavior Pack:** https://github.com/Jawollo07/mc-siedler-bp  
**Resource Pack:** https://github.com/Jawollo07/mc-siedler-rp

## 📖 Übersicht

Siedler Logic bildet die Gameplay- und Serverlogik des Projekts. Der aktuelle Fokus liegt auf der Verbindung von Wirtschaft, Territorium, Bevölkerung und Militär.

Aktuelle Systeme:

- 👥 Teams, Team-Chat, Farben und Beziehungen
- 🏠 Claims und visuelle Claim-Grenzen
- 💰 Emerald-basierte Wirtschaft, Steuern und permanenter Monster-Token-TaxBonus
- 🏪 Marktplätze und spezialisierte Händler
- ⚔️ Soldaten mit KI, Befehlen, Leveln, XP und Ausrüstung
- 🧑‍🌾 Soldatenhändler mit direkter Rekrutierungs-UI
- 🐎 Infanterie, Bogenschützen und Kavallerie
- 👹 Monster, Pillager-Trupps, Außenposten und Belagerungen
- 🧰 Essentials, Homes, TPA und erweitertes Spieler-Dashboard
- 💾 persistente World Dynamic Properties

## 📊 Spieler-Dashboard

Mit `/siedler:stats` öffnet sich das zentrale Siedler-Dashboard. Die Startseite zeigt die wichtigsten Live-Werte des Spielers und seines Teams.

Das Dashboard umfasst:

- 👤 **Mein Profil** – Position, Dimension, Team, eigene Soldaten, Soldaten-XP und durchschnittliches Soldatenlevel
- 🛡️ **Team & Rangliste** – Teamdaten und eine Live-Rangliste der Teams nach Bevölkerung, Soldaten und Claims
- 🏠 **Claims & Bevölkerung** – aktueller Chunk, Claim-Status, Team-Claims und Bevölkerung pro Claim
- 💰 **Steuern & Wirtschaft** – Dorfbewohner, permanenter Monster-Token-TaxBonus und tatsächlich berechnete Tagessteuer
- ⚔️ **Soldaten** – eigene und Team-Soldaten, Aufteilung nach Infanterie/Bogenschützen/Kavallerie, XP und Durchschnittslevel
- 📊 **Server-Statistiken** – Online-Spieler, Teams, Claims, Dorfbewohner, Monster und Soldaten über alle drei Dimensionen
- 🔄 **Aktualisieren** – öffnet das Dashboard mit aktuellen Live-Daten erneut

Die Soldatenstatistiken verwenden die persistenten `soldier:ownerId`, `soldier:type`, `soldier:level` und `soldier:xp` Daten. Dadurch bleiben Owner, Typ, Level und XP unabhängig von der UI-Auswahl auswertbar.

## 💰 Steuern & permanenter Monster-Token-TaxBonus

Jedes Team kann eine Steuerkiste besitzen. Die tägliche Steuer wird aus der Bevölkerung und einem **permanenten TaxBonus** berechnet:

`Tagessteuer = Dorfbewohner + TaxBonus`

Der TaxBonus entsteht **ausschließlich durch besiegte Monster-Tokens**. Jeder besiegte Monster-Token erhöht den täglichen TaxBonus des Teams des Spielerkillers um **+1 Emerald**.

Beispiel:

`Team 1: 10 Dorfbewohner + 1 TaxBonus = 11 Emeralds pro Tag`

Wird später ein weiterer Monster-Token besiegt:

`Team 1: 10 Dorfbewohner + 2 TaxBonus = 12 Emeralds pro Tag`

Der Bonus bleibt dauerhaft bestehen und wird **nicht** bei der täglichen Auszahlung verbraucht. Maximal können **64 Emeralds/Tag** TaxBonus aufgebaut werden. Die komplette Tagesauszahlung bleibt auf **256 Emeralds** begrenzt.

Es gibt keinen automatischen Bevölkerungsbonus und keinen normalen manuellen TaxBonus.

### TaxBonus-Commands

```text
/siedler:taxinfo <team>
/siedler:settax <team> <x> <y> <z>
/siedler:countvillagers <team>
```

`taxinfo` zeigt Dorfbewohner, permanenten TaxBonus und die daraus berechnete tägliche Steuer.

## 🧟 Monster-Tokens

- 1 besiegter Monster-Token → **+1 Emerald/Tag dauerhaft**
- jeder weitere Token erhöht den täglichen Bonus um weitere +1
- maximal +64 Emeralds/Tag TaxBonus pro Team
- Bonus wird nur dem Team des tatsächlichen Spielerkillers gutgeschrieben
- Spieler ohne Team erhalten keinen Bonus
- der Bonus bleibt auch nach der täglichen Steuerzahlung erhalten

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
│   ├── index.js
│   └── player_stats.js
└── Soldier
```

## 🎮 Wichtige Commands

### Dashboard

```text
/siedler:stats
```

### Steuern

```text
/siedler:settax <team> <x> <y> <z>
/siedler:taxinfo <team>
/siedler:countvillagers <team>
```

### Monster-Tokens

```text
/siedler:token
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

# 🏘️ Siedler Logic

> Modulares Minecraft-Bedrock-Behavior-Pack für das Minecraft-Siedler-Projekt – mit Teams, Claims, Wirtschaft, Märkten, Händlern, Monstern und Soldaten.

**Behavior Pack:** https://github.com/Jawollo07/mc-siedler-bp  
**Resource Pack:** https://github.com/Jawollo07/mc-siedler-rp

## 📖 Übersicht

Siedler Logic bildet die Gameplay- und Serverlogik des Projekts. Der aktuelle Fokus liegt auf der Verbindung von Wirtschaft, Territorium, Bevölkerung und Militär.

Aktuelle Systeme:

- 👥 Teams, Team-Chat, Farben und Beziehungen
- 🏠 Claims und visuelle Claim-Grenzen
- 💰 Emerald-basierte Wirtschaft, Steuern und Monster-Token-TaxBonus
- 🏪 Marktplätze und spezialisierte Händler
- ⚔️ Soldaten mit KI, Befehlen, Leveln, XP und Ausrüstung
- 🧑‍🌾 Soldatenhändler mit direkter Rekrutierungs-UI
- 🐎 Infanterie, Bogenschützen und Kavallerie
- 👹 Monster, Pillager-Trupps, Außenposten und Belagerungen
- 🧰 Essentials, Homes, TPA und Spieler-Dashboard
- 💾 persistente World Dynamic Properties

## 💰 Steuern & Monster-Token-TaxBonus

Jedes Team kann eine Steuerkiste besitzen. Die normale Tagessteuer wird anhand der Dorfbewohner in den Team-Claims berechnet:

`Tagessteuer = Dorfbewohner + gespeicherter Monster-Token-Bonus`

Der **TaxBonus kann ausschließlich durch das Besiegen eines Monster-Tokens** entstehen. Für jeden von einem Spieler besiegten Token-Mob werden aktuell **8 Emeralds TaxBonus** dem Team des Spielers gutgeschrieben.

Der Bonus wird persistent im Team gespeichert und kann bis maximal **64 Emeralds** angesammelt werden. Er wird bei der nächsten erfolgreichen täglichen Steuerzahlung vollständig verwendet und anschließend auf `0` zurückgesetzt.

Es gibt **keinen automatischen Bevölkerungsbonus** und keinen normalen Admin-Bonus mehr. Dadurch ist der TaxBonus direkt an das Monster-Token-System gekoppelt.

Die komplette Tagesauszahlung eines Teams ist auf **256 Emeralds** begrenzt. Ist die Steuerkiste teilweise voll, werden eingelagerten und neben der Kiste abgelegten Emeralds getrennt erfasst.

### TaxBonus-Commands

```text
/siedler:taxinfo <team>
/siedler:settax <team> <x> <y> <z>
/siedler:countvillagers <team>
```

`taxinfo` zeigt den aktuell angesammelten Monster-Token-Bonus und die daraus resultierende Tagessteuer. Die Bonusvergabe selbst erfolgt automatisch beim Besiegen eines Token-Mobs.

Die Konfiguration befindet sich zentral in `scripts/taxes/config.js`.

## 🧟 Monster-Tokens

Monster-Tokens sind besondere Monster, die über das Token-System erzeugt werden. Wird ein Token-Mob von einem Spieler besiegt, wird dessen Team automatisch mit TaxBonus belohnt.

- 1 besiegter Token-Mob → +8 TaxBonus
- maximal 64 gespeicherter TaxBonus pro Team
- Bonus wird nur dem Team des tatsächlichen Spielerkillers gutgeschrieben
- Spieler ohne Team erhalten keinen Bonus
- Bonus wird bei der nächsten erfolgreichen Steuerzahlung verbraucht

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

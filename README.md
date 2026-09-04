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
- 🧰 Essentials und erweitertes Spieler-Dashboard

## ⚔️ Soldier-KI

Das Soldier-System verwendet eine eigene Kampf- und Bewegungslogik. Ein Soldat sucht feindliche Ziele, nähert sich ihnen und wechselt anschließend in den `attack`-Zustand.

Ein wichtiger Fix betrifft die **Nahkampfreichweite**: Die alte Logik stoppte den Soldaten durch einen zu großen Bewegungs-Ankunftsradius deutlich vor dem Gegner. Die Kampfposition wird jetzt mit einem kleinen Ankunftsradius berechnet, sodass der Soldat tatsächlich bis an die praktische Kollisionsdistanz heranläuft.

Ablauf:

`Ziel erkennen → annähern → praktische Nahkampfdistanz → Angriffswindup → applyDamage() → Cooldown → nächster Angriff`

Die konfigurierte Level-Reichweite bleibt dabei erhalten; die KI verwendet für Nahkämpfer zusätzlich eine sichere Mindestreichweite von 1.45 Blöcken, damit Entity-Kollision den Angriff nicht verhindert.

## 💰 Steuern & permanenter Monster-Token-TaxBonus

Jedes Team kann eine Steuerkiste besitzen. Die tägliche Steuer wird aus der Bevölkerung und einem **permanenten TaxBonus** berechnet:

`Tagessteuer = Dorfbewohner + TaxBonus`

Der TaxBonus entsteht **ausschließlich durch besiegte Monster-Tokens**. Jeder besiegte Monster-Token erhöht den täglichen TaxBonus des Teams des Spielerkillers um **+1 Emerald**.

Der Bonus bleibt dauerhaft bestehen und wird nicht bei der täglichen Auszahlung verbraucht. Maximal können **64 Emeralds/Tag** TaxBonus aufgebaut werden. Die komplette Tagesauszahlung bleibt auf **256 Emeralds** begrenzt.

Alle Teams besitzen die Variable `taxBonus`. Bereits vorhandene Teams werden beim Laden automatisch migriert; fehlt `taxBonus`, wird sie mit `0` initialisiert.

## 🧑‍🌾 Händler

Händler werden als `siedler:trader` gespawnt. Es gibt sieben Rollen: `food`, `building`, `resources`, `tools`, `weapons`, `supplies` und `soldiers`.

## 📊 Spieler-Dashboard

Mit `/siedler:stats` öffnet sich das zentrale Dashboard. Es enthält Spielerprofil, Team/Rangliste, Claims/Bevölkerung, Steuern/TaxBonus, Soldatenstatistiken und Serverstatistiken über die drei Dimensionen.

## 📦 Installation

| Komponente | Stand |
|---|---|
| Minecraft Bedrock | `1.26.0+` |
| `@minecraft/server` | `2.9.0` |
| `@minecraft/server-ui` | `2.1.0` |
| Entry Point | `scripts/core/main.js` |

Nach Änderungen an Scripts, Commands oder Entity-Definitionen sollte der Server bzw. die Welt vollständig neu geladen werden.

## 🎮 Wichtige Commands

```text
/siedler:stats
/siedler:settax <team> <x> <y> <z>
/siedler:taxinfo <team>
/siedler:countvillagers <team>
/siedler:token
/siedler:trader <type>
/siedler:spawn_soldier <type> [level]
/siedler:move <x y z>
/siedler:follow
/siedler:stay
```

## 🧩 Architektur

```text
scripts/core/main.js
│
├── Core
├── Teams
├── Taxes
├── Claims
├── Market
├── Monster
├── Essentials
└── Soldier
    ├── ai.js
    ├── config.js
    ├── commands.js
    ├── command_manager.js
    ├── archer.js
    ├── cavalry.js
    └── level.js
```

Neue Systeme sollten möglichst modular unter `scripts/` liegen, über den zentralen Loader geladen werden und bestehende Systeme wiederverwenden. Die detaillierte Planung befindet sich in `plan.md`.

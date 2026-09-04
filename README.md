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
- 🏹 Infanterie, echte Bogenschützen mit ballistisch berechneten Pfeil-Projektilen und Kavallerie
- 👹 Monster, Pillager-Trupps, Außenposten und Belagerungen
- 🧰 Essentials und erweitertes Spieler-Dashboard

## ⚔️ Soldier-KI

Das Soldier-System verwendet eine eigene Kampf- und Bewegungslogik. Ein Soldat sucht feindliche Ziele, nähert sich ihnen und wechselt anschließend in den passenden Kampfzustand.

### 🗡️ Infanterie

Nahkämpfer laufen bis zur praktischen Entity-Kollisionsdistanz und greifen anschließend über `applyDamage()` mit Windup und Cooldown an. Die Kampfposition verwendet einen kleinen Arrival-Radius, damit Soldaten nicht vor dem Gegner stehen bleiben.

### 🏹 Bogenschützen

Bogenschützen verwenden eine **eigene Fernkampf-KI** und greifen nicht wie Infanteristen per `applyDamage()` an. Sie:

- halten bevorzugt Abstand zum Gegner,
- zielen auf das Ziel,
- spawnen echte `minecraft:arrow`-Projektile,
- setzen den Bogenschützen als Projectile-Owner,
- verwenden eine diskrete ballistische Flugbahnberechnung mit Gravitation und Luftwiderstand,
- wählen bevorzugt eine flache gültige Flugbahn statt einer unnötig hohen Flugkurve,
- berücksichtigen die aktuelle Bewegung des Ziels durch vorausschauendes Zielen,
- starten Pfeile leicht vor dem Soldaten, damit sie nicht an der eigenen Entity kollidieren,
- richten die sichtbare Pfeilrotation während des Fluges an der tatsächlichen Flugrichtung aus,
- spielen beim Schuss den Bogenschuss-Sound,
- schießen abhängig vom Soldaten-Level schneller,
- besitzen eine mehrstufige Sichtlinienprüfung vor jedem Schuss,
- überwachen die Flugbahn jedes erzeugten Pfeils,
- verwenden eine Pfeilgeschwindigkeit von `3.2` mit `0.05` Gravitation und `0.99` Luftwiderstand,
- können Ziele bis zu einer Entfernung von `40` Blöcken erfassen.

### 🏹 Pfeilphysik

Die Pfeilphysik wurde auf eine langsamere, deutlich sichtbarere Flugbahn umgestellt. Der ballistische Solver simuliert pro Tick horizontale Bewegung, Luftwiderstand und Gravitation und sucht anschließend numerisch nach einem passenden Abschusswinkel. Dadurch wird die Fallkurve bei kurzen und langen Schüssen wesentlich konsistenter.

Zusätzlich wird die voraussichtliche Flugzeit für bewegte Ziele geschätzt. Der Bogenschütze führt bis zu drei kurze Korrekturen der Zielposition durch, damit laufende Gegner nicht mehr ausschließlich auf ihre aktuelle Position beschossen werden.

Die Pfeile werden außerdem zwischen ihrer letzten und aktuellen Position per Block-Ray geprüft. Dadurch werden schnelle Projektile gegen Tunneling durch dünne Blockflächen abgesichert. Wird ein Block auf der Flugstrecke erkannt, wird der Pfeil entfernt. Nach zehn Sekunden werden nicht mehr relevante Pfeile automatisch bereinigt.

### 👁️ Sichtweite & Hindernisse

Fernkampfangriffe benötigen eine **freie Sichtlinie** zwischen Bogenschütze und Ziel. Vor dem Schuss wird per Block-Ray geprüft, ob ein nicht passierbarer Block die Schusslinie blockiert. Die Prüfung verwendet mehrere Zielhöhen, damit Teildeckung berücksichtigt wird.

Die Sichtlinienprüfung und die Flugbahnprüfung sind bewusst **fail-closed**: Wenn eine Ray-Abfrage fehlschlägt, darf der Pfeil nicht weiterfliegen bzw. nicht abgeschossen werden.

### 🐎 Kavallerie

Kavallerie verwendet weiterhin die separate Kavallerie-KI mit Mount- und Charge-Logik.

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
    ├── ranged_ai.js
    ├── config.js
    ├── commands.js
    ├── command_manager.js
    ├── archer.js
    ├── cavalry.js
    ├── combat_range.js
    └── level.js
```

Neue Systeme sollten möglichst modular unter `scripts/` liegen, über den zentralen Loader geladen werden und bestehende Systeme wiederverwenden. Die detaillierte Planung befindet sich in `plan.md`.

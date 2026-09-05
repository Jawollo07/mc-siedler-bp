# 🏘️ Siedler Logic

> Modulares Minecraft-Bedrock-Behavior-Pack für das Minecraft-Siedler-Projekt.

**Behavior Pack:** https://github.com/Jawollo07/mc-siedler-bp  
**Resource Pack:** https://github.com/Jawollo07/mc-siedler-rp

## 📖 Systeme

- Teams, Team-Chat, Farben und Diplomatie
- Claims und Claim-Grenzen
- Wirtschaft, Steuern und permanenter Monster-Token-TaxBonus
- Marktplätze und spezialisierte Händler
- Soldaten mit KI, Befehlen, Leveln, XP und Ausrüstung
- Infanterie, Bogenschützen mit ballistischer Pfeilphysik und Kavallerie
- Monster, Pillager-Trupps, Außenposten und Belagerungsgrundlage
- Essentials mit Homes, Spawn, TPA, privaten Nachrichten, Todespunkten, Startsystem und Admin-Werkzeugen
- Spieler-Dashboard und Serverstatistiken

## ⚔️ Soldier-KI

Das Soldier-System verwendet eigene Kampf- und Bewegungslogik. Infanterie nutzt Nahkampf, Bogenschützen eine eigene Fernkampf-KI mit echten `minecraft:arrow`-Projektilen und ballistischer Flugbahnberechnung.

### 🐎 Kavallerie

Kavallerie verwendet **kein eigenes Pferde-Entity mehr**. Beim Spawnen wird ein normales `minecraft:horse` erzeugt und explizit auf einen erwachsenen Wild-Zustand gebracht. Der Soldat wird über den nativen Minecraft-`/ride`-Befehl auf das Pferd gesetzt.

```text
siedler:cavalry
      │
      └── /ride
            ↓
      minecraft:horse
```

Wichtig für die Kompatibilität: Das Wild-Pferd besitzt eine `minecraft:rideable`-Komponente mit unterstützten Rider-Familien. Die Kavallerie besitzt deshalb zusätzlich die kompatible `baby_undead`-Familie. Dadurch kann `/ride ... start_riding ...` das Vanilla-Pferd verwenden, ohne die Kavallerie als `player` zu behandeln.

Beim Mount-Spawn wird die Vanilla-Horse-Initialisierung zusätzlich mit dem `minecraft:spawn_adult`-Event abgesichert. Damit wird verhindert, dass ein zufällig als Fohlen erzeugtes Pferd ohne passende Wild-/Rideable-Komponenten als Kavallerie-Mount verwendet wird.

Das Pferd erhält die Tags `soldier_mount` und `cavalry_mount` sowie Dynamic Properties für Besitzer, Level und Rider. Dadurch kann die Kavallerie-KI das richtige Mount zuverlässig wiederfinden.

Die Kavallerie-Bewegung wird weiterhin zentral auf das Pferd angewendet. Charge-, Circle- und Pass-Manöver bleiben erhalten. Das Mount wird bei der Zielsuche explizit als Nicht-Ziel behandelt.

Das Mounting verwendet eindeutige temporäre Tags und den aktuellen `/ride`-Aufbau mit `teleport_ride` und `if_group_fits`. Falls die Rideable-Komponente den Rider im selben Tick noch nicht meldet, wird einmalig `minecraft:rideable.addRider()` als API-Fallback versucht.

### 🏹 Pfeilphysik

Bogenschützen berechnen eine ballistische Flugbahn mit Gravitation, Luftwiderstand und vorausschauendem Zielen. Pfeile werden als echte `minecraft:arrow`-Projektil erzeugt und während des Flugs überwacht.

## 🧰 Essentials

Das Essentials-System arbeitet bei persistenter Spielerdatenhaltung mit Spieler-IDs. Das Startsystem verwaltet Team-Teleports, Spielstart und Starterkits und behandelt ungültige Daten kontrolliert.

## 💰 Steuern

Der tägliche TaxBonus entsteht ausschließlich durch besiegte Monster-Tokens. Jeder besiegte Token erhöht den permanenten Bonus des Teams des Spielerkillers um `+1 Emerald/Tag`. Bestehende Teams werden bei der Migration mit `taxBonus: 0` ergänzt.

## 🧑‍🌾 Händler

Händler werden als `siedler:trader` mit spezialisierten Rollen gespawnt. Der Soldatenhändler ermöglicht die Rekrutierung von Soldaten.

## 📊 Dashboard

`/siedler:stats` zeigt Spieler-, Team-, Claim-, Steuer-, Soldaten- und Serverstatistiken.

## 📦 Installation

| Komponente | Stand |
|---|---|
| Minecraft Bedrock | `1.26.0+` |
| `@minecraft/server` | `2.9.0` |
| `@minecraft/server-ui` | `2.1.0` |
| Entry Point | `scripts/core/main.js` |

Nach Änderungen an Scripts, Commands oder Entity-Definitionen sollte Server/Welt vollständig neu geladen werden.

## 🎮 Wichtige Commands

```text
/siedler:stats
/siedler:spawn
/siedler:sethome
/siedler:home
/siedler:back
/siedler:tpa <spieler>
/siedler:tpahere <spieler>
/siedler:tpaccept
/siedler:tpdeny
/siedler:msg <spieler> <nachricht>
/siedler:reply <nachricht>
/siedler:team_tp <spieler>
/siedler:starterkit <spieler>
/siedler:startgame
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
    ├── cavalry_ai.js
    ├── spawn.js
    ├── config.js
    ├── commands.js
    ├── command_manager.js
    ├── archer.js
    ├── cavalry.js
    ├── combat_range.js
    └── level.js
```

Die detaillierte Planung befindet sich in `plan.md`.

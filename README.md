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

Kavallerie verwendet ein normales erwachsenes `minecraft:horse`. Der Soldat wird über `/ride start_riding` auf das Mount gesetzt und die KI steuert anschließend ausschließlich das Pferd.

Die Kavallerie-KI arbeitet als taktische Zustandsmaschine:

```text
APPROACH → CHARGE → HIT → PASS → APPROACH → ...
              │
              └── STUCK → PASS (andere Seite)
```

- Zielpriorität für Spieler und feindliche Soldiers
- Ziel-Hysterese verhindert unnötiges Wechseln zwischen Gegnern
- direkte Annäherung auf größere Distanz
- seitlich versetzte Annäherung verhindert dauerhaftes Hängenbleiben am Gegner
- Charge mit erhöhtem Schaden und Knockback
- echtes Passieren statt Kreisen auf dem Gegner
- automatische Seitenwechsel bei festgefahrener Kavallerie
- Mount-Zuordnung über `soldier:riderId` und Mount-Tags
- eigenes Mount wird niemals als Ziel ausgewählt
- Bewegung wird zentral über `ai.js` auf das Mount angewendet

Das Mounting selbst verwendet eindeutige Tags, `/ride` und den Rideable-API-Fallback. Die Kavallerie-Entity besitzt die benötigte `baby_undead`-Familienkompatibilität für das Vanilla-Pferd, ohne als `player` behandelt zu werden.

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

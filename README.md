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

## 🏪 Marktplatz

Der konfigurierte Marktplatz ist ein vollständig geschützter Bereich. Spieler können dort **keine Blöcke abbauen und keine Blöcke platzieren**. Monster werden zusätzlich aus dem Markt entfernt und neu gespawnte Monster werden dort ebenfalls sofort entfernt.

Die Block-Abbau- und Block-Platzierungs-Sperre wird über `world.beforeEvents.playerBreakBlock` und `world.beforeEvents.playerPlaceBlock` umgesetzt. Die Events werden vor der eigentlichen Weltänderung abgebrochen, sodass kein nachträgliches Zurücksetzen platzierter Blöcke notwendig ist.

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
- Ziel-Hysterese verhindert unnötiges Wechseln zwischen Zielen
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

## 🧪 Permanente Weakness

Wenn die Weakness-Konfiguration aktiviert ist, erhalten alle Spieler dauerhaft den normalen Vanilla-`weakness`-Effekt. Der Effekt wird regelmäßig erneuert, damit er permanent bestehen bleibt.

Dadurch wird die Weakness **gegen alle Nahkampfziele angewendet – einschließlich PvP**. Spieler verursachen also sowohl gegen Mobs als auch gegen andere Spieler den durch die konfigurierte Weakness-Stufe reduzierten Nahkampfschaden.

Die Einstellung befindet sich in `scripts/monster/config.js` unter `weakness`:

```js
weakness: {
    enabled: true,
    level: 1,
    duration: 220,
    interval: 100
}
```

`level` entspricht dem konfigurierten Weakness-Amplifier. `duration` und `interval` bestimmen, wie der permanente Effekt regelmäßig erneuert wird.

### Weakness-Commands

Die Weakness lässt sich ohne Neustart über OP-Commands verwalten. Alle Befehle sind auf `GameDirectors` beschränkt und Änderungen werden persistent gespeichert:

```text
/siedler:weakness_status
/siedler:weakness_on
/siedler:weakness_off
/siedler:weakness_level <0-255>
/siedler:weakness_duration <ticks>
/siedler:weakness_interval <ticks>
```

Beispiele:

```text
/siedler:weakness_status
/siedler:weakness_on
/siedler:weakness_level 1
/siedler:weakness_off
```

## 🧰 Essentials

Das Essentials-System arbeitet bei persistenter Spielerdatenhaltung mit Spieler-IDs. Das Startsystem verwaltet Team-Teleports, Spielstart und Starterkits und behandelt ungültige Daten kontrolliert.

## 💰 Steuern

Der tägliche TaxBonus entsteht ausschließlich durch besiegte Monster-Tokens. Jeder besiegte Token erhöht den permanenten Bonus des Teams des Spielerkillers um `+1 Emerald/Tag`. Bestehende Teams werden bei der Migration mit `taxBonus: 0` ergänzt.

## 🧑‍🌾 Händler

Händler werden als `siedler:trader` mit spezialisierten Rollen gespawnt. Lebensmittel-, Baustoff-, Rohstoff-, Werkzeug-, Waffen- und Versorgungshändler verwenden eigene Vanilla-Trade-Tabellen und öffnen beim Interagieren das normale Bedrock-Handelsfenster. Die Trade-Tabelle wird über eine Component Group aktiviert, damit die Handels-KI korrekt funktioniert.

Die Händler-Initialisierung wartet nach dem Spawn einen Tick, damit die Trade-Component sicher aktiv ist. Zusätzlich werden ältere bzw. per `/summon` erzeugte Händler ohne Handelsrolle automatisch repariert. Bereits vorhandene Händlerrollen werden nicht ständig neu angewendet, damit Handelsnutzungen nicht zurückgesetzt werden. Der Soldatenhändler verwendet weiterhin die eigene Rekrutierungslogik.

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
/siedler:trader_here <type>
/siedler:trader_types
/siedler:trader_remove
/siedler:spawn_soldier <type> [level]
/siedler:move <x y z>
/siedler:follow
/siedler:stay
/siedler:weakness_status
/siedler:weakness_on
/siedler:weakness_off
/siedler:weakness_level <level>
/siedler:weakness_duration <ticks>
/siedler:weakness_interval <ticks>
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
│   ├── commands.js
│   └── weakness_commands.js
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

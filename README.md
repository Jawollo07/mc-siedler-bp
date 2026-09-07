# 🏘️ Siedler Logic

> Modulares Minecraft-Bedrock-Behavior-Pack für das Minecraft-Siedler-Projekt.

**Behavior Pack:** https://github.com/Jawollo07/mc-siedler-bp  
**Resource Pack:** https://github.com/Jawollo07/mc-siedler-rp

## 📖 Systeme

- Teams, Team-Chat, Farben und Diplomatie
- Claims und Claim-Grenzen
- Claim-Protection mit Block-Recovery bei unerlaubtem Abbau und Item-Rückgabe bei unerlaubtem Platzieren
- Wirtschaft, Steuern und permanenter Monster-Token-TaxBonus
- Ein zentraler Marktplatz und spezialisierte Händler
- Soldaten mit KI, Befehlen, Leveln, XP und Ausrüstung
- Infanterie, Bogenschützen mit ballistischer Pfeilphysik und Kavallerie
- Monster, Pillager-Trupps, Außenposten und Belagerungsgrundlage
- Essentials mit Homes, Spawn, TPA, privaten Nachrichten, Todespunkten, Startsystem und Admin-Werkzeugen
- Spieler-Dashboard und Serverstatistiken

## 🛡️ Claims & Block-Recovery

Claim-Gebiete schützen Blöcke vor unerlaubtem Abbau und Platzieren. Der normale Schutz arbeitet über `world.beforeEvents.playerBreakBlock` bzw. `world.beforeEvents.playerPlaceBlock`, sodass die Weltänderung bereits vor der Ausführung abgebrochen wird.

Zusätzlich besitzt die Claim-Protection eine **Block-Recovery** als Fallback für Server-Builds, bei denen eine Weltänderung trotz fehlendem oder nicht zuverlässig arbeitendem Before-Event stattfinden kann:

- Der ursprüngliche Blocktyp wird vor einem unerlaubten Abbau zwischengespeichert.
- Wird der Block trotzdem entfernt, wird er automatisch wiederhergestellt.
- Ein Recovery-Scanner prüft zusätzlich offene Wiederherstellungen.
- Bereits neu platzierte Blöcke werden bei der Recovery nicht überschrieben.
- Die Dimension und Spieler-ID werden zusammen mit dem Recovery-Eintrag gespeichert.
- Unerlaubte Platzierungen werden entfernt.
- Bei einem After-Event-Fallback wird der platzierte Block **einmalig ins Inventar des Spielers zurückgegeben**.
- Ist das Inventar voll, wird der zurückgegebene Gegenstand stattdessen sicher beim Spieler gedroppt, damit er nicht verloren geht.
- Beim normalen Before-Event wird nichts zusätzlich gegeben, da der Block durch das Canceln gar nicht aus dem Inventar entfernt wird. Dadurch entstehen keine Duplikate.
- Die Recovery-Queue ist begrenzt und veraltete Einträge werden automatisch entfernt.
- Explosionen innerhalb von Claims werden weiterhin bereits vor der Zerstörung abgebrochen.

Die Wiederherstellung verwendet aktuell den ursprünglichen **Blocktyp**. Komplexe Blockzustände (z. B. bestimmte Orientierungen oder Inhalte von Block-Entities) werden nicht als vollständiges Backup gespeichert.

## 🏪 Marktplatz

Es gibt bewusst **einen zentralen Marktplatz**. Der konfigurierte Bereich ist vollständig geschützt: Spieler können dort **keine Blöcke abbauen und keine Blöcke platzieren**. Monster werden zusätzlich aus dem Markt entfernt und neu gespawnte Monster werden dort ebenfalls sofort entfernt.

Der Teleportpunkt wird unabhängig von den Marktplatz-Ecken einmalig durch einen Admin gesetzt und persistent als World Dynamic Property gespeichert:

```text
/market_tp_set
```

Dieser Befehl setzt die aktuelle Position und Dimension als Ziel. Normale Spieler können anschließend ohne OP-Rechte jederzeit mit

```text
/market
```

zum gespeicherten Marktplatz-Teleportpunkt reisen. Der Teleportpunkt wird beim Server-/Weltneustart nicht verloren.

Alle Custom Commands werden direkt über `event.customCommandRegistry.registerCommand()` registriert. Für jeden Command wird ein gültiges `CommandPermissionLevel` gesetzt; insbesondere ist `/market` explizit `Any` und `/market_tp_set` `GameDirectors`.

```text
/market
/market_tp_set
/siedler:market_status
/siedler:market_enable
/siedler:market_disable
/siedler:market_cleanup
```

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

### 🏹 Pfeilphysik

Bogenschützen berechnen eine ballistische Flugbahn mit Gravitation, Luftwiderstand und vorausschauendem Zielen. Pfeile werden als echte `minecraft:arrow`-Projektil erzeugt und während des Flugs überwacht.

## 🧪 Permanente Weakness

Wenn die Weakness-Konfiguration aktiviert ist, erhalten alle Spieler dauerhaft den normalen Vanilla-`weakness`-Effekt. Der Effekt wird regelmäßig erneuert, damit er permanent bestehen bleibt.

Dadurch wird die Weakness **gegen alle Nahkampfziele angewendet – einschließlich PvP**. Spieler verursachen also sowohl gegen Mobs als auch gegen andere Spieler den durch die konfigurierte Weakness-Stufe reduzierten Nahkampfschaden.

Die Einstellung befindet sich in `scripts/monster/config.js` unter `weakness`.

### Weakness-Commands

```text
/siedler:weakness_status
/siedler:weakness_on
/siedler:weakness_off
/siedler:weakness_level <0-255>
/siedler:weakness_duration <ticks>
/siedler:weakness_interval <ticks>
```

## 🧰 Essentials

Das Essentials-System arbeitet bei persistenter Spielerdatenhaltung mit Spieler-IDs. Das Startsystem verwaltet Team-Teleports, Spielstart und Starterkits und behandelt ungültige Daten kontrolliert.

## 💰 Steuern

Der tägliche TaxBonus entsteht ausschließlich durch besiegte Monster-Tokens. Jeder besiegte Token erhöht den permanenten Bonus des Teams des Spielerkillers um `+1 Emerald/Tag`. Bestehende Teams werden bei der Migration mit `taxBonus: 0` ergänzt.

Die tägliche Steuer wird **nur eingezogen, wenn zum Zeitpunkt der Tagesabrechnung mindestens ein Mitglied des jeweiligen Teams online ist**. Ist ein Team vollständig offline, wird für dieses Team an diesem Tageswechsel keine Steuer eingezogen. Die Prüfung erfolgt pro Team anhand der persistent gespeicherten Spieler-ID.

## 🧑‍🌾 Händler

Händler werden als `siedler:trader` mit spezialisierten Rollen gespawnt. Lebensmittel-, Baustoff-, Rohstoff-, Werkzeug-, Waffen- und Versorgungshändler verwenden eigene Vanilla-Trade-Tabellen und öffnen beim Interagieren das normale Bedrock-Handelsfenster. Die Trade-Tabelle wird über eine Component Group aktiviert, damit die Handels-KI korrekt funktioniert.

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
/market
/market_tp_set
/siedler:market_status
/siedler:market_enable
/siedler:market_disable
/siedler:market_cleanup
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
│   ├── protection.js (Protection + Block-Recovery + Item-Rückgabe)
│   └── display.js
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

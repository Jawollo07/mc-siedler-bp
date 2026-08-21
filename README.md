# 🏘️ Siedler Logic

> Ein modulares Minecraft-Bedrock-Behavior-Pack für Siedler-, Survival- und Multiplayer-Server.

[![Minecraft Bedrock](https://img.shields.io/badge/Minecraft%20Bedrock-1.26.0%2B-62B47A?logo=minecraft)](https://www.minecraft.net/)
[![API](https://img.shields.io/badge/%40minecraft%2Fserver-2.9.0-5C5CFF)](https://learn.microsoft.com/minecraft/creator/scriptapi/minecraft/server/minecraft-server)
[![Version](https://img.shields.io/badge/Version-1.1.4-orange)](https://github.com/Jawollo07/mc-siedler-bp)

Siedler Logic bündelt **Teams, Claims, Steuern, Essentials und ein konfigurierbares Monster-System** in einem Script-Modul. Dazu kommen organisierte **Pillager-Trupps, eigene KI, Belagerungen und Pillager-Außenposten-Raids**.

---

## 📋 Inhaltsverzeichnis

- [✨ Features](#-features)
- [📦 Installation](#-installation)
- [🗂️ Projektstruktur](#️-projektstruktur)
- [🎮 Befehle](#-befehle)
- [👹 Monster-System](#-monster-system)
- [🏴 Pillager-Trupps](#-pillager-trupps)
- [🧠 Pillager-KI](#-pillager-ki)
- [⚙️ Konfiguration](#️-konfiguration)
- [💾 Speicherung](#-speicherung)
- [🔐 Berechtigungen](#-berechtigungen)
- [🛠️ Entwicklung](#️-entwicklung)
- [⚠️ Hinweise](#️-hinweise)
- [🤝 Mitwirken](#-mitwirken)
- [📜 Lizenz](#-lizenz)

---

## ✨ Features

### 👥 Teams

- Teams erstellen, löschen und verwalten
- Spieler Teams hinzufügen und entfernen
- Frei definierbare Minecraft-Teamfarbe
- Teamübersicht mit Mitgliedern und Steuerkiste
- Team-Chat über `@team`
- Dauerhafte Speicherung über World Dynamic Properties

### 🏠 Claims

Claims schützen die Gebiete der einzelnen Teams.

- Ein Claim umfasst **2×2 Chunks**
- Bis zu **4 Chunks pro Team**
- Bereits belegte Chunks werden erkannt
- Schutz vor unerlaubten Aktionen in geschützten Gebieten
- Claim-Informationen können abgefragt werden
- Claim-Daten werden dauerhaft gespeichert

### 💰 Steuern

Das Steuersystem versorgt Teams automatisch mit Emeralds.

- Steuerkiste pro Team
- Berechnung anhand der Dorfbewohner innerhalb der Team-Claims
- Optional fester Steuerbetrag
- Automatische Auszahlung zu Beginn eines neuen Minecraft-Tages
- Emeralds werden in die Steuerkiste gelegt
- Überschüssige Emeralds werden bei voller Kiste daneben gespawnt
- Teammitglieder werden über die Auszahlung informiert

### 🧰 Essentials

Enthalten sind unter anderem:

- `/siedler:spawn`
- `/siedler:sethome`
- `/siedler:home`
- `/siedler:delhome`
- `/siedler:tpa`
- `/siedler:tpaccept`
- `/siedler:tpdeny`
- `/siedler:msg`
- `/siedler:back`
- Admin-Heal und Admin-Food
- Godmode
- Flugmodus
- Spieler töten
- Inventar leeren
- Tag/Nacht setzen
- Wetter ändern

Homes und Todespunkte werden dauerhaft gespeichert.

### 👹 Monster-System

Das Monster-System besitzt eine zentrale, speicherbare Konfiguration und unterstützt:

- Individuelle Spawn-Chancen
- Globale Spawnrate
- Nacht-Multiplikator
- Unterschiedliche Spawnregeln für Claims
- Deaktivierbare Monster
- Konfigurierbares Schwäche-System
- Monster-Tokens
- Pillager-Trupps
- Vindicator- und Ravager-Anteile
- Pillager-Captains
- Eigene Pillager-KI
- Belagerungen gegnerischer Gebiete
- Pillager-Außenposten als bevorzugte Spawnpunkte
- Konfiguration zur Laufzeit

---

## 📦 Installation

### Voraussetzungen

| Komponente | Version |
|---|---|
| Minecraft Bedrock | **1.26.0+** |
| `@minecraft/server` | **2.9.0** |
| Script Entry Point | `scripts/main.js` |

Die Versionen entsprechen dem aktuellen `manifest.json`. fileciteturn6file0

### 1. Repository klonen

```bash
git clone https://github.com/Jawollo07/mc-siedler-bp.git
cd mc-siedler-bp
```

### 2. Behavior Pack einbinden

Der Repository-Ordner ist das Behavior Pack. Binde ihn in die gewünschte Minecraft-Bedrock-Welt bzw. den Server ein und aktiviere das Pack.

Das Manifest definiert `scripts/main.js` als Script-Einstiegspunkt. fileciteturn6file0

### 3. Start prüfen

Beim erfolgreichen Laden schreibt `scripts/main.js` unter anderem folgende Meldungen ins Scripting-Log:

```text
[Siedler Logic] Alle Module geladen!
[Siedler Logic] Erfolgreich gestartet!
```

Der Einstiegspunkt lädt dabei Teams, Steuern, Claims, Monster/Pillager und Essentials. fileciteturn7file0

---

## 🗂️ Projektstruktur

```text
mc-siedler-bp/
├── manifest.json
├── README.md
└── scripts/
    ├── main.js
    ├── dynamic_properties.js
    │
    ├── claims/
    │   ├── display.js
    │   ├── index.js
    │   ├── protection.js
    │   └── utils.js
    │
    ├── essentials/
    │   └── index.js
    │
    ├── monster/
    │   ├── commands.js
    │   ├── config.js
    │   ├── index.js
    │   ├── outpost_raids.js
    │   ├── pillager_squads.js
    │   └── token.js
    │
    ├── taxes/
    │   ├── taxes.js
    │   └── time_watcher.js
    │
    └── teams/
        ├── chat.js
        └── index.js
```

Der zentrale Einstiegspunkt `scripts/main.js` lädt die Module und registriert zunächst die Dynamic Properties. fileciteturn7file0

### Architektur

```text
scripts/main.js
│
├── Dynamic Properties
├── Teams
│   └── Team-Chat
├── Steuern
├── Claims
│   ├── Schutz
│   └── Anzeige
├── Monster
│   ├── Konfiguration
│   ├── Tokens
│   ├── Pillager-Trupps
│   ├── Außenposten-Raids
│   └── Commands
└── Essentials
```

---

## 🎮 Befehle

### 👥 Team-Befehle

| Befehl | Beschreibung | Berechtigung |
|---|---|---|
| `/siedler:team_create <name> [farbe]` | Erstellt ein Team | OP |
| `/siedler:team_add <spieler> <team>` | Fügt einen Spieler hinzu | OP |
| `/siedler:team_remove <spieler> <team>` | Entfernt einen Spieler | OP |
| `/siedler:team_delete <team>` | Löscht ein Team | OP |
| `/siedler:team_list` | Zeigt alle Teams | OP |
| `/siedler:team_settax <team> <x> <y> <z> [amount]` | Setzt Steuerkiste und optional festen Betrag | OP |

### 💬 Team-Chat

```text
@team Hallo zusammen!
```

Die Nachricht wird an die Mitglieder des eigenen Teams gesendet.

### 🏞️ Claim-Befehle

| Befehl | Beschreibung | Berechtigung |
|---|---|---|
| `/siedler:claim_set <team>` | Setzt einen 2×2-Chunk-Claim | OP |
| `/siedler:claim_remove <team>` | Entfernt den Claim eines Teams | OP |
| `/siedler:claim_info` | Zeigt den aktuellen Claim | Alle |
| `/siedler:claim_list` | Listet Claims auf | OP |

---

## 👹 Monster-System

Die Monster-Konfiguration wird zentral verwaltet und kann dauerhaft in den World Dynamic Properties gespeichert werden.

### Monster-Status

```text
/siedler:monster_status
```

Zeigt unter anderem:

- Status des Monster-Systems
- Pillager-Status
- Spawnchance
- Truppgröße
- maximale Anzahl aktiver Trupps
- Outpost-Status
- Belagerungsstatus

### System aktivieren/deaktivieren

```text
/siedler:monster_enable
/siedler:monster_disable
```

### Pillager aktivieren/deaktivieren

```text
/siedler:monster_pillager on
/siedler:monster_pillager off
```

### Außenposten-Raids

```text
/siedler:monster_outpost on
/siedler:monster_outpost off
```

### Belagerungen

```text
/siedler:monster_siege on
/siedler:monster_siege off
```

### Trupp manuell spawnen

```text
/siedler:monster_spawn 10
```

Die Anzahl ist auf **1–32** begrenzt.

### Markierte Monster entfernen

```text
/siedler:monster_clear
```

### Konfiguration neu laden/speichern

```text
/siedler:monster_reload
/siedler:monster_save
```

### Konfigurationswerte lesen und setzen

```text
/siedler:monster_get <path>
/siedler:monster_set <path> <value>
```

Beispiele:

```text
/siedler:monster_get pillager.spawnChance
/siedler:monster_set pillager.spawnChance 0.5
/siedler:monster_set pillager.outpost.enabled true
```

Die Custom Commands sind mit der Bedrock-Scripting-API registriert und verwenden `GameDirectors` als Berechtigungsstufe. fileciteturn9file0

---

## 🏴 Pillager-Trupps

Pillager können als organisierte feindliche Truppen auftreten.

### Standardwerte

| Einstellung | Standardwert |
|---|---:|
| Truppgröße | `4–7` |
| Maximale aktive Trupps | `3` |
| Spawnchance | `22 %` |
| Outpost-Spawnchance | `70 %` |
| Mindestdistanz | `36 Blöcke` |
| Maximaldistanz | `64 Blöcke` |
| Lebensdauer | `24.000 Ticks` |
| KI-Intervall | `10 Ticks` |
| Nahkampfreichweite | `3,2 Blöcke` |
| Fernkampfreichweite | `18 Blöcke` |

### Truppzusammensetzung

Je nach Konfiguration können Truppen enthalten:

- Pillager
- Pillager-Captain
- Vindicator
- Ravager

Die Truppgröße kann zufällig aus dem konfigurierten Bereich gewählt werden. Manuell erzeugte Truppen können über den Monster-Befehl eine feste Anzahl erhalten. fileciteturn9file0

---

## 🏰 Pillager-Außenposten

Das Monster-System kann Pillager-Truppen bevorzugt an bzw. in der Nähe von **Pillager-Außenposten** erzeugen.

Damit lassen sich Außenposten als Ausgangspunkt für gegnerische Truppen und Raids verwenden.

Die relevanten Einstellungen befinden sich im Bereich:

```text
pillager.outpost
```

Beispiel:

```text
/siedler:monster_get pillager.outpost.enabled
/siedler:monster_set pillager.outpost.enabled true
```

---

## ⚔️ Belagerungen

Pillager-Truppen können gegnerische Gebiete als Ziele verwenden. In Verbindung mit Claims entsteht dadurch ein Server-System, bei dem Spielergebiete von feindlichen Truppen angegriffen werden können.

Die Einstellungen befinden sich im Bereich:

```text
pillager.siege
```

Aktivieren/deaktivieren:

```text
/siedler:monster_siege on
/siedler:monster_siege off
```

---

## 🧠 Pillager-KI

Die Pillager-Truppen besitzen eine eigene Logik und sind nicht nur einfache zufällige Mob-Spawns.

Je nach aktivierten Funktionen kann die KI unter anderem:

- Ziele suchen
- Entfernungen bewerten
- zu Zielen laufen
- Nah- und Fernkampf einsetzen
- Truppmitglieder zusammenhalten
- getrennte Einheiten wieder gruppieren
- gegnerische Claims als Ziele verwenden
- Angriffe bzw. Belagerungen durchführen

Dadurch können Pillager als organisierte gegnerische Fraktion eingesetzt werden.

---

## ⚙️ Konfiguration

Die Standardkonfiguration liegt in:

```text
scripts/monster/config.js
```

Typischer Aufbau:

```js
DEFAULT_CONFIG = {
    enabled: true,
    globalSpawnRate: 0.7,
    nightSpawnMultiplier: 1.3,

    allowedMobs: { ... },
    spawnChances: { ... },

    claims: { ... },
    weakness: { ... },
    token: { ... },
    pillager: { ... }
};
```

Der `pillager`-Bereich ist wiederum in verschiedene Teilbereiche gegliedert, darunter:

```text
pillager
├── ai
├── siege
├── outpost
└── composition
```

### Konfiguration zur Laufzeit

Werte können über `monster_get` gelesen und über `monster_set` verändert werden.

Unterstützte Eingaben bei `monster_set`:

| Eingabe | Ergebnis |
|---|---|
| `true` / `false` | Boolean |
| `0.5`, `10`, usw. | Number |
| `{...}` | JSON-Objekt, sofern gültig |
| `[...]` | JSON-Array, sofern gültig |
| sonstiger Text | String |

Beispiel:

```text
/siedler:monster_set pillager.spawnChance 0.35
/siedler:monster_set pillager.outpost.enabled true
/siedler:monster_get pillager.spawnChance
```

---

## 💾 Speicherung

Siedler Logic verwendet **World Dynamic Properties** für dauerhafte Daten.

Dazu gehören unter anderem:

- Teams
- Claims
- Homes
- Todespunkte
- Monster-Konfiguration

Das Pack lädt die Dynamic-Property-Registrierung bewusst früh im Startvorgang. fileciteturn7file0

---

## 🔐 Berechtigungen

Die administrativen Monster-Custom-Commands verwenden die Berechtigungsstufe:

```text
GameDirectors
```

Zusätzlich existiert für das Monster-Chat-Interface eine eigene Tag-basierte Berechtigung:

```text
monster.admin
```

oder

```text
admin
```

Für normale Spieler sind die vorgesehenen Spielerfunktionen wie Home, TPA, Back und private Nachrichten verfügbar.

---

## 🛠️ Entwicklung

### Einstiegspunkt

```text
scripts/main.js
```

Die Module werden dort zentral importiert. fileciteturn7file0

### Neues Modul

Ein neues System kann beispielsweise so eingebunden werden:

```js
import "./mein_modul/index.js";
```

### Debugging

Bei Problemen zuerst die Minecraft-Scripting-Logs prüfen.

Für umfangreichere Fehlersuche kann das Debugging in der jeweiligen Konfiguration aktiviert werden.

---

## ⚠️ Hinweise

- Siedler Logic ist für **Minecraft Bedrock 1.26.0+** ausgelegt.
- Die aktuelle Manifest-Abhängigkeit ist `@minecraft/server 2.9.0`. fileciteturn6file0
- Änderungen an der Bedrock-Scripting-API können Anpassungen am Code erforderlich machen.
- Vor Änderungen an einer produktiven Welt sollte ein Backup erstellt werden.
- Große Pillager-Truppen, häufige Spawns und intensive KI-Berechnungen können zusätzliche Serverlast verursachen.
- Befehle und Konfigurationsoptionen können sich zwischen Versionen ändern.

---

## 🐛 Fehler melden

Bei einem Fehler bitte möglichst folgende Informationen angeben:

1. Minecraft-Bedrock-Version
2. Siedler-Logic-Version
3. `@minecraft/server`-Version
4. vollständiger relevanter Log-Auszug
5. Schritte zum Reproduzieren
6. betroffenes Modul bzw. betroffene Datei

Beispiel:

```text
Minecraft: 1.26.x
Siedler Logic: 1.1.4
@minecraft/server: 2.9.0
Modul: Monster / Pillager
Fehler: ...
```

---

## 🤝 Mitwirken

Beiträge, Bugfixes und neue Features sind willkommen.

```bash
git clone https://github.com/Jawollo07/mc-siedler-bp.git
cd mc-siedler-bp
```

Bitte bei Änderungen möglichst die bestehende modulare Struktur beibehalten und neue Systeme sauber in eigene Module aufteilen.

---

## 📜 Lizenz

Aktuell ist im Repository keine separate Lizenzdatei hinterlegt.

Ohne ausdrückliche Lizenz gelten die gesetzlichen Urheberrechte. Wenn das Projekt ausdrücklich als Open Source genutzt, verändert und weiterveröffentlicht werden soll, sollte eine passende Lizenzdatei wie `LICENSE` ergänzt werden.

---

## 🔗 Links

- **Repository:** https://github.com/Jawollo07/mc-siedler-bp
- **Minecraft Creator:** https://learn.microsoft.com/minecraft/creator/

---

## 👤 Autor

**Jawollo07**  
Projekt: **Siedler Logic**

---

> 🚧 **Siedler Logic befindet sich in aktiver Entwicklung.** Funktionen, Befehle und Konfigurationswerte können sich mit zukünftigen Versionen ändern.

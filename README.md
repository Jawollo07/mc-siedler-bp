# 🏘️ Siedler Logic

> Ein modulares Minecraft-Bedrock-Behavior-Pack für Siedler-, Survival- und Multiplayer-Server.

[![Minecraft Bedrock](https://img.shields.io/badge/Minecraft%20Bedrock-1.26.0%2B-62B47A?logo=minecraft)](https://www.minecraft.net/)
[![API](https://img.shields.io/badge/%40minecraft%2Fserver-2.9.0-5C5CFF)](https://learn.microsoft.com/minecraft/creator/scriptapi/minecraft/server/minecraft-server)
[![Version](https://img.shields.io/badge/Version-1.1.4-orange)](https://github.com/Jawollo07/mc-siedler-bp)

Siedler Logic ist ein modulares Minecraft-Bedrock-Behavior-Pack für Siedler-, Survival- und Multiplayer-Server. Das Pack kombiniert **Teams, Claims, Steuern, Spieler-Statistiken, Essentials und ein konfigurierbares Monster-System**. Dazu kommen organisierte **Pillager-Trupps, eigene KI, Belagerungen und Pillager-Außenposten-Raids**.

---

## 📋 Inhaltsverzeichnis

- [✨ Features](#-features)
- [📦 Installation](#-installation)
- [🗂️ Projektstruktur](#️-projektstruktur)
- [🎮 Befehle](#-befehle)
- [📊 Siedler-Spielermenü](#-siedler-spielermenü)
- [🏠 Claim-Menü](#-claim-menü)
- [💰 Steuern](#-steuern)
- [👹 Monster-System](#-monster-system)
- [🏴 Pillager-Trupps](#-pillager-trupps)
- [🧠 Pillager-KI](#-pillager-ki)
- [⚙️ Konfiguration](#️-konfiguration)
- [💾 Speicherung](#-speicherung)
- [🔐 Berechtigungen](#-berechtigungen)
- [🛠️ Entwicklung](#️-entwicklung)
- [⚠️ Hinweise](#-hinweise)
- [🤝 Mitwirken](#-mitwirken)
- [📜 Lizenz](#-lizenz)

---

## ✨ Features

### 👥 Teams

- Teams erstellen, löschen und verwalten
- Spieler zu Teams hinzufügen und entfernen
- Frei definierbare Minecraft-Teamfarbe
- Teamübersicht mit Mitgliedern und Steuerkiste
- Team-Chat über `@team`
- Dauerhafte Speicherung über World Dynamic Properties
- Server-Formulare für Teamverwaltung und Teaminformationen

### 🏠 Claims

Claims schützen die Gebiete der einzelnen Teams.

- Ein Claim umfasst **2×2 Chunks**
- Bis zu **4 Chunks pro Team**
- Bereits belegte Chunks werden erkannt
- Schutz vor unerlaubten Aktionen in geschützten Gebieten
- Claim-Informationen können abgefragt werden
- Claim-Daten werden dauerhaft gespeichert
- Server-Formular zur Verwaltung der Claims

### 📊 Spieler-Statistiken

Das zentrale Spieler-Dashboard ist über ein Server-Formular erreichbar.

- Spielerprofil
- Position und Dimension
- aktueller Claim
- eigenes Team
- Teammitglieder
- Anzahl der Team-Claims
- Anzahl der Dorfbewohner innerhalb der Team-Claims
- tägliche Steuer
- Steuerkisten-Status
- Server-Statistiken
- Aktualisieren-Funktion

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

### 1. Repository klonen

```bash
git clone https://github.com/Jawollo07/mc-siedler-bp.git
cd mc-siedler-bp
```

### 2. Behavior Pack einbinden

Der Repository-Ordner ist das Behavior Pack. Binde ihn in die gewünschte Minecraft-Bedrock-Welt bzw. den Server ein und aktiviere das Pack.

Der Script-Einstiegspunkt ist:

```text
scripts/main.js
```

### 3. Start prüfen

Beim erfolgreichen Laden sollten im Scripting-Log Meldungen wie diese erscheinen:

```text
[Siedler Logic] Alle Module geladen!
[Siedler Logic] Erfolgreich gestartet!
```

Nach Änderungen an Custom Commands oder Server-Formularen sollte der Behavior Pack bzw. der Server vollständig neu geladen werden.

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
    │   ├── index.js
    │   └── player_stats.js
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

### Architektur

```text
scripts/main.js
│
├── Dynamic Properties
├── Teams
│   └── Team-Chat
├── Steuern
├── Claims
│   ├── Verwaltung / Formulare
│   ├── Schutz
│   └── Anzeige
├── Essentials
│   └── Spieler-Dashboard
└── Monster
    ├── Konfiguration
    ├── Tokens
    ├── Pillager-Trupps
    ├── Außenposten-Raids
    └── Commands
```

---

## 🎮 Befehle

### 👥 Team-Befehle

| Befehl | Beschreibung | Berechtigung |
|---|---|---|
| `/siedler:team` | Öffnet das Team-Menü | Spieler |
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
| `/siedler:claim` | Öffnet das Claim-Menü | Spieler |
| `/siedler:claim_set <team>` | Setzt einen 2×2-Chunk-Claim | OP |
| `/siedler:claim_remove <team>` | Entfernt den Claim eines Teams | OP |
| `/siedler:claim_info` | Zeigt den aktuellen Claim | Alle |
| `/siedler:claim_list` | Listet Claims auf | OP |

### 📊 Spieler-Menü

```text
/siedler:stats
```

Öffnet das zentrale Siedler-Spielermenü.

---

## 📊 Siedler-Spielermenü

Mit `/siedler:stats` erhalten Spieler ein zentrales Server-Formular für ihre wichtigsten Informationen.

### 🏠 Hauptmenü

```text
👤 Mein Profil
🛡️ Team
🏠 Claims
💰 Steuern & Wirtschaft
📊 Server-Statistiken
🔄 Aktualisieren
✕ Schließen
```

### 👤 Mein Profil

Zeigt:

- Spielername
- aktuelle Position
- aktuelle Dimension
- Anzahl der Online-Spieler
- eigenes Team
- Anzahl der Teammitglieder

### 🛡️ Team

Zeigt Informationen zum eigenen Team:

- Teamname
- Mitgliederzahl
- Anzahl der beanspruchten Chunks
- Anzahl der Dorfbewohner in den Team-Claims
- Teamfarbe

Ist der Spieler keinem Team zugeordnet, wird dies entsprechend angezeigt.

### 🏠 Claims

Zeigt:

- aktuellen Chunk
- Team des aktuellen Claims
- ob der aktuelle Standort frei ist
- Anzahl der eigenen Team-Claims
- aktuelles Claim-Limit

### 💰 Steuern & Wirtschaft

Zeigt:

- Team
- Anzahl der Dorfbewohner
- tägliche Steuer
- Steuerberechnung
- Steuerkisten-Status

### 📊 Server-Statistiken

Zeigt unter anderem:

- Online-Spieler
- Anzahl der Teams
- Anzahl der beanspruchten Chunks
- Anzahl der Dorfbewohner in der aktuellen Dimension
- aktuelle Dimension

### 🔄 Aktualisieren

Die Werte können direkt aus dem Menü heraus aktualisiert werden, ohne `/siedler:stats` erneut auszuführen.

---

## 🏠 Claim-Menü

Mit:

```text
/siedler:claim
```

wird das Claim-Server-Formular geöffnet.

### 🟢 Grundstück setzen

- zeigt alle vorhandenen Teams in einem Dropdown
- Team auswählen
- Claim wird am aktuellen Spielerstandort gesetzt
- das normale Claim-Limit und die Belegungsprüfung bleiben aktiv

### 🔴 Grundstück entfernen

- Team auswählen
- alle Claims dieses Teams werden entfernt

### 🟡 Aktuellen Claim anzeigen

Zeigt, ob der aktuelle Chunk frei ist oder zu welchem Team er gehört.

### 🟠 Alle Claims anzeigen

Listet die aktuell vergebenen Claims nach Team auf.

---

## 💰 Steuern

Die Steuerberechnung basiert standardmäßig auf den Dorfbewohnern innerhalb der Claims eines Teams.

Ein Team kann außerdem einen festen Steuerbetrag konfigurieren.

Die Steuerkiste wird über den Team-Steuerbefehl eingerichtet:

```text
/siedler:team_settax <team> <x> <y> <z> [amount]
```

Die Auszahlung erfolgt automatisch zum Beginn eines neuen Minecraft-Tages.

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

---

## 🏰 Pillager-Außenposten

Das Monster-System kann Pillager-Truppen bevorzugt an bzw. in der Nähe von **Pillager-Außenposten** erzeugen.

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

Pillager-Truppen können gegnerische Gebiete als Ziele verwenden. In Verbindung mit Claims können Spielergebiete dadurch von feindlichen Truppen angegriffen werden.

Aktivieren/deaktivieren:

```text
/siedler:monster_siege on
/siedler:monster_siege off
```

---

## 🧠 Pillager-KI

Die Pillager-Truppen besitzen eine eigene Logik und sind nicht nur zufällige Mob-Spawns.

Je nach aktivierten Funktionen kann die KI unter anderem:

- Ziele suchen
- Entfernungen bewerten
- zu Zielen laufen
- Nah- und Fernkampf einsetzen
- Truppmitglieder zusammenhalten
- getrennte Einheiten wieder gruppieren
- gegnerische Claims als Ziele verwenden
- Angriffe bzw. Belagerungen durchführen

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

| Eingabe | Ergebnis |
|---|---|
| `true` / `false` | Boolean |
| `0.5`, `10`, usw. | Number |
| `{...}` | JSON-Objekt, sofern gültig |
| `[...]` | JSON-Array, sofern gültig |
| sonstiger Text | String |

---

## 💾 Speicherung

Siedler Logic verwendet **World Dynamic Properties** für dauerhafte Daten.

Dazu gehören unter anderem:

- Teams
- Claims
- Homes
- Todespunkte
- Monster-Konfiguration

---

## 🔐 Berechtigungen

Administrative Commands sind entsprechend ihrer Funktion geschützt. Spielerbezogene Informationsmenüs wie `/siedler:stats` und `/siedler:claim` können von normalen Spielern geöffnet werden.

| Bereich | Berechtigung |
|---|---|
| Spieler-Statistiken | Alle Spieler |
| Claim-Menü | Alle Spieler |
| Claim setzen/entfernen per Command | OP |
| Team-Verwaltung | OP |
| Steuerkiste konfigurieren | OP |
| Monster-Verwaltung | OP / Game Director |

---

## 🛠️ Entwicklung

### Voraussetzungen

- Minecraft Bedrock `1.26.0+`
- `@minecraft/server` `2.9.0`
- JavaScript / ECMAScript
- Behavior-Pack-Scripting

### Einstiegspunkt

```text
scripts/main.js
```

### Neue Module

Neue Systeme sollten möglichst modular unter `scripts/` angelegt und über den zentralen Einstiegspunkt geladen werden.

### Server-Formulare

Für UI-Elemente wird `@minecraft/server-ui` verwendet, insbesondere:

```js
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
```

---

## ⚠️ Hinweise

- Nach Änderungen an Custom Commands sollte der Server bzw. das Behavior Pack neu geladen werden.
- Die verwendete Bedrock-Scripting-API muss zur Version des Packs passen.
- Team-, Claim- und Steuerdaten werden dauerhaft gespeichert und sollten bei größeren Änderungen gesichert werden.
- Administrative Commands sollten nur vertrauenswürdigen Spielern zugänglich sein.

---

## 🤝 Mitwirken

Issues und Pull Requests sind willkommen.

Repository:

https://github.com/Jawollo07/mc-siedler-bp

---

## 📜 Lizenz

Siehe die Lizenzdatei bzw. Repository-Konfiguration für die aktuell geltenden Lizenzbedingungen.

---

**Siedler Logic** – Teams, Claims, Wirtschaft und Monster-System für Minecraft Bedrock. 🏘️
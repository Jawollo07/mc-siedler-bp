# Siedler Logic

Ein umfangreiches **Minecraft Bedrock Behavior Pack** für Siedler-/Survival-Server. Das Pack bündelt Teams, Grundstücke (Claims), Steuern, ein konfigurierbares Monster-System mit Pillager-Trupps und Außenposten-Raids sowie verschiedene Essentials in einem Script-Modul.

> **Aktueller Stand:** Version **1.1.3** · Mindestversion **Minecraft Bedrock 1.26.0** · `@minecraft/server` **2.9.0**

## ✨ Features

### 👥 Teams
- Teams erstellen, löschen und verwalten.
- Spieler können einem Team zugeordnet oder daraus entfernt werden.
- Teams besitzen eine frei definierbare Minecraft-Farbe.
- Teamdaten werden als World Dynamic Properties gespeichert.
- Teamübersicht inklusive Mitglieder und Steuerkiste.
- Eigener Team-Chat über `@team`.

### 🏠 Claims / Grundstücke
- Ein Claim besteht aus einem **2×2-Chunk-Gebiet**.
- Pro Team sind maximal **4 Chunks** vorgesehen.
- Bereits vergebene Chunks werden automatisch erkannt.
- Schutzsystem verhindert unerlaubte Aktionen in geschützten Bereichen.
- Claim-Informationen können von jedem Spieler abgefragt werden.
- Claim-Daten werden dauerhaft gespeichert.

### 💰 Steuern
- Teams können eine Steuerkiste festlegen.
- Standardmäßig orientiert sich die Auszahlung an der Anzahl der Dorfbewohner innerhalb der Team-Claims.
- Alternativ kann ein fester Steuerbetrag für ein Team konfiguriert werden.
- Die Auszahlung erfolgt automatisch zu Beginn eines neuen Minecraft-Tages.
- Emeralds werden direkt in die Steuertruhe gelegt.
- Ist die Truhe voll, werden überschüssige Emeralds daneben gespawnt.
- Teammitglieder werden über die Auszahlung informiert.

### 👹 Monster-System
Das Monster-System besitzt eine zentrale Konfiguration und unterstützt:

- Individuelle Spawn-Chancen für verschiedene Monster.
- Unterschiedliche Spawnraten für normale Gebiete und Claims.
- Nacht-Multiplikatoren.
- Geblockte Monster innerhalb von Claims.
- Konfigurierbares Schwäche-System.
- Pillager-Trupps mit zufälliger Gruppengröße.
- Vindicator- und Ravager-Anteile in Trupps.
- Pillager-Captains.
- Eigene Pillager-KI mit Zielsuche, Bewegung, Angriff und Gruppierungslogik.
- Belagerungen gegnerischer Gebiete.
- Bevorzugtes Spawnen an Pillager-Außenposten.
- Dynamische Monster-Konfiguration ohne Neustart des Packs.

### 🏴 Pillager-Trupps & Außenposten
Das Pillager-System kann automatisch feindliche Trupps erzeugen. Dabei können Außenposten bevorzugt werden.

Die Standardkonfiguration enthält unter anderem:

| Einstellung | Standardwert |
|---|---:|
| Truppgröße | 4–7 |
| Maximale aktive Trupps | 3 |
| Spawnchance | 22 % |
| Outpost-Spawnchance | 70 % |
| Mindestdistanz | 36 Blöcke |
| Maximaldistanz | 64 Blöcke |
| Lebensdauer | 24.000 Ticks |
| Denkintervall der KI | 10 Ticks |
| Angriffsreichweite | 3,2 Blöcke |
| Fernkampfreichweite | 18 Blöcke |

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

---

## 📦 Installation

### 1. Dateien herunterladen

Lade das Repository herunter oder klone es:

```bash
git clone https://github.com/Jawollo07/mc-siedler-bp.git
```

### 2. Behavior Pack installieren

Der Inhalt des Repositorys ist ein Behavior Pack. Der Ordner muss als Behavior-Pack-Verzeichnis deiner Welt eingebunden werden.

Die zentrale Manifest-Datei ist:

```text
manifest.json
```

Das Script startet über:

```text
scripts/main.js
```

### 3. Script-Abhängigkeit

Das Pack verwendet:

```text
@minecraft/server 2.9.0
```

und benötigt daher eine kompatible Minecraft-Bedrock-Version.

### 4. Welt starten

Nach dem Aktivieren des Behavior Packs sollte im Server-/Welt-Log unter anderem erscheinen:

```text
[Siedler Logic] Alle Module geladen!
[Siedler Logic] Erfolgreich gestartet!
```

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

`main.js` lädt die einzelnen Module und sorgt dafür, dass die Dynamic Properties früh registriert werden.

---

## 🎮 Team-Befehle

| Befehl | Beschreibung | Berechtigung |
|---|---|---|
| `/siedler:team_create <name> [farbe]` | Erstellt ein Team | OP |
| `/siedler:team_add <spieler> <team>` | Fügt einen Spieler hinzu | OP |
| `/siedler:team_remove <spieler> <team>` | Entfernt einen Spieler | OP |
| `/siedler:team_delete <team>` | Löscht ein Team | OP |
| `/siedler:team_list` | Zeigt alle Teams | OP |
| `/siedler:team_settax <team> <x> <y> <z> [amount]` | Setzt Steuerkiste und optional festen Betrag | OP |

### Team-Chat

Spieler können mit folgendem Präfix ausschließlich mit ihrem eigenen Team schreiben:

```text
@team Hallo zusammen!
```

---

## 🏞️ Claim-Befehle

| Befehl | Beschreibung | Berechtigung |
|---|---|---|
| `/siedler:claim_set <team>` | Setzt ein 2×2-Chunk-Grundstück am Spielerstandort | OP |
| `/siedler:claim_remove <team>` | Entfernt das Grundstück eines Teams | OP |
| `/siedler:claim_info` | Zeigt den aktuellen Claim-Status | Alle |
| `/siedler:claim_list` | Listet alle vergebenen Grundstücke | OP |

---

## 👹 Monster-Admin-Befehle

Monster-Befehle werden über den Chat ausgeführt und benötigen den Tag `monster.admin` oder `admin`.

```text
!monster help
!monster status
!monster enable
!monster disable
!monster pillager on|off
!monster outpost on|off
!monster siege on|off
!monster spawn [1-32]
!monster clear
!monster reload
!monster save
```

Beispiel:

```text
/tag <spieler> add monster.admin
```

Danach kann der Spieler beispielsweise mit

```text
!monster status
```

den aktuellen Status anzeigen.

Hinweis: Zusätzlich zu den Chat-Befehlen gibt es jetzt administrative Slash-Commands mit OP-Rechteprüfung:

```text
/siedler:monster_get <path>    # Gibt einen Konfigurationswert zurück (z.B. pillager.spawnChance)
/siedler:monster_set <path> <value>  # Setzt einen Konfigurationswert und speichert die Config
```

Beispiele (als OP im Spiel):

```text
/siedler:monster_get pillager.spawnChance
/siedler:monster_set pillager.spawnChance 0.5
/siedler:monster_set pillager.outpost.enabled true
```

---

## ⚙️ Monster-Konfiguration

Die zentrale Standardkonfiguration befindet sich in:

```text
scripts/monster/config.js
```

Dort können unter anderem folgende Bereiche angepasst werden:

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

Die Pillager-Konfiguration ist in die Bereiche `ai`, `siege`, `outpost` und `composition` unterteilt. Dadurch lassen sich KI-Verhalten, Belagerungen, Außenposten und Truppzusammensetzung getrennt anpassen.

Änderungen können außerdem über die Monster-Admin-Befehle gespeichert bzw. neu geladen werden.

Konfiguration per Befehl
-----------------------

Das Pack bietet nun komfortable Befehle zum Lesen und Setzen von Konfigurationswerten zur Laufzeit:

- `/siedler:monster_get <path>` — Liefert den aktuellen Wert zurück. Pfade verwenden Punkt-Notation (z.B. `pillager.spawnChance`).
- `/siedler:monster_set <path> <value>` — Setzt einen Wert und speichert die Config in den World Dynamic Properties.

Werteparsing beim `monster_set`:
- `true` / `false` → Boolean
- numerische Strings → Number (z.B. `0.5` → Zahl)
- JSON-Objekte/Arrays (`{...}` / `[...]`) werden versucht zu parsen
- sonst → String

Beispiele:

```text
/siedler:monster_get pillager.spawnChance
/siedler:monster_set pillager.spawnChance 0.35
/siedler:monster_set pillager.outpost.enabled true
/siedler:monster_set pillager.composition '{"includeRavager":false}'
```

Hinweis: Diese Befehle erfordern OP-Rechte (`GameDirectors`). Für zusätzliche Sicherheit kann eine Whitelist implementiert werden, die nur bestimmte Pfade änderbar macht. Frage mich, wenn du das möchtest.

---

## 🧠 Pillager-KI

Das Pillager-System ist nicht nur ein einfacher zufälliger Spawn. Die Trupp-Logik berücksichtigt unter anderem:

- Zielauswahl.
- Entfernung zum Ziel.
- Angriffsreichweite.
- Fernkampfreichweite.
- Gruppierung und Formation.
- Bewegung zum Ziel.
- Verlust eines Ziels.
- Rückzug nach längerer erfolgloser Suche.
- Gegnerische Claims als mögliche Angriffsziele.
- Pillager-Außenposten als bevorzugte Spawnpunkte.

Damit können Pillager als organisierte feindliche Trupps eingesetzt werden.

---

## 💾 Speicherung

Das Pack verwendet Minecraft **World Dynamic Properties**, um Daten dauerhaft in der Welt zu speichern.

Gespeichert werden unter anderem:

- Teams
- Claims
- Homes
- Todespunkte
- Monster-Konfiguration

Die Daten sind damit nicht an einen einzelnen Server-Prozess gebunden und bleiben beim Neustart der Welt erhalten.

---

## 🔐 Berechtigungen

Die meisten Verwaltungsbefehle verwenden die Bedrock-Berechtigungsstufe `GameDirectors` und sind damit für normale Spieler nicht verfügbar.

Das Monster-Chat-Interface besitzt zusätzlich eine eigene Tag-Prüfung:

```text
monster.admin
```

oder

```text
admin
```

Normale Spieler können die allgemeinen Spielerfunktionen wie Home, TPA, Back und private Nachrichten verwenden.

---

## 🛠️ Entwicklung

Das Projekt ist in einzelne Module aufgeteilt, damit Systeme unabhängig voneinander angepasst werden können.

### Einstiegspunkt

```text
scripts/main.js
```

### Neue Module hinzufügen

Ein neues System kann als eigenes Modul unter `scripts/` angelegt und anschließend in `scripts/main.js` importiert werden.

Beispiel:

```js
import "./mein_modul/index.js";
```

### Fehlerdiagnose

Das Pack schreibt Status- und Fehlermeldungen in die Minecraft-Scripting-Logs. Für das Monster-System kann zusätzlich `debug: true` in der zentralen Konfiguration aktiviert werden.

---

## ⚠️ Hinweise

- Das Pack verwendet die aktuelle `@minecraft/server`-API-Version aus dem Manifest und ist nicht für beliebig alte Bedrock-Versionen ausgelegt.
- Bei Änderungen an der Minecraft-Scripting-API können einzelne Funktionen angepasst werden müssen.
- Vor größeren Änderungen an einer produktiven Welt sollte ein Backup der Welt erstellt werden.
- Die Monster- und Pillager-Systeme können je nach Konfiguration zusätzliche Serverlast erzeugen.

---

## 📜 Lizenz

Aktuell ist im Repository keine Lizenzdatei hinterlegt. Falls das Projekt öffentlich weitergegeben oder von anderen Personen verändert werden soll, empfiehlt sich eine ausdrückliche Lizenz im Repository.

---

## 🔗 Repository

**GitHub:** https://github.com/Jawollo07/mc-siedler-bp

---

## 👤 Autor

**Jawollo07**

Projekt: **Siedler Logic**

# 🏘️ Siedler Logic – Spielerhandbuch

> Enduser-Dokumentation für das aktuelle Siedler Logic Behavior Pack.
>
> **Stand:** 11.09.2026

Siedler Logic erweitert Minecraft Bedrock um Teams, Gebiete, Diplomatie, Wirtschaft, Steuern, Soldaten, Händler, Monster, Minenfelder und praktische Serverfunktionen.

Diese Seite richtet sich an **Spieler und Spielleiter**. Technische Moduldateien, Dynamic Properties und interne Implementierungsdetails werden bewusst nicht erklärt.

---

## 📌 Schnellstart

Die wichtigsten Befehle für normale Spieler:

| Befehl | Zweck |
|---|---|
| `/siedler:team` | Team-Verwaltung öffnen |
| `/siedler:diplomacy` | Diplomatie öffnen |
| `/siedler:claim` | Claim-Menü öffnen |
| `/siedler:claim_info` | Aktuellen Claim prüfen |
| `/siedler:market` | Zum Marktplatz teleportieren |
| `/siedler:soldier_tool` | Soldatenstab erhalten |
| `/siedler:soldier_tp` | Eigene Soldaten zu dir teleportieren |
| `/siedler:ec` | Persönlichen 27-Slot-Enderchest öffnen |
| `/siedler:teamchest` | Gemeinsame 54-Slot-Teamchest öffnen |
| `/siedler:sethome` | Home setzen |
| `/siedler:home` | Zum Home teleportieren |
| `/siedler:tpa <spieler>` | Teleport-Anfrage senden |
| `/siedler:tpaccept` | Teleport-Anfrage annehmen |
| `/siedler:tpdeny` | Teleport-Anfrage ablehnen |
| `/siedler:back` | Zum letzten Todespunkt |
| `/siedler:spawn` | Zum Weltspawn |
| `/siedler:afk` | AFK-Status umschalten |
| `/siedler:mines` | Minenfeld-Verwaltung öffnen |

> Die meisten Spielerfunktionen benötigen keine OP-Rechte. Verwaltungs- und Spielleiterbefehle sind entsprechend geschützt.

---

# 👥 Teams

Teams bilden die Grundlage des Siedler-Systems. Spieler werden anhand ihrer persistenten **Spieler-ID** einem Team zugeordnet. Dadurch bleibt die Zuordnung unabhängig von Namensänderungen stabil.

## Team-Menü

```text
/siedler:team
```

Öffnet das grafische Team-Management.

Spieler können dort – abhängig von ihren Rechten – Teaminformationen verwalten.

## Team-Befehle

| Befehl | Funktion | Rechte |
|---|---|---|
| `/siedler:team` | Team-Menü | Alle |
| `/siedler:team_create <name> [farbe]` | Team erstellen | Spielleitung |
| `/siedler:team_add <spieler> <team>` | Spieler hinzufügen | Spielleitung |
| `/siedler:team_remove <spieler> <team>` | Spieler entfernen | Spielleitung |
| `/siedler:team_delete <team>` | Team löschen | Spielleitung |
| `/siedler:team_list` | Teams und Mitglieder anzeigen | Spielleitung |

Ein Spieler kann immer nur **einem Team gleichzeitig** angehören.

---

# 🤝 Diplomatie

Teams besitzen Beziehungen zueinander:

- 🟢 **Verbündet** – freundliche Beziehung
- 🟡 **Neutral** – keine Feindschaft
- 🔴 **Feindlich** – Gegner

```text
/siedler:diplomacy
```

Das Menü zeigt die gespeicherten Beziehungen und erlaubt Teammitgliedern, die Beziehung ihres Teams zu einem anderen Team zu ändern. Änderungen gelten für beide beteiligten Teams.

Die Diplomatie wird unter anderem von Soldaten und Minen verwendet, um Freund und Feind zu unterscheiden.

---

# 🗺️ Claims / Grundstücke

Ein Claim schützt ein **4×4-Chunk-Grundstück**, also insgesamt 16 Chunks.

Das Claim-System schützt unter anderem vor unerlaubten Blockänderungen. Bei geschützten Aktionen greift die vorhandene Protection-Logik; je nach Aktion können Änderungen zurückgesetzt und Items wiederhergestellt werden.

## Claim-Menü

```text
/siedler:claim
```

Das Menü bietet:

- Grundstück setzen
- Grundstück entfernen
- aktuellen Claim anzeigen
- alle vergebenen Claims anzeigen

## Claim-Befehle

| Befehl | Funktion | Rechte |
|---|---|---|
| `/siedler:claim` | Claim-Menü | Alle |
| `/siedler:claim_info` | Besitzer des aktuellen Chunks anzeigen | Alle |
| `/siedler:claim_set <team>` | 4×4-Chunk-Claim für ein Team setzen | Spielleitung |
| `/siedler:claim_remove <team>` | Alle Claims eines Teams entfernen | Spielleitung |
| `/siedler:claim_force_remove <team>` | Claims eines nicht mehr existierenden Teams entfernen | Spielleitung |
| `/siedler:claim_force_release` | Claim des aktuellen Chunks freigeben | Spielleitung |
| `/siedler:claim_list` | Alle Claims auflisten | Spielleitung |

Pro Team sind aktuell maximal **16 Chunks** vorgesehen; ein neuer 4×4-Claim benötigt daher die entsprechende freie Claim-Kapazität.

---

# ⚔️ Soldaten

Das Soldatensystem stellt eigene Einheiten mit KI bereit. Aktuell gibt es:

- ⚔️ **Infanterie** – Nahkampf
- 🏹 **Bogenschütze** – Fernkampf mit ballistischer Pfeilphysik
- 🐎 **Kavallerie** – berittene Einheit mit Charge-/Pass-Verhalten

Soldaten besitzen:

- Besitzer
- Teamzugehörigkeit
- Level 1–7
- XP
- Ausrüstung
- Befehlszustand
- Gruppenunterstützung

Die Einheiten können Ziele suchen, Wege berechnen, Hindernisse berücksichtigen und sich im Gelände bewegen. Soldaten erkennen die Teambeziehungen und greifen nicht einfach verbündete Einheiten an.

## Soldatenstab

```text
/siedler:soldier_tool
```

Gibt den **Soldatenstab** zur interaktiven Soldatenverwaltung. Die Auswahl kann über die Spieloberfläche erfolgen.

## Soldaten teleportieren

```text
/siedler:soldier_tp
```

Teleportiert deine eigenen Soldaten zu dir.

Optional kann eine Auswahl angegeben werden, z. B. eine Gruppe oder eine andere vom Soldatensystem unterstützte Auswahl.

## Einzel-Soldatenbefehle

| Befehl | Funktion | Rechte |
|---|---|---|
| `/siedler:soldier_tool` | Soldatenstab erhalten | Alle |
| `/siedler:soldier_tp [Target]` | Eigene Soldaten teleportieren | Alle |
| `/siedler:move <x> <y> <z>` | Nächsten eigenen Soldaten bewegen | Spielleitung |
| `/siedler:follow` | Nächsten Soldaten folgen lassen | Spielleitung |
| `/siedler:stay` | Nächsten Soldaten halten lassen | Spielleitung |
| `/siedler:attack [radius]` | Nächsten Soldaten angreifen lassen | Spielleitung |
| `/siedler:defend [radius]` | Position verteidigen | Spielleitung |
| `/siedler:patrol <x> <y> <z>` | Zwischen Positionen patrouillieren | Spielleitung |
| `/siedler:stop` | Befehl des Soldaten stoppen | Spielleitung |
| `/siedler:soldier_info` | Level und XP anzeigen | Spielleitung |
| `/siedler:soldier_xp <amount>` | XP vergeben | Spielleitung |
| `/siedler:spawn_soldier <type> [level]` | Soldaten spawnen | Spielleitung |

### Soldatengruppen

Mehrere eigene Soldaten können dauerhaft zu Gruppen zusammengefasst werden.

| Befehl | Funktion |
|---|---|
| `/siedler:group_create <name> [radius]` | Gruppe aus eigenen Soldaten in der Nähe erstellen |
| `/siedler:group_add <gruppe>` | Nächsten eigenen Soldaten hinzufügen |
| `/siedler:group_remove <gruppe>` | Nächsten eigenen Soldaten entfernen |
| `/siedler:group_delete <gruppe>` | Gruppe löschen |
| `/siedler:group_list` | Eigene Gruppen anzeigen |
| `/siedler:group_move <gruppe> <x> <y> <z>` | Gruppe in Formation bewegen |
| `/siedler:group_follow <gruppe>` | Gruppe folgen lassen |
| `/siedler:group_stay <gruppe>` | Gruppe halten lassen |
| `/siedler:group_defend <gruppe> <x> <y> <z> [radius]` | Bereich verteidigen |
| `/siedler:group_stop <gruppe>` | Gruppe stoppen |
| `/siedler:group_formation <gruppe> <formation> [spacing]` | Formation ändern |

---

# 🎯 Soldaten-Angriffsmodi

Das Soldatensystem unterstützt sechs Modi:

| Modus | Verhalten |
|---:|---|
| `0` | Nichts automatisch angreifen |
| `1` | Monster in der Nähe angreifen |
| `2` | Feindliche Soldaten angreifen |
| `3` | Tiere angreifen |
| `4` | Feindliche Dorfbewohner angreifen |
| `5` | Alles angreifen |

Die Zielauswahl berücksichtigt zusätzlich Besitzer, Soldatentypen und Teambeziehungen.

---

# 🏪 Marktplatz & Händler

Der Marktplatz ist ein zentraler Handelsbereich des Servers.

```text
/siedler:market
```

Teleportiert dich zum gespeicherten Marktplatz-Teleportpunkt.

Der Marktplatz ist als geschützter Handelsbereich gedacht. Das Marktsystem verhindert dort insbesondere das normale Block-Interagieren, das für die Marktplatzregeln nicht erlaubt ist, und hält Monster aus dem Bereich fern.

## Händler

Im Marktplatz können spezialisierte Händler verwendet werden. Das System unterstützt unter anderem Handelsangebote und einen speziellen **Soldatenhändler**.

Die konkrete Auswahl der Händler und Angebote wird durch die Serverkonfiguration bzw. die aktuell gespawnten Händler bestimmt.

## Marktplatz-Verwaltung

| Befehl | Funktion | Rechte |
|---|---|---|
| `/siedler:market` | Zum Marktplatz teleportieren | Alle |
| `/siedler:market_tp_set` | Marktplatz-Teleportpunkt auf eigene Position setzen | Spielleitung |
| `/siedler:market_status` | Marktplatzstatus und Teleportpunkt anzeigen | Spielleitung |
| `/siedler:market_enable` | Marktplatz aktivieren | Spielleitung |
| `/siedler:market_disable` | Marktplatz deaktivieren | Spielleitung |
| `/siedler:market_cleanup` | Monster sofort aus dem Marktplatz entfernen | Spielleitung |

---

# 💰 Steuern & Wirtschaft

Die Wirtschaft verwendet **Emeralds** als zentrale Währung.

Die tägliche Teamsteuer wird anhand der Dorfbewohner in den Claims des Teams berechnet. Aktuell beträgt die Basis:

> **2 Emeralds pro Dorfbewohner und Tag**

Zusätzlich kann ein Team einen permanenten **Monster-Token-TaxBonus** besitzen.

Beispiel:

```text
5 Dorfbewohner × 2 Emeralds = 10 Emeralds
+ 1 Emerald TaxBonus
= 11 Emeralds Tagessteuer
```

Die Tagesabrechnung erfolgt nur, wenn mindestens ein Teammitglied online ist und eine Steuerkiste eingerichtet wurde. Bei einem fehlgeschlagenen Einzahlungsversuch wird später erneut versucht abzurechnen.

## Steuerbefehle

| Befehl | Funktion | Rechte |
|---|---|---|
| `/siedler:countvillagers <team>` | Dorfbewohner in Team-Claims zählen | Spielleitung |
| `/siedler:settax <team> <x> <y> <z>` | Steuerkiste festlegen | Spielleitung |
| `/siedler:taxinfo <team>` | Aktuellen Steuerstatus anzeigen | Spielleitung |
| `/siedler:taxstats <team>` | Steuerstatistik öffnen | Spielleitung |

---

# 💣 Minenfeld

Das Minenfeld ist ein persistentes Verteidigungssystem.

## Mine platzieren

```text
/give @s siedler:mine
```

Mit der Mine einen geeigneten Untergrund anvisieren und benutzen.

Die Platzierung wird unter anderem auf Folgendes geprüft:

- geeigneter fester Untergrund
- freier Raum über der Position
- keine Flüssigkeit
- keine zu nahe gelegene Mine
- keine ungültige Doppelplatzierung

Das Item wird erst **nach erfolgreicher Prüfung** verbraucht.

Nach der Platzierung wird die Mine nach **1 Sekunde scharf**.

## Auslösemodi

| Modus | Spieler-Auslösung |
|---:|---|
| `0` | Nur Feinde |
| `1` | Feinde + neutrale Teams |
| `2` | Alle Spieler |

Eigene und verbündete Teams lösen die jeweilige Team-Mine nicht aus.

**Monster können scharfe Minen unabhängig vom Spieler-Modus auslösen.** Das gilt sowohl für normale Bedrock-Monster als auch für `siedler:monster`.

Eine ausgelöste Mine warnt kurz per Nachricht/Sound und explodiert nach ungefähr **1 Sekunde**.

Die Explosion:

- zerstört keine Blöcke
- kann Feuer erzeugen
- kann benachbarte scharfe Minen auslösen
- macht die Mine anschließend wieder verfügbar

Die automatische Wiederbewaffnung erfolgt nach ungefähr **15 Sekunden**.

## Minenverwaltung

```text
/siedler:mines
```

Öffnet die grafische Minenfeld-Verwaltung.

Dort können unter anderem:

- Einzelminen scharf/entschärft werden
- Einzelminen entfernt werden
- Minen aufgelistet werden
- der Minenstatus geprüft werden
- Minengruppen erstellt werden
- Gruppen geschaltet werden
- Gruppen gezündet werden
- Auslösemodi eingestellt werden

## Minengruppen

Mehrere eigene Minen können dauerhaft zu einer Gruppe zusammengefasst werden.

| Befehl | Funktion |
|---|---|
| `/siedler:mine_group_create <gruppe> <radius>` | Minen im Radius der Gruppe zuordnen |
| `/siedler:mine_group_list` | Eigene Minengruppen anzeigen |
| `/siedler:mine_group_arm <gruppe>` | Gruppe scharf schalten |
| `/siedler:mine_group_disarm <gruppe>` | Gruppe entschärfen |
| `/siedler:mine_group_remove <gruppe>` | Gruppe entfernen |
| `/siedler:mine_group_mode <gruppe> <0-2>` | Auslösemodus der Gruppe ändern |
| `/siedler:mine_group_detonate <gruppe>` | Gruppe manuell zünden |

Bei einer Gruppenzündung werden die scharfen Gruppenminen synchron zur Explosion gebracht.

---

# 👹 Monster & Belagerungen

Das Monster-System erzeugt PvE-Gefahren und kann Pillager-Belagerungen verwalten.

Pillager-Squads werden nicht einfach in Claims gesetzt. Vor einem Squad-Spawn wird nach einem sicheren Punkt außerhalb von Claims gesucht. Gibt es keinen sicheren Spawnpunkt, wird der Squad verworfen.

Auch Belagerungen berücksichtigen den Online-Status: Ein Claim ohne online verteidigendes Teammitglied wird nicht als normales Belagerungsziel angegriffen. Wird ein Claim während eines Angriffs leer, kann der Squad in den Rückzug wechseln.

## Monster-Verwaltung

| Befehl | Funktion | Rechte |
|---|---|---|
| `/siedler:monster_status` | Monster-Systemstatus anzeigen | Spielleitung |
| `/siedler:monster_enable` | Monster-System aktivieren | Spielleitung |
| `/siedler:monster_disable` | Monster-System deaktivieren | Spielleitung |
| `/siedler:monster_pillager <on\|off>` | Pillager aktivieren/deaktivieren | Spielleitung |
| `/siedler:monster_outpost <on\|off>` | Outpost-Raids aktivieren/deaktivieren | Spielleitung |
| `/siedler:monster_get <path>` | Konfigurationswert lesen | Spielleitung |
| `/siedler:monster_set <path> <value>` | Konfigurationswert setzen | Spielleitung |

Beispiel:

```text
/siedler:monster_status
/siedler:monster_pillager off
```

---

# 🧰 Essentials

## Persönlicher Enderchest

```text
/siedler:ec
```

Öffnet einen **persistenten 27-Slot-Speicher**.

Items werden nicht einfach auf den Boden gelegt, sondern in einem eigenen Inventarsystem gespeichert. Der Speicher bleibt über Serverneustarts erhalten.

Gespeichert werden unter anderem:

- Itemtyp
- Anzahl
- NameTag
- Lore
- Verzauberungen
- Haltbarkeit
- Keep-on-Death-Eigenschaft

## Gemeinsame Teamchest

```text
/siedler:teamchest
```

Öffnet eine gemeinsame **54-Slot-Team-Doppelchest**.

Alle Mitglieder desselben Teams greifen auf denselben persistenten Speicher zu.

---

# 🏠 Homes & Teleport

| Befehl | Funktion |
|---|---|
| `/siedler:spawn` | Zum Weltspawn |
| `/siedler:sethome` | Eigenes Home setzen |
| `/siedler:home` | Zum Home teleportieren |
| `/siedler:delhome` | Home löschen |
| `/siedler:back` | Zum letzten Todespunkt |
| `/siedler:tpa <spieler>` | Anfrage senden, selbst zum Spieler zu teleportieren |
| `/siedler:tpahere <spieler>` | Spieler auffordern, zu dir zu teleportieren |
| `/siedler:tpaccept` | Letzte TPA-Anfrage akzeptieren |
| `/siedler:tpdeny` | Letzte TPA-Anfrage ablehnen |

TPA-Anfragen laufen nach **60 Sekunden** ab.

Homes und Todespunkte werden persistent gespeichert.

---

# 💬 Team-Chat

```text
/siedler:teamchat <nachricht>
```

Sendet eine Nachricht an dein Team.

Das System besitzt einen Command-basierten Fallback, sodass der Team-Chat auch auf Server/API-Kombinationen funktioniert, auf denen die native Chat-API nicht verfügbar ist.

---

# 💤 AFK-System

```text
/siedler:afk
```

Schaltet den eigenen AFK-Status um.

Das Pack überwacht Aktivität und verwaltet den AFK-Zustand zentral. Die genaue Zeit und weitere Regeln werden vom Server konfiguriert.

---

# 📊 Statistiken

Das Pack sammelt Spieler- und Serverstatistiken. Dazu gehören unter anderem spielbezogene Ereignisse wie Kämpfe und Todesfälle.

Das Dashboard bzw. die vorhandenen Statistik-Menüs können vom Server für Übersicht und Auswertung verwendet werden.

---

# ☠️ Team-Eliminierung

Das Siedler-System unterstützt eine Team-Eliminierung:

1. Ein konfigurierter Eliminationsblock wird zerstört.
2. Das betroffene Team wird als ausgeschieden bekanntgegeben.
3. Die Team-Eliminierung wird per Broadcast mitgeteilt.
4. Ausgeschiedene Teammitglieder werden nach ihrem Tod dauerhaft in den **Spectator-Modus** versetzt.

Die genaue Auslösung und der verwendete Block werden von der Serverkonfiguration bestimmt.

---

# 🛡️ Spielerschutz & Serverregeln

Viele Systeme arbeiten automatisch im Hintergrund:

- Claim-Protection
- Block-Recovery
- Item-Rückgabe bei geschützten Aktionen
- Teamzugehörigkeit über stabile Spieler-IDs
- Schutz eigener/verbündeter Einheiten bei Soldaten und Minen
- Monster- und Belagerungslogik
- tägliche Steuerabrechnung
- Anti-AFK
- persistente Speicher
- zentrale Fehler- und Statusprotokollierung

Spieler müssen dafür normalerweise keinen zusätzlichen Befehl ausführen.

---

# 🎮 Rechte-System

Die Befehle werden grob in zwei Gruppen eingeteilt:

### 👤 Spieler

Für alle Spieler freigegeben sind unter anderem:

- Team-/Diplomatie-Menüs
- Claim-Informationen
- Marktplatz-Teleport
- Soldatenstab
- Soldatenteleport
- Enderchest
- Teamchest
- Homes
- TPA
- Spawn
- Back
- AFK
- Team-Chat
- Minenverwaltung

### 🛠️ Spielleitung

Verwaltungsbefehle wie Team-Erstellung, Claim-Verwaltung, Steuerkonfiguration, Monster-Konfiguration, Soldaten-Debug-/Spawn-Befehle und Marktplatzverwaltung sind geschützt.

---

# 🧭 Befehlsübersicht

## Spielerbefehle

```text
/siedler:team
/siedler:diplomacy
/siedler:claim
/siedler:claim_info
/siedler:market
/siedler:soldier_tool
/siedler:soldier_tp [Target]
/siedler:ec
/siedler:teamchest
/siedler:spawn
/siedler:sethome
/siedler:home
/siedler:delhome
/siedler:tpa <spieler>
/siedler:tpahere <spieler>
/siedler:tpaccept
/siedler:tpdeny
/siedler:back
/siedler:teamchat <nachricht>
/siedler:afk
/siedler:mines
```

## Spielleiterbefehle

```text
/siedler:team_create <name> [farbe]
/siedler:team_add <spieler> <team>
/siedler:team_remove <spieler> <team>
/siedler:team_delete <team>
/siedler:team_list

/siedler:claim_set <team>
/siedler:claim_remove <team>
/siedler:claim_force_remove <team>
/siedler:claim_force_release
/siedler:claim_list

/siedler:countvillagers <team>
/siedler:settax <team> <x> <y> <z>
/siedler:taxinfo <team>
/siedler:taxstats <team>

/siedler:market_tp_set
/siedler:market_status
/siedler:market_enable
/siedler:market_disable
/siedler:market_cleanup

/siedler:monster_status
/siedler:monster_enable
/siedler:monster_disable
/siedler:monster_pillager <on|off>
/siedler:monster_outpost <on|off>
/siedler:monster_get <path>
/siedler:monster_set <path> <value>

/siedler:move <x> <y> <z>
/siedler:follow
/siedler:stay
/siedler:attack [radius]
/siedler:defend [radius]
/siedler:patrol <x> <y> <z>
/siedler:stop
/siedler:soldier_info
/siedler:soldier_xp <amount>
/siedler:spawn_soldier <type> [level]
/siedler:group_create <name> [radius]
/siedler:group_add <gruppe>
/siedler:group_remove <gruppe>
/siedler:group_delete <gruppe>
/siedler:group_list
/siedler:group_move <gruppe> <x> <y> <z>
/siedler:group_follow <gruppe>
/siedler:group_stay <gruppe>
/siedler:group_defend <gruppe> <x> <y> <z> [radius]
/siedler:group_stop <gruppe>
/siedler:group_formation <gruppe> <formation> [spacing]

/siedler:mine_group_create <gruppe> <radius>
/siedler:mine_group_list
/siedler:mine_group_arm <gruppe>
/siedler:mine_group_disarm <gruppe>
/siedler:mine_group_remove <gruppe>
/siedler:mine_group_mode <gruppe> <0-2>
/siedler:mine_group_detonate <gruppe>
```

---

# 🔧 Spielleiter: zusätzliche Essentials-Befehle

Für Administration stehen zusätzlich bereit:

| Befehl | Funktion |
|---|---|
| `/siedler:admin_heal [spieler]` | Spieler heilen |
| `/siedler:admin_feed [spieler]` | Hunger auffüllen |
| `/siedler:admin_god [spieler]` | Godmode umschalten |
| `/siedler:admin_fly [spieler]` | Flugmodus umschalten |
| `/siedler:admin_kill <spieler>` | Spieler töten |
| `/siedler:admin_clear <spieler>` | Inventar leeren |
| `/siedler:admin_day` | Tag setzen |
| `/siedler:admin_night` | Nacht setzen |
| `/siedler:admin_sun` | Klares Wetter |
| `/siedler:admin_rain` | Regen |

---

# ❓ Häufige Fragen

### Warum kann ich einen Block nicht abbauen?

Prüfe, ob du dich in einem geschützten Claim oder einem besonders geschützten Bereich wie dem Marktplatz befindest.

### Warum greift mein Soldat meinen Freund nicht an?

Die Soldaten berücksichtigen Teamzugehörigkeit und Diplomatie. Verbündete Einheiten werden entsprechend behandelt.

### Warum löst meine eigene Mine nicht aus?

Eigene und verbündete Teams sind vor der Auslösung ihrer Team-Minen geschützt. Prüfe außerdem den Auslösemodus der Mine.

### Warum löst eine Mine trotz Modus 0 aus?

Monster werden unabhängig von den drei Spieler-Auslösemodi erkannt und können scharfe Minen auslösen.

### Bleiben meine Items im `/siedler:ec` nach einem Neustart?

Ja. Der persönliche Speicher ist persistent.

### Bleibt die Teamchest nach einem Neustart erhalten?

Ja. Die 54 Slots werden persistent pro Team gespeichert.

### Wie lange ist eine TPA-Anfrage gültig?

60 Sekunden.

---

# 📚 Weiterführende Dokumentation

- [README.md](README.md) – Projektübersicht
- [plan.md](plan.md) – Entwicklungsstand und technische Roadmap

---

> **Hinweis:** Diese Dokumentation beschreibt den Stand des Repositories zum 11.09.2026. Bei zukünftigen Änderungen sollten neue Spielerbefehle und sichtbare Funktionsänderungen hier ergänzt werden.

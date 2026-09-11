# 🏘️ Siedler Logic – Spielerhandbuch

> Enduser-Dokumentation für das aktuelle Siedler Logic Behavior Pack.
>
> **Stand:** 11.09.2026

Siedler Logic erweitert Minecraft Bedrock um Teams, Gebiete, Diplomatie, Wirtschaft, Steuern, Soldaten, Händler, Monster, Outposts, Minenfelder und praktische Serverfunktionen.

Diese Seite richtet sich an **Spieler und Spielleiter**. Technische Moduldateien und interne Implementierungsdetails werden bewusst nicht erklärt.

---

## 📌 Schnellstart

| Befehl | Zweck |
|---|---|
| `/siedler:team` | Team-Verwaltung öffnen |
| `/siedler:diplomacy` | Diplomatie öffnen |
| `/siedler:claim` | Claim-Menü öffnen |
| `/siedler:claim_info` | Aktuellen Claim prüfen |
| `/siedler:market` | Zum Marktplatz teleportieren |
| `/siedler:soldier_tool` | Soldatenstab erhalten |
| `/siedler:soldier_tp` | Eigene Soldaten teleportieren |
| `/siedler:token` | Monster-Token spawnen |
| `/siedler:token_auto` | Automatisches Token-Spawning an/aus |
| `/siedler:outpost_register` | Aktuellen Standort als Outpost registrieren |
| `/siedler:mines` | Minenfeld-Verwaltung öffnen |
| `/siedler:ec` | Persönliche Enderchest öffnen |
| `/siedler:teamchest` | Gemeinsame Teamchest öffnen |
| `/siedler:sethome` | Home setzen |
| `/siedler:home` | Zum Home teleportieren |
| `/siedler:tpa <spieler>` | Teleport-Anfrage senden |
| `/siedler:tpaccept` | Teleport-Anfrage annehmen |
| `/siedler:tpdeny` | Teleport-Anfrage ablehnen |
| `/siedler:back` | Zum letzten Todespunkt |
| `/siedler:spawn` | Zum Weltspawn |
| `/siedler:afk` | AFK-Status umschalten |

> Die meisten Spielerfunktionen benötigen keine OP-Rechte. Verwaltungs- und Spielleiterbefehle sind entsprechend geschützt.

---

# 👥 Teams

Teams bilden die Grundlage des Siedler-Systems. Spieler werden anhand ihrer persistenten **Spieler-ID** einem Team zugeordnet. Dadurch bleibt die Zuordnung unabhängig von Namensänderungen stabil.

## Team-Menü

```text
/siedler:team
```

Öffnet das grafische Team-Management.

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

Die Diplomatie wird unter anderem von Soldaten und Minen verwendet, um Freund und Feind zu unterscheiden.

---

# 🗺️ Claims / Grundstücke

Ein Claim schützt ein **4×4-Chunk-Grundstück**, also insgesamt 16 Chunks.

## Claim-Menü

```text
/siedler:claim
```

Das Menü bietet unter anderem das Setzen, Entfernen und Anzeigen von Claims.

| Befehl | Funktion | Rechte |
|---|---|---|
| `/siedler:claim` | Claim-Menü | Alle |
| `/siedler:claim_info` | Besitzer des aktuellen Chunks anzeigen | Alle |
| `/siedler:claim_set <team>` | 4×4-Chunk-Claim setzen | Spielleitung |
| `/siedler:claim_remove <team>` | Claims eines Teams entfernen | Spielleitung |
| `/siedler:claim_force_remove <team>` | Claims eines nicht mehr existierenden Teams entfernen | Spielleitung |
| `/siedler:claim_force_release` | Claim des aktuellen Chunks freigeben | Spielleitung |
| `/siedler:claim_list` | Claims auflisten | Spielleitung |

Claims schützen Gebiete vor unerlaubten Blockänderungen. Die bestehende Protection- und Recovery-Logik bleibt unabhängig vom Outpost-System bestehen.

---

# 👑 Outposts erobern

Outposts sind strategische Punkte, die von Teams **erobert und gehalten** werden können.

## Outpost registrieren

Ein Spielleiter stellt sich an die gewünschte Position und verwendet:

```text
/siedler:outpost_register
```

Der Standort wird anschließend als eroberbarer Outpost gespeichert.

> Ein registrierter Outpost ist ein strategischer Besitzpunkt und wird **nicht automatisch zu einem Claim**.

## Eroberung

- Ein Spieler eines Teams muss sich innerhalb von **12 Blöcken** um den Outpost befinden.
- Befindet sich nur **ein Team** im Bereich, beginnt bzw. läuft die Eroberung.
- Die vollständige Eroberung dauert **10 Sekunden**.
- Der Fortschritt wird über die Actionbar angezeigt.
- Sind mehrere Teams gleichzeitig im Bereich, ist der Outpost **umkämpft** und die Eroberung wird angehalten bzw. zurückgesetzt.
- Der bisherige Besitzer hält den Outpost, solange sein Team den Punkt kontrolliert.
- Nach erfolgreicher Eroberung wird der neue Besitzer dauerhaft gespeichert.
- Bei einer Übernahme wird eine globale Meldung angezeigt.
- Die Besitzdaten überleben Serverneustarts.

### Beispiel

```text
Team Rot betritt den Outpost
        ↓
10 Sekunden halten
        ↓
Team Rot erobert den Outpost
        ↓
Outpost gehört Team Rot
```

Kommt Team Blau während der Eroberung hinzu:

```text
Rot + Blau im Radius
        ↓
OUTPOST UMKÄMPFT
        ↓
Eroberung stoppt
```

## 💰 Outpost-TaxBonus

Eine erfolgreiche Outpost-Eroberung belohnt das Team zusätzlich mit einem **permanenten TaxBonus**.

- Jede erfolgreiche Eroberung gibt standardmäßig **+1 Emerald pro Tag**.
- Der Bonus gehört dem **Team**, nicht dem einzelnen Spieler.
- Der Bonus wird dauerhaft gespeichert und bleibt über Serverneustarts erhalten.
- Auch eine spätere **Rückeroberung** durch ein anderes Team erzeugt den Bonus für den neuen Besitzer.
- Der Outpost-Bonus und der Monster-Token-Bonus verwenden dasselbe TaxBonus-System.
- Die konfigurierte maximale TaxBonus-Grenze gilt für alle Quellen gemeinsam.

Beispiel:

```text
Team Blau: 5 Dorfbewohner
5 × 2 Emeralds = 10 Emeralds

+ 2 Emeralds TaxBonus durch Token/Outposts
------------------------------------------
= 12 Emeralds Tagessteuer
```

Der TaxBonus wird nicht jeden Tag neu vergeben. Er erhöht dauerhaft den täglichen Steuerertrag des Teams.

## Outposts und Monster

Outpost-Besitz und Pillager-Raids sind getrennte Systeme. Ein eroberter Outpost wird nicht automatisch zu einem Claim und ersetzt nicht die Claim-Protection.

---

# 💰 Steuern & Wirtschaft

Die zentrale Währung ist **Emerald**.

Die tägliche Teamsteuer wird anhand der Dorfbewohner in den Claims des Teams berechnet. Die aktuelle Basis beträgt:

> **2 Emeralds pro Dorfbewohner und Tag**

Zusätzlich kommt der permanente **TaxBonus** hinzu. Dieser kann durch Monster-Tokens und durch eroberte Outposts steigen.

### Steuerformel

```text
Tagessteuer = Dorfbewohner × 2 + TaxBonus
```

Beispiel:

```text
5 Dorfbewohner × 2 = 10
+ 1 TaxBonus
= 11 Emeralds Tagessteuer
```

Die Tagesabrechnung erfolgt nur, wenn mindestens ein Teammitglied online ist und eine Steuerkiste eingerichtet wurde. Fehlgeschlagene Einzahlungen werden erneut versucht.

## Steuerbefehle

| Befehl | Funktion | Rechte |
|---|---|---|
| `/siedler:countvillagers <team>` | Dorfbewohner in Team-Claims zählen | Spielleitung |
| `/siedler:settax <team> <x> <y> <z>` | Steuerkiste festlegen | Spielleitung |
| `/siedler:taxinfo <team>` | Steuerstatus anzeigen | Spielleitung |
| `/siedler:taxstats <team>` | Steuerstatistik anzeigen | Spielleitung |

---

# 👹 Monster-Token

Monster-Tokens sind besondere Monster. Ihr Besiegen erhöht den **permanenten TaxBonus des Teams des Spielers, der den Token besiegt**.

## Token manuell starten

```text
/siedler:token
```

Der Befehl spawnt einen Token-Mob in sicherer Entfernung zum Spieler.

## Automatisches Token-Spawning

```text
/siedler:token_auto
```

Der Befehl schaltet das automatische Spawning ein bzw. aus.

Standardmäßig wird automatisch in einem festen Zeitabstand ein Token-Mob für einen zufälligen Online-Spieler gespawnt. Es können maximal **4 Token-Mobs gleichzeitig** aktiv sein.

## Token-Regeln

- Standardmäßig gibt ein besiegter Token **+1 Emerald permanenten TaxBonus pro Tag**.
- Die Teamzuordnung verwendet die persistente **Spieler-ID**.
- Der Bonus wird sofort gespeichert.
- Die gemeinsame TaxBonus-Obergrenze gilt auch für Token-Boni.
- Token werden nur an sicheren Positionen gespawnt.
- Wasser, Lava und belegte Fuß-/Kopfblöcke werden als Spawnposition vermieden.
- Token werden in Overworld, Nether und End erkannt.
- Sobald alle aktiven Token-Mobs besiegt wurden, ist die Token-Runde abgeschlossen.
- Mit dem nächsten `/siedler:token` kann eine neue Runde gestartet werden.

### Beispiel

```text
Team Rot
  5 Dorfbewohner = 10 Emeralds Basissteuer
  + 2 besiegte Token = +2 TaxBonus
  + 1 eroberter Outpost = +1 TaxBonus

Gesamt:
10 + 3 = 13 Emeralds pro Tag
```

---

# ⚔️ Soldaten

Das Soldatensystem stellt eigene Einheiten mit KI bereit.

Aktuelle Typen:

- ⚔️ **Infanterie** – Nahkampf
- 🏹 **Bogenschütze** – Fernkampf
- 🐎 **Kavallerie** – berittene Einheit mit Charge-/Pass-Verhalten

Soldaten besitzen unter anderem Besitzer, Team, Level 1–7, XP, Ausrüstung und Befehlszustand. Die KI berücksichtigt Teambeziehungen und kann Wege, Hindernisse und Kampfpositionen berücksichtigen.

## Soldatenstab

```text
/siedler:soldier_tool
```

Gibt den Soldatenstab zur interaktiven Soldatenverwaltung.

## Soldaten teleportieren

```text
/siedler:soldier_tp
```

Teleportiert eigene Soldaten zum Spieler.

## Einzel-Soldatenbefehle

| Befehl | Funktion |
|---|---|
| `/siedler:soldier_tool` | Soldatenstab erhalten |
| `/siedler:soldier_tp [Target]` | Eigene Soldaten teleportieren |
| `/siedler:move <x> <y> <z>` | Soldaten bewegen |
| `/siedler:follow` | Soldaten folgen lassen |
| `/siedler:stay` | Soldaten halten lassen |
| `/siedler:attack [radius]` | Angriffsbefehl |
| `/siedler:defend [radius]` | Position verteidigen |
| `/siedler:patrol <x> <y> <z>` | Patrouille |
| `/siedler:stop` | Befehl stoppen |
| `/siedler:soldier_info` | Level und XP anzeigen |
| `/siedler:soldier_xp <amount>` | XP vergeben |
| `/siedler:spawn_soldier <type> [level]` | Soldaten spawnen |

## 🎯 Angriffsmodi

| Modus | Verhalten |
|---:|---|
| `0` | Nichts automatisch angreifen |
| `1` | Monster in der Nähe angreifen |
| `2` | Feindliche Soldaten angreifen |
| `3` | Tiere angreifen |
| `4` | Feindliche Dorfbewohner angreifen |
| `5` | Alles angreifen |

Die Zielauswahl berücksichtigt zusätzlich Besitzer und Diplomatie.

## Soldatengruppen

| Befehl | Funktion |
|---|---|
| `/siedler:group_create <name> [radius]` | Gruppe erstellen |
| `/siedler:group_add <gruppe>` | Soldaten hinzufügen |
| `/siedler:group_remove <gruppe>` | Soldaten entfernen |
| `/siedler:group_delete <gruppe>` | Gruppe löschen |
| `/siedler:group_list` | Gruppen anzeigen |
| `/siedler:group_move <gruppe> <x> <y> <z>` | Gruppe bewegen |
| `/siedler:group_follow <gruppe>` | Gruppe folgen lassen |
| `/siedler:group_stay <gruppe>` | Gruppe halten lassen |
| `/siedler:group_defend <gruppe> <x> <y> <z> [radius]` | Bereich verteidigen |
| `/siedler:group_stop <gruppe>` | Gruppe stoppen |
| `/siedler:group_formation <gruppe> <formation> [spacing]` | Formation ändern |

---

# 🏪 Marktplatz & Händler

```text
/siedler:market
```

Teleportiert zum Marktplatz.

Der Marktplatz ist ein geschützter Handelsbereich. Dort werden Monster entfernt bzw. ferngehalten und normale Blockänderungen sind entsprechend den Marktplatzregeln eingeschränkt.

Es gibt verschiedene spezialisierte Händler, darunter einen **Soldatenhändler**.

## Marktplatz-Verwaltung

| Befehl | Funktion | Rechte |
|---|---|---|
| `/siedler:market` | Zum Marktplatz | Alle |
| `/siedler:market_tp_set` | Teleportpunkt setzen | Spielleitung |
| `/siedler:market_status` | Status anzeigen | Spielleitung |
| `/siedler:market_enable` | Aktivieren | Spielleitung |
| `/siedler:market_disable` | Deaktivieren | Spielleitung |
| `/siedler:market_cleanup` | Monster entfernen | Spielleitung |

---

# 💣 Minenfeld

Das Minenfeld ist ein persistentes Verteidigungssystem.

## Mine platzieren

```text
/give @s siedler:mine
```

Mit der Mine einen geeigneten Untergrund anvisieren und benutzen.

Die Position wird auf festen Untergrund, freien Raum, Flüssigkeiten, Abstand zu anderen Minen und Doppelplatzierung geprüft. Erst nach erfolgreicher Prüfung wird das Item verbraucht.

Die Mine wird nach etwa **1 Sekunde** scharf.

## Auslösemodi

| Modus | Spieler-Auslösung |
|---:|---|
| `0` | Nur Feinde |
| `1` | Feinde + neutrale Teams |
| `2` | Alle Spieler |

Eigene und verbündete Teams lösen Team-Minen nicht aus.

**Monster können scharfe Minen unabhängig vom Spieler-Modus auslösen.**

Die Explosion:

- zerstört keine Blöcke
- kann Feuer erzeugen
- kann benachbarte scharfe Minen auslösen
- wird nach etwa 15 Sekunden wieder scharf

## Minenverwaltung

```text
/siedler:mines
```

Öffnet die grafische Minenfeld-Verwaltung.

## Minengruppen

```text
/siedler:mine_group_create <gruppe> <radius>
/siedler:mine_group_list
/siedler:mine_group_arm <gruppe>
/siedler:mine_group_disarm <gruppe>
/siedler:mine_group_remove <gruppe>
/siedler:mine_group_mode <gruppe> <0-2>
/siedler:mine_group_detonate <gruppe>
```

Mehrere Minen können damit dauerhaft als Gruppe verwaltet und gemeinsam gezündet werden.

---

# 🏠 Essentials

## Homes

```text
/siedler:sethome
/siedler:home
```

Setzt bzw. lädt das persönliche Home.

## Teleport-Anfragen

```text
/siedler:tpa <spieler>
/siedler:tpaccept
/siedler:tpdeny
```

## Todespunkt

```text
/siedler:back
```

Teleportiert zum letzten gespeicherten Todespunkt.

## Enderchest

```text
/siedler:ec
```

Öffnet die persönliche persistente **27-Slot-Enderchest**.

## Teamchest

```text
/siedler:teamchest
```

Öffnet die gemeinsame persistente **54-Slot-Teamchest** des Teams.

---

# ☠️ Team-Eliminierung

Das Siedler-System kann Teams über einen konfigurierten Eliminationsblock aus dem Spiel nehmen.

Wird der entsprechende Block zerstört, wird die Eliminierung des Teams bekanntgegeben. Spieler eines eliminierten Teams werden bei ihrem Tod dauerhaft in den **Spectator-Modus** versetzt.

---

# 💤 AFK

```text
/siedler:afk
```

Schaltet den eigenen AFK-Status um. Das System verfügt zusätzlich über die zentrale Anti-AFK-Erkennung.

---

## ℹ️ Wichtige Hinweise

- Teamzuordnungen und Besitzdaten werden persistent gespeichert.
- Spieler werden intern über ihre **Spieler-ID** statt über den Namen identifiziert.
- Outposts, Claims und Minen sind unterschiedliche Systeme und ersetzen einander nicht.
- TaxBonus aus Token und Outposts ist **permanent** und erhöht den täglichen Steuerertrag.
- Die tatsächlichen Rechte einzelner Befehle werden serverseitig durch das jeweilige Modul kontrolliert.

---

## 🧭 Kurzüberblick über das Siedler-System

```text
Teams
 ├─ Diplomatie
 ├─ Claims
 ├─ Soldaten
 ├─ Minen
 ├─ Steuern
 │   └─ TaxBonus
 │       ├─ Monster-Token
 │       └─ Outpost-Eroberungen
 └─ Wirtschaft

Outposts = strategische Kontrollpunkte
Claims   = geschützte Grundstücke
Token    = Monster-Ziele + TaxBonus
Minen    = Verteidigung
Soldaten = militärische Einheiten
Markt    = Handel
```

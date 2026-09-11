# 🏘️ Siedler Logic – Spielerhandbuch

> Enduser-Dokumentation für das aktuelle Siedler Logic Behavior Pack.
>
> **Stand:** 11.09.2026

## 👑 Outposts erobern

Outposts sind strategische Punkte, die von Teams erobert und gehalten werden können.

### Outpost registrieren

Ein Spielleiter stellt sich an die gewünschte Outpost-Position und verwendet:

```text
/siedler:outpost_register
```

Der Standort wird als Outpost gespeichert und kann anschließend von Teams erobert werden.

### Eroberung

- Ein Spieler eines Teams muss sich innerhalb von **12 Blöcken** um den Outpost befinden.
- Befindet sich nur **ein Team** im Eroberungsbereich, beginnt bzw. läuft die Eroberung.
- Die vollständige Eroberung dauert **10 Sekunden**.
- Der Fortschritt wird über die Actionbar angezeigt.
- Kommen Spieler verschiedener Teams gleichzeitig in den Bereich, wird der Outpost **umkämpft** und der Fortschritt pausiert bzw. zurückgesetzt.
- Der bisherige Besitzer kann den eigenen Outpost normal halten.
- Nach erfolgreicher Eroberung wird der neue Besitzer dauerhaft gespeichert.
- Wird ein Outpost von einem anderen Team übernommen, erhalten alle Spieler eine globale Meldung.
- Die Besitzdaten überleben Serverneustarts.

### Beispiel

```text
Team Rot betritt den Outpost
        ↓
10 Sekunden halten
        ↓
Team Rot erobert den Outpost
        ↓
Outpost gehört dauerhaft Team Rot
```

Kommt während der Eroberung Team Blau hinzu:

```text
Rot + Blau im Radius
        ↓
OUTPOST UMKÄMPFT
        ↓
Eroberung pausiert
```

## 👹 Monster

Monster können weiterhin über das bestehende Monster-/Pillager-System aus Outposts heraus angreifen. Das neue Eroberungssystem trennt dabei **Outpost-Besitz** und **Pillager-Raids**: Ein eroberter Outpost wird nicht automatisch zu einem Claim und ersetzt nicht die bestehende Claim-Protection.

---

## 📌 Schnellstart

Die wichtigsten Befehle für normale Spieler:

| Befehl | Zweck |
|---|---|
| `/siedler:team` | Team-Verwaltung öffnen |
| `/siedler:diplomacy` | Diplomatie öffnen |
| `/siedler:token` | Monster-Token spawnen |
| `/siedler:token_auto` | Automatisches Token-Spawning an/aus |
| `/siedler:outpost_register` | Aktuellen Standort als Outpost registrieren |
| `/siedler:mines` | Minenfeld-Verwaltung öffnen |
| `/ec` | Persönliche Enderchest öffnen |
| `/teamchest` | Gemeinsame Teamchest öffnen |

> Die vollständige Dokumentation der übrigen Systeme befindet sich weiter unten in dieser Datei.

# 🏘️ Siedler Logic

> Modulares Minecraft-Bedrock-Behavior-Pack für das Minecraft-Siedler-Projekt.

**Behavior Pack:** https://github.com/Jawollo07/mc-siedler-bp  
**Resource Pack:** https://github.com/Jawollo07/mc-siedler-rp

## 📖 Systeme

- Teams, Diplomatie, Claims und Wirtschaft
- Claim-Protection mit Block-Recovery und Item-Rückgabe
- Zentraler Marktplatz und spezialisierte Händler
- **Automatischer Marktbestand: fehlende Händler werden selbstständig nachgespawnt**
- **Händler bleiben dauerhaft innerhalb des konfigurierten Marktplatzes und wandern nicht mehr zufällig umher**
- **Verzauberungshändler-Villager mit vollständigem Pool aller definierten Angebote**
- Soldaten mit KI, Leveln, XP, Ausrüstung und Kavallerie
- **Konfigurierbare Soldier-Angriffsmodi 0–5 mit persistenter Speicherung pro Soldier**
- **Beschleunigte Soldier-Bewegung mit Level-/Kavallerie-Bonus, Geschwindigkeitslimit und Terrain-Unterstützung**
- **Watchdog-sichere lokale A*-Wegfindung mit begrenztem Suchbudget, Höhenwechseln, Umwegen und Stuck-Recovery**
- **Verbesserte Kavallerie mit direkter Mount-Steuerung, Charge/Pass-Taktik und Hindernissprüngen**
- **Automatische Zielsuche für nahe feindliche Monster**
- Bogenschützen mit ballistischer Pfeilphysik
- Essentials und Spieler-Dashboard
- Detaillierter Villager-Todeslogger mit Todesursache, Verursacher und Claim-Team
- Anti-AFK-System mit Warnung, AFK-Status und Kick
- Erweitertes zentralisiertes Logging für alle Behavior-Pack-Module
- Native Chat-Verarbeitung ohne externe ChatSend-API-Abhängigkeit
- **Pillager-Squads mit Claim-sicherem Spawn und spielerabhängiger Belagerungslogik**
- **Robustes tägliches Steuersystem mit Online-Prüfung, Wiederholungsversuchen und Steuerstatistik**

## 💰 Steuer-System

Das Steuer-System befindet sich unter `scripts/taxes/` und berechnet die tägliche Steuer eines Teams anhand seiner Dorfbewohner und des permanenten Monster-Token-Bonus.

### Steuerberechnung

- Jeder Dorfbewohner erzeugt **2 Emeralds/Tag**.
- Jeder besiegte Monster-Token erhöht den permanenten täglichen `taxBonus` um **1 Emerald**.
- Der permanente Bonus bleibt über die Auszahlung und Serverneustarts erhalten.
- Die gesamte Tagessteuer ist auf den konfigurierten Maximalwert begrenzt.
- Steuern werden nur eingezogen, wenn mindestens ein Mitglied des Teams online ist.

### Sichere Steuerkiste

- Die komplette Buchung wird vor dem Einlagern auf verfügbaren Platz geprüft.
- Ist die Truhe voll oder der Chunk nicht verfügbar, werden **keine Emeralds auf den Boden gedroppt**.
- Fehlgeschlagene Buchungen werden nicht als bezahlt markiert und später automatisch erneut versucht.
- Dadurch gehen bei temporär ungeladenen Chunks oder vollen Truhen keine Steuereinnahmen verloren.

### Persistente Steuerstatistik

Pro Team werden gespeichert:

- `totalTaxes` – insgesamt eingezahlte Emeralds
- `villagerCount` – zuletzt ermittelte Dorfbewohnerzahl
- `lastPaidDay` – letzter erfolgreicher Zahlungstag
- `lastTaxAmount` – Höhe der letzten Zahlung
- `lastTaxBonus` – verwendeter permanenter Bonus
- `lastPaymentStatus` – aktueller Zahlungsstatus
- `taxFailures` – Anzahl fehlgeschlagener Zahlungsversuche

Verfügbare Befehle:

```text
/siedler:taxinfo <team>
/siedler:taxstats <team>
/siedler:countvillagers <team>
/siedler:settax <team> <x> <y> <z>
```

`/siedler:taxstats` öffnet zusätzlich eine UI mit Tagessteuer, Dorfbewohnern, Token-Bonus, Gesamtzahlungen und Status.

## ⚔️ Soldier-System

Das Soldier-System befindet sich unter `scripts/soldier/` und unterstützt Infanterie, Bogenschützen und Kavallerie mit Owner-Zuordnung, Leveln, XP, Ausrüstung, KI, Befehlen und Gruppenformationen.

### 🎯 Soldier-Angriffsmodi

Jeder Soldier besitzt einen separat gespeicherten Angriffsmodus. Der Modus beeinflusst nur die **autonome Zielsuche**; manuell erteilte Befehle wie Folgen, Bleiben, Verteidigen oder ein direkter Angriff haben weiterhin Vorrang.

| Modus | Verhalten |
|---:|---|
| `0` | **Nichts angreifen** – keine autonome Zielsuche |
| `1` | **Monster in der Nähe** – nur Entities der Bedrock-Monsterfamilie |
| `2` | **Feindliche Soldaten** – nur Soldaten eines Teams mit `hostile`-Beziehung |
| `3` | **Tiere** – nur Entities der Bedrock-Tierfamilie |
| `4` | **Feindliche Dorfbewohner** – nur Villager innerhalb eines Claims eines feindlichen Teams |
| `5` | **Alles** – lebende Ziele; Spieler und Soldaten müssen weiterhin feindlich sein |

Der Standardmodus für neue bzw. bisher nicht gespeicherte Soldiers ist `1` (Monster).

Der Modus wird über den Custom Command gesetzt:

```text
/siedler:soldier_mode <0-5>
```

Sind Soldiers über den Soldatenstab ausgewählt, wird der Modus auf die Auswahl angewendet. Ist keine Auswahl vorhanden, wird der Modus auf den nächstgelegenen eigenen Soldier angewendet.

### 🧭 Wegfindung und Performance

Die lokale A*-Wegfindung arbeitet bewusst mit einem begrenzten Suchradius und einem kleinen Node-Budget. Blockabfragen werden damit nicht mehr als ungebremste Großsuche ausgeführt. Direkte Wege werden bevorzugt und zwischengespeichert; A*-Neuberechnungen werden zeitlich begrenzt.

### Kavallerie

Die Kavallerie wird über `cavalry_ai.js` und `cavalry_controller.js` direkt am Pferd gesteuert. Sie nähert sich Gegnern aktiv, chargt aus größerer Distanz, verursacht erhöhten Charge-Schaden und Knockback, passiert Ziele nach Treffern und nutzt eine Stuck-Recovery mit wechselnder Pass-Seite.

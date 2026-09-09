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

## ⚔️ Soldier-System

Das Soldier-System befindet sich unter `scripts/soldier/` und unterstützt Infanterie, Bogenschützen und Kavallerie mit Owner-Zuordnung, Leveln, XP, Ausrüstung, KI, Befehlen und Gruppenformationen.

### 🎯 Soldier-Angriffsmodi

Jeder Soldier besitzt einen separat gespeicherten Angriffsmodus. Der Modus beeinflusst nur die **autonome Zielsuche**; manuell erteilte Befehle wie Folgen, Bleiben, Verteidigen oder ein direkter Angriff haben weiterhin Vorrang.

| Modus | Verhalten |
|---:|---|
| `0` | **Nichts angreifen** – keine autonome Zielsuche |
| `1` | **Monster in der Nähe** – nur Entities der Bedrock-Monster-Familie |
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

Beispiele:

```text
/siedler:soldier_mode 0
/siedler:soldier_mode 1
/siedler:soldier_mode 2
/siedler:soldier_mode 3
/siedler:soldier_mode 4
/siedler:soldier_mode 5
```

Der Modus wird als `soldier:mode` auf der Soldier-Entity gespeichert und bleibt dadurch über Serverneustarts erhalten.

### 🧭 Wegfindung und Performance

Die lokale A*-Wegfindung arbeitet bewusst mit einem begrenzten Suchradius und einem kleinen Node-Budget. Blockabfragen werden damit nicht mehr als ungebremste Großsuche ausgeführt. Direkte Wege werden bevorzugt und zwischengespeichert; A*-Neuberechnungen werden zeitlich begrenzt. Dadurch soll verhindert werden, dass die Script-Engine durch `dimension.getBlock()`-Abfragen den Watchdog auslöst.

### Kavallerie

Die Kavallerie wird über `cavalry_ai.js` und den dedizierten `cavalry_controller.js` direkt am Pferd gesteuert. Der normale Rider-A*-Steuervektor greift nicht in die Mount-Bewegung ein.

Die Kavallerie:

- nähert sich Gegnern aktiv und hält die Bewegung auch im Nahbereich aufrecht
- startet Charges bereits aus größerer Entfernung
- verursacht beim Charge erhöhten Schaden und zusätzlichen Knockback
- passiert das Ziel nach einem Treffer, statt darin stehenzubleiben
- wechselt bei Blockade die Pass-Seite und versucht die Annäherung erneut

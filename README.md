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
- **Soldatenstab-UI für Einzel-/Mehrfachauswahl, Angriffsmodus und Teleport**
- **Gruppen-UI mit Angriffsmodus und Gruppen-Teleport zum Spieler**
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

## ⚔️ Soldier-System

Das Soldier-System befindet sich unter `scripts/soldier/` und unterstützt Infanterie, Bogenschützen und Kavallerie mit Owner-Zuordnung, Leveln, XP, Ausrüstung, KI, Befehlen und Gruppenformationen.

### 🎯 Soldier-Angriffsmodi

Jeder Soldier besitzt einen separat gespeicherten Angriffsmodus. Der Modus beeinflusst nur die **autonome Zielsuche**; manuell erteilte Befehle haben weiterhin Vorrang.

| Modus | Verhalten |
|---:|---|
| `0` | **Nichts angreifen** |
| `1` | **Monster in der Nähe** |
| `2` | **Feindliche Soldaten** |
| `3` | **Tiere** |
| `4` | **Feindliche Dorfbewohner** |
| `5` | **Alles** – Spieler/Soldaten weiterhin nur bei feindlicher Beziehung |

Der Standardmodus für neue bzw. bisher nicht gespeicherte Soldiers ist `1` (Monster).

Der Modus kann per Command oder vollständig über den Soldatenstab gesteuert werden:

```text
/siedler:soldier_mode <0-5>
```

Im Soldatenstab stehen die Modi bei einem einzelnen Soldier sowie bei einer Mehrfachauswahl zur Verfügung. Bei Gruppen kann der Modus für **alle Mitglieder der Gruppe gleichzeitig** gesetzt werden.

### 🧭 Soldaten-Teleport

Der Teleport ist ebenfalls direkt im Soldatenstab verfügbar:

- einzelner Soldier → **„Zu mir teleportieren“**
- Mehrfachauswahl → **„Teleport zu mir“**
- Gruppe → **„Teleport zu mir“** für alle Gruppenmitglieder
- Teleports werden kreisförmig um den Spieler verteilt, damit Einheiten nicht exakt auf derselben Position landen
- Dimensionswechsel des Soldiers wird unterstützt
- Bei Kavallerie wird die Einheit über das Soldier-Entity-System teleportiert; vorhandene Mount-Steuerung bleibt erhalten

Der bestehende Command bleibt ebenfalls verfügbar:

```text
/siedler:soldier_tp [Target]
```

### 👥 Gruppen

Gruppen können über den Soldatenstab erstellt und verwaltet werden. Die Gruppen-UI bietet jetzt zusätzlich:

- Folgen
- Bleiben
- Stoppen
- **Angriffsmodus für die gesamte Gruppe**
- **Teleport der gesamten Gruppe zum Spieler**
- Formation ändern
- Mitglieder verwalten
- Gruppe löschen

### 🧭 Wegfindung und Performance

Die lokale A*-Wegfindung arbeitet bewusst mit einem begrenzten Suchradius und einem kleinen Node-Budget. Blockabfragen werden damit nicht mehr als ungebremste Großsuche ausgeführt. Direkte Wege werden bevorzugt und zwischengespeichert; A*-Neuberechnungen werden zeitlich begrenzt.

### Kavallerie

Die Kavallerie wird über `cavalry_ai.js` und `cavalry_controller.js` direkt am Pferd gesteuert. Sie nähert sich Gegnern aktiv, chargt aus größerer Distanz, verursacht erhöhten Charge-Schaden und Knockback, passiert Ziele nach Treffern und nutzt eine Stuck-Recovery mit wechselnder Pass-Seite.

## 📡 Essentials / TPA

- `/siedler:tpa <Spieler>` und `/siedler:tpahere <Spieler>` verwenden einen nativen `PlayerSelector`.
- Dadurch wird das Ziel direkt als `Player` an das Script übergeben und nicht mehr als fehleranfälliger String geparst.
- Die Lösung ist auch für Aufrufe über `/execute as ... run` ausgelegt.
- `tpaccept` und `tpdeny` arbeiten weiterhin mit der persistenten Spieler-ID der TPA-Anfrage.

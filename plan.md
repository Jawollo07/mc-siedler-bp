# 🏘️ Siedler Logic – Entwicklungsplan

> Aktueller Entwicklungsplan für `mc-siedler-bp`. Ziel ist ein zusammenhängendes Minecraft-Bedrock-Siedler-System, das sich spielerisch an **Die Siedler 3** orientiert und Wirtschaft, Bevölkerung, Territorium, Handel und Militär miteinander verbindet.

**Stand:** 02.09.2026  
**Behavior Pack:** `mc-siedler-bp`  
**Resource Pack:** `mc-siedler-rp`

---

# 🎯 Gesamtziel

Das Projekt soll sich von einer Sammlung einzelner Server-Systeme zu einem zusammenhängenden Strategiespiel entwickeln:

**Siedlung → Ressourcen → Wirtschaft → Bevölkerung → Handel → Territorium → Diplomatie → Militär → Krieg**

Bestehende Systeme werden deshalb nicht nur einzeln weiterentwickelt, sondern zunehmend miteinander verbunden.

---

# 📊 Aktueller Stand

## Bereits vorhanden

- [x] Zentraler, fehlertoleranter Loader über `scripts/core/main.js`
- [x] World Dynamic Properties als persistente Datengrundlage
- [x] Team-System
- [x] Team-Chat
- [x] Teamfarben
- [x] Teambeziehungen `friendly`, `neutral`, `hostile`
- [x] Claims auf Chunk-Basis
- [x] Claim-Grenzanzeige
- [x] Steuer-/Wirtschaftssystem
- [x] Emeralds als Standardwährung
- [x] Marktplätze mit rechteckigen Schutzgebieten
- [x] Monster-Schutz innerhalb aktiver Marktplätze
- [x] Vordefinierte Händler
- [x] Händler-Warengruppen
- [x] Monster-Konfiguration
- [x] Pillager-System
- [x] Außenposten-/Belagerungslogik
- [x] Essentials, Homes, TPA und Spieler-Dashboard
- [x] Soldier-Entity und Soldier-Spawn-System
- [x] Soldier-Zuordnung über `player.id`
- [x] Soldier-KI-Grundsystem
- [x] Soldier-Befehle
- [x] Soldier-Level 1–3
- [x] Infanterie als erster Einheitentyp
- [x] Ausrüstungssystem
- [x] Grundlage für Soldier-Fähigkeiten
- [x] Separates Resource Pack für Custom-Entity-Darstellung

## Aktuelle Hauptbaustellen

- [ ] Soldier-Kampf und Bewegung natürlicher machen
- [ ] vollständige Gruppen-/Auswahlsteuerung für Soldaten
- [ ] Diplomatie vollständig mit Claims und Militär verbinden
- [ ] Wirtschaft stärker an unverarbeitete Ressourcen und Produktion koppeln
- [ ] Handelssystem stärker an Siedler-3-Gameplay ausrichten
- [ ] Bevölkerung und Siedlungsfortschritt ergänzen
- [ ] Resource-Pack-Darstellung aller Custom Entities stabilisieren

---

# 🔴 Phase 1 – Fundament & Stabilität

**Priorität: sehr hoch**

- [x] Zentraler Loader
- [x] Fehlertolerantes Laden der Module
- [x] Zentrale Versionsverwaltung
- [x] Cleanup ungültiger Entity-/Soldier-Daten
- [x] API-Version auf den aktuellen Entwicklungsstand abstimmen
- [ ] Einheitliches Logging-System
- [ ] zentrale Fehler-/Diagnosefunktionen
- [ ] automatische Validierung wichtiger Konfigurationen
- [ ] saubere Behandlung von World-/Dimension-Wechseln
- [ ] Performance-Überprüfung aller `runInterval`-Systeme

**Ziel:** Ein Server-Neustart oder ein Fehler in einem Modul darf nicht das gesamte Siedler-System destabilisieren.

---

# 🔴 Phase 2 – Soldier-System zum Militärsystem ausbauen

Das Soldier-System ist bereits funktionsfähig, benötigt aber noch eine deutlich natürlichere KI und bessere Steuerungsmöglichkeiten.

## 2.1 Einheiten

- [x] Infanterie
- [x] Level 1–3
- [x] unterschiedliche HP, Schaden und Geschwindigkeit
- [x] unterschiedliche Ausrüstung
- [ ] Bogenschütze
- [ ] Schwerer Soldat
- [ ] Spezialeinheiten
- [ ] weitere Einheitentypen
- [ ] Erfahrungssystem
- [ ] Beförderungen
- [ ] Unterhalt pro Einheit

## 2.2 Bewegung & KI

- [x] grundlegende Zielsuche
- [x] Team-/Feinderkennung
- [x] Follow
- [x] Move
- [x] Stay
- [x] grundlegende Attack-Logik
- [x] Retreat-Grundlage
- [ ] natürlichere Beschleunigung und Abbremsung
- [ ] bessere Wegfindung
- [ ] Hinderniserkennung
- [ ] Abstand zum Ziel sinnvoll halten
- [ ] Gruppenbewegung
- [ ] Formation
- [ ] Vermeidung von gegenseitigem Blockieren
- [ ] Schutz verletzter Einheiten
- [ ] intelligenter Rückzug
- [ ] Zielprioritäten
- [ ] Sichtlinie/Line-of-Sight

## 2.3 Kampf

**Priorität: 🔴 sehr hoch**

- [ ] natürlicheres Annähern an Gegner
- [ ] realistische Angriffsintervalle
- [ ] Attack-Animationen mit dem Resource Pack abstimmen
- [ ] kein hektisches Hin-und-her-Laufen im Nahkampf
- [ ] Abstand und Kollisionsverhalten verbessern
- [ ] unterschiedliche Kampfverhalten je Einheitentyp
- [ ] Fokusfeuer bei Gruppen
- [ ] Zielwechsel nur bei sinnvoller Priorität
- [ ] Rückzug bei geringer Gesundheit
- [ ] Kampfmoral
- [ ] Formation während des Kampfes
- [ ] Belagerungs-/Garnisonsverhalten

## 2.4 Befehle

- [x] `/siedler:spawn_soldier`
- [x] `/siedler:move`
- [x] `/siedler:follow`
- [x] `/siedler:stay`
- [ ] `/siedler:attack`
- [ ] `/siedler:defend`
- [ ] `/siedler:patrol`
- [ ] `/siedler:stop`
- [ ] Soldaten auswählen
- [ ] mehrere Soldaten gleichzeitig befehligen
- [ ] Gruppen speichern
- [ ] Zielpositionen markieren
- [ ] Garnisonen erstellen

## 2.5 Versorgung

- [ ] Nahrung als Militärressource
- [ ] Waffenverbrauch bzw. Instandhaltung
- [ ] Rüstungsunterhalt
- [ ] Heilung über Versorgung
- [ ] Versorgungslager
- [ ] Nachschubwege
- [ ] Soldatenunterhalt über Emeralds

---

# 🟠 Phase 3 – Claims & Territorium

Das Claims-System soll zu einem echten Territorialsystem ausgebaut werden.

- [x] Chunk-basierte Claims
- [x] Claim-Grenzen
- [x] Claim-Informationen
- [x] Claim-Limits
- [ ] Territoriumsstatus
- [ ] Hauptsiedlung
- [ ] Außenposten
- [ ] Grenzgebiete
- [ ] Einflussbereiche
- [ ] Gebietserweiterung durch Siedlungsfortschritt
- [ ] Diplomatiestatus berücksichtigt bei Schutzregeln
- [ ] Militärische Kontrolle von Gebieten
- [ ] umkämpfte Gebiete

### Zielmodell

`Siedlung → Einflussgebiet → Außenposten → Grenzgebiet → Feindgebiet`

---

# 🟠 Phase 4 – Diplomatie & Politik

Die vorhandenen Teambeziehungen werden zu einem vollständigen Diplomatiesystem ausgebaut.

- [x] `friendly`
- [x] `neutral`
- [x] `hostile`
- [x] Beziehungen persistent speichern
- [ ] Bündnisse
- [ ] Kriegserklärungen
- [ ] Nichtangriffspakte
- [ ] Friedensverträge
- [ ] Handelsabkommen
- [ ] Kriegsstatus
- [ ] Diplomatie-UI
- [ ] Beziehungsänderungen nachvollziehbar speichern
- [ ] Claims berücksichtigen Diplomatie
- [ ] Soldiers berücksichtigen Diplomatie
- [ ] Markt-/Handelsregeln berücksichtigen Diplomatie

**Ziel:** Ein Team soll politisch mit anderen Teams interagieren können, statt lediglich eine technische Spielergruppe zu sein.

---

# 🟡 Phase 5 – Wirtschaft & Ressourcen

Die Wirtschaft soll stärker an das Produktionsprinzip von **Die Siedler 3** angelehnt werden.

## Ressourcen

- [x] Emeralds als Standardwährung
- [ ] mehr unverarbeitete Rohstoffe
- [ ] Holz
- [ ] Stein
- [ ] Erz
- [ ] Kohle
- [ ] Getreide
- [ ] Nahrung
- [ ] weitere Rohstoffe

## Produktion

- [ ] Produktionsketten
- [ ] Rohstoff → Verarbeitung → Endprodukt
- [ ] Gebäude als Produktionsstätten
- [ ] Produktionskapazitäten
- [ ] Lagerbestände
- [ ] Transportwege
- [ ] Arbeiter/Siedler als Produktionsfaktor

## Wirtschaftssystem

- [x] Steuern
- [x] Emerald-Währung
- [ ] Team-Kasse
- [ ] Produktionskosten
- [ ] Soldatenunterhalt
- [ ] Gebäudekosten
- [ ] Wirtschaftswachstum
- [ ] Ressourcenknappheit

---

# 🟡 Phase 6 – Handel & Märkte

Das bestehende Marktplatz-/Händlersystem wird zu einem vollständigen Handelssystem erweitert.

## Bereits vorhanden

- [x] rechteckige Marktplätze
- [x] Monster-Schutz
- [x] konfigurierbare Marktgebiete
- [x] Händler-NPCs
- [x] Händler-Warengruppen
- [x] Commands zum Spawnen und Entfernen von Händlern

## Ausbau

- [ ] echte Handelsangebote
- [ ] Teamhandel
- [ ] Handelsaufträge
- [ ] Ressourcenpreise
- [ ] Angebot/Nachfrage
- [ ] regionale Preisunterschiede
- [ ] Handelsrouten
- [ ] Händlerbewegung
- [ ] Händler-Lagerbestand
- [ ] Handelsverträge zwischen Teams
- [ ] Marktübersicht im Dashboard

### Händler-Typen

Aktuell:

- `food` – Lebensmittel
- `building` – Baustoffe
- `resources` – Rohstoffe
- `tools` – Werkzeuge
- `weapons` – Waffen
- `supplies` – Versorgung

Langfristig soll die Anzahl und Spezialisierung der Händler deutlich erweitert werden.

---

# 🟡 Phase 7 – Siedlungen & Bevölkerung

Dieser Bereich ist entscheidend, damit das Projekt nicht nur ein Team-/Militärsystem bleibt.

- [ ] Siedlungen
- [ ] Einwohnerzahl
- [ ] Bevölkerung wächst durch Nahrung/Wirtschaft
- [ ] Wohngebäude
- [ ] Arbeiter
- [ ] Berufe
- [ ] Produktionsgebäude
- [ ] Lagerhäuser
- [ ] Versorgung
- [ ] Zufriedenheit
- [ ] Bevölkerungsgrenzen
- [ ] Siedlungsstufen
- [ ] Hauptsiedlung als Zentrum des Territoriums

### Siedlungsfortschritt

`Lager → Dorf → Siedlung → Stadt → Großsiedlung`

Die tatsächlichen Stufen und Anforderungen werden später anhand des gewünschten Siedler-3-Spielgefühls festgelegt.

---

# 🟢 Phase 8 – Spieler-UI & Verwaltung

- [x] `/siedler:stats`
- [x] Spieler-/Siedlungs-Dashboard
- [x] Teaminformationen
- [x] Claims-Informationen
- [x] Steuer-/Wirtschaftsinformationen
- [ ] Militärübersicht
- [ ] Soldatenliste
- [ ] Soldatenauswahl
- [ ] Diplomatie-Menü
- [ ] Handelsübersicht
- [ ] Ressourcenübersicht
- [ ] Bevölkerungsübersicht
- [ ] Warnungen bei Angriffen
- [ ] Ereignis-/Benachrichtigungssystem

**Ziel:** Der Spieler soll die wichtigsten Informationen über seine Siedlung ohne Chat-Kommandos abrufen können.

---

# 🟢 Phase 9 – Resource Pack & Custom Entities

Das Behavior Pack und das Resource Pack müssen bei Custom Entities exakt zusammenpassen.

- [ ] `siedler:soldier` zuverlässig sichtbar machen
- [ ] `siedler:trader` zuverlässig sichtbar machen
- [ ] Geometrien validieren
- [ ] Render Controller validieren
- [ ] Texturen validieren
- [ ] Animationen verbessern
- [ ] Ausrüstung korrekt darstellen
- [ ] unterschiedliche Soldier-Typen visuell unterscheiden
- [ ] Level visuell darstellen
- [ ] Teamfarbe/Teamzugehörigkeit darstellen
- [ ] Kampfanimationen
- [ ] Bewegungsanimationen
- [ ] Idle-Animationen

**Priorität:** 🔴 sehr hoch, solange Custom Entities zwar gespawnt werden, aber clientseitig nicht zuverlässig dargestellt werden.

---

# 🔵 Phase 10 – Monster, Pillager & Bedrohungen

Das vorhandene Monster-System wird langfristig stärker in das Strategiesystem integriert.

- [x] zentrale Monster-Konfiguration
- [x] Spawnraten
- [x] individuelle Spawnchancen
- [x] Nacht-Multiplikator
- [x] Monster-Tokens
- [x] Pillager-Trupps
- [x] Captains
- [x] Vindicators/Ravager
- [x] Außenposten-/Raid-Logik
- [x] Belagerungsgrundlage
- [ ] gezielte Angriffe auf Siedlungen
- [ ] Bedrohungsstufen
- [ ] Verteidigungswarnungen
- [ ] Monsterangriffe auf Produktionsgebiete
- [ ] Integration in Wirtschaft und Bevölkerung

---

# 🔵 Phase 11 – Siedler-3-Spielgefühl

Nach der technischen Stabilisierung soll der Fokus stärker auf das eigentliche Gameplay gelegt werden.

- [ ] klare Ressourcenketten
- [ ] Produktionskreisläufe
- [ ] Lager und Logistik
- [ ] Bevölkerung als aktiver Teil der Wirtschaft
- [ ] Militär als wirtschaftlich relevantes System
- [ ] Territorium als strategische Ressource
- [ ] Handel zwischen Spielern/Teams
- [ ] Diplomatie
- [ ] Krieg und Frieden
- [ ] Belagerungen
- [ ] langfristige Siegbedingungen

### Leitprinzip

> **Nicht möglichst viele Features hinzufügen, sondern die vorhandenen Systeme zu einem funktionierenden Wirtschaft-, Siedlungs- und Strategiespiel verbinden.**

---

# 🧪 Phase 12 – Qualität, Performance & Tests

- [ ] Testwelt für alle Systeme
- [ ] automatisierte bzw. reproduzierbare Smoke-Tests
- [ ] Soldier-Stresstest
- [ ] viele Entities gleichzeitig testen
- [ ] viele Teams testen
- [ ] große Claim-Gebiete testen
- [ ] große Märkte testen
- [ ] Neustart-/Persistenztests
- [ ] Fehlerfalltests für Loader und Module
- [ ] Performance-Messung der KI
- [ ] Performance-Messung von Entity-Suchen
- [ ] unnötige `runInterval`-Aufrufe reduzieren
- [ ] Speicherbereinigung prüfen

---

# 🗂️ Architektur-Ziel

Die aktuelle modulare Struktur soll erhalten bleiben:

```text
scripts/core/
├── Loader
├── Dynamic Properties
└── Version

scripts/teams/
├── Teams
├── Chat
└── Relations

scripts/claims/
├── Claims
├── Protection
└── Display

scripts/taxes/
└── Economy / Taxes

scripts/market/
├── Market Places
├── Monster Protection
├── Traders
└── Commands

scripts/monster/
├── Configuration
├── Tokens
├── Pillager
├── Outposts
└── Siege

scripts/essentials/
├── Homes
├── TPA
├── Stats
└── Dashboard

scripts/soldier/
├── AI
├── Spawn
├── Commands
├── Command Manager
└── Configuration
```

Neue Systeme sollen möglichst eigenständig bleiben und nur über klar definierte Schnittstellen miteinander kommunizieren.

---

# 🛣️ Empfohlene nächste Schritte

Die nächsten Entwicklungsarbeiten sollten in dieser Reihenfolge erfolgen:

1. **🔴 Custom-Entity-Darstellung stabilisieren** – Soldier und Trader müssen zuverlässig sichtbar sein.
2. **🔴 Soldier-Kampf natürlicher machen** – Bewegung, Zielverhalten, Attack-Timing und Abstand.
3. **🔴 Soldier-Gruppen und Befehle** – mehrere Einheiten auswählen und gemeinsam steuern.
4. **🟠 Teambeziehungen vollständig integrieren** – Claims, Soldiers und Diplomatie müssen dieselben Beziehungen verwenden.
5. **🟡 Wirtschaft erweitern** – mehr unverarbeitete Ressourcen und Produktionsketten.
6. **🟡 Handel ausbauen** – Händler, Angebote, Preise und Handelsaufträge.
7. **🟢 Bevölkerung/Siedlungen** – damit Wirtschaft und Territorium echte Grundlagen erhalten.
8. **🟢 UI erweitern** – Militär, Wirtschaft, Diplomatie, Handel und Bevölkerung in einem Dashboard.
9. **🔵 Balancing** – Kosten, Produktion, Militär, Handel und Bevölkerungswachstum aufeinander abstimmen.
10. **🔵 Performance-/Stabilitätstest** – Zielgröße ist ein zuverlässiger Mehrspielerbetrieb für bis zu **8 Spieler / 4 Teams**.

---

# 👥 Zielgröße

Das Projekt wird langfristig auf:

- **8 Spieler**
- **4 Teams**
- mehrere Siedlungen
- große Claims
- zahlreiche Händler
- mehrere Soldatengruppen
- aktive Monster-/Pillager-Bedrohungen

ausgelegt.

Alle neuen Systeme sollten diese Größenordnung berücksichtigen und nicht nur für eine einzelne Testwelt funktionieren.

---

# 📌 Entwicklungsregeln

1. **Aktuellen Code als Quelle der Wahrheit verwenden.**
2. Keine Features als fertig markieren, solange sie nur teilweise implementiert sind.
3. Behavior Pack und Resource Pack gemeinsam betrachten, wenn Custom Entities betroffen sind.
4. `player.id` statt `player.name` für persistente Spielerzuordnung verwenden.
5. Gemeinsame Systeme wie Teambeziehungen nicht mehrfach implementieren.
6. Neue Features modular unter `scripts/` entwickeln.
7. Persistente Daten über die vorhandene Dynamic-Property-Struktur verwalten.
8. Performance bei KI, Entity-Suchen und Intervallen berücksichtigen.
9. Änderungen an Commands, Entities und Scripts nach Möglichkeit auf einer Testwelt prüfen.
10. README und `plan.md` regelmäßig an den tatsächlichen Repository-Stand anpassen.

---

# 🏁 Langfristiges Ziel

Am Ende soll `mc-siedler-bp` nicht nur ein Behavior Pack mit verschiedenen Serverfunktionen sein, sondern die zentrale Gameplay-Engine des Minecraft-Siedler-Projekts:

```text
                ┌──────────────┐
                │  Bevölkerung │
                └──────┬───────┘
                       │
┌──────────┐     ┌─────▼─────┐     ┌──────────┐
│ Ressourcen├────► Wirtschaft ├────► Handel   │
└────┬─────┘     └─────┬─────┘     └────┬─────┘
     │                 │                 │
     │           ┌─────▼─────┐           │
     └──────────►│ Siedlung  │◄──────────┘
                 └─────┬─────┘
                       │
                ┌──────▼──────┐
                │  Territorium │
                └──────┬──────┘
                       │
                ┌──────▼──────┐
                │ Diplomatie  │
                └──────┬──────┘
                       │
                ┌──────▼──────┐
                │   Militär   │
                └──────┬──────┘
                       │
                ┌──────▼──────┐
                │ Krieg/Frieden│
                └──────────────┘
```

**Priorität hat dabei nicht die Menge einzelner Features, sondern die Verzahnung der Systeme zu einem glaubwürdigen Siedler-Strategiespiel.**

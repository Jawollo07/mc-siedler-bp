# 🏘️ Siedler Logic – Entwicklungsplan

> Aktueller Entwicklungsplan für `mc-siedler-bp`. Ziel ist ein zusammenhängendes Minecraft-Bedrock-Siedler-System mit Wirtschaft, Bevölkerung, Territorium, Handel und Militär.

**Stand:** 02.09.2026  
**Behavior Pack:** `mc-siedler-bp`  
**Resource Pack:** `mc-siedler-rp`

---

# 🎯 Gesamtziel

Das Projekt soll sich von einzelnen Server-Systemen zu einem zusammenhängenden Strategiespiel entwickeln:

**Siedlung → Ressourcen → Wirtschaft → Bevölkerung → Handel → Territorium → Diplomatie → Militär → Krieg**

---

# 📊 Aktueller Stand

## Bereits vorhanden

- [x] Zentraler, fehlertoleranter Loader
- [x] World Dynamic Properties
- [x] Teams und Team-Chat
- [x] Teamfarben
- [x] Teambeziehungen `friendly`, `neutral`, `hostile`
- [x] Chunk-basierte Claims
- [x] Claim-Grenzanzeige
- [x] Steuern und Emerald-Wirtschaft
- [x] Marktplätze mit Monster-Schutz
- [x] Spezialisierte Händler und Handelstabellen
- [x] Rohstofforientierte Händlerangebote
- [x] Soldatenhändler mit Rekrutierungs-UI
- [x] Soldaten-Entity und Spawn-System
- [x] Soldier-Zuordnung über `player.id`
- [x] Soldier-KI-Grundsystem
- [x] Soldier-Befehle
- [x] Soldier-Level 1–7
- [x] Persistentes Soldier-XP-System
- [x] Schadenabhängige Treffer-XP
- [x] Gegnerstärkeabhängige Kill-XP
- [x] Automatische Levelbeförderungen
- [x] Infanterie
- [x] Ausrüstungssystem
- [x] Grundlage für Soldier-Fähigkeiten
- [x] Monster-/Pillager-System
- [x] Außenposten-/Belagerungsgrundlage
- [x] Essentials, Homes, TPA und Dashboard
- [x] Separates Resource Pack

---

# 🔴 Phase 1 – Fundament & Stabilität

- [x] Zentraler Loader
- [x] Fehlertolerantes Laden
- [x] Zentrale Versionsverwaltung
- [x] API-Version auf aktuellen Entwicklungsstand abgestimmt
- [ ] Einheitliches Logging-System
- [ ] zentrale Fehler-/Diagnosefunktionen
- [ ] automatische Konfigurationsvalidierung
- [ ] saubere Behandlung von World-/Dimension-Wechseln
- [ ] Performance-Prüfung aller `runInterval`-Systeme

---

# 🔴 Phase 2 – Soldier-System

## 2.1 Einheiten

- [x] Infanterie
- [x] Level 1–7
- [x] unterschiedliche HP, Schaden und Geschwindigkeit
- [x] unterschiedliche Ausrüstung
- [x] XP-/Level-System mit persistentem XP-Fortschritt
- [x] automatische Beförderung anhand der XP
- [x] Rekrutierung über Soldatenhändler
- [ ] Bogenschütze
- [ ] Schwerer Soldat
- [ ] Spezialeinheiten
- [ ] weitere Einheitentypen
- [ ] Beförderungen mit zusätzlichen Rängen/Abzeichen
- [ ] Unterhalt pro Einheit

### Aktuelle XP-Schwellen

| Level | Rang | Gesamt-XP |
|---:|---|---:|
| 1 | Rekrut | 0 |
| 2 | Veteran | 150 |
| 3 | Elite | 400 |
| 4 | Hauptmann | 800 |
| 5 | Kriegsveteran | 1.400 |
| 6 | Kriegsherr | 2.200 |
| 7 | Marschall | 3.500 |

### Aktuelle XP-Regeln

XP wird im Kampf nach Leistung vergeben und persistent als `soldier:xp` gespeichert.

| Ereignis | XP |
|---|---:|
| 1–2 verursachter Schaden | 1 XP |
| 3–5 verursachter Schaden | 2–4 XP |
| 6–10 verursachter Schaden | 5–7 XP |
| 11+ verursachter Schaden | 1–8 XP, maximal 8 XP |
| Kill eines normalen Gegners | 25–50 XP |
| Kill eines starken Gegners | 50–75 XP |
| Kill eines sehr starken Gegners/Bosses | 75–100 XP |

Treffer-XP wird zufällig innerhalb des jeweiligen Bereichs bestimmt. Der finale Treffer eines Gegners erhält keine zusätzliche Treffer-XP, weil der Kill separat vergütet wird.

Die Kill-Klassifizierung unterstützt:

- explizite Tags `soldier_xp_boss`, `boss`, `very_strong`
- explizite Tags `soldier_xp_strong`, `strong`
- bekannte starke Gegner wie Vindicator, Evoker, Ravager, Warden, Elder Guardian und Piglin Brute
- Ender Dragon und Wither als Bosse
- maximale Lebenspunkte als Fallback für nicht explizit konfigurierte Gegner

Implementierung:

```text
scripts/soldier/level.js
```

Konfigurationswerte befinden sich zentral in `SOLDIER_LEVEL_CONFIG` in `level.js`.

## 2.2 Rekrutierung

- [x] Soldatenhändler
- [x] eigene Rekrutierungs-UI
- [x] Rekrut Level 1 für 8 Emeralds
- [x] Veteran Level 2 für 18 Emeralds
- [x] Elite Level 3 für 35 Emeralds
- [x] Zahlung aus Spielerinventar
- [x] automatische Besitzerzuordnung über `player.id`
- [x] Rückerstattung bei fehlgeschlagenem Spawn
- [ ] Rekrutierung abhängig von Siedlungsstufe
- [ ] Bevölkerung als Voraussetzung
- [ ] maximale Armeegröße
- [ ] Unterhaltskosten

## 2.3 Bewegung & KI

- [x] grundlegende Zielsuche
- [x] Team-/Feinderkennung
- [x] Follow
- [x] Move
- [x] Stay
- [x] Attack-Grundlogik
- [x] Retreat-Grundlage
- [ ] natürlichere Beschleunigung und Abbremsung
- [ ] bessere Wegfindung
- [ ] Hinderniserkennung
- [ ] sinnvollen Abstand zum Ziel halten
- [ ] Gruppenbewegung
- [ ] Formation
- [ ] Vermeidung gegenseitiger Blockierung
- [ ] Schutz verletzter Einheiten
- [ ] intelligenter Rückzug
- [ ] Zielprioritäten
- [ ] Sichtlinie

## 2.4 Kampf

- [ ] natürliches Annähern
- [ ] realistische Angriffsintervalle
- [ ] Attack-Animationen mit RP abstimmen
- [ ] kein hektisches Hin-und-her-Laufen
- [ ] bessere Kollision/Abstände
- [ ] unterschiedliches Kampfverhalten je Einheitentyp
- [ ] Fokusfeuer
- [ ] sinnvoller Zielwechsel
- [ ] Kampfmoral
- [ ] Formation im Kampf
- [ ] Garnisons-/Belagerungsverhalten

## 2.5 Befehle & Gruppen

- [x] `/siedler:spawn_soldier`
- [x] `/siedler:move`
- [x] `/siedler:follow`
- [x] `/siedler:stay`
- [x] `/siedler:attack`
- [x] `/siedler:defend`
- [x] `/siedler:patrol`
- [x] `/siedler:stop`
- [x] Grundlage für Soldatenauswahl
- [x] Soldatengruppen
- [x] Gruppenverwaltung
- [x] Formationsgrundlage
- [ ] mehrere komplexe Gruppen gleichzeitig befehligen
- [ ] Zielpositionen markieren
- [ ] Garnisonen erstellen

## 2.6 Versorgung

- [ ] Nahrung als Militärressource
- [ ] Waffenverbrauch/Instandhaltung
- [ ] Rüstungsunterhalt
- [ ] Heilung über Versorgung
- [ ] Versorgungslager
- [ ] Nachschubwege
- [ ] Soldatenunterhalt über Emeralds

---

# 🟠 Phase 3 – Claims & Territorium

- [x] Chunk-Claims
- [x] Claim-Grenzen
- [x] Claim-Informationen
- [x] Claim-Limits
- [ ] Hauptsiedlung
- [ ] Außenposten
- [ ] Grenzgebiete
- [ ] Einflussbereiche
- [ ] Gebietserweiterung durch Siedlungsfortschritt
- [ ] Diplomatie bei Schutzregeln
- [ ] militärische Kontrolle
- [ ] umkämpfte Gebiete

---

# 🟠 Phase 4 – Diplomatie

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
- [ ] Claims berücksichtigen Diplomatie
- [ ] Soldiers berücksichtigen Diplomatie
- [ ] Marktregeln berücksichtigen Diplomatie

---

# 🟡 Phase 5 – Wirtschaft & Ressourcen

## Ressourcen

- [x] Emeralds als Standardwährung
- [x] Holz
- [x] Stein/Cobblestone
- [x] Sand/Gravel/Lehm
- [x] Kohle
- [x] Erze
- [x] Getreide und Gemüse
- [x] Samen
- [x] Tierprodukte
- [ ] weitere unverarbeitete Rohstoffe

## Produktion

- [ ] Produktionsketten
- [ ] Rohstoff → Verarbeitung → Endprodukt
- [ ] Gebäude als Produktionsstätten
- [ ] Produktionskapazitäten
- [ ] Lagerbestände
- [ ] Transportwege
- [ ] Arbeiter/Siedler als Produktionsfaktor

## Wirtschaft

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

## Vorhanden

- [x] rechteckige Marktplätze
- [x] Monster-Schutz
- [x] konfigurierbare Marktgebiete
- [x] Händler-NPCs
- [x] spezialisierte Händler
- [x] Rohstoff-/Samenangebote
- [x] Soldatenhändler
- [x] Soldaten-Rekrutierungs-UI
- [x] Commands zum Spawnen und Entfernen

## Ausbau

- [ ] echte Handelsangebote zwischen Spielern/Teams
- [ ] Handelsaufträge
- [ ] Ressourcenpreise
- [ ] Angebot/Nachfrage
- [ ] regionale Preisunterschiede
- [ ] Handelsrouten
- [ ] Händlerbewegung
- [ ] Händler-Lagerbestand
- [ ] Handelsverträge
- [ ] Marktübersicht im Dashboard

### Aktuelle Händler

- `food` – Lebensmittel
- `building` – Baustoffe
- `resources` – Rohstoffe
- `tools` – Werkzeuge
- `weapons` – Waffen
- `supplies` – Versorgung
- `soldiers` – Soldatenrekrutierung

---

# 🟡 Phase 7 – Siedlungen & Bevölkerung

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
- [ ] Hauptsiedlung als Zentrum

### Zielmodell

`Lager → Dorf → Siedlung → Stadt → Großsiedlung`

---

# 🟢 Phase 8 – Spieler-UI

- [x] `/siedler:stats`
- [x] Spieler-/Siedlungs-Dashboard
- [x] Teaminformationen
- [x] Claiminformationen
- [x] Steuer-/Wirtschaftsinformationen
- [x] Soldaten-Rekrutierungs-UI
- [ ] Militärübersicht
- [ ] Soldatenliste
- [ ] Soldatenauswahl vollständig ausbauen
- [x] Gruppenverwaltung
- [ ] Diplomatie-Menü
- [ ] Handelsübersicht
- [ ] Ressourcenübersicht
- [ ] Bevölkerungsübersicht
- [ ] Angriffs-/Ereigniswarnungen

---

# 🟢 Phase 9 – Resource Pack & Custom Entities

- [ ] `siedler:soldier` zuverlässig sichtbar
- [ ] `siedler:trader` zuverlässig sichtbar
- [ ] Geometrien validieren
- [ ] Render Controller validieren
- [ ] Texturen validieren
- [ ] Animationen verbessern
- [ ] Ausrüstung korrekt darstellen
- [ ] Soldier-Typen visuell unterscheiden
- [ ] Level visuell darstellen
- [ ] Teamfarbe darstellen
- [ ] Kampfanimationen
- [ ] Bewegungsanimationen
- [ ] Idle-Animationen

---

# 🔵 Phase 10 – Monster & Bedrohungen

- [x] zentrale Monster-Konfiguration
- [x] Spawnraten
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
- [ ] Angriffe auf Produktionsgebiete
- [ ] Integration in Wirtschaft und Bevölkerung

---

# 🔵 Phase 11 – Siedler-3-Spielgefühl

- [ ] klare Ressourcenketten
- [ ] Produktionskreisläufe
- [ ] Lager und Logistik
- [ ] Bevölkerung als Wirtschaftsfaktor
- [ ] Militär als wirtschaftlich relevantes System
- [ ] Territorium als strategische Ressource
- [ ] Handel zwischen Teams
- [ ] Diplomatie
- [ ] Krieg und Frieden
- [ ] Belagerungen
- [ ] Siegbedingungen

### Leitprinzip

> **Nicht möglichst viele Features hinzufügen, sondern die vorhandenen Systeme zu einem funktionierenden Wirtschafts-, Siedlungs- und Strategiespiel verbinden.**

---

# 🧪 Phase 12 – Qualität, Performance & Tests

- [ ] Testwelt für alle Systeme
- [ ] Regressionstests nach API-Updates
- [ ] Soldier-Kampftests inklusive XP-Verteilung
- [ ] Soldier-Rekrutierungstests
- [ ] Händler-/UI-Tests
- [ ] Multiplayer-Test mit 8 Spielern / 4 Teams
- [ ] Performance-Test bei vielen Soldaten
- [ ] Performance-Test bei vielen Händlern
- [ ] Fehler-/Crash-Analyse
- [ ] Backup-/Rollback-Prozess

---

# 📌 Aktueller Schwerpunkt

1. **Soldatensteuerung und Kampf natürlicher machen**
2. **Soldatengruppen und Auswahl vollständig ausbauen**
3. **Soldatenversorgung und Unterhalt hinzufügen**
4. **Rohstoffwirtschaft mit echten Produktionsketten verbinden**
5. **Siedlungen und Bevölkerung implementieren**
6. **Diplomatie mit Claims, Handel und Militär verbinden**
7. **Resource-Pack-Darstellung stabilisieren**
8. **Soldier-XP im Multiplayer und mit unterschiedlichen Gegnerstärken testen**

Der Soldaten-Levelpfad umfasst aktuell sieben Stufen. XP wird jetzt nach tatsächlich verursachtem Schaden und Gegnerstärke vergeben. Die nächsten Schritte sind, Beförderungen stärker mit Rängen, Gruppenverwaltung, Versorgung und den Siedlungsstufen zu verknüpfen.

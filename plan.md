# 🏘️ Siedler Logic – Entwicklungsplan

> Aktueller Entwicklungsplan für `mc-siedler-bp`. Ziel ist ein zusammenhängendes Minecraft-Bedrock-Siedler-System mit Wirtschaft, Bevölkerung, Territorium, Handel und Militär.

**Stand:** 03.09.2026  
**Behavior Pack:** `mc-siedler-bp`  
**Resource Pack:** `mc-siedler-rp`

---

# 🎯 Gesamtziel

**Siedlung → Ressourcen → Wirtschaft → Bevölkerung → Handel → Territorium → Diplomatie → Militär → Krieg**

---

# 📊 Aktueller Stand

- [x] Zentraler, fehlertoleranter Loader
- [x] World Dynamic Properties
- [x] Teams, Team-Chat, Farben und Beziehungen
- [x] Chunk-Claims und Claim-Grenzanzeige
- [x] Steuern und Emerald-Wirtschaft
- [x] Marktplätze und spezialisierte Händler
- [x] Rohstofforientierte Händlerangebote
- [x] Sieben vordefinierte Händlerrollen
- [x] Persistente Händler-Variant-Tags für das Resource Pack
- [x] Soldatenhändler mit Rekrutierungs-UI
- [x] Soldaten-Entity und Spawn-System
- [x] Soldier-Zuordnung über `player.id`
- [x] Soldier-KI-Grundsystem und Befehle
- [x] Soldier-Level 1–7 und persistentes XP-System
- [x] Schaden- und Gegnerstärke-basierte XP
- [x] Infanterie
- [x] Bogenschütze
- [x] Kavallerie mit Pferd als Reittier
- [x] Ausrüstungssystem und Grundlage für Fähigkeiten
- [x] Monster-/Pillager-System und Belagerungsgrundlage
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
- [x] Bogenschütze
- [x] Kavallerie
- [x] Kavallerie-Reittier (`minecraft:horse`)
- [x] Level 1–7 für die Einheitentypen
- [x] unterschiedliche HP, Schaden, Reichweite und Geschwindigkeit
- [x] unterschiedliche Ausrüstung
- [x] XP-/Level-System mit persistentem XP-Fortschritt
- [x] automatische Beförderung anhand der XP
- [x] Rekrutierung über Soldatenhändler
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

| Ereignis | XP |
|---|---:|
| 1–2 verursachter Schaden | 1 XP |
| 3–5 verursachter Schaden | 2–4 XP |
| 6–10 verursachter Schaden | 5–7 XP |
| 11+ verursachter Schaden | 1–8 XP, maximal 8 XP |
| Kill eines normalen Gegners | 25–50 XP |
| Kill eines starken Gegners | 50–75 XP |
| Kill eines sehr starken Gegners/Bosses | 75–100 XP |

## 2.2 Rekrutierung

- [x] Soldatenhändler
- [x] eigene Rekrutierungs-UI
- [x] Infanterie Level 1–3 im Händler
- [x] Bogenschütze Level 1–3 im Händler
- [x] Kavallerie Level 1–3 im Händler
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
- [ ] echte Projektil-/Bogenschützenlogik
- [ ] Kavallerie-Sturmangriff als eigene Kampfmechanik
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
- [x] Soldatenauswahl-Grundlage
- [x] Soldatengruppen
- [x] Gruppenverwaltung
- [x] Formationsgrundlage
- [ ] mehrere komplexe Gruppen gleichzeitig befehligen
- [ ] Zielpositionen markieren
- [ ] Garnisonen erstellen

---

# 🟠 Phase 3 – Claims & Territorium

- [x] Chunk-Claims
- [x] Claim-Grenzen
- [x] Claim-Informationen
- [x] Claim-Limits
- [ ] Hauptsiedlung
- [ ] Außenposten
- [ ] militärische Kontrolle
- [ ] umkämpfte Gebiete

---

# 🟠 Phase 4 – Diplomatie

- [x] `friendly`
- [x] `neutral`
- [x] `hostile`
- [x] Beziehungen persistent speichern
- [ ] Bündnisse
- [ ] Diplomatie-UI
- [ ] Claims berücksichtigen Diplomatie
- [ ] Soldiers berücksichtigen Diplomatie

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

## Wirtschaft

- [x] Steuern
- [x] Emerald-Währung
- [x] Team-Kasse

---

# 🟡 Phase 6 – Handel & Märkte

## Vorhanden

- [x] rechteckige Marktplätze
- [x] Monster-Schutz
- [x] konfigurierbare Marktgebiete
- [x] Händler-NPCs
- [x] sieben spezialisierte Händlerrollen
- [x] Rohstoff-/Samenangebote
- [x] Soldatenhändler
- [x] Soldaten-Rekrutierungs-UI
- [x] Händler-Variant-Tags für das Resource Pack
- [x] Commands zum Spawnen und Entfernen

## Ausbau

- [ ] echte Handelsangebote zwischen Spielern/Teams
- [ ] Handelsaufträge
- [ ] Ressourcenpreise
- [ ] Angebot/Nachfrage

### Aktuelle Händler

- `food` – Lebensmittel
- `building` – Baustoffe
- `resources` – Rohstoffe
- `tools` – Werkzeuge
- `weapons` – Waffen
- `supplies` – Versorgung
- `soldiers` – Soldatenrekrutierung

---

# 🟢 Phase 9 – Resource Pack & Custom Entities

- [ ] `siedler:soldier` zuverlässig sichtbar
- [ ] `siedler:trader` zuverlässig sichtbar
- [ ] Geometrien validieren
- [ ] Render Controller validieren
- [ ] Texturen validieren
- [x] Animationen verbessern
- [ ] Ausrüstung korrekt darstellen
- [x] Soldier-Typen visuell unterscheiden
- [x] Kavallerie visuell als berittene Einheit vorbereiten
- [ ] Level visuell darstellen
- [ ] Teamfarbe darstellen
- [ ] Kampfanimationen weiter ausbauen
- [x] individuelle Bewegungsanimationen
- [ ] Idle-Animationen weiter verfeinern
- [x] Händler-Typen visuell unterscheiden

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
- [x] gezielte Angriffe auf Siedlungen
- [x] Verteidigungswarnungen

---

# 🔵 Phase 11 – Siedler-3-Spielgefühl

- [ ] klare Ressourcenketten
- [ ] Bevölkerung als Wirtschaftsfaktor
- [ ] Territorium als strategische Ressource
- [ ] Handel zwischen Teams
- [x] Diplomatie
- [ ] Krieg und Frieden
- [ ] Belagerungen

### Leitprinzip

> **Nicht möglichst viele Features hinzufügen, sondern die vorhandenen Systeme zu einem funktionierenden Wirtschafts-, Siedlungs- und Strategiespiel verbinden.**

# 🏘️ Siedler Logic – Entwicklungsplan

> Aktueller Entwicklungsplan für `mc-siedler-bp`.

**Stand:** 03.09.2026  
**Behavior Pack:** `mc-siedler-bp`  
**Resource Pack:** `mc-siedler-rp`

---

# 📊 Aktueller Stand

- [x] Zentraler, fehlertoleranter Loader
- [x] World Dynamic Properties
- [x] Teams, Team-Chat, Farben und Beziehungen
- [x] Chunk-Claims und Claim-Grenzanzeige
- [x] Steuern und Emerald-Wirtschaft
- [x] Permanenter TaxBonus ausschließlich durch besiegte Monster-Tokens
- [x] Jeder besiegte Monster-Token erhöht die tägliche Team-Steuer dauerhaft um +1 Emerald
- [x] TaxBonus-Limit von 64 Emeralds/Tag
- [x] persistenter Schutz gegen doppelte Tagesauszahlung nach Neustarts
- [x] Steuer-Informations-Command
- [x] Marktplätze und spezialisierte Händler
- [x] sieben vordefinierte Händlerrollen
- [x] Soldatenhändler mit Rekrutierungs-UI
- [x] Soldaten-Entity und Spawn-System
- [x] Soldier-Zuordnung über `player.id`
- [x] Soldier-KI-Grundsystem und Befehle
- [x] Soldier-Level 1–7 und persistentes XP-System
- [x] Infanterie
- [x] Bogenschütze
- [x] Kavallerie mit Pferd
- [x] Ausrüstungssystem
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
- [ ] Performance-Prüfung aller `runInterval`-Systeme

---

# 🔴 Phase 2 – Soldier-System

## 2.1 Einheiten

- [x] Infanterie
- [x] Bogenschütze
- [x] Kavallerie
- [x] Level 1–7
- [x] unterschiedliche HP, Schaden, Reichweite und Geschwindigkeit
- [x] unterschiedliche Ausrüstung
- [x] persistentes XP-System
- [x] automatische Beförderung
- [x] Rekrutierung über Soldatenhändler
- [ ] Schwerer Soldat
- [ ] Spezialeinheiten
- [ ] Unterhalt pro Einheit

## 2.2 Bewegung & KI

- [x] grundlegende Zielsuche
- [x] Team-/Feinderkennung
- [x] Follow / Move / Stay / Attack / Retreat
- [ ] bessere Wegfindung
- [ ] Hinderniserkennung
- [ ] Gruppenbewegung
- [ ] Formation
- [ ] intelligente Zielprioritäten
- [ ] Sichtlinie

## 2.3 Kampf

- [ ] natürliches Annähern
- [ ] realistische Angriffsintervalle
- [ ] Attack-Animationen mit RP abstimmen
- [ ] echte Projektil-/Bogenschützenlogik
- [ ] Kavallerie-Sturmangriff
- [ ] Fokusfeuer
- [ ] Kampfmoral
- [ ] Garnisons-/Belagerungsverhalten

## 2.4 Befehle & Gruppen

- [x] Soldier Commands
- [x] Soldatenauswahl
- [x] Soldatengruppen
- [x] Gruppenverwaltung
- [x] Formationsgrundlage
- [ ] mehrere komplexe Gruppen gleichzeitig befehligen
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

## Steuern & TaxBonus

- [x] Steuern pro Dorfbewohner
- [x] Emerald-Währung
- [x] Team-Kasse
- [x] TaxBonus durch besiegte Monster-Tokens
- [x] +1 Emerald tägliche Steuer pro besiegtem Monster-Token
- [x] permanenter, nicht verbrauchbarer Bonus
- [x] maximal +64 Emeralds/Tag TaxBonus pro Team
- [x] Bonus nur für das Team des Spielerkillers
- [x] Spieler ohne Team erhalten keinen Bonus
- [x] Tagesauszahlung von maximal 256 Emeralds
- [x] persistenter Schutz gegen doppelte Auszahlung
- [x] `/siedler:taxinfo`
- [ ] Steuerhistorie
- [ ] wirtschaftliche Ereignisse mit temporären Boni

### Aktuelles TaxBonus-Modell

Der TaxBonus stammt **ausschließlich aus Monster-Tokens** und bleibt dauerhaft erhalten.

`Monster-Token besiegt → +1 Emerald/Tag permanenter TaxBonus`

`Tagessteuer = Dorfbewohner + permanenter TaxBonus`

Beispiel:

`10 Dorfbewohner + 1 TaxBonus = 11 Emeralds/Tag`

Nach einem weiteren besiegten Monster-Token:

`10 Dorfbewohner + 2 TaxBonus = 12 Emeralds/Tag`

Der TaxBonus wird bei der täglichen Steuerzahlung **nicht zurückgesetzt**. Er stellt einen dauerhaften wirtschaftlichen Fortschritt des Teams durch das Besiegen von Monster-Tokens dar.

---

# 🟡 Phase 6 – Handel & Märkte

- [x] rechteckige Marktplätze
- [x] Monster-Schutz
- [x] konfigurierbare Marktgebiete
- [x] Händler-NPCs
- [x] sieben spezialisierte Händlerrollen
- [x] Rohstoff-/Samenangebote
- [x] Soldatenhändler
- [x] Händler-Variant-Tags
- [ ] echte Handelsangebote zwischen Spielern/Teams
- [ ] Handelsaufträge
- [ ] Ressourcenpreise
- [ ] Angebot/Nachfrage

---

# 🟢 Phase 9 – Resource Pack & Custom Entities

- [ ] `siedler:soldier` zuverlässig sichtbar
- [ ] `siedler:trader` zuverlässig sichtbar
- [ ] Geometrien validieren
- [ ] Render Controller validieren
- [ ] Ausrüstung korrekt darstellen
- [x] Soldier-Typen visuell unterscheiden
- [x] individuelle Bewegungsanimationen
- [ ] Level visuell darstellen
- [ ] Teamfarbe darstellen
- [ ] Kampfanimationen weiter ausbauen
- [ ] Idle-Animationen weiter verfeinern
- [x] Händler-Typen visuell unterscheiden

---

# 🔵 Phase 10 – Monster & Bedrohungen

- [x] zentrale Monster-Konfiguration
- [x] Spawnraten
- [x] Nacht-Multiplikator
- [x] Monster-Tokens
- [x] Token-Belohnung über permanenten TaxBonus
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

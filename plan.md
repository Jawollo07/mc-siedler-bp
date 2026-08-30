# Siedler Logic – Erweiterungsplan

> Roadmap für `mc-siedler-bp` mit Fokus auf ein Minecraft-Bedrock-Erlebnis, das sich spielerisch an **Die Siedler 3** orientiert. Das Backpack-System soll dabei nicht nur zusätzlicher Speicher sein, sondern als Teil der Logistik und des Siedler-Gameplays funktionieren.

## Ziel

Das Projekt soll sich von einer Sammlung einzelner Server-Systeme zu einem zusammenhängenden Siedler-System entwickeln:

**Siedlung → Wirtschaft → Logistik → Bevölkerung → Militär → Territorium → Diplomatie → Krieg**

Bestehende Systeme wie Teams, Claims, Steuern, Monster/Pillager und das Soldier-System sollen dabei miteinander verbunden werden, statt isolierte Features zu bleiben.

---

# Punkt 1 - Fundament und Stabilität

**Priorität: 🔴 sehr hoch**

- [ ] Zentrale Version aus einer einzigen Quelle beziehen
- [ ] Einheitliches Konfigurationssystem für alle Module
- [ ] Zentrale Dynamic-Property-Registrierung
- [ ] Gemeinsame Utility-Funktionen für Teams, Claims, Entities und Spieler
- [ ] Fehlergrenzen zwischen Modulen verbessern
- [ ] Debug-/Development-Modus zentral steuerbar machen
- [ ] Performance-Telemetrie für wiederkehrende Tasks
- [x] Cleanup-System für nicht mehr gültige Soldier-/Entity-Einträge
- [ ] Dokumentation der verwendeten Dynamic Properties
- [ ] API-Kompatibilität mit der verwendeten `@minecraft/server`-Version prüfen

**Ergebnis:** Das Pack kann dauerhaft auf einem Server laufen, ohne dass einzelne Systeme das gesamte Pack destabilisieren.

---

# Punkt 2 - Soldier-System zu einem vollständigen Militärsystem ausbauen

**Priorität: 🔴 sehr hoch**

Das Soldier-System besitzt bereits eigene AI-, Spawn-, Config- und Command-Strukturen. Die aktuelle Implementierung enthält allerdings erst die Grundlage; insbesondere fehlen noch belastbare Team-/Feinderkennung, vollständige Befehlslogik und die tatsächliche Ability-Ausführung.

## 2.1 Einheiten

- [ ] Nahkämpfer
- [ ] Bogenschütze
- [ ] Schwerer Soldat
- [ ] Spezialeinheiten
- [ ] Unterschiedliche Werte pro Einheit
- [ ] Level/Erfahrung

## 2.2 AI

- [ ] Zielsuche
- [ ] Team-/Feinderkennung
- [ ] Formation
- [ ] Follow-Befehl
- [ ] Move-Befehl
- [ ] Attack-Befehl
- [ ] Hold-Position
- [ ] Patrol
- [ ] Retreat
- [ ] Schutz wichtiger Einheiten
- [ ] Wegfindung verbessern
- [ ] Hinderniserkennung

## 2.3 Kommandos

- [ ] Auswahl von Soldaten
- [ ] Gruppen bilden
- [ ] Befehle an Gruppen
- [ ] Zielposition markieren
- [ ] Angriff auf Entity/Spieler
- [ ] Rückzug
- [ ] Garnison

## 2.4 Versorgung

- [ ] Nahrung
- [ ] Waffen
- [ ] Rüstung
- [ ] Heilung

---

# Punkt 3 - Claims als echtes Territorialsystem

**Priorität: 🟠 hoch**

Das vorhandene Claims-System soll stärker mit dem Siedler-Gameplay verbunden werden.

- [ ] Siedlungsgebiet
- [x] Grenzmarker
- [ ] Grenzstatus
- [ ] Schutz abhängig von Team-/Diplomatiestatus

## Grenzlogik

`Siedlung → Territorium → Außenposten → Grenzgebiet → feindliches Gebiet`

---

# Punkt 4 – Diplomatie und Politik

**Priorität: 🟠 hoch**

Die vorhandenen Teams werden zu politischen Fraktionen erweitert.

- [ ] Bündnisse
- [ ] Kriegserklärungen
- [x] Neutralität
- [ ] Nichtangriffspakte
- [ ] Handelsabkommen
- [x] Beziehungen zwischen Teams
- [x] Diplomatiestatus speichern
- [ ] Kriegsstatus sichtbar machen
- [ ] Bündnis-/Kriegsregeln mit Claims und Soldiers verbinden

> Aktuell existiert bereits eine persistente Relationsebene mit `friendly`, `neutral` und `hostile`. Eine vollständige Diplomatie-UI und die Gameplay-Verknüpfung fehlen noch.

---

# Punkt 5 – Handel

**Priorität: 🟡 mittel**

- [ ] Markt
- [ ] Teamhandel
- [ ] Ressourcenpreise
- [ ] Handelsaufträge
- [ ] Händler-NPCs
- [ ] Angebot/Nachfrage
- [ ] Handelsgebühren

---

# Punkt 6 - Spieler-UI und Verwaltung

**Priorität: 🟡 mittel**

- [x] Siedlungs-Dashboard
- [x] Wirtschaftsübersicht
- [x] Steuerübersicht
- [ ] Lagerübersicht
- [ ] Militärübersicht
- [ ] Claims-Karte/Übersicht
- [ ] Diplomatie-Menü
- [ ] Backpack-Menü
- [ ] Produktionsstatus
- [ ] Warnungen bei Ressourcenmangel
- [ ] Warnungen bei Angriffen

Die vorhandene `/siedler:stats`-UI bildet bereits ein zentrales Siedler-Spielermenü mit Profil, Team, Claims, Steuern/Wirtschaft und Server-Statistiken. Die übrigen Verwaltungsbereiche müssen noch integriert werden.

---

# Punkt 7 - Admin- und Debug-Werkzeuge

**Priorität: 🟢 mittel**

- [ ] `/siedler debug`
- [x] `/siedler stats`
- [ ] `/siedler reload`
- [ ] Soldier-Debug
- [ ] Claim-Debug
- [ ] Team-Debug
- [ ] Wirtschafts-Debug
- [ ] Dynamic-Property-Diagnose
- [ ] Performance-Report
- [ ] sichere Admin-Rechte

---

# Wichtigste Gameplay-Verknüpfungen

Die folgenden Verbindungen haben höchste Priorität:

```text
Backpack
   ↓
Logistik
   ↓
Lager ───→ Produktion
   ↓             ↓
Wirtschaft ←── Steuern
   ↓
Siedlung
   ↓
Bevölkerung
   ↓
Militär ───→ Soldier AI
   ↓
Claims
   ↓
Diplomatie
   ↓
Krieg
```

Damit entsteht ein Kreislauf, bei dem jedes große System einen Grund hat, mit den anderen Systemen zu interagieren.

---

# Definition of Done

Ein Feature gilt erst als fertig, wenn:

- [ ] Funktional implementiert
- [ ] Persistenz getestet
- [ ] Fehlerfälle behandelt
- [ ] Rechte geprüft
- [ ] Performance geprüft
- [ ] Mit bestehenden Systemen integriert
- [ ] UI/Feedback vorhanden, falls erforderlich
- [ ] Debug-Möglichkeit vorhanden
- [ ] Dokumentation aktualisiert

---

# Leitprinzipien

1. **Siedler-Gameplay vor Einzel-Features.**
2. **Backpack = Logistik, nicht einfach mehr Inventar.**
3. **Wirtschaft muss Ressourcen verbrauchen und produzieren.**
4. **Soldaten müssen Teil der Wirtschaft und Versorgung sein.**
5. **Claims müssen mit Siedlungen und Diplomatie verbunden sein.**
6. **Teams bilden die Grundlage für politische Beziehungen.**
7. **PvE soll die Spieler zu Expansion und Verteidigung zwingen.**
8. **Keine unnötige Tick-Last.**
9. **Persistenz und Fehlerbehandlung sind bei jedem System Pflicht.**
10. **Erst Kernmechaniken stabilisieren, dann Content und Polish hinzufügen.**

# Siedler Logic – Erweiterungsplan

> Roadmap für `mc-siedler-bp` mit Fokus auf ein Minecraft-Bedrock-Erlebnis, das sich spielerisch an **Die Siedler 3** orientiert. Das Backpack-System soll dabei nicht nur zusätzlicher Speicher sein, sondern als Teil der Logistik und des Siedler-Gameplays funktionieren.

## Ziel

Das Projekt soll sich von einer Sammlung einzelner Server-Systeme zu einem zusammenhängenden Siedler-System entwickeln:

**Siedlung → Wirtschaft  → Bevölkerung → Militär → Territorium → Diplomatie → Krieg**

Bestehende Systeme wie Teams, Claims, Steuern, Monster/Pillager und das Soldier-System sollen dabei miteinander verbunden werden, statt isolierte Features zu bleiben.

---

# Punkt 1 - Fundament und Stabilität

**Priorität: 🔴 sehr hoch**

- [x] Zentrale Version aus einer einzigen Quelle beziehen
- [x] Cleanup-System für nicht mehr gültige Soldier-/Entity-Einträge
- [x] API-Kompatibilität mit der verwendeten `@minecraft/server`-Version prüfen

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

---

# Punkt 6 - Spieler-UI und Verwaltung

**Priorität: 🟡 mittel**

- [x] Siedlungs-Dashboard
- [x] Wirtschaftsübersicht
- [x] Steuerübersicht
- [ ] Militärübersicht
- [ ] Diplomatie-Menü
- [ ] Warnungen bei Angriffen

Die vorhandene `/siedler:stats`-UI bildet bereits ein zentrales Siedler-Spielermenü mit Profil, Team, Claims, Steuern/Wirtschaft und Server-Statistiken. Die übrigen Verwaltungsbereiche müssen noch integriert werden.

---

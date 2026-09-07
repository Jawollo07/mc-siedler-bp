# 🏘️ Siedler Logic – Entwicklungsplan

> Aktueller Entwicklungsstand des Behavior Packs.

**Stand:** 07.09.2026

## 📊 Aktueller Stand

- [x] Zentraler Loader und fehlertolerantes Modul-Laden
- [x] Teams, Diplomatie, Claims und Wirtschaft
- [x] Verbesserte Diplomatie-UI mit Übersicht, Teamstatus, Beziehungsdetails und Bestätigung
- [x] Diplomatie-Menü für alle Spieler über `/diplomacy`
- [x] Normale Spieler können nur Beziehungen ihres eigenen Teams ändern
- [x] Spieler ohne Team können Diplomatie nur ansehen
- [x] Claim-Block-Recovery bei unerlaubtem Abbau
- [x] Rückgabe unerlaubt platzierter Blöcke ins Spielerinventar
- [x] Sicherer Fallback-Drop bei vollem Inventar
- [x] Keine Item-Duplikation beim normalen Before-Event-Cancel
- [x] Permanenter Monster-Token-TaxBonus
- [x] Tagessteuer nur bei mindestens einem online Teammitglied
- [x] Permanente Vanilla-Weakness für Spieler gegen Mobs und im PvP
- [x] Weakness per Admin-Commands aktivieren/deaktivieren und konfigurieren
- [x] Händler und Soldatenhändler
- [x] Handelsfenster für spezialisierte Händler repariert
- [x] Händler-Trade-Tables werden über Component Groups sicher aktiviert
- [x] Händler-Spawn wird nach dem Entity-Spawn initialisiert
- [x] Alte/rollenlose Händler werden automatisch repariert
- [x] Händler-Recovery setzt bestehende Trade-Nutzungen nicht zurück
- [x] Soldatenhändler öffnet zuverlässig über Entity-Interaktion eine eigene Rekrutierungs-UI
- [x] Soldatenhändler erkennt neben dem `soldier_trader`-Tag auch Variant-ID `6` als Fallback
- [x] Soldatenhändler bietet Infanterie, Bogenschützen und Kavallerie sowie Level 1–3 an
- [x] Soldatenhändler prüft und belastet Emeralds sicher und erstattet bei Spawn-Fehlern
- [x] Soldier-Spawn, Owner-Zuordnung, Level 1–7 und XP
- [x] Infanterie, Bogenschütze und Kavallerie
- [x] Soldier-Ausrüstung und Befehle
- [x] Soldier-Zielsuche und Team-/Feinderkennung
- [x] Nahkampf-KI mit Windup/Cooldown
- [x] Eigene Bogenschützen-KI mit echter `minecraft:arrow`-Physik
- [x] Ballistisches Zielen, Gravitation, Drag, Predictive Aim und Swept-Ray
- [x] Spieler-Dashboard und Serverstatistiken
- [x] Resource Pack mit Custom-Soldaten
- [x] Kavallerie verwendet ein normales erwachsenes `minecraft:horse`
- [x] Kavallerie-Mounting über `/ride`
- [x] Vanilla-Rider-Kompatibilität über `baby_undead`
- [x] Eindeutige Mount-Tags und `soldier:riderId`
- [x] Kavallerie bewegt das Mount statt den Reiter direkt
- [x] Taktische Kavallerie-Zustände: Approach, Charge, Hit, Pass
- [x] Charge mit erhöhtem Schaden und Knockback
- [x] Seitliches Passieren statt dauerhaftem Kreisen auf dem Gegner
- [x] Zielpriorität und Target-Hysterese
- [x] Stuck-Erkennung mit automatischem Seitenwechsel
- [x] Eigenes Mount wird bei der Zielsuche ausgeschlossen
- [x] Rideable-API als Mounting-Fallback
- [x] Essentials mit Homes, Todespunkten, TPA und Startsystem
- [x] Marktplatz blockiert Abbau und Platzierung
- [x] Markt-Commands direkt über `customCommandRegistry.registerCommand()` registriert
- [x] Zusätzlichen `registerCommand`-Wrapper aus dem Markt-Command-Modul entfernt
- [x] Ein zentraler Marktplatz statt einer ID-basierten Markt-Teleportverwaltung
- [x] Persistenter Marktplatz-Teleportpunkt über World Dynamic Property
- [x] `/market_tp_set` für Admins zum Setzen des Marktplatz-Teleportpunkts
- [x] `/market` für normale Spieler zum Teleportieren
- [x] Vollständiges Anti-AFK-System
- [x] Serverweite Inaktivitätserkennung über Spielerbewegung
- [x] Aktivitätserkennung über Chat, Blockabbau, Blockplatzierung, Interaktion und Kampf
- [x] Konfigurierbare AFK-Warnung und AFK-Markierung
- [x] Automatischer AFK-Kick nach konfigurierter Zeit
- [x] Manueller AFK-Status über `/afk`
- [x] Admin-Steuerung für Anti-AFK und Kick-Funktion
- [x] Admin-Command zum Ändern der Kick-Zeit

## 💤 Phase 5 – Anti-AFK

- [x] Grundlegende Inaktivitätserkennung
- [x] Bewegungsbasierte Aktivitätserkennung
- [x] Chat-/Interaktions-/Kampfaktivität
- [x] Warnung vor AFK-Kick
- [x] AFK-Status
- [x] Automatischer Kick
- [x] `/afk` für Spieler
- [x] Admin-Schalter für System und Kicks
- [x] Konfigurierbare Kick-Zeit

## 🟠 Phase 4 – Diplomatie

- [x] Friendly
- [x] Neutral
- [x] Hostile
- [x] persistente Beziehungen
- [x] Soldiers berücksichtigen Beziehungen
- [x] Bündnisse
- [x] Diplomatie-UI
- [x] öffentliches `/diplomacy`-Menü für alle Spieler
- [x] Diplomatie-Übersicht mit Beziehungszählern
- [x] Teamstatus und Mitgliederanzahl
- [x] Detailansicht einzelner Beziehungen
- [x] Änderungsbestätigung vor dem Speichern
- [x] Änderungen werden für beide Teams gespiegelt
- [x] Normale Spieler können nur Beziehungen ihres eigenen Teams ändern
- [x] Spieler ohne Team erhalten eine reine Leseansicht

## 🎯 Nächster Schwerpunkt

### Soldier-KI v2

1. echte Wegfindung für Soldiers und Kavallerie
2. Hindernisse und Gelände erkennen
3. Höhen-/Treppenlogik verbessern
4. Charge-Lane auf Hindernisse prüfen
5. echte Nahkampf-Hitbox statt reiner Mittelpunkt-Distanz berücksichtigen
6. Kampfpositionen dynamisch um Ziele verteilen
7. Gruppenformationen stabilisieren
8. Angriffe, Treffer und Animationen synchronisieren
9. Kavallerie auf realen Serverlogs und Ingame-Szenarien testen
10. Charge/Pass-Verhalten gegen mehrere Gegner testen
11. Vanilla-Pferd auf Hindernisse, Steigungen und Terrain-Wechsel testen
12. Bogenschützen-Schaden und Verzauberungen vollständig mit dem Soldier-Level synchronisieren
13. Pfeilphysik mit realen Ingame-Flugtests feinjustieren
14. Essentials-Konfiguration aus `index.js` herauslösen
15. Essentials optional um Rang-/Team-Limits erweitern
16. Claim-Rollback für persistente historische Blockänderungen als optionales Admin-System entwickeln
17. Anti-AFK optional um persistente Serverkonfiguration und Ausnahmen für bestimmte Rollen erweitern

### Leitprinzip

> **Soldaten sollen sich wie echte Einheiten verhalten: Ziel erkennen, sinnvoll annähern, eine gute Kampfposition einnehmen und angreifen. Kavallerie soll nicht in Gegnern stecken bleiben, sondern mit hoher Geschwindigkeit chargen, den Gegner passieren und anschließend für den nächsten Angriff neu ansetzen.**

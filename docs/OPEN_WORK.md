# Was offen ist

Stand: 2026-11-04, Branch `main`. Die Betas v2.0.0-beta.1 bis beta.6 sind
veröffentlicht, die Secrets für den Updater angelegt. Offen sind das erste
stabile Release und die manuelle Abnahme unter Windows.

## Nächste Schritte

1. **Erstes Release:** auf `main` `./scripts/release.sh 2.0.0` (Tag `v2.0.0`),
   danach `main` zurück nach `dev` holen.
2. **Manuelle Abnahme** unter Windows (Liste unten).
3. **Release-Notes danach:** `RELEASE_NOTES.md` gilt nur für `v2.0.0`. Für das
   nächste Release löschen (dann entstehen die Notes aus den
   `Release-Note:`-Trailern) oder auf den neuen Tag ändern.

## Manuelle Abnahme unter Windows

1. **Meldungen:** Die erzeugte Meldungen-CSV in JAuswertung mit dem
   Wellen-Regelwerk importieren. Die Anzahl der importierten Meldungen
   entspricht der in der Anwendung angezeigten Kontrollzahl; Umlaute in
   Gliederungen und Namen kommen richtig an.
2. **Pokalwertung:** Die Ergebnisdatei 2025 in alter und neuer Version
   auswerten. Die Pokalwertung ist gleich, bis auf dokumentierte, beabsichtigte
   Abweichungen.
3. **Druck:** Kalibrierungsseite und eine Urkunde auf Normalpapier drucken und
   über das vorbedruckte Papier legen. Abweichung höchstens 1 mm.
4. **Windows:** Installation, Drag & Drop, Speichern und Öffnen, Update und
   Übernahme der alten Einstellungen prüfen.

5. **Neue Funktionen unter Windows:**
   - Projektdatei speichern, auf einem zweiten Rechner per Doppelklick öffnen
     (App geschlossen und offen; Pfad mit Leerzeichen und Umlauten, z. B.
     `C:\Wettkampf Süd\Übung.wwkprojekt`). Gliederungswahl der Entfernungen
     und Rec-Werte-Einstellungen kommen mit.
   - Fehlermeldungen mit Dateipfad (z. B. falsche Endung per Drag & Drop)
     zeigen den Pfad ohne das Präfix `\\?\`.
   - Fenster mit ungespeicherten Einstellungen schließen → beim nächsten Start
     sind die Änderungen gespeichert.
   - Menü „Datei“ und Strg+N/O/S.
   - Öffnen- und Speichern-Dialoge überall: Dateitypen, vorgeschlagener Name,
     Dialog liegt vor dem Fenster; Speichern und danach „Öffnen“/„Im Ordner
     zeigen“ klappt.
   - Jahresprüfung: alte Ergebnisdatei am Originalort und als Kopie → Warnung
     mit Bestätigung.
   - Entfernungen mit Karte, Export als PNG/PDF; Karte auf der Urkunde und
     Position auf dem vorgedruckten Papier.
   - Regelwerk fürs neue Jahr: Regelwerk + Strafenkatalog (`…m.def`) erzeugen,
     neuen Wettkampf in JAuswertung anlegen → Fehlstart 100 Strafpunkte, RW1 vorhanden.
   - Vorjahres-`.wk` (mit Mannschaften und Ergebnissen) in Schritt 6 ablegen,
     neue Datei erzeugen und in JAuswertung öffnen: keine Mannschaften, neue
     Altersklassen und Rec-Werte, Strafenkatalog, Name und Datum der
     Veranstaltung, Bahn-Einstellungen und Logo wie im Vorjahr; Meldungen
     importieren und einen Lauf anlegen.
   - Aktionsleiste unten, Schritt-Assistent, Urkunden-Vorschau.
   - Wellen-Rekorde: Ergebnisdatei 2025 bei der Auswertung laden → Hinweis
     „Neuer Rekord in der Welle“ nur für Zeiten, die alle anderen Jahre
     unterbieten; Werkzeuge → Wellen-Zeiten zeigt Verlauf, Rekord, Durchschnitt, längste Zeit und die grobe Dauer der Welle aus den Meldungen; beim
     Regelwerk fürs neue Jahr erscheinen schnellere Rekorde mit Button
     „übernehmen“.
   - Starts: eine Mannschaft nur in der Welle, eine nur in der Rettung →
     Export in JAuswertung importieren; die Kontrollzahl stimmt, die
     Mannschaft ohne Rettung fehlt in ihrer Altersklasse.
   - Schriftgröße mit Strg + Plus/Minus/0 und unter Einstellungen →
     Darstellung; bleibt nach einem Neustart.
   - Lange Seiten scrollen: Kopf- und Aktionsleiste bleiben stehen, unter der
     Aktionsleiste kein Rand; neue Seite beginnt oben.
   - Update-Dialog zeigt die Release-Notes formatiert (Überschriften, Listen,
     Fett).

Echte Meldungen und Ergebnisdateien für die Abnahme bleiben außerhalb des Repos.

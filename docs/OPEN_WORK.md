# Was offen ist

Stand: 2026-10-15, Branch `dev`. Der Neuaufbau mit Tauri und SvelteKit ist
fertig, die Python-Version ist entfernt (letzter Stand: Tag `v1.0.1.2`). Offen
sind die manuelle Abnahme unter Windows, die GitHub-Secrets für den Updater
und das erste Release.

## Abgleich mit der früheren Python-Version (`app.py`, bis `v1.0.1.2`)

Im Code umgesetzt; geprüft wird das Verhalten bei der manuellen Abnahme.

Seiten:

- [x] Wellenwettkampf – Vorbereitung (Meldedatei laden, Mannschaften je
      Gliederung auswählen, Export für JAuswertung)
- [x] Wellenwettkampf – Auswertung (Pokalwertung, Excel-Ausgabe)
- [x] Tools – Urkunden sortieren (jetzt: Urkunden als PDF)
- [x] Tools – Entfernungen berechnen
- [x] Einstellungen

Einstellungen (alle sechs, mit den Standardwerten des Originals):

- [x] Altersklassen (hinzufügen, löschen, sortieren)
- [x] Senioren-Altersklassen Mannschaft
- [x] Senioren-Altersklassen Einzel
- [x] Wellen-Starterlaubnis ab
- [x] Senioren-Altersklassen vereinfachen
- [x] Nicht angetretene Teams bei der Auswertung ausschließen

Weiteres:

- [x] Update-Prüfung beim Start (jetzt mit Installation aus der Anwendung)
- [x] Info (Version, Autor, GitHub)
- [x] Warnung, wenn die Ergebnisdatei nicht aus dem aktuellen Jahr stammt
- [x] Seriendruck-Tabelle für die bisherige Word-Vorlage (Notlösung neben dem
      PDF)
- [x] Gespeicherte Standortdaten der Gliederungen für Entfernungen ohne Internet
- [x] Übernahme der Einstellungen der alten Version beim ersten Start

## Manuelle Abnahme vor dem ersten Release

1. **Meldungen:** Die erzeugte Meldungen-Datei in JAuswertung mit dem
   Wellen-Regelwerk importieren. Die Anzahl der importierten Meldungen
   entspricht der in der Anwendung angezeigten Kontrollzahl.
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
   - Kopierte Vorjahres-`.wk` (Mannschaften/Ergebnisse vorher in JAuswertung
     entfernt) aktualisieren und in JAuswertung öffnen: Bahn-Einstellungen,
     Strafenkatalog und Rec-Werte stimmen.
   - Aktionsleiste unten, Schritt-Assistent, Urkunden-Vorschau.
   - Wellen-Rekorde: Ergebnisdatei 2025 bei der Auswertung laden → Hinweis
     „Neuer Rekord in der Welle“ nur für Zeiten, die alle anderen Jahre
     unterbieten; Werkzeuge → Wellen-Zeiten zeigt Verlauf, Rekord, Durchschnitt, längste Zeit und die grobe Dauer der Welle aus den Meldungen; beim
     Regelwerk fürs neue Jahr erscheinen schnellere Rekorde mit Button
     „übernehmen“.

## Nächste Schritte

1. **Updater:** Der Public Key ist eingetragen. Im GitHub-Repo die Secrets
   `TAURI_SIGNING_PRIVATE_KEY` und `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
   anlegen. Der private Schlüssel kommt nie ins Repo.
2. **Manuelle Abnahme** unter Windows (Liste oben).
3. **Betas vor dem ersten Release:** aus `dev` mit
   `./scripts/release.sh --beta` (oder Actions → „Beta aus dev“). Ohne
   stabilen Tag beginnt die Serie bei der Version aus `package.json`, also
   `v2.0.0-beta.1`, `v2.0.0-beta.2`, … `RELEASE_NOTES.md` mit erster Zeile
   „# Wettkampftools v2.0.0“ gilt dabei auch für diese Betas.
4. **Erstes Release:** `dev` nach `main` mergen, dann
   `./scripts/release.sh 2.0.0` (Tag `v2.0.0`). Der Release-Ablauf nimmt die
   Notes aus `RELEASE_NOTES.md`; die erste Zeile muss den Tag genau nennen
   (`v2.0.0`, nicht `v2.0.0-beta.3`). Für spätere Releases die Datei löschen
   oder auf den neuen Tag ändern; ohne Datei entstehen die Notes aus den
   `Release-Note:`-Trailern der Commits.

Echte Meldungen und Ergebnisdateien für die Abnahme bleiben außerhalb des Repos.

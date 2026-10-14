# Was offen ist

Stand: 2026-10-14, Branch `heist/tauri-port`. Der Neuaufbau mit Tauri und
SvelteKit ist im Code fertig. Offen sind die manuelle Abnahme, der
Updater-Schlüssel und das erste Release. Die Python-Version bleibt bis zur
manuellen Abnahme im Repo.

## Abgleich mit der Python-Version (`app.py`)

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

## Manuelle Abnahme vor dem Entfernen der Python-Version

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

## Nächste Schritte

1. **Updater-Schlüssel:** Schlüsselpaar erzeugen (`npm run tauri signer
   generate`), den Public Key in `src-tauri/tauri.conf.json` eintragen
   (Platzhalter `REPLACE_WITH_MINISIGN_PUBKEY`) und im GitHub-Repo die Secrets
   `TAURI_SIGNING_PRIVATE_KEY` und `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
   anlegen. Der private Schlüssel kommt nie ins Repo.
2. **Python-Version entfernen** – erst nach bestandener manueller Abnahme und
   als eigener Commit:
   - `app.py`
   - `Pipfile`, `Pipfile.lock`
   - `requirements.txt`
   - `metadata.yml`
   - `.github/workflows/build.yml`
   - `images/splash.png`
3. **Erstes Release:** Tag `v2.0.0` setzen und pushen. Der Release-Ablauf
   nimmt die Notes aus `RELEASE_NOTES.md` (erste Zeile muss den Tag nennen).
   Für spätere Releases die Datei löschen oder auf den neuen Tag ändern;
   ohne Datei entstehen die Notes aus den `Release-Note:`-Trailern der
   Commits.

Echte Meldungen und Ergebnisdateien für die Abnahme bleiben außerhalb des Repos.

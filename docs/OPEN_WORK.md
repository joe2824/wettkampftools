# Was offen ist

Stand: 2026-10-14, Branch `heist/tauri-port`.

## Neuaufbau

Der Neuaufbau mit Tauri und SvelteKit ist in Arbeit. Die Python-Version bleibt
bis zur manuellen Abnahme im Repo.

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

## Updater

- Updater-Schlüssel erzeugen (`npm run tauri signer generate`) und den Public
  Key in `src-tauri/tauri.conf.json` eintragen (Platzhalter
  `REPLACE_WITH_MINISIGN_PUBKEY`).
- Im GitHub-Repo die Secrets `TAURI_SIGNING_PRIVATE_KEY` und
  `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` anlegen.

Echte Meldungen und Ergebnisdateien für die Abnahme bleiben außerhalb des Repos.

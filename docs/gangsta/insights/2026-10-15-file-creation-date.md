---
heist: tauri-port
phase: the-hit
date: 2026-10-15
tags: [jauswertung, excel, year-check, tauri, files]
---
# Jahr einer Ergebnisdatei nur über das Dateisystem bestimmen

JAuswertung schreibt in seine `.xls`-Exporte kein Erstellungsdatum (OLE SummaryInformation leer), und das interne Änderungsdatum wird beim erneuten Speichern überschrieben (Ergebnisdatei 2022 trug intern März 2025). Verlässlich ist nur das Dateisystem: das frühere Jahr aus Erstellungs- und Änderungsdatum (Windows setzt beim Kopieren das Erstellungsdatum neu, das Änderungsdatum bleibt) – wie im Original `app.py`.

Dafür braucht die App den Dateipfad: HTML5-Drop liefert nur Bytes. Lösung: Tauri `dragDropEnabled: true` + Rust liest Pfad, Bytes und Zeiten (`read_input_file`, `input_file_info`); abgelegte Pfade werden in Rust gezielt in den fs-Scope aufgenommen.

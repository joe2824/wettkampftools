# Project Constitution

## Commandments
- Das Jahr einer Ergebnisdatei kommt aus dem Dateisystem (früheres Jahr aus Erstellung/Änderung), nicht aus Dokumenteigenschaften. — Source: insights/2026-10-15-file-creation-date.md
- Alle Optionen des Originals bleiben erhalten; neue Quellen ergänzen nur. — Source: Don (tauri-port)

## Negative Constraints
- NEVER einen Commit an den Exit-Code einer gefilterten Prüf-Pipe hängen. — Source: fails/2026-10-15-commit-chain-grep.md
- NEVER parallele Worker den Git-Index verändern lassen; nur der Crew Lead staged und committet. — Source: fails/2026-10-15-parallel-workers-git-index.md

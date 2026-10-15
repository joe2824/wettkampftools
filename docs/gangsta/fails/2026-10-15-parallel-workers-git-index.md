---
heist: tauri-port
phase: the-hit
date: 2026-10-15
tags: [git, parallel-workers, orchestration]
---
# Vorgemerkte Änderungen paralleler Worker rutschen in fremde Commits

Worker haben mit `git mv` Umbenennungen im gemeinsamen Index vorgemerkt; der nächste Commit des Crew Leads mit expliziten Pfaden hat sie trotzdem mitgenommen (der Index wird als Ganzes committet).

NEVER: Parallele Worker im selben Arbeitsverzeichnis den Git-Index verändern lassen (`git add`, `git mv`, `git rm`). Worker ändern nur Dateien; der Crew Lead staged und committet mit expliziten Pfaden und prüft vorher `git diff --cached --stat`.

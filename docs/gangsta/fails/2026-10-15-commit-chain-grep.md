---
heist: tauri-port
phase: the-hit
date: 2026-10-15
tags: [git, verification, shell]
---
# Commit trotz roter Tests

Eine Befehlskette `npm test 2>&1 | grep "Tests " && git commit …` hat committet, obwohl Tests fehlschlugen: Der Exit-Code kam von `grep`, nicht von `npm test`.

NEVER: Prüfbefehle vor einem Commit über eine Pipe filtern und den Commit an deren Exit-Code hängen. Erst den Prüfbefehl allein laufen lassen (oder `set -o pipefail`), dann committen.

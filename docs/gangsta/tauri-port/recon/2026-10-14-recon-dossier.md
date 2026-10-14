---
heist: tauri-port
date: 2026-10-14
status: approved
---

# Reconnaissance Dossier: Wettkampftools → Tauri 2 + SvelteKit

## Objective

Wettkampftools (PyQt6, `app.py`) auf Tauri 2 + SvelteKit + shadcn-svelte neu aufbauen, mit Struktur, Stack und Regeln aus `github.com/joe2824/timetracker`. Dabei:

1. Mannschaften-Import (DLRG-Meldeexport CSV → Excel → JAuswertung) gegen den echten JAuswertung-Importer prüfen und korrekt machen.
2. Urkundendruck auf vorbedruckte Urkunden optimieren — ohne Word-Abhängigkeit (keine Lizenz mehr).

## Codebase Overview

Ein einziges Modul `app.py` (820 Zeilen), PyQt6 + pandas, Build per PyInstaller nur für Windows (`.github/workflows/build.yml`). Fünf Seiten:

| Seite | Funktion | Code |
|---|---|---|
| WWK Vorbereitung | CSV-Meldeexport einlesen, Mannschaftsnamen normieren (`Gliederung` bzw. `Gliederung N`), Teams ab Start-AK als zusätzliche `AkW`-Meldung duplizieren, Export `.xlsx` Blatt „Meldungen" | `app.py:149-249` |
| WWK Auswertung | JAuswertung-Excel lesen (Blätter `Seriendruck` + `Daten`), Punkte je AK/Geschlecht = `n+1-Platz` (+1 Bonus für Platz 1), Summe je Gliederung getrennt Rettung (AK) / Welle (AkW) | `app.py:336-404` |
| Urkunden sortieren | gleicher Code mit `evaluate=False`: Seriendruck sortiert + Spalte `WWK`=`x` | `app.py:354-367` |
| Entfernungen | Gliederungen über `services.dlrg.net` POI-API geocodieren, Distanz nach Bad Nauheim | `app.py:726-780` |
| Einstellungen | AK-Listen, Senioren-AKs, Start-AK Welle, Senioren vereinfachen, nicht angetretene ausschließen (QSettings) | `app.py:536-703` |

Update-Check gegen GitHub Releases (`app.py:705-720`).

### Gefundene Fehler im Bestand

- **Encoding:** `pd.read_csv(..., encoding='utf-8')` (`app.py:164`) — Exporte 2022–2024 sind ISO-8859, 2025/2026 UTF-8 (geprüft mit `file`). Alte Dateien brechen ab.
- **AK-Vergleich als String:** `ak >= self.start_age_group_wwk` (`app.py:563`). „AK 100"/„AK 120" < „AK 13/14" lexikografisch → Senioren-AKs 100/120 fallen ohne „Senioren vereinfachen" aus der Welle.
- **Unbekannte AK geht verloren:** `pd.Categorical(..., self.all_age_groups)` (`app.py:242`, `:365`) setzt nicht gelistete AKs auf NaN → leere AK im Export.
- **Gruppierung vor Normierung:** Teamnummern werden vor `AK offen → AK Offen` gezählt (`app.py:172` vs `:179`).
- **Doppelt belegtes Widget:** `self.jauswertung_file_entry` wird auf Seite 2 und 3 angelegt (`app.py:428`, `:452`) — Seite „Auswertung" zeigt den Pfad nie.
- **NaN-Platz:** Ohne „nicht angetretene ausschließen" erzeugt `Platz`=NaN NaN-Punkte (`app.py:378`).
- `calculate_distances` referenziert `gld_data` im `except` vor Zuweisung (`app.py:771-777`).

## Mannschaften-Import vs. JAuswertung (Associate-Befund, Commit `4df76c94`)

Importer: `jauswertung-io/.../ImportUtils.java`, Apache POI 5.5.1, `.xls/.xlsx/.xlsm` + CSV (UTF-8).

| Unser Export | JAuswertung | Status |
|---|---|---|
| Header in Zeile 1, klein geschrieben (`gliederung`, `name`, `ak`, `geschlecht`, `meldepunkte`) | Header-Match `strip().toLowerCase().equals` (IU:2031) | ✅ |
| `ak` statt `Altersklasse`, ein Blatt „Meldungen" | `ak` wird erkannt, wenn keine `Altersklasse`-Spalte davor (IU:2181-2203). Sonst Blattname | ✅ |
| `geschlecht` = `weiblich`/`männlich` als Text | akzeptiert (IU:1101-1121); `x`/`gemischt` und numerisch 0/1 brechen ab | ✅ |
| `Nachname N`/`Vorname N`/`Jahrgang N`, N=1..5 | exakt diese Header (IU:2349-2588), max. 5 Mitglieder in DLRG-AKs | ✅ |
| `qualifikation` = `offen` | Header wird als QUALI erkannt (IU:2161-2180) — **Werte-Parsing für „offen" nicht verifiziert** | ⚠️ |
| AK-Namen `AkW 13/14`, `AK Senioren` | Exakter Match gegen das Regelwerk der Wettkampfdatei; nicht im Standard „DLRG 2026" → **eigenes Regelwerk nötig** | ⚠️ zu klären |
| Leere Zeile / RuntimeException | Zeile wird **stillschweigend verworfen** (IU:554-557) | ⚠️ Risiko: Teams fehlen unbemerkt |

Fazit: Format ist grundsätzlich korrekt. Offene Punkte: Regelwerk mit `AkW`-/`Senioren`-AKs, Wert in `qualifikation`, und eine Plausibilitätsprüfung (Anzahl Teams rein = Anzahl Teams im Export) fehlt.

## Urkunden

**Vorlage** `Urkunden-Eindruck.docx`: A4, oberer Rand 10 cm (vorgedruckter Kopf), Text zentriert in Nunito/Nunito Black, Seriendruckfelder `Name`, `WWK` (IF → „Wellenwertung"/„Rettungswertung"), `Altersklasse`, `Geschlecht`, `Punkte`, `Platz`; zwei Unterschrift-PNGs. **Hart eingetragen:** „38. Wellenwettkampf", „15. November 2025", Ort, Unterzeichner. Datenquelle zeigt auf einen absoluten OneDrive-Pfad 2024.

**Druckanleitung.txt:** erst als PDF, dann mit „Sortieren" drucken, „5 Urkunden hintereinander" — also Kopien pro Team per Druckertrick.

**JAuswertung-Seite:** Excel-Ergebnisexport hat Blatt `Seriendruck` (nur platzierte Teams, alles als Text) mit `Platz | Name | Mitglied 1..n | Gliederung | Qualifikationsgliederung | Altersklasse | Geschlecht | … | Punkte | …` (`DataTableUtils.java:161-197`, `469-578`). Mitglied-Zellen = „Vorname Nachname". JAuswertung hat zusätzlich einen eigenen Urkunden-Editor mit Platzhaltern inkl. `<mitglieder>` (`UrkundenPrintable.java:37-40`).

**Optimierungspotenzial:** PDF direkt aus der App (eingebettete Schrift + Unterschriften), Kopfdaten (Nr., Datum, Ort, Unterzeichner) als Einstellungen, Anzahl Urkunden je Team = Anzahl Mitglieder (oder fest), optional Mitgliedernamen statt nur Teamname, Druckreihenfolge passend zum Stapel, Offset-Kalibrierung für den Drucker.

## Vorlage timetracker (Associate-Befund, HEAD `da7918c`)

- Stack: Svelte 5.57 (Runes only), SvelteKit 2.70 + adapter-static (`ssr=false`), Vite 6, Tailwind 4 (`@tailwindcss/vite`), shadcn-svelte (`baseColor: neutral`, bits-ui 2.19, `@lucide/svelte`), mode-watcher, svelte-sonner, vitest 4 (+happy-dom), npm + Node 22, TypeScript strict.
- Tauri 2.12, Plugins: opener, fs, dialog, http, single-instance, updater, process. CSP strikt, Capabilities minimal.
- Rust-Commands in `lib.rs` + Feature-Modulen, `Result<T, String>` mit deutschen Fehlermeldungen; Panic-/Datei-Logging.
- State: `*.svelte.ts` Klassen-Singletons; Persistenz JSON via plugin-fs in AppData.
- Regeln (`AGENTS.md`, `CLAUDE.md` = `@AGENTS.md`): Bezeichner Englisch, UI/Kommentare/Commits Deutsch; Tests neben dem Modul; `components/ui` nicht von Hand ändern; „Fertig heißt fertig" (check + test + cargo test); keine echten Personendaten in Fixtures; Conventional Commits auf Deutsch mit `Release-Note:`-Trailer; **keine KI-Attribution**; Vokabular-Tabelle; Kommentarstil.
- CI: `ci.yml` → `verify.yml` (check/test/build, Rust auf windows-latest mit clippy `-D warnings`), `release.yml` mit tauri-action, Updater-Signatur, `latest.json`, Release-Notes aus Trailern.
- `.skillshare/config.yaml` mit Skills shadcn-svelte, svelte5, tailwind-v4, tauri-v2 + gangsta.

Nicht relevant für dieses Projekt: `server/`-Workspace, Docker, Team/Sync, PWA-Build, Tray, Outlook, DPAPI.

## Entscheidungen des Don (Scope-Anpassung 2026-10-14)

- **Regelwerk** liegt im Projekt: `Regelwerk_2025.rwm` („Wellen-Wk 2025 (mit Rec-Werten für 2024)").
- **Urkunden:** bis zu 5 Schwimmer je Mannschaft → **eine Urkunde je Mitglied** (4–5). Mitgliedername auf der Urkunde **optional** (zuschaltbar).
- **Papier:** vorbedrucktes A4. Positionen aus der Word-Vorlage übernehmen; **gewünscht: Editor, in dem man Objekte frei positioniert.**
- **Teamnamen-Normierung bleibt Pflicht:** freie Namen („Spaßnamen") werden immer durch `Gliederung` bzw. `Gliederung N` ersetzt.
- **Alle Optionen des Originals bleiben erhalten:** Altersklassen-Liste (eintragen/löschen/sortieren), Senioren-AKs Mannschaft und Einzel als eigene Listen, „Senioren Altersklassen vereinfachen" (→ `AK Senioren`) als Schalter, „Wellen-Starterlaubnis ab", „Nicht angetretene Teams ausschließen", Zurücksetzen auf Standard. Das Regelwerk ersetzt diese Einstellungen **nicht**, es dient nur zur Prüfung/Warnung.

- **Repo-Hygiene:** `.docx`, `.rwm`, `.txt`, `.csv` (plus `.xls/.xlsx`) kommen nicht ins Repo (`.gitignore` angepasst). Fixtures nur mit Platzhalterdaten.

### Funktionsfragen (Runde 2)

- **Plattform:** nur Windows (Installer + Auto-Update wie timetracker).
- **Urkunden-Auswahl in der App:** alle platzierten Teams laden, dann per Filter/Häkchen auswählen (z. B. zwischendurch nur AK 10 + AK 12; Filter nach AK, Geschlecht, Wertung).
- **Reihenfolge im PDF:** Blöcke je AK + Geschlecht in AK-Reihenfolge; **innerhalb jedes Blocks vom letzten zum 1. Platz**, damit beim Vorlesen der Sieger zuletzt kommt. Je Team die Urkunden direkt hintereinander.
- **Anzahl je Team:** immer 5 Urkunden; bei eingeschalteten Mitgliedernamen tragen die ersten n einen Namen, überschüssige bleiben ohne Namen.
- **AK-Text:** bei Wellenwertung `AkW 13/14` → „AK 13/14" (die Wertung steht schon im Satz).
- **Druckweg:** PDF erzeugen und öffnen; Druck aus dem PDF-Viewer in „Tatsächlicher Größe". Kein Sortieren-Trick mehr.
- **Editor-Extras:** Kalibrierungsseite (Druckerversatz in mm, global korrigierbar), Vorlage exportieren/importieren, Hintergrund-Scan im Editor (wird nicht gedruckt), Einstellungen exportieren/importieren (TODO aus `app.py:695`).
- **Gesamtauswertung:** Excel wie bisher **und** Ansicht in der App **und** PDF zum Aushang.
- Kopfdaten (Nr. des Wettkampfs, Datum, Ort, Unterzeichner + Unterschrift-Bilder) als Einstellungen; Bilder liegen in AppData, nicht im Repo.

## Wertungsregeln WWK (vom Don vorgegeben, ab 2026) — bindend für die Auswertung

> **Pokalwertung:** Ab 2026 keine Pokale mehr für Treppchenplätze der einzelnen AKs. Alle teilnehmenden Mannschaften erhalten für Rettungs- und Wellenwettkampf Urkunden mit Platzierung. Die Gesamtpokale für Rettungs- und Wellenwettkampf erhält jeweils die Ortsgruppe mit der höchsten Gesamtpunktzahl aus allen AKs in der jeweiligen Wertung.
>
> **Punktesystem:** Gewertet wird nach AK sowie männlich/weiblich getrennt. Punkte 1. Platz = Anzahl Mannschaften + 1; 2. Platz = (n+1) − 2, 3. Platz = (n+1) − 3 usw. Beispiel n=5: 6, 4, 3, 2, 1.

Formel: `Punkte(Platz) = n + 1 − Platz`, für Platz 1 `n + 1`. Das alte Programm rechnet genau so (`app.py:378-379`) ✅ — n=5 ergibt 6/4/3/2/1.

**Präzisierungen (Don, 2026-10-14):**
- **n** = angetretene/platzierte Teams der Gruppe AK+Geschlecht (Schalter „Nicht angetretene ausschließen", Standard an).
- **Disqualifizierte** (ohne Platz) zählen wie nicht angetreten: nicht in n, 0 Punkte.
- **Gleicher Platz in einer AK:** beide erhalten die Punkte dieses Platzes; das nächste Team behält seinen JAuswertung-Platz (2, 2, 4 → n−1, n−1, n−3).
- **Gesamtwertung je Ortsgruppe:** Summe über alle AKs, getrennt Rettung (`AK …`) und Welle (`AkW …`). Bei Punktgleichstand teilen sich die Ortsgruppen den Platz, die nächste bekommt den folgenden Platz (1, 1, 2 — „dichte" Rangfolge). Ein Gleichstand um Platz 1 wird **deutlich markiert**; über den Pokal entscheidet die Wettkampfleitung, nicht die App.
- Abweichung im Bestand: `ergebnis.index += 1` (`app.py:385`) vergibt bei Gleichstand fortlaufende Plätze → wird korrigiert.

**Transparenz (Anforderung):** Die Auswertung muss nachvollziehbar sein — in der App und im Aushang-PDF für jede Ortsgruppe die Aufschlüsselung: je Team AK, Geschlecht, Platz, n der Gruppe, Rechnung `n+1−Platz (+1)` = Punkte, Summe. Ausgeschlossene Teams (nicht angetreten/DQ) sichtbar mit Grund. Regeltext im PDF abgedruckt. Unit-Tests decken das Regelbeispiel (n=5) und alle Sonderfälle ab.

## Regelwerk_2025.rwm (ZIP → `data.xml`)

- Mannschaftswettkampf (`<einzel>false`), je AK `minMembers 4` / `maxMembers 5`.
- AKs: `AK 10`, `AK 12`, `AK 13/14`, `AK 15/16`, `AK 17/18`, `AK offen`, `AK Senioren`, `AkW 13/14`, `AkW 15/16`, `AkW 17/18`, `AkW offen`, `AkW Senioren`.
- Wertungsgruppen: `Rettungswertung`, `Wellenwertung`. Geschlecht-Übersetzungen: männlich/weiblich, m/w.
- **Folge:** Einzelne Senioren-AKs (`AK 100`…`AK 280+`) existieren in diesem Regelwerk nicht → bei ausgeschaltetem „Senioren vereinfachen" bricht der Import mit „AgeGroupNotFound" ab. `AK offen` (klein) matcht `AK Offen` (case-insensitiv, `Regelwerk.java:237-275`).
- Die App kann optional eine `.rwm` laden und den Export **dagegen prüfen** (Warnung bei AKs, die JAuswertung nicht kennt). Die AK-Listen bleiben Einstellungen wie im Original.

## Layout der Word-Vorlage (Basis für Default-Positionen)

A4 hoch, Ränder links/rechts 2,5 cm, oben 10 cm (vorgedruckter Kopf), Zeilenabstand 1,2 (`w:line=288`), alles zentriert:

| Element | Schrift | Größe |
|---|---|---|
| Teamname | Nunito Black | 22 pt |
| „erreichte beim / N. Wellenwettkampf / der DLRG-Ortsgruppe Dorheim / am Datum / im Usa-Wellenbad Bad Nauheim" | Nunito, Nr.+Titel Black | 18 pt |
| „in der Rettungs-/Wellenwertung / AK Geschlecht / mit P Punkten / den" | Nunito, Werte Black | 18 pt |
| „P. Platz" | Nunito Black | 20 pt |
| 2 Unterschriften (PNG) + Name/Funktion | Nunito Light | 10 pt |

Nunito steht unter SIL OFL → darf mit der App ausgeliefert werden.

## Existing Test Coverage

Keine Tests vorhanden. Kein Test-Framework.

## Dependencies

`requirements.txt`: pandas 2.3.3, PyQt6 6.10, xlrd, XlsxWriter, xlwt, pywin32 (nur Versionsnummer), requests, geopy, numpy. Wegfall komplett durch den Port. Neu benötigt: Excel lesen/schreiben (Frontend `exceljs`/SheetJS oder Rust `calamine` + `rust_xlsxwriter`), PDF-Erzeugung (z. B. `pdf-lib` im Frontend oder Typst/`printpdf` in Rust).

## Relevant Ledger Entries

Keine — `docs/gangsta/` existierte vor dieser Heist nicht, keine Constitution.

## Risks and Unknowns

1. ~~Regelwerk~~ → geklärt, siehe oben.
2. ~~Urkunden-Umfang~~ → geklärt: immer 5 je Team, Namen optional aus `Mitglied 1..n` im `Seriendruck`-Blatt.
3. **Druckgenauigkeit:** Vorbedrucktes Papier → mm-genaue Positionierung; Druckerränder/Skalierung „Tatsächliche Größe" nötig.
4. ~~Teamnamen-Normierung~~ → gewollt, bleibt.
5. **Personendaten:** CSV enthält Namen + Jahrgänge von Kindern → nur lokal verarbeiten, keine echten Daten in Fixtures (Regel aus timetracker).
6. **`Druckanleitung.txt`** enthält einen Autoschlüssel (Zugangsdaten) — darf nicht ins Repo.
7. ~~Plattform~~ → nur Windows; Entwicklung auf macOS, Rust-CI auf windows-latest.
8. Entfernungs-Tool hängt an `services.dlrg.net` — API-Verfügbarkeit/CORS → über Rust/plugin-http.

## Recommended Scope

**In:**
- Neues Projekt im selben Repo (Python-Code danach entfernen) mit timetracker-Struktur, `AGENTS.md`/`CLAUDE.md`, CI/Release mit Updater.
- Alle 5 Funktionen 1:1 portiert, mit den oben genannten Fehlern behoben.
- Vorbereitung: Encoding-Erkennung, Vorschau-Tabelle, Validierung gegen JAuswertung-Regeln (Geschlecht, AK-Namen, Mitgliederzahl), Zählerprüfung.
- Alle Einstellungen des Originals 1:1 (AK-Listen, Senioren Mannschaft/Einzel, Vereinfachen-Schalter, Start-AK Welle, nicht angetretene ausschließen, Zurücksetzen).
- Regelwerk (`.rwm`) optional laden zur Prüfung des Exports.
- Urkunden: PDF-Erzeugung in der App ohne Word, 5 je Team (Mitgliedernamen optional), Auswahl per Filter, Reihenfolge letzter → 1. Platz je AK+Geschlecht, Kopfdaten als Einstellungen, **Layout-Editor mit frei positionierbaren Objekten** (Default = Word-Vorlage), Hintergrund-Scan, Kalibrierungsseite, Vorlage + Einstellungen exportieren/importieren, Nunito + Unterschriften eingebettet.
- Gesamtauswertung: Excel + Ansicht in der App + PDF-Aushang.
- Tests (vitest) für Parsing/Normierung/Punkteberechnung mit Platzhalterdaten.

**Out (vorerst):** Web-/PWA-Build, Server, Tray, Direkt-Download aus dem DLRG-Meldeportal, JAuswertung-eigener Urkunden-Editor.

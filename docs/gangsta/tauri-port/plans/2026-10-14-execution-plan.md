---
heist: tauri-port
date: 2026-10-14
total-work-packages: 30
territories: 6
estimated-total-budget: 2.6M tokens
---

# Execution Plan: Wettkampftools 2 — Tauri-Port

Contract: `docs/gangsta/tauri-port/specs/2026-10-14-contract.md` (signed).
Reference template (read-only): timetracker clone in the session scratchpad (`.../scratchpad/timetracker`).
JAuswertung sources (read-only): `.../scratchpad/jauswertung`. Word template unpacked: `.../scratchpad/docx`. Rulebook unpacked: `.../scratchpad/rwm`.

**Prevention Guidance (all Work Packages):** Do NOT reproduce Gangsta-internal spec identifiers (FR-xxx, NFR-xxx, WP-xxx, where xxx is one or more digits) in any deliverable — source code, test files, code comments, or documentation. These identifiers belong only in `docs/gangsta/`.

**Global rules for every Worker:** English identifiers, German UI texts/comments; Svelte 5 runes only (no `export let`, no `svelte/store`); never hand-edit `src/lib/components/ui/`; tests next to the module (`foo.ts` → `foo.test.ts`); `src/lib/testing/` only fakes/fixtures; placeholder data only ("Anna Meier", "Musterstadt") — never names from the real CSV; never add `.csv/.xls/.xlsx/.docx/.rwm/.txt` data files; keep competition points and trophy points strictly separate; no commits by Workers (the Capo commits per package with German Conventional Commit, no AI attribution).

## Territories

### Territory: Foundation
**Crew Lead Domain:** Project scaffold, tooling, conventions, CI, release, cleanup
**Files:** `package.json`, `package-lock.json`, `*.config.*`, `tsconfig.json`, `components.json`, `src/app.*`, `src/routes/+layout.*`, `src/lib/components/ui/**`, `src/lib/platform/**`, `src/lib/log.ts`, `static/**`, `src-tauri/{Cargo.toml,build.rs,tauri.conf.json,capabilities/**,icons/**,src/main.rs}`, `.github/workflows/**`, `AGENTS.md`, `CLAUDE.md`, `.skillshare/**`, `docs/OPEN_WORK.md`, `README.md`, `.gitignore`
**Workers:** 1 (sequential — everything else depends on it)
**Budget:** 500k

### Territory: Rust Core
**Crew Lead Domain:** Excel adapter, output file handling, legacy settings migration, logging
**Files:** `src-tauri/src/{lib.rs,workbook.rs,output.rs,legacy_settings.rs,logging.rs}`, `src/lib/platform/{workbook,output,legacySettings}.ts`
**Workers:** 2 parallel
**Budget:** 400k

### Territory: Domain
**Crew Lead Domain:** Pure TS domain: CSV, age groups, registrations, validation, results, scoring, exports, settings, rulebook, distance
**Files:** `src/lib/{io,wwk,settings,distance,format}/**`, `src/lib/testing/**`
**Workers:** 3 parallel
**Budget:** 650k

### Territory: Certificates
**Crew Lead Domain:** Certificate model, layout model, rendering, PDF, fonts, calibration, notice PDF
**Files:** `src/lib/certificates/**`, `src/lib/pdf/**`, `src/lib/wwk/noticePdf.ts`
**Workers:** 2 parallel
**Budget:** 450k

### Territory: UI
**Crew Lead Domain:** Routes, own components, stores, session
**Files:** `src/routes/**` (except root layout scaffold), `src/lib/components/*` (not `ui/`), `src/lib/session.svelte.ts`, `src/lib/**/*Store.svelte.ts`, `src/lib/release/**`
**Workers:** 2 parallel
**Budget:** 500k

### Territory: Release & Acceptance
**Crew Lead Domain:** Release workflow, parity check, Python removal (after Don's acceptance)
**Files:** `.github/workflows/release.yml`, `README.md`, deletions of Python artefacts
**Workers:** 1
**Budget:** 100k

## Work Packages

### WP-001: Scaffold SvelteKit + Tauri project
**Territory:** Foundation
**Contract Clause:** AD-1, AD-5, NFR-001, NFR-009
**Files:**
- Create: `package.json` (scripts: dev, build, check, test, test:watch, tauri), `svelte.config.js` (adapter-static, fallback index.html, CSP hash mode), `vite.config.js` (tailwind + sveltekit, port 1420 strict, `__APP_VERSION__`), `vitest.config.ts` (node env, `src/**/*.test.ts`, TZ Europe/Berlin), `tsconfig.json` (strict), `components.json` (neutral), `src/app.html` (lang de), `src/app.css` (Tailwind 4 + shadcn neutral tokens light/dark, Nunito @font-face), `src/routes/+layout.ts` (ssr=false, prerender), `src/routes/+layout.svelte` (ModeWatcher, Toaster), `src/routes/+page.svelte` (placeholder)
- Create: `src-tauri/Cargo.toml` (lib `wettkampftools_lib`, tauri 2, plugins fs/dialog/http/opener/updater/process/single-instance, serde, serde_json, calamine, rust_xlsxwriter, chrono; windows-only winreg), `src-tauri/build.rs`, `src-tauri/src/main.rs`, `src-tauri/src/lib.rs` (minimal run + plugins), `src-tauri/tauri.conf.json` (productName Wettkampftools, identifier de.joe2824.wettkampftools, version 2.0.0, window 1200×800 min 960×640, dragDropEnabled false, strict CSP as timetracker + img-src data: blob:, NSIS currentUser, updater endpoint + placeholder pubkey), `src-tauri/capabilities/default.json` (permissions per Contract NFR-003), `src-tauri/icons/*` (generated from `images/icon.ico`/`logo.png` via `tauri icon`)
- Create: `static/fonts/Nunito-{Light,Regular,Bold,Black}.ttf` + `static/fonts/OFL.txt` (download from official google/fonts repo, static instances)
- Modify: `.gitignore` (add node_modules, build, .svelte-kit, src-tauri/target, src-tauri/gen; remove bare `test`; add `!static/fonts/OFL.txt`; keep data-file ignores)
- Pin exact versions (latest stable at scaffold time; timetracker versions as floor).
**Acceptance Criteria:**
1. `npm ci` works from lockfile; `npm run check` and `npm run build` pass; `cargo check` in src-tauri passes.
2. `npm run tauri dev` opens an empty window (manual smoke on macOS acceptable).
**Verification:** `npm run check && npm run build && (cd src-tauri && cargo check)`
**Budget:** 120k
**Dependencies:** None

### WP-002: shadcn-svelte components + app shell
**Territory:** Foundation
**Contract Clause:** FR-001, NFR-006
**Files:**
- Create via CLI: `src/lib/components/ui/` — button, card, table, tabs, checkbox, switch, select, input, label, dialog, alert-dialog, alert, badge, separator, sidebar, toggle-group, scroll-area, tooltip, sonner, collapsible, slider, progress, textarea
- Create: `src/lib/utils.ts` (cn), `src/routes/+layout.svelte` (sidebar navigation: Wellenwettkampf → Vorbereitung, Auswertung, Urkunden; Werkzeuge → Entfernungen, Urkunden-Layout; footer Einstellungen, Info), empty route pages for `preparation`, `evaluation`, `certificates`, `certificates/layout`, `distances`, `settings`
**Acceptance Criteria:**
1. All routes reachable via sidebar; German labels; light/dark follow system.
**Verification:** `npm run check && npm run build`
**Budget:** 60k
**Dependencies:** WP-001

### WP-003: Conventions, docs, CI
**Territory:** Foundation
**Contract Clause:** NFR-009, Applicable Constitution Rules, AC-1
**Files:**
- Create: `AGENTS.md` (adapted from timetracker: Befehle, Fertig heißt fertig = check + test + clippy + cargo test, Ordnerstruktur, Svelte 5, Namenskonvention, Testdaten, Commits ohne KI-Attribution + Release-Note-Trailer, Vokabular incl. **Wettkampfpunkte vs. Pokalpunkte**, Kommentare, Anwendertexte, Datenschutz: keine Personendaten in Logs/Fixtures/Repo), `CLAUDE.md` (`@AGENTS.md`), `.skillshare/config.yaml` (gangsta + shadcn-svelte, svelte5, tailwind-v4, tauri-v2 skills as in timetracker), `docs/OPEN_WORK.md` (manual acceptance list)
- Create: `.github/workflows/ci.yml`, `.github/workflows/verify.yml` (ubuntu: npm ci, check, test, build; windows-latest: rust toolchain + clippy -D warnings + cargo test, rust-cache)
**Acceptance Criteria:**
1. Workflows are valid YAML and mirror timetracker structure without server/docker/pwa/tz jobs.
**Verification:** `npx --yes yaml-lint .github/workflows/*.yml || python3 -c "import yaml,glob;[yaml.safe_load(open(f)) for f in glob.glob('.github/workflows/*.yml')]"`
**Budget:** 50k
**Dependencies:** WP-001

### WP-004: Platform adapters + logging
**Territory:** Foundation
**Contract Clause:** AD-6, AD-7, NFR-002, NFR-003
**Files:**
- Create: `src/lib/platform/env.ts` (isTauri), `src/lib/platform/fs.ts` (AppData JSON/binary read/write via plugin-fs; in-memory fake for tests in `src/lib/testing/fakeFs.ts`), `src/lib/platform/files.ts` (saveFile: dialog.save + writeFile), `src/lib/platform/http.ts` (plugin-http fetch), `src/lib/log.ts` (file log in AppData/logs, 14 days, API accepts only message codes + numbers)
- Create: `src-tauri/src/logging.rs` (panic hook + log line, timetracker pattern)
**Acceptance Criteria:**
1. Unit tests for fs fake round-trip and log message sanitisation (no free-text row content).
**Verification:** `npm test -- src/lib/platform src/lib/log && npm run check`
**Budget:** 60k
**Dependencies:** WP-001

### WP-005: Rust workbook adapter (calamine + rust_xlsxwriter)
**Territory:** Rust Core
**Contract Clause:** AD-2, FR-016, FR-017, FR-020, FR-027, FR-037
**Files:**
- Create: `src-tauri/src/workbook.rs` — commands `read_workbook(bytes) -> Workbook {sheets:[{name, rows:[[Cell]]}], props:{created?, modified?}}` (Cell = string | number | bool | null; xls + xlsx) and `write_workbook(sheets) -> bytes` (text cells as strings, numbers as numbers, empty = no cell, header row 1, shared strings as Excel does)
- Create: `src/lib/platform/workbook.ts` (typed invoke wrappers + in-memory fake for TS tests)
- Register commands in `lib.rs`
**Acceptance Criteria:**
1. `cargo test`: write → read round-trip keeps sheet names, cell types, empty cells; reads a generated .xls fixture (created in-test or minimal checked-in synthetic file without personal data); rejects non-workbook bytes with German error.
**Verification:** `cd src-tauri && cargo test workbook && cargo clippy --all-targets -- -D warnings`
**Budget:** 120k
**Dependencies:** WP-001

### WP-006: Rust output file commands
**Territory:** Rust Core
**Contract Clause:** FR-004, NFR-003, AD-6
**Files:**
- Create: `src-tauri/src/output.rs` — `open_output_file(path)`, `reveal_output_file(path)`: canonicalize, extension allowlist xlsx/pdf/json, fs-scope check, then opener
- Create: `src/lib/platform/output.ts`
**Acceptance Criteria:**
1. `cargo test` covers allowed/denied extensions and path normalisation logic (pure function).
**Verification:** `cd src-tauri && cargo test output && cargo clippy --all-targets -- -D warnings`
**Budget:** 50k
**Dependencies:** WP-001

### WP-007: Legacy settings migration (registry)
**Territory:** Rust Core
**Contract Clause:** FR-065, AD-8
**Files:**
- Create: `src-tauri/src/legacy_settings.rs` — pure decoder (REG_MULTI_SZ, REG_SZ bool/string, `@Variant(...)` QDataStream QStringList/QVariantList/bool, `@@` unescape, malformed → None + warning) + `read_legacy_settings` command (`#[cfg(windows)]` read-only `HKCU\Software\Joe2824\WettkampfTools`, otherwise `Ok(None)`)
- Create: `src/lib/platform/legacySettings.ts`
**Acceptance Criteria:**
1. Decoder unit tests on all OSes with byte fixtures; Windows-only integration test writes to a throwaway test key, reads, deletes it.
**Verification:** `cd src-tauri && cargo test legacy && cargo clippy --all-targets -- -D warnings`
**Budget:** 110k
**Dependencies:** WP-001

### WP-008: CSV decoding + parsing
**Territory:** Domain
**Contract Clause:** FR-010
**Files:**
- Create: `src/lib/io/csv.ts`, `src/lib/io/csv.test.ts`, `src/lib/testing/latin1.ts`, `src/lib/testing/fixtures.ts` (registration CSV builder with placeholder data)
**Acceptance Criteria:**
1. UTF-8, UTF-8 with BOM, windows-1252 umlauts decode correctly and report encoding; trailing `;` column dropped; quoted fields; missing required columns → typed error.
**Verification:** `npm test -- src/lib/io/csv`
**Budget:** 50k
**Dependencies:** WP-001

### WP-009: Settings model
**Territory:** Domain
**Contract Clause:** FR-060, FR-061, FR-062, FR-063, FR-064, FR-065, AD-7
**Files:**
- Create: `src/lib/settings/settings.ts` (+ test) — Settings v1 type, defaults equal to app.py defaults, `parseSettings` whitelist + defaults merge, `mergeLegacySettings`, `serializeSettingsForExport` (no images)
**Acceptance Criteria:**
1. Garbage/partial/old input → valid settings; unknown keys dropped; export contains no image data; legacy merge per field with fallbacks reported.
**Verification:** `npm test -- src/lib/settings`
**Budget:** 50k
**Dependencies:** WP-001

### WP-010: Age groups
**Territory:** Domain
**Contract Clause:** FR-011, FR-012, FR-014, FR-022, FR-035
**Files:**
- Create: `src/lib/wwk/ageGroups.ts` (+ test) — normalize (case-insensitive against configured order, configured spelling), build order, wave-eligible (index-based; seniors per simplify setting), toWave, classify rescue/wave/unknown, display AkW → AK
**Acceptance Criteria:**
1. "AK offen"/"AkW offen" → configured spelling; AK 100/120 eligible without simplification; unknown stays unknown; display form correct.
**Verification:** `npm test -- src/lib/wwk/ageGroups`
**Budget:** 40k
**Dependencies:** WP-009

### WP-011: Registrations: parse, normalize, name teams
**Territory:** Domain
**Contract Clause:** FR-011, FR-012, FR-013
**Files:**
- Create: `src/lib/wwk/registrations.ts` (+ test)
**Acceptance Criteria:**
1. Gliederung trimmed; numbering after normalization + senior simplification ("Verein 1/2"); single team without number; renames list; members parsed (up to 5).
**Verification:** `npm test -- src/lib/wwk/registrations`
**Budget:** 60k
**Dependencies:** WP-008, WP-010

### WP-012: Registration validation + rulebook summary
**Territory:** Domain
**Contract Clause:** FR-015, FR-063
**Files:**
- Create: `src/lib/io/rulebook.ts` (+ test, fflate + DOMParser, synthetic rwm built in test), `src/lib/wwk/validation.ts` (+ test)
**Acceptance Criteria:**
1. Each rule (gender, Jahrgang, >5, missing name/gliederung errors; <4 and unknown-AK-in-settings warnings; rulebook-unknown AK error only with rulebook) covered; case-insensitive rulebook matching.
**Verification:** `npm test -- src/lib/io/rulebook src/lib/wwk/validation`
**Budget:** 50k
**Dependencies:** WP-010

### WP-013: Registration sheet build + verification
**Territory:** Domain
**Contract Clause:** FR-016, FR-017
**Files:**
- Create: `src/lib/wwk/registrationExport.ts` (+ test) — rows + wave copies, sort (AK asc, gender desc, gliederung desc), sheet spec "Meldungen" with original headers and cell types, expected counts (total + per AK/gender), verify against read-back sheet
**Acceptance Criteria:**
1. Count N = teams + wave copies; per group counts; numeric meldepunkte/Jahrgang; empty → null; verify detects missing row.
**Verification:** `npm test -- src/lib/wwk/registrationExport`
**Budget:** 50k
**Dependencies:** WP-011, WP-005 (interface only; tests use fake)

### WP-014: Results reader (Daten sheet)
**Territory:** Domain
**Contract Clause:** FR-020, FR-021, FR-030, FR-031
**Files:**
- Create: `src/lib/wwk/results.ts` (+ test) — find "Daten", first-exact-match headers (Platz, Name, Gliederung, Altersklasse, Geschlecht, Punkte, Mitglied 1..n), team vs individual detection, year detection (min of props + file date)
**Acceptance Criteria:**
1. Missing sheet → typed error; per-discipline "Platz 1" columns not confused with "Platz"; unplaced → null; individual detection.
**Verification:** `npm test -- src/lib/wwk/results`
**Budget:** 50k
**Dependencies:** WP-010

### WP-015: Trophy scoring
**Territory:** Domain
**Contract Clause:** FR-022, FR-023, FR-024, FR-025, FR-026, NFR-004
**Files:**
- Create: `src/lib/wwk/scoring.ts` (+ test), `src/lib/wwk/rulesText.ts`
**Acceptance Criteria:**
1. n=5 → 6/4/3/2/1; tie 2,2,4; tie for 1st; unplaced with switch on/off (never NaN); unknown AK not scored with reason; dense ranking 1,2,2,3; tieForFirst flag; each scored team has n + formula string; rescue/wave separated.
**Verification:** `npm test -- src/lib/wwk/scoring`
**Budget:** 60k
**Dependencies:** WP-014

### WP-016: Evaluation + serial-letter workbooks
**Territory:** Domain
**Contract Clause:** FR-027, FR-037, FR-035
**Files:**
- Create: `src/lib/format/points.ts` (+ test, competition points "1234,50"), `src/lib/wwk/evaluationExport.ts` (+ test: sheets Rettungswettkampf, Wellenwettkampf, Quelldaten, Aufschlüsselung), `src/lib/wwk/serialLetterExport.ts` (+ test: columns for old Word template incl. WWK "x", sort per certificate order)
**Acceptance Criteria:**
1. Sheet names/headers as specified; "Pokalpunkte" label; serial letter has no trophy points.
**Verification:** `npm test -- src/lib/format src/lib/wwk/evaluationExport src/lib/wwk/serialLetterExport`
**Budget:** 50k
**Dependencies:** WP-015

### WP-017: Distance tool domain
**Territory:** Domain
**Contract Clause:** FR-050
**Files:**
- Create: `src/lib/distance/dlrgPoi.ts` (+ test) — cleanName parity, filter typ Gld, geodesic km to Bad Nauheim (50.367073, 8.740880), matched/unmatched, cache model with date
**Acceptance Criteria:**
1. cleanName cases; known distance computed within 0.01 km of geodesic reference; unmatched listed.
**Verification:** `npm test -- src/lib/distance`
**Budget:** 40k
**Dependencies:** WP-001

### WP-018: Certificate queue model
**Territory:** Certificates
**Contract Clause:** FR-030–FR-035, NFR-004
**Files:**
- Create: `src/lib/certificates/model.ts` (+ test, incl. import-boundary test: `certificates/` never imports scoring)
**Acceptance Criteria:**
1. Filters; block order AK order + weiblich first; place last → 1st; copies 5 / 1 / configurable; member names mapping + hint when copies < members; unknown AK and unplaced excluded; display AK; competition points formatted.
**Verification:** `npm test -- src/lib/certificates/model`
**Budget:** 50k
**Dependencies:** WP-014, WP-016 (points format)

### WP-019: Layout model + defaults
**Territory:** Certificates
**Contract Clause:** FR-040, FR-041, FR-044
**Files:**
- Create: `src/lib/certificates/layout.ts` (+ test) — text/image objects in mm, placeholders, bold runs, visibility, default team + individual layouts from Word template measurements, parse/serialize without images
**Acceptance Criteria:**
1. Defaults match Word template (top 100 mm, side 25 mm, sizes 22/18/20/10, line 1.2); import rejects/strips image data and garbage.
**Verification:** `npm test -- src/lib/certificates/layout`
**Budget:** 50k
**Dependencies:** WP-001

### WP-020: Fonts + layout renderer (DrawOps)
**Territory:** Certificates
**Contract Clause:** FR-036, FR-040, FR-043, NFR-005
**Files:**
- Create: `src/lib/certificates/fonts.ts` (fontkit metrics), `src/lib/certificates/render.ts` (+ test) — placeholder fill, bold runs, alignment within width, shrink-to-fit, global offset, calibration page ops
**Acceptance Criteria:**
1. Centering within width; shrink to min size; offset applied to all ops; calibration crosshairs at 20 mm from edges.
**Verification:** `npm test -- src/lib/certificates/render`
**Budget:** 70k
**Dependencies:** WP-019

### WP-021: PDF writer (@cantoo/pdf-lib)
**Territory:** Certificates
**Contract Clause:** FR-036, FR-043, AD-3, NFR-008
**Files:**
- Create: `src/lib/pdf/document.ts` (+ test) — DrawOps → PDF bytes, A4, fonts embedded once, images embedded once, PrintScaling None; `src/lib/pdf/table.ts` (+ test) simple paginated table helper
**Acceptance Criteria:**
1. Page count, A4 MediaBox, PrintScaling None, fonts embedded, each image once; 600 pages < 5 s in test.
**Verification:** `npm test -- src/lib/pdf`
**Budget:** 70k
**Dependencies:** WP-020

### WP-022: Notice (Aushang) PDF
**Territory:** Certificates
**Contract Clause:** FR-028, NFR-002
**Files:**
- Create: `src/lib/wwk/noticePdf.ts` (+ test)
**Acceptance Criteria:**
1. Contains event header, rules text, both standings, breakdown, not-scored list, tie alert; contains no member names.
**Verification:** `npm test -- src/lib/wwk/noticePdf`
**Budget:** 50k
**Dependencies:** WP-015, WP-021

### WP-023: Stores + session
**Territory:** UI
**Contract Clause:** FR-003, FR-060–FR-065, FR-040, FR-061
**Files:**
- Create: `src/lib/session.svelte.ts`, `src/lib/settings/settingsStore.svelte.ts` (load, save, dirty, reset, export/import, first-start legacy migration with toast), `src/lib/certificates/layoutStore.svelte.ts` (layout, background, signatures in AppData)
**Acceptance Criteria:**
1. Tests with fake fs: first start migrates once; save/load; export/import without images.
**Verification:** `npm test -- src/lib/session src/lib/settings src/lib/certificates/layoutStore && npm run check`
**Budget:** 60k
**Dependencies:** WP-004, WP-007, WP-009, WP-019

### WP-024: Shared UI components
**Territory:** UI
**Contract Clause:** FR-002, FR-004
**Files:**
- Create: `src/lib/components/Dropzone.svelte` (+ test happy-dom: extension, magic bytes PK/D0CF11E0, 20 MB, button fallback), `src/lib/components/SortableList.svelte`, `src/lib/components/StepHeader.svelte`, `src/lib/components/SaveResult.svelte` (open/reveal)
**Acceptance Criteria:**
1. Wrong type/too large rejected with German message; drop and button both deliver bytes.
**Verification:** `npm test -- src/lib/components && npm run check`
**Budget:** 50k
**Dependencies:** WP-002, WP-006

### WP-025: Vorbereitung page
**Territory:** UI
**Contract Clause:** FR-010–FR-017
**Files:**
- Modify: `src/routes/preparation/+page.svelte` (+ subcomponents under `src/lib/components/preparation/`)
**Acceptance Criteria:**
1. Steps drop → prüfen → Welle → export; renames table; issues; confirm on errors; N callout with per-group table.
**Verification:** `npm run check && npm test`
**Budget:** 70k
**Dependencies:** WP-011, WP-012, WP-013, WP-023, WP-024

### WP-026: Auswertung page
**Territory:** UI
**Contract Clause:** FR-020–FR-028
**Files:**
- Modify: `src/routes/evaluation/+page.svelte` (+ `src/lib/components/evaluation/*`)
**Acceptance Criteria:**
1. Year warning; tabs Rettung/Welle; dense rank; collapsible breakdown; not-scored; rules text; tie alert; Excel + notice PDF save & open; individual-file hint.
**Verification:** `npm run check && npm test`
**Budget:** 60k
**Dependencies:** WP-015, WP-016, WP-022, WP-023, WP-024

### WP-027: Urkunden page
**Territory:** UI
**Contract Clause:** FR-030–FR-037
**Files:**
- Modify: `src/routes/certificates/+page.svelte` (+ `src/lib/components/certificates/*`)
**Acceptance Criteria:**
1. Session reuse or drop; filters + checkboxes + all/none per AK; page count; names switch; PDF save & open; print hint; serial-letter fallback.
**Verification:** `npm run check && npm test`
**Budget:** 60k
**Dependencies:** WP-018, WP-021, WP-016, WP-023, WP-024

### WP-028: Layout editor page
**Territory:** UI
**Contract Clause:** FR-040–FR-044, NFR-005
**Files:**
- Modify: `src/routes/certificates/layout/+page.svelte`; Create: `src/lib/components/certificates/LayoutCanvas.svelte`, `PropertiesPanel.svelte`, `ObjectList.svelte`
**Acceptance Criteria:**
1. Drag + arrow nudge; properties edit; team/individual variant switch; background toggle/opacity; calibration PDF; offset X/Y; export/import; reset; canvas uses same render ops as PDF.
**Verification:** `npm run check && npm test`
**Budget:** 90k
**Dependencies:** WP-020, WP-021, WP-023, WP-024

### WP-029: Entfernungen + Einstellungen + Info/Updater
**Territory:** UI
**Contract Clause:** FR-050, FR-060–FR-065, FR-070, FR-001
**Files:**
- Modify: `src/routes/distances/+page.svelte`, `src/routes/settings/+page.svelte`; Create: `src/lib/release/updater.svelte.ts`, `src/lib/components/UpdateDialog.svelte`, `src/lib/components/InfoDialog.svelte`, `src/routes/+page.svelte` (start page with 3 step cards)
**Acceptance Criteria:**
1. All six original settings + event data + signatures + rulebook + export/import + reset; distances with cache/unmatched/refresh; update check dialog; info dialog.
**Verification:** `npm run check && npm test`
**Budget:** 80k
**Dependencies:** WP-017, WP-023, WP-024, WP-012

### WP-030: Release workflow, README, parity doc; Python removal after acceptance
**Territory:** Release & Acceptance
**Contract Clause:** AD-9, AC-7, AC-8, FR-070
**Files:**
- Create: `.github/workflows/release.yml` (timetracker minus docker/beta channel, tags v*.*.*, NSIS, latest.json, Release-Note trailers); Rename/rewrite `ReadMe.md` → `README.md`; update `docs/OPEN_WORK.md` with parity checklist
- Delete (ONLY after Don confirms manual acceptance AC-3..AC-6): `app.py`, `Pipfile`, `Pipfile.lock`, `requirements.txt`, `metadata.yml`, `.github/workflows/build.yml`, `images/splash.png`
**Acceptance Criteria:**
1. Release workflow valid; README German, download link; parity checklist complete; Python deletion is a separate commit after Don's go.
**Verification:** `npm run check && npm test && (cd src-tauri && cargo clippy --all-targets -- -D warnings && cargo test)`
**Budget:** 60k
**Dependencies:** WP-025–WP-029

## Execution Order

1. **Wave 1 (sequential):** WP-001 → WP-002, WP-003, WP-004 (parallel after 001)
2. **Wave 2 (parallel):** WP-005, WP-006, WP-007 (Rust) · WP-008, WP-009, WP-017 (Domain) · WP-019 (Certificates)
3. **Wave 3 (parallel):** WP-010 → WP-011, WP-012, WP-014 · WP-020
4. **Wave 4 (parallel):** WP-013, WP-015 · WP-021
5. **Wave 5 (parallel):** WP-016, WP-018, WP-022, WP-023, WP-024
6. **Wave 6 (parallel):** WP-025, WP-026, WP-027, WP-028, WP-029
7. **Wave 7:** WP-030 (Python deletion gated on Don's manual acceptance)

Parallel Workers inside a wave touch disjoint files. `lib.rs` command registration (WP-005/006/007) is merged by the Rust Capo sequentially.

## Baseline Verification

- Tests: PASS (no existing test suite; Python app has no tests — baseline is empty)
- Dependencies: OK — Node v22.23.3, npm 10.9.9, cargo/rustc 1.99.0, Xcode CLT present; Windows build verified in CI only
- Branch: `heist/tauri-port` created from `main` (9541a67); uncommitted: `.gitignore` change, `docs/gangsta/`
- Isolation: single branch; parallel Workers per wave only on disjoint files (no worktrees needed)

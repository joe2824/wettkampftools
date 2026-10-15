<br />
<div align="center">
  <a href="https://github.com/joe2824/wettkampftools">
    <img src="images/logo.png" alt="Logo" width="200" height="auto">
  </a>
  <br>
  <br>
</div>

# Wettkampftools

Desktop-Anwendung für Vorbereitung, Auswertung und Urkunden beim
Wellenwettkampf der DLRG Ortsgruppe Dorheim e.V. in Bad Nauheim.

## Download

**[Aktuelle Version herunterladen](https://github.com/joe2824/wettkampftools/releases/latest)**
— dort unter „Assets“ den Windows-Installer (`…-setup.exe`) wählen.

Die Anwendung läuft unter Windows. Neue Versionen werden beim Start erkannt und
können direkt aus der Anwendung installiert werden.

## Funktionen

### Vorbereitung

- Als erster Schritt die **Veranstaltung**: Nummer, Titel, Ausrichter, Datum,
  Ort und die beiden Unterzeichner samt Unterschrift. Alles wird sofort
  gespeichert.
- Meldedatei aus dem DLRG-Meldeportal per Ziehen und Ablegen oder Auswahl laden.
- Prüfung der Meldungen nach denselben Regeln wie JAuswertung, mit
  verständlichen Hinweisen zu jeder auffälligen Zeile.
- Mannschaften je Gliederung für die Wellenwertung auswählen; vorausgewählt
  wird nach Altersklasse.
- Mannschaftsnamen werden je Gliederung einheitlich nummeriert. Statt der
  Gliederung kann je Gliederung ein eigener Name gelten (z. B. „Sulzbach / Saar“),
  frei eingetragen oder aus der Meldung übernommen; er wird für die nächsten
  Jahre gemerkt.
- Export der Meldungen für JAuswertung mit **Kontrollzahl**: So viele Meldungen
  muss JAuswertung nach dem Import anzeigen.

### Auswertung und Pokalwertung

- Excel-Export aus JAuswertung laden; stammt die Datei nicht aus dem
  aktuellen Jahr, warnt die Anwendung.
- Gesamtwertung je Ortsgruppe, getrennt für Rettungswertung und Wellenwertung.
- Jede Ortsgruppe lässt sich aufklappen: Team, Altersklasse, Geschlecht, Platz
  und die Rechnung der Pokalpunkte mit eingesetzten Zahlen.
- Ausgabe als Excel-Datei und als Aushang-PDF (ohne Mitgliedernamen).

**Regel der Pokalwertung:** In jeder Gruppe (Altersklasse und Geschlecht)
erhält ein Team `n + 1 − Platz` Pokalpunkte, wobei `n` die Anzahl der Teams mit
Platz ist. Der Erste bekommt also `n + 1`, der Zweite `n − 1`, der Letzte `1`.
Maßgeblich ist der Platz aus JAuswertung, auch bei Gleichstand. Teams ohne Platz
erhalten keine Pokalpunkte. Die Pokalpunkte aller Teams einer Ortsgruppe werden
addiert; bei Punktgleichheit teilen sich Ortsgruppen den Rang. Ein Gleichstand
um Platz 1 wird markiert und von der Wettkampfleitung entschieden.

**Wettkampfpunkte und Pokalpunkte sind zwei verschiedene Dinge:** Wettkampfpunkte
stammen aus JAuswertung und stehen auf den Urkunden. Pokalpunkte dienen nur der
Gesamtwertung um den Pokal und erscheinen nie auf einer Urkunde.

### Urkunden

- Urkunden direkt als PDF, ohne Word. Für den Notfall gibt es weiterhin die
  Seriendruck-Tabelle für die bisherige Word-Vorlage.
- Reihenfolge wie bei der Siegerehrung vorgelesen.
- Auswahl nach Wertung und Altersklasse, Mitgliedernamen wahlweise mit
  ausgeben.
- Layout-Editor mit A4-Vorschau: Texte und Unterschriften frei positionieren,
  den Scan der vorbedruckten Urkunde zur Ausrichtung einblenden.
- Im Layout-Editor: Hilfslinien mit Einrasten (Kanten, Mitten, Grundlinien,
  gleiche Abstände), Größe über Anfasser ziehen, Elemente hinzufügen,
  entfernen und duplizieren, Mehrfachauswahl per Rahmen, Ausrichten,
  Verteilen und Gruppieren.
- Kalibrierungsseite, um den Versatz des eigenen Druckers auszugleichen.
- Auf Wunsch eine Deutschlandkarte auf der Urkunde (Schalter „Karte auf der
  Urkunde“ im Layout-Editor): alle teilnehmenden Gliederungen als Punkte, Bad
  Nauheim als Stern, die eigene Gliederung wahlweise hervorgehoben.

### Entfernungen

Berechnet die Entfernung jeder gemeldeten Gliederung nach Bad Nauheim anhand
der öffentlichen DLRG-Standortdaten. Der letzte Datenstand bleibt auch ohne
Internet verfügbar.

Eine Deutschlandkarte zeigt jede Gliederung als Punkt, verknüpft mit der
Tabelle, dazu eine Übersicht (Anzahl, weiteste Anreise, Durchschnitt,
Bundesländer). Die Karte lässt sich als PNG-Bild oder PDF speichern. Sie kommt
ohne Online-Kartendienst aus.

### Rec-Werte fürs neue Jahr

Erstellt aus dem bisherigen Vereins-Regelwerk ein neues Regelwerk (.rwm) zum
Import in JAuswertung; nur Rec-Werte und Beschreibung ändern sich.

- **Rettungsdisziplinen:** Werte aus dem offiziellen DLRG-Regelwerk, das
  JAuswertung mitbringt (z. B. „DLRG 2026.rwm“). Eine einmal gepflegte
  Zuordnung legt fest, welche offizielle Altersklasse und welcher
  Disziplinname gilt (z. B. AK 10 nutzt die Werte der AK 12).
- **Wellendisziplinen:** Bestzeit des Vorjahres plus 5 Sekunden (Zuschlag
  einstellbar). Die Bestzeiten speichert die App automatisch, sobald die
  Ergebnisdatei geladen wird – nur Zeiten, keine Namen.
- **Vergleich:** Je Wert alt, neu, Änderung und Herkunft (z. B. „DLRG 2026 ·
  AK 12“ oder „Bestzeit 2025: 1:18,40 + 5,00 s“); jeder Wert lässt sich von
  Hand ändern.
- **Automatisch fürs nächste Jahr:** Das Regelwerk für das neue Jahr lädt die
  App direkt aus JAuswertung, sobald es dort veröffentlicht ist; die
  Bestzeiten des Vorjahres sind bereits ausgewählt. Bis zum Wettkampftag
  erinnert die Startseite daran.

### Einstellungen

Altersklassen, Senioren-Altersklassen, Starterlaubnis für die Welle,
Zusammenfassen der Senioren, Umgang mit nicht angetretenen Teams und Urkunden.
Einstellungen lassen sich als Datei exportieren und importieren; die
Veranstaltungsdaten sind darin enthalten, die Unterschriften nicht. Einstellungen der alten Version werden beim ersten
Start übernommen.

### Projekt auf einem anderen Rechner weiterbearbeiten

Oben links neben dem Knopf für die Seitenleiste liegt das Menü **Datei** mit
**Neuer Wettkampf …** (Strg+N, auf dem Mac ⌘N), **Projekt öffnen …** (Strg+O)
und **Projekt speichern …** (Strg+S).

**Projekt speichern …** legt den ganzen Wettkampf in
eine Datei (`.wwkprojekt`): Veranstaltung, Einstellungen samt Regelwerk und
Mannschaftsnamen, Urkunden-Layout, Unterschriften (abwählbar), Meldedatei mit
Wellenauswahl, Ergebnisse samt Jahresprüfung und Urkunden-Auswahl. Der
Hintergrund-Scan ist nicht enthalten.

Auf dem anderen Rechner die Datei unter **Projekt öffnen …** auswählen, auf
die Fläche der Startseite ziehen oder im Explorer doppelt anklicken; ein Doppelklick startet
Wettkampftools oder holt das offene Fenster nach vorn. Nach einer Rückfrage ersetzt das Projekt den dortigen
Stand; enthält es keine Unterschriften, bleiben die vorhandenen erhalten. Die
Datei enthält Namen und Jahrgänge der Teilnehmenden und gehört nur in die
Hände von Berechtigten.

## Ablauf am Wettkampftag

1. **Meldedatei** aus dem DLRG-Meldeportal herunterladen (eine Datei).
2. In der Anwendung **Vorbereitung** öffnen, zuerst die **Veranstaltung**
   prüfen (Nummer und Datum), dann Meldedatei laden, Hinweise prüfen,
   Mannschaften auswählen und die Meldungen exportieren.
3. Die Meldungen in **JAuswertung importieren** und die angezeigte Anzahl mit
   der **Kontrollzahl** vergleichen.
4. **Wettkampf** durchführen und in JAuswertung erfassen.
5. Aus JAuswertung den **Excel-Export** erstellen.
6. In der Anwendung **Auswertung** öffnen und die Pokalwertung erzeugen,
   anschließend unter **Urkunden** die Urkunden-PDF erstellen.

**Drucken:** Im PDF-Programm „Tatsächliche Größe“ (nicht „An Seite anpassen“)
wählen. Vor dem ersten Druck auf vorbedrucktem Papier die Kalibrierungsseite auf
Normalpapier drucken, über eine Urkunde legen und einen gemessenen Versatz in der
Anwendung eintragen.

## Datenschutz

Meldedaten und Ergebnisse werden nur auf dem eigenen Rechner verarbeitet und
nirgendwohin übertragen. Damit ein Wettkampf über mehrere Tage bearbeitet werden
kann, bleiben Meldedaten lokal auf diesem Rechner, bis ‚Neuer Wettkampf‘
gewählt wird; sie werden nie in Logs oder Exporte der Einstellungen geschrieben.
Erzeugte Dateien liegen dort, wo man sie selbst ablegt. Eine Projektdatei
mit Meldedaten und Ergebnissen entsteht nur, wenn man sie ausdrücklich speichert.

Aus dem Internet geladen werden nur die öffentlichen DLRG-Standortdaten, das
offizielle DLRG-Regelwerk aus JAuswertung (von `raw.githubusercontent.com`, für
die Rec-Werte) und Updates; hochgeladen wird dabei nichts.

Für die Rec-Werte bleiben im App-Datenordner dauerhaft gespeichert, auch nach
‚Neuer Wettkampf‘: die Bestzeiten je Altersklasse und Disziplin aus geladenen
Ergebnissen (ohne Namen), eine Kopie des Vereins-Regelwerks und die Zuordnung
der Rec-Werte.

## Entwicklung

Voraussetzungen: Node.js 22 und Rust (stable). Entwickelt werden kann auch auf
macOS, die Anwendung selbst läuft nur unter Windows.

```sh
npm ci
npm run tauri dev
```

Prüfungen vor jedem Commit:

```sh
npm run check
npm test
npm run format:check
cd src-tauri && cargo clippy --all-targets -- -D warnings
cd src-tauri && cargo test
```

Aufbau, Konventionen und Regeln stehen in [`AGENTS.md`](AGENTS.md).

## Release

Ein Release entsteht aus einem Tag: `release.yml` prüft (`verify.yml`), baut
unter Windows den NSIS-Installer samt Update-Manifest (`latest.json`) und
veröffentlicht das GitHub-Release. Die Notes kommen aus den
`Release-Note:`-Trailern der Commits (siehe [`AGENTS.md`](AGENTS.md)); liegt
eine `RELEASE_NOTES.md` im Repo, ersetzt sie die Notes und muss in der ersten
Zeile den Tag genau nennen (`v2.1.0` passt nicht zu `v2.1.0-beta.3`, `v2.0.1`
nicht zu `v2.0.10`). Betas dürfen stattdessen ihre Basisversion nennen: „v2.1.0“
gilt auch für `v2.1.0-beta.N`. Die Regel steht in `scripts/version.mjs`
(`node scripts/version.mjs notes <tag>`).

Reihenfolge: Betas einer Version kommen vor ihrem stabilen Release. Vor dem
allerersten stabilen Tag beginnt `--beta` ohne Angabe bei der Version aus
`package.json` (`2.0.0-beta.1`), danach setzt es eine offene Serie fort oder
fragt nach der nächsten Version.

**Stabil** (aus `main`):

```sh
./scripts/release.sh --dry-run minor   # zeigt nur, was passieren würde
./scripts/release.sh minor             # patch | minor | major | 2.1.0; ohne Angabe wird gefragt
```

**Beta** (aus `dev`; Tags wie `v2.1.0-beta.1`):

```sh
./scripts/release.sh --beta            # setzt eine offene Beta-Serie fort, sonst wird gefragt
./scripts/release.sh --beta minor      # neue Serie, z. B. 2.1.0-beta.1
```

Alternativ auf GitHub: **Actions → „Beta aus dev“ → Run workflow** (optional mit
Basisversion). Den Branch `dev` muss es dafür geben; fehlt er, bricht der Ablauf
mit einem Hinweis ab. Unter Windows heißt das Skript `scripts\release.bat`, mit
denselben Optionen.

Die Skripte brechen ab, wenn nicht committete Änderungen vorliegen oder der
falsche Branch ausgecheckt ist, und lassen vor dem Taggen alle Prüfungen laufen.
Sie setzen die Version in `package.json`, `src-tauri/tauri.conf.json`,
`src-tauri/Cargo.toml` und `src-tauri/Cargo.lock`, committen, taggen und pushen.

Betas werden als Vorabversion veröffentlicht und nie zu „Latest“. Jeder Build –
stabil oder Beta – lädt sein `latest.json` zusätzlich an das feste Release
`beta`: Wer in der Anwendung unter **Info** „Beta-Versionen erhalten“
einschaltet, sucht nach dem nächsten Start dort nach Updates und bekommt so auch
stabile Versionen, sobald sie neuer sind.

Benötigte Secrets im Repository: `TAURI_SIGNING_PRIVATE_KEY` und
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (Signatur der Updates; der öffentliche
Schlüssel steht in `tauri.conf.json`). `GITHUB_TOKEN` stellt GitHub selbst.

## Lizenzen

Wettkampftools ist unter der MIT-Lizenz veröffentlicht, siehe
[`LICENSE.txt`](LICENSE.txt).

- **Schrift Nunito**: SIL Open Font License 1.1, siehe
  [`static/fonts/OFL.txt`](static/fonts/OFL.txt). Sie steckt in der Anwendung
  und in erzeugten PDFs, was die Lizenz erlaubt. Die Word-Vorlage für den
  Seriendruck braucht sie auf dem Rechner;
  [kostenlos bei Google Fonts](https://fonts.google.com/specimen/Nunito).
- **Kartendaten**: [Natural Earth](https://www.naturalearthdata.com/)
  (gemeinfrei), vereinfacht.
- **Datenquellen** (zur Laufzeit geladen, nicht mitgeliefert):
  DLRG-Standortdaten und die offiziellen Regelwerke aus
  [JAuswertung](https://github.com/dennisfabri/JAuswertung).
- **Bibliotheken**: Die Lizenzhinweise aller mitgelieferten npm-Pakete und
  Rust-Crates entstehen bei jedem `npm run build` als
  `build/third-party-licenses.json` (Vite-Plugin in
  [`scripts/licenses-plugin.mjs`](scripts/licenses-plugin.mjs)): npm nur mit
  Paketen, deren Code im Bundle landet, Rust aus `cargo metadata` für das
  Windows-Ziel. Gleiche Lizenztexte stehen nur einmal darin. Liefert ein
  Paket keinen eigenen Lizenztext mit, steht dort der SPDX-Standardtext seiner
  Lizenz (aus [`scripts/spdx/`](scripts/spdx/), Quelle
  [spdx/license-list-data](https://github.com/spdx/license-list-data)) samt
  Urhebern aus den Paketangaben. Ohne `cargo` fehlen die Rust-Angaben;
  Release-Builds brechen dann ab (`REQUIRE_RUST_LICENSES=1` in `release.yml`),
  ebenso wenn ein Paket ganz ohne Text bleibt. Die Datei liegt nur im
  Build-Ordner und wird nicht eingecheckt. In der Anwendung: **Info →
  Lizenzen und Quellen**.

Links aus der Anwendung öffnet nur, was in
`src-tauri/capabilities/default.json` unter `opener:allow-open-url` steht –
genau die Adressen aus `src/lib/release/credits.ts`; ein Test hält beides
gleich.

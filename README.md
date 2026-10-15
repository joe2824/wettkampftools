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
cd src-tauri && cargo clippy --all-targets -- -D warnings
cd src-tauri && cargo test
```

Aufbau, Konventionen und Regeln stehen in [`AGENTS.md`](AGENTS.md).

## Lizenz

Veröffentlicht unter MIT-Lizenz. Siehe [`LICENSE.txt`](LICENSE.txt).

Kartendaten: [Natural Earth](https://www.naturalearthdata.com/) (gemeinfrei,
public domain), vereinfacht.

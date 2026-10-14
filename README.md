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

- Meldedatei aus dem DLRG-Meldeportal per Ziehen und Ablegen oder Auswahl laden.
- Prüfung der Meldungen nach denselben Regeln wie JAuswertung, mit
  verständlichen Hinweisen zu jeder auffälligen Zeile.
- Mannschaften je Gliederung für die Wellenwertung auswählen; vorausgewählt
  wird nach Altersklasse.
- Mannschaftsnamen werden je Gliederung einheitlich nummeriert.
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

### Entfernungen

Berechnet die Entfernung jeder gemeldeten Gliederung nach Bad Nauheim anhand
der öffentlichen DLRG-Standortdaten. Der letzte Datenstand bleibt auch ohne
Internet verfügbar.

### Einstellungen

Altersklassen, Senioren-Altersklassen, Starterlaubnis für die Welle,
Zusammenfassen der Senioren, Umgang mit nicht angetretenen Teams,
Veranstaltungsdaten und Unterschriften. Einstellungen lassen sich als Datei
exportieren und importieren. Einstellungen der alten Version werden beim ersten
Start übernommen.

## Ablauf am Wettkampftag

1. **Meldedatei** aus dem DLRG-Meldeportal herunterladen (eine Datei).
2. In der Anwendung **Vorbereitung** öffnen, Meldedatei laden, Hinweise prüfen,
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
nirgendwohin übertragen. Die Anwendung speichert keine Teilnehmerdaten;
gespeichert werden nur Einstellungen, Layout und erzeugte Dateien dort, wo man
sie selbst ablegt. Aus dem Internet geladen werden nur die öffentlichen
DLRG-Standortdaten und Updates.

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

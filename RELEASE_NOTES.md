# Wettkampftools v2.0.0

Wettkampftools ist komplett neu als Desktop-App aufgebaut: übersichtlicher,
schneller und mit allem, was die bisherige Version konnte.

### Wichtig vor dem Update

- Diese Version muss **einmalig neu installiert** werden. Ein Update aus der
  alten Version heraus ist nicht möglich.
- Die bisherigen Einstellungen werden beim ersten Start automatisch übernommen.
  Danach kann die alte Version deinstalliert werden.

### Neue Funktionen

- **Vorbereitung:** Die Meldedatei wird nach denselben Regeln wie in
  JAuswertung geprüft, auffällige Zeilen werden verständlich erklärt. Nach dem
  Export liest die Anwendung die gespeicherte Datei noch einmal ein und zeigt
  eine Kontrollzahl: So viele Meldungen muss JAuswertung nach dem Import
  anzeigen.
- **Altersklassen:** Die Zuordnung ist verbessert. Ältere Meldedateien mit
  Umlauten werden richtig gelesen, die Altersklassen AK 100 und AK 120 werden
  für die Welle richtig berücksichtigt, und nach dem Zusammenfassen der
  Senioren stimmt die Nummerierung der Mannschaften. Wird die Start-AK der
  Welle nachträglich geändert, werden Wellen-Ergebnisse trotzdem gewertet und
  beurkundet.
- **Pokalwertung:** Für jede Ortsgruppe lässt sich aufklappen, wie die Punkte
  zustande kommen. Bei Punktgleichheit teilen sich Ortsgruppen den Rang, ein
  Gleichstand um Platz 1 wird deutlich markiert. Neu ist ein Aushang als PDF
  mit Ergebnis, Aufschlüsselung und Regeln.
- **Urkunden:** Urkunden entstehen ohne Word direkt als PDF, in der
  Reihenfolge der Siegerehrung. Die Auswahl nach Altersklasse ist möglich,
  Mitgliedernamen können wahlweise mit gedruckt werden. Ein Layout-Editor mit
  Kalibrierungsseite sorgt dafür, dass der Druck genau auf das vorbedruckte
  Papier passt.
- **Mannschaftsnamen:** Je Gliederung lässt sich ein eigener Name festlegen
  (z. B. „Sulzbach / Saar“ statt „Sulzbach“) oder per Klick aus der Meldung
  übernehmen. Er wird gemerkt und in den folgenden Jahren automatisch verwendet.
- Der Arbeitsstand bleibt über mehrere Tage erhalten; ‚Neuer Wettkampf‘ auf der
  Startseite beginnt von vorn. Die Bestätigung einer Ergebnisdatei aus einem
  anderen Jahr bleibt nach einem Neustart erhalten, solange das Dateijahr
  dasselbe ist.
- Einstellungen, Layout und Arbeitsstand werden ausfallsicher gespeichert. Kann
  eine gespeicherte Datei nicht gelesen werden, wird sie nicht überschrieben,
  sondern aufbewahrt, und beim Start erscheint ein Hinweis.
- Ein neu erzeugtes Regelwerk lässt sich nach dem Speichern direkt öffnen oder
  im Ordner anzeigen.
- Die **Veranstaltung** wird als erster Schritt der Vorbereitung eingetragen
  und sofort gespeichert. ‚Neuer Wettkampf‘ zählt die Nummer hoch und leert das
  Datum; die Startseite zeigt die aktuelle Veranstaltung, fehlt das Datum, gibt
  es einen Hinweis.
- **Rec-Werte fürs neue Jahr:** Die Rettungsdisziplinen übernehmen die Werte
  aus dem offiziellen DLRG-Regelwerk von JAuswertung, die Wellendisziplinen die
  Bestzeit des Vorjahres plus 5 Sekunden. Eine Vergleichstabelle zeigt je Wert
  die Änderung zum Vorjahr und die Herkunft; die Startseite erinnert daran.
- **Einstellungen** lassen sich als Datei sichern und auf einem anderen
  Rechner wieder einlesen.
- **Projektdatei:** Auf der Startseite lässt sich der ganze Wettkampf
  (Veranstaltung, Einstellungen, Layout, Unterschriften, Meldungen und
  Ergebnisse) als eine Datei speichern und auf einem anderen Rechner öffnen,
  um dort weiterzuarbeiten.
- **Automatische Updates:** Neue Versionen werden beim Start gemeldet und
  lassen sich direkt aus der Anwendung installieren.
- Wer neue Funktionen früher ausprobieren möchte, schaltet unter **Info** in
  der Seitenleiste „Beta-Versionen erhalten“ ein; das gilt nach einem Neustart.
- Entfernungen: Gibt es mehrere DLRG-Gliederungen gleichen Namens, werden sie markiert und lassen sich zuordnen; ein Zusatz im Mannschaftsnamen (z. B. „Saar“) führt zu einem Vorschlag zum Prüfen. Gliederungen wie Dorheim, die zusammen mit ihrer Jugend eingetragen sind, werden jetzt gefunden.
- Projektdateien (.wwkprojekt) lassen sich per Doppelklick im Explorer öffnen: Wettkampftools startet bzw. holt das offene Fenster nach vorn und fragt vor dem Ersetzen des aktuellen Stands nach.
- Neues Menü „Datei“ oben links: Neuer Wettkampf (Strg+N), Projekt öffnen (Strg+O) und Projekt speichern (Strg+S), auf dem Mac mit ⌘.
- Entfernungen: Deutschlandkarte mit allen Gliederungen und Bad Nauheim, Übersicht (Anzahl, weiteste Anreise, Durchschnitt, Bundesländer), als PNG oder PDF speicherbar – ohne Internet (Kartendaten: Natural Earth, gemeinfrei).
- Urkunden-Layout: optional eine Deutschlandkarte mit allen teilnehmenden Gliederungen auf der Urkunde.
- Die Seiten nutzen breite Fenster besser aus.

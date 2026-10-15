# Wettkampftools v2.0.0

Wettkampftools ist komplett neu als Desktop-App aufgebaut: übersichtlicher,
schneller und mit allem, was die bisherige Version konnte.

### Wichtig vor dem Update

- Diese Version muss **einmalig neu installiert** werden. Ein Update aus der
  alten Version heraus ist nicht möglich.
- Die bisherigen Einstellungen werden beim ersten Start automatisch übernommen.
  Danach kann die alte Version deinstalliert werden.

### Vorbereitung

- Die **Veranstaltung** (Nummer, Titel, Ausrichter, Datum, Ort und die beiden
  Unterzeichner samt Unterschrift) wird als erster Schritt eingetragen und
  sofort gespeichert. Die Startseite zeigt die aktuelle Veranstaltung; fehlt
  das Datum, gibt es einen Hinweis.
- Die Meldedatei wird nach denselben Regeln wie in JAuswertung geprüft,
  auffällige Zeilen werden verständlich erklärt.
- Nach dem Export liest die Anwendung die gespeicherte Datei noch einmal ein
  und zeigt eine **Kontrollzahl**: So viele Meldungen muss JAuswertung nach dem
  Import anzeigen.
- Die Zuordnung der Altersklassen ist verbessert: Ältere Meldedateien mit
  Umlauten werden richtig gelesen, AK 100 und AK 120 werden für die Welle
  richtig berücksichtigt, und nach dem Zusammenfassen der Senioren stimmt die
  Nummerierung der Mannschaften.
- **Mannschaftsnamen:** Je Gliederung lässt sich ein eigener Name festlegen
  (z. B. „Sulzbach / Saar“ statt „Sulzbach“) oder per Klick aus der Meldung
  übernehmen. Er wird gemerkt und in den folgenden Jahren verwendet.

### Auswertung und Pokalwertung

- Für jede Ortsgruppe lässt sich aufklappen, wie die Punkte zustande kommen.
- Bei Punktgleichheit teilen sich Ortsgruppen den Rang; ein Gleichstand um
  Platz 1 wird deutlich markiert.
- Neu ist ein **Aushang als PDF** mit Ergebnis, Aufschlüsselung und Regeln.
- Wird die Start-Altersklasse der Welle nachträglich geändert, werden
  Wellen-Ergebnisse trotzdem gewertet und beurkundet.
- Stammt die Ergebnisdatei aus einem anderen Jahr, bleibt die Bestätigung nach
  einem Neustart erhalten, solange das Dateijahr gleich bleibt.

### Urkunden

- Urkunden entstehen ohne Word direkt als PDF, in der Reihenfolge der
  Siegerehrung. Die Auswahl nach Altersklasse ist möglich, Mitgliedernamen
  können wahlweise mit gedruckt werden.
- Ein **Layout-Editor** mit Kalibrierungsseite sorgt dafür, dass der Druck
  genau auf das vorbedruckte Papier passt.
- Im Layout-Editor: Hilfslinien mit Einrasten (Kanten, Mitten, Grundlinien,
  gleiche Abstände), Größe über Anfasser ändern, Elemente hinzufügen,
  entfernen und duplizieren, Mehrfachauswahl per Rahmen (mit Umschalt oder
  Strg zum Ergänzen), Ausrichten, gleichmäßig Verteilen und Gruppieren.
- Das Layout wird automatisch gespeichert.
- Auf Wunsch eine **Deutschlandkarte** mit allen teilnehmenden Gliederungen
  auf der Urkunde.

### Entfernungen

- **Deutschlandkarte** mit allen Gliederungen und Bad Nauheim, dazu eine
  Übersicht (Anzahl, weiteste Anreise, Durchschnitt, Bundesländer). Die Karte
  lässt sich als PNG oder PDF speichern und funktioniert ohne Internet.
- Gibt es mehrere DLRG-Gliederungen gleichen Namens, werden sie markiert und
  lassen sich zuordnen; ein Zusatz im Mannschaftsnamen (z. B. „Saar“) führt zu
  einem Vorschlag zum Prüfen.
- Gliederungen, die zusammen mit ihrer Jugend eingetragen sind (z. B.
  Dorheim), werden jetzt gefunden.

### Rec-Werte fürs neue Jahr

- Die Rettungsdisziplinen übernehmen die Werte aus dem offiziellen
  DLRG-Regelwerk von JAuswertung, die Wellendisziplinen die Bestzeit des
  Vorjahres plus 5 Sekunden.
- Eine Vergleichstabelle zeigt je Wert die Änderung zum Vorjahr und die
  Herkunft; die Startseite erinnert rechtzeitig daran.
- Das neue Regelwerk lässt sich nach dem Speichern direkt öffnen oder im
  Ordner anzeigen.

### Arbeitsstand und Projektdatei

- Der Arbeitsstand bleibt über mehrere Tage erhalten. Änderungen werden
  automatisch gespeichert, auch wenn das Fenster kurz danach geschlossen wird.
- Neues Menü **Datei** oben links: Neuer Wettkampf (Strg+N), Projekt öffnen
  (Strg+O) und Projekt speichern (Strg+S).
- **Neuer Wettkampf** beginnt von vorn, zählt die Nummer der Veranstaltung hoch
  und leert das Datum.
- Eine **Projektdatei** (.wwkprojekt) enthält den ganzen Wettkampf
  (Veranstaltung, Einstellungen, Layout, Unterschriften, Meldungen und
  Ergebnisse), um auf einem anderen Rechner weiterzuarbeiten. Sie lässt sich
  per Doppelklick im Explorer öffnen; vor dem Ersetzen des aktuellen Stands
  wird nachgefragt.
- Einstellungen, Layout und Arbeitsstand werden ausfallsicher gespeichert. Kann
  eine gespeicherte Datei nicht gelesen werden, wird sie aufbewahrt statt
  überschrieben, und beim Start erscheint ein Hinweis.

### Einstellungen

- Einstellungen lassen sich als Datei sichern und auf einem anderen Rechner
  wieder einlesen.
- Beim Verlassen der Einstellungen mit ungespeicherten Änderungen fragt die
  Anwendung nach.

### Updates und Info

- **Automatische Updates:** Neue Versionen werden beim Start gemeldet und
  lassen sich direkt aus der Anwendung installieren.
- Wer neue Funktionen früher ausprobieren möchte, schaltet unter **Info** in
  der Seitenleiste „Beta-Versionen erhalten“ ein; das gilt nach einem Neustart.
- **Info → Lizenzen und Quellen** nennt die Schrift, die Kartendaten, die
  Datenquellen und alle mitgelieferten Bibliotheken samt Lizenztexten.
- Die Seiten nutzen breite Fenster besser aus.
- Beim Öffnen einer Projektdatei wird der bisherige Stand vorher gesichert; schlägt das Übernehmen fehl, wird er automatisch wiederhergestellt.
- Projektdateien nehmen auch die Gliederungswahl der Entfernungen sowie Zuordnung, Wellen-Zuschlag, Vereins-Regelwerk und Bestzeiten der Rec-Werte mit.

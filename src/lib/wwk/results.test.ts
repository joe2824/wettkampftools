import { describe, expect, it } from "vitest";
import type { Cell, Workbook } from "$lib/platform/workbook";
import { readJAuswertungResults, ResultsError, workbookYear } from "./results";

const TEAM_HEADER: Cell[] = [
	"Platz",
	"Name",
	"Mitglied 1",
	"Mitglied 2",
	"Gliederung",
	"Qualifikationsgliederung",
	"Altersklasse",
	"Geschlecht",
	"Bemerkung",
	"Meldepunkte",
	"Punkte",
	"Differenz",
	"Platz 1",
	"Zeit 1",
	"Punkte 1"
];

const INDIVIDUAL_HEADER: Cell[] = [
	"Platz",
	"Name",
	"Nachname",
	"Vorname",
	"Jahrgang",
	"Gliederung",
	"Altersklasse",
	"Geschlecht",
	"Punkte"
];

function workbook(rows: Cell[][], sheetName = "Daten"): Workbook {
	return {
		sheets: [
			{ name: "Andere", rows: [["x"]] },
			{ name: sheetName, rows }
		],
		properties: { created: null, modified: null }
	};
}

describe("readJAuswertungResults", () => {
	it("liest Mannschaften mit Platz, Punkten und Mitgliedern", () => {
		const result = readJAuswertungResults(
			workbook([
				TEAM_HEADER,
				[
					1,
					"Musterstadt 1",
					"Anna Meier",
					"Max Mustermann",
					"Musterstadt",
					"",
					"AK 12",
					"weiblich",
					"",
					0,
					1234.5,
					0,
					7,
					"1:00",
					300
				]
			])
		);
		expect(result.kind).toBe("team");
		expect(result.rows).toEqual([
			{
				sourceRow: 1,
				place: 1,
				name: "Musterstadt 1",
				organisation: "Musterstadt",
				ageGroupRaw: "AK 12",
				gender: "weiblich",
				competitionPoints: 1234.5,
				members: ["Anna Meier", "Max Mustermann"]
			}
		]);
	});

	it("verwechselt „Platz 1“ nicht mit „Platz“, auch wenn sie davor steht", () => {
		const header: Cell[] = [
			"Platz 1",
			" platz ",
			"Name",
			"Mitglied 1",
			"Gliederung",
			"Altersklasse",
			"Geschlecht",
			"Punkte 1",
			"Punkte"
		];
		const result = readJAuswertungResults(
			workbook([header, [9, 2, "Beispielhausen 1", "", "Beispielhausen", "AK 10", "männlich", 99, 50]])
		);
		expect(result.rows[0].place).toBe(2);
		expect(result.rows[0].competitionPoints).toBe(50);
		expect(result.rows[0].members).toEqual([]);
	});

	it("nimmt bei doppelten Überschriften die erste Spalte", () => {
		const header: Cell[] = [...TEAM_HEADER, "Platz"];
		const row: Cell[] = [3, "Team", "", "", "Org", "", "AK 12", "weiblich", "", 0, 1, 0, "", "", "", 8];
		expect(readJAuswertungResults(workbook([header, row])).rows[0].place).toBe(3);
	});

	it("unterscheidet leeren, textuellen und ungültigen Platz", () => {
		const base: Cell[] = ["Team", "", "", "Org", "", "AK 12", "weiblich", "", 0, "", 0];
		const result = readJAuswertungResults(
			workbook([TEAM_HEADER, ["", ...base], [" 3 ", ...base], ["DQ", ...base], [2.5, ...base]])
		);
		expect(result.rows.map((r) => r.place)).toEqual([null, 3, null, null]);
		expect(result.rows[0].competitionPoints).toBeNull();
	});

	it("liest Punkte mit Komma oder Punkt als Dezimaltrennzeichen", () => {
		const row = (points: Cell): Cell[] => [1, "Team", "", "", "Org", "", "AK 12", "weiblich", "", 0, points];
		const result = readJAuswertungResults(
			workbook([TEAM_HEADER, row("1234,56"), row("1234.56"), row("abc"), row(null)])
		);
		expect(result.rows.map((r) => r.competitionPoints)).toEqual([1234.56, 1234.56, null, null]);
	});

	it("überspringt leere Zeilen und behält die Quellzeile", () => {
		const result = readJAuswertungResults(
			workbook([TEAM_HEADER, [null, "", "  "], [], [1, "Team", "", "", "Org", "", "AK 12", "weiblich"]])
		);
		expect(result.rows).toHaveLength(1);
		expect(result.rows[0].sourceRow).toBe(3);
	});

	it("erkennt Einzelwettkämpfe ohne Mitglied-Spalten", () => {
		const result = readJAuswertungResults(
			workbook([
				INDIVIDUAL_HEADER,
				[1, "Anna Meier", "Meier", "Anna", 12, "Musterstadt", "AK 12", "weiblich", "800,00"]
			])
		);
		expect(result.kind).toBe("individual");
		expect(result.rows[0].name).toBe("Anna Meier");
		expect(result.rows[0].members).toEqual([]);
		expect(result.rows[0].competitionPoints).toBe(800);
	});

	it("liefert keine Punkte, wenn die Spalte fehlt", () => {
		const header: Cell[] = ["Platz", "Name", "Gliederung", "Altersklasse", "Geschlecht", "Punkte 1"];
		const result = readJAuswertungResults(workbook([header, [1, "Anna Meier", "Org", "AK 12", "weiblich", 10]]));
		expect(result.rows[0].competitionPoints).toBeNull();
	});

	it("findet das Blatt ohne Beachtung der Groß-/Kleinschreibung", () => {
		expect(readJAuswertungResults(workbook([INDIVIDUAL_HEADER], " daten ")).rows).toEqual([]);
	});

	it("meldet ein fehlendes Blatt „Daten“", () => {
		const call = () => readJAuswertungResults(workbook([TEAM_HEADER], "Tabelle1"));
		expect(call).toThrow(ResultsError);
		expect(call).toThrow("Das Blatt „Daten“ fehlt – bitte den Excel-Export aus JAuswertung verwenden.");
	});

	it("meldet fehlende Pflichtspalten", () => {
		const header = TEAM_HEADER.filter((h) => h !== "Gliederung" && h !== "Geschlecht");
		const call = () => readJAuswertungResults(workbook([header]));
		expect(call).toThrow(ResultsError);
		expect(call).toThrow("Im Blatt „Daten“ fehlen die Spalten: Gliederung, Geschlecht.");
	});

	it("meldet ein leeres Blatt als fehlende Spalten", () => {
		expect(() => readJAuswertungResults(workbook([]))).toThrow(ResultsError);
	});
});

describe("workbookYear", () => {
	const NO_PROPERTIES = { created: null, modified: null };
	const ms = (year: number, month = 5) => Date.UTC(year, month, 1);

	it("nimmt das Erstellungsjahr, wenn die Datei später geändert wurde", () => {
		const dates = { createdMs: ms(2025), modifiedMs: ms(2026) };
		expect(workbookYear(NO_PROPERTIES, dates)).toEqual({ year: 2025, creationKnown: true });
	});

	it("erkennt Kopien am älteren Änderungsdatum", () => {
		const dates = { createdMs: ms(2026), modifiedMs: ms(2024) };
		expect(workbookYear(NO_PROPERTIES, dates)).toEqual({ year: 2024, creationKnown: true });
	});

	it("berücksichtigt Dokumenteigenschaften, wenn vorhanden", () => {
		const properties = { created: "2023-06-01T10:00:00Z", modified: "2026-06-01T10:00:00Z" };
		expect(workbookYear(properties, { createdMs: ms(2026), modifiedMs: ms(2026) }).year).toBe(2023);
	});

	it("ignoriert fehlende und ungültige Angaben", () => {
		const properties = { created: null, modified: "kein Datum" };
		expect(workbookYear(properties, { createdMs: ms(2026), modifiedMs: null })).toEqual({
			year: 2026,
			creationKnown: true
		});
	});

	it("meldet ein unbekanntes Erstellungsdatum", () => {
		expect(workbookYear(NO_PROPERTIES, { createdMs: null, modifiedMs: ms(2026) })).toEqual({
			year: 2026,
			creationKnown: false
		});
	});

	it("liefert kein Jahr ohne jede Angabe", () => {
		expect(workbookYear(NO_PROPERTIES, { createdMs: null, modifiedMs: null })).toEqual({
			year: null,
			creationKnown: false
		});
	});
});

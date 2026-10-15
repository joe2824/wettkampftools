import { describe, expect, it } from "vitest";
import type { Cell, Workbook } from "$lib/platform/workbook";
import { extractBestTimes, parseBestTimes } from "./bestTimes";

const HUNDREDTHS_PER_DAY = 24 * 60 * 60 * 100;
const excelTime = (hundredths: number): number => hundredths / HUNDREDTHS_PER_DAY;
const HEADER: Cell[] = ["Platz", "Name", "Mitglied 1", "Gliederung", "Altersklasse", "Geschlecht", "Punkte",
	"Platz 1", "Zeit 1", "Punkte 1", "Strafe 1", "Platz 2", "Zeit 2", "Punkte 2", "Strafe 2"];

function row(ageGroup: string, gender: string, time1: Cell, penalty1: Cell, time2: Cell = "", penalty2: Cell = ""): Cell[] {
	return [1, "Musterstadt", "Anna Meier", "Musterstadt", ageGroup, gender, 100, 1, time1, 50, penalty1, 1, time2, 50, penalty2];
}

const workbookOf = (rows: Cell[][]): Workbook => ({
	sheets: [{ name: "Daten", rows: [HEADER, ...rows] }],
	properties: { created: null, modified: null }
});

describe("extractBestTimes", () => {
	it("nimmt je Altersklasse, Geschlecht und Disziplin die schnellste gültige Zeit", () => {
		const best = extractBestTimes(
			workbookOf([
				row("AkW offen", "weiblich", excelTime(21000), "", excelTime(10600), " "),
				row("AkW offen", "weiblich", excelTime(20500), 0, excelTime(10700), "0"),
				row("AkW offen", "männlich", "2:45,10", "", "", "")
			]),
			2025
		);
		expect(best).toEqual({
			year: 2025,
			entries: [
				{ ageGroup: "AkW offen", gender: "female", disciplineIndex: 0, time: 20500 },
				{ ageGroup: "AkW offen", gender: "female", disciplineIndex: 1, time: 10600 },
				{ ageGroup: "AkW offen", gender: "male", disciplineIndex: 0, time: 16510 }
			]
		});
	});

	it("übergeht Zeiten mit Strafe, Disqualifikation oder ohne Wert", () => {
		const best = extractBestTimes(
			workbookOf([
				row("AkW 13/14", "weiblich", excelTime(15000), "disq."),
				row("AkW 13/14", "weiblich", excelTime(15100), "n.a."),
				row("AkW 13/14", "weiblich", excelTime(15200), 200),
				row("AkW 13/14", "weiblich", "", ""),
				row("AkW 13/14", "weiblich", 0, ""),
				row("AkW 13/14", "weiblich", excelTime(16000), "")
			]),
			2025
		);
		expect(best.entries).toEqual([{ ageGroup: "AkW 13/14", gender: "female", disciplineIndex: 0, time: 16000 }]);
	});

	it("übergeht unbekannte Geschlechter und Zeilen ohne Altersklasse", () => {
		const best = extractBestTimes(workbookOf([row("AkW offen", "mixed", excelTime(100), ""), row("", "weiblich", excelTime(100), "")]), 2025);
		expect(best.entries).toEqual([]);
	});

	it("braucht das Blatt „Daten“", () => {
		expect(() => extractBestTimes({ sheets: [], properties: { created: null, modified: null } }, 2025)).toThrow();
	});
});

describe("parseBestTimes", () => {
	it("übernimmt gespeicherte Bestzeiten", () => {
		const data = { year: 2025, entries: [{ ageGroup: "AkW offen", gender: "male", disciplineIndex: 0, time: 16510 }] };
		expect(parseBestTimes(data)).toEqual(data);
	});

	it("verwirft Ungültiges", () => {
		expect(parseBestTimes(null)).toBeNull();
		expect(parseBestTimes({ year: "2025", entries: [] })).toBeNull();
		expect(parseBestTimes({ year: 2025, entries: [{ ageGroup: "A", gender: "x", disciplineIndex: 0, time: 1 }] })).toBeNull();
	});
});

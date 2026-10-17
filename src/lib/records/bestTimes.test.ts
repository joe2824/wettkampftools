import { describe, expect, it } from "vitest";
import type { Cell, Workbook } from "$lib/platform/workbook";
import { bestTimeKey, compareEntries, extractBestTimes, parseBestTimes } from "./bestTimes";

const HUNDREDTHS_PER_DAY = 24 * 60 * 60 * 100;
const excelTime = (hundredths: number): number => hundredths / HUNDREDTHS_PER_DAY;
const WAVE = "4*50m Retten in der Welle mit Gurtretter;4*50m Retten in der Welle";
const RESCUE = "4*25m Rettungsstaffel;4*25m RLB";
const HEADER: Cell[] = [
	"Platz",
	"Name",
	"Mitglied 1",
	"Gliederung",
	"Altersklasse",
	"Geschlecht",
	"Punkte",
	"Disziplinen",
	"Platz 1",
	"Zeit 1",
	"Punkte 1",
	"Strafe 1",
	"Platz 2",
	"Zeit 2",
	"Punkte 2",
	"Strafe 2"
];

function row(
	ageGroup: string,
	gender: string,
	time1: Cell,
	penalty1: Cell,
	time2: Cell = "",
	penalty2: Cell = "",
	disciplines: string = WAVE
): Cell[] {
	return [
		1,
		"Musterstadt",
		"Anna Meier",
		"Musterstadt",
		ageGroup,
		gender,
		100,
		disciplines,
		1,
		time1,
		50,
		penalty1,
		1,
		time2,
		50,
		penalty2
	];
}

const workbookOf = (rows: Cell[][]): Workbook => ({
	sheets: [{ name: "Daten", rows: [HEADER, ...rows] }],
	properties: { created: null, modified: null }
});

describe("extractBestTimes", () => {
	it("nimmt je Altersklasse, Geschlecht und Disziplin die schnellste gültige Zeit", () => {
		const best = extractBestTimes(
			workbookOf([
				row("AkW offen", "weiblich", excelTime(10600), "", excelTime(21000), " "),
				row("AkW offen", "weiblich", excelTime(10700), 0, excelTime(20500), "0"),
				row("AkW offen", "männlich", "1:45,10", "-", "", "")
			]),
			2025
		);
		expect(best).toEqual({
			year: 2025,
			entries: [
				{
					ageGroup: "AkW offen",
					gender: "female",
					discipline: "4*50m Retten in der Welle",
					time: 20500,
					slowest: 21000,
					average: 20750,
					teams: 2
				},
				{
					ageGroup: "AkW offen",
					gender: "female",
					discipline: "4*50m Retten in der Welle mit Gurtretter",
					time: 10600,
					slowest: 10700,
					average: 10650,
					teams: 2
				},
				{
					ageGroup: "AkW offen",
					gender: "male",
					discipline: "4*50m Retten in der Welle mit Gurtretter",
					time: 10510,
					slowest: 10510,
					average: 10510,
					teams: 1
				}
			]
		});
	});

	it("zählt Zeiten mit Strafe für Durchschnitt und längste Zeit, aber nicht als Bestzeit", () => {
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
		expect(best.entries).toEqual([
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 16000,
				slowest: 16000,
				average: Math.round((15000 + 15100 + 15200 + 16000) / 4),
				teams: 4
			}
		]);
	});

	it("lässt eine Gruppe ohne straffreie Zeit weg", () => {
		const best = extractBestTimes(workbookOf([row("AkW 13/14", "weiblich", excelTime(15000), "disq.")]), 2025);
		expect(best.entries).toEqual([]);
	});

	it("nimmt nur Wellendisziplinen", () => {
		const best = extractBestTimes(
			workbookOf([row("AK 12", "weiblich", excelTime(6000), "", excelTime(8000), "", RESCUE)]),
			2025
		);
		expect(best.entries).toEqual([]);
	});

	it("übergeht unbekannte Geschlechter und Zeilen ohne Altersklasse", () => {
		const best = extractBestTimes(
			workbookOf([row("AkW offen", "mixed", excelTime(100), ""), row("", "weiblich", excelTime(100), "")]),
			2025
		);
		expect(best.entries).toEqual([]);
	});

	it("braucht das Blatt „Daten“", () => {
		expect(() => extractBestTimes({ sheets: [], properties: { created: null, modified: null } }, 2025)).toThrow();
	});
});

describe("bestTimeKey", () => {
	it("ignoriert Schreibweise und Leerzeichen", () => {
		const a = { ageGroup: "AkW offen", gender: "female" as const, discipline: "4*50m Retten in der Welle" };
		const b = { ageGroup: " AkW Offen", gender: "female" as const, discipline: "4*50M Retten in der Welle " };
		expect(bestTimeKey(a)).toBe(bestTimeKey(b));
		expect(bestTimeKey(a)).not.toBe(bestTimeKey({ ...a, gender: "male" }));
	});
});

describe("compareEntries", () => {
	it("sortiert nach Altersklasse, weiblich vor männlich, dann Disziplin", () => {
		const entries = [
			{ ageGroup: "AkW offen", gender: "male" as const, discipline: "B" },
			{ ageGroup: "AkW offen", gender: "female" as const, discipline: "B" },
			{ ageGroup: "AkW offen", gender: "female" as const, discipline: "A" },
			{ ageGroup: "AkW 13/14", gender: "male" as const, discipline: "B" }
		];
		expect([...entries].sort(compareEntries).map((e) => `${e.ageGroup} ${e.gender} ${e.discipline}`)).toEqual([
			"AkW 13/14 male B",
			"AkW offen female A",
			"AkW offen female B",
			"AkW offen male B"
		]);
	});
});

describe("parseBestTimes", () => {
	it("übernimmt gespeicherte Bestzeiten", () => {
		const data = {
			year: 2025,
			entries: [
				{
					ageGroup: "AkW offen",
					gender: "male",
					discipline: "4*50m Retten in der Welle",
					time: 16510,
					slowest: 18000,
					average: 17000,
					teams: 3
				}
			]
		};
		expect(parseBestTimes(data)).toEqual(data);
	});

	it("verwirft Ungültiges und das alte Format ohne Disziplinnamen", () => {
		expect(parseBestTimes(null)).toBeNull();
		expect(parseBestTimes({ year: "2025", entries: [] })).toBeNull();
		expect(
			parseBestTimes({ year: 2025, entries: [{ ageGroup: "A", gender: "x", discipline: "B", time: 1 }] })
		).toBeNull();
		expect(
			parseBestTimes({ year: 2025, entries: [{ ageGroup: "A", gender: "male", disciplineIndex: 0, time: 1 }] })
		).toBeNull();
		expect(
			parseBestTimes({ year: 2025, entries: [{ ageGroup: "A", gender: "male", discipline: "B", time: 1 }] })
		).toBeNull();
	});
});

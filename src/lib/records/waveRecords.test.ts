import { describe, expect, it } from "vitest";
import type { BestTimes } from "./bestTimes";
import {
	currentDisciplines,
	findNewRecords,
	findRecord,
	mergeYears,
	waveRecordTable,
	waveStatistics,
	waveYearSeries
} from "./waveRecords";

const RETTEN = "4*50m Retten in der Welle";
const GURT = "4*50m Retten in der Welle mit Gurtretter";
const entry = (ageGroup: string, gender: "female" | "male", discipline: string, time: number, teams = 1) => ({
	ageGroup,
	gender,
	discipline,
	time,
	slowest: time + 1000,
	average: time + 500,
	teams
});

const Y2019: BestTimes = {
	year: 2019,
	entries: [entry("AkW offen", "male", RETTEN, 16221), entry("AkW offen", "male", GURT, 9913)]
};
const Y2024: BestTimes = {
	year: 2024,
	entries: [entry("AkW offen", "male", RETTEN, 16221), entry("AkW offen", "female", RETTEN, 21203)]
};
const Y2025: BestTimes = {
	year: 2025,
	entries: [
		entry("AkW offen", "male", RETTEN, 16000),
		entry("AkW offen", "female", RETTEN, 21300),
		entry("AkW 13/14", "female", GURT, 11660)
	]
};

describe("mergeYears", () => {
	it("ersetzt gleiche Jahre durch die gespeicherten und sortiert aufsteigend", () => {
		const stored: BestTimes = { year: 2024, entries: [entry("AkW offen", "male", RETTEN, 16100)] };
		const merged = mergeYears([Y2024, Y2019], [stored, Y2025]);
		expect(merged.map((year) => year.year)).toEqual([2019, 2024, 2025]);
		expect(merged[1]).toBe(stored);
	});
});

describe("waveRecordTable", () => {
	it("nimmt je Altersklasse, Geschlecht und Disziplin die schnellste Zeit und nennt das Jahr", () => {
		const table = waveRecordTable([Y2025, Y2019, Y2024]);
		expect(table).toEqual([
			{ ...entry("AkW 13/14", "female", GURT, 11660), year: 2025 },
			{ ...entry("AkW offen", "female", RETTEN, 21203), year: 2024 },
			{ ...entry("AkW offen", "male", RETTEN, 16000), year: 2025 },
			{ ...entry("AkW offen", "male", GURT, 9913), year: 2019 }
		]);
	});

	it("zählt bei Gleichstand das frühere Jahr", () => {
		expect(findRecord(waveRecordTable([Y2024, Y2019]), entry("AkW offen", "male", RETTEN, 0))).toMatchObject({
			time: 16221,
			year: 2019
		});
	});
});

describe("findRecord", () => {
	it("findet den Rekord unabhängig von der Schreibweise", () => {
		const table = waveRecordTable([Y2025]);
		expect(findRecord(table, entry("akw offen", "male", RETTEN.toUpperCase(), 0))?.time).toBe(16000);
		expect(findRecord(table, entry("AkW 15/16", "male", RETTEN, 0))).toBeUndefined();
	});
});

describe("waveStatistics", () => {
	it("rechnet Durchschnitt über alle Mannschaften, längste Zeit mit Jahr und Mannschaften je Wettkampf", () => {
		const a: BestTimes = { year: 2024, entries: [entry("AkW offen", "male", RETTEN, 16000, 4)] };
		const b: BestTimes = { year: 2025, entries: [entry("AkW offen", "male", RETTEN, 17000, 2)] };
		const [statistic] = waveStatistics([b, a]);
		expect(statistic).toMatchObject({
			ageGroup: "AkW offen",
			gender: "male",
			discipline: RETTEN,
			record: { time: 16000, year: 2024 },
			average: Math.round((16500 * 4 + 17500 * 2) / 6),
			slowest: 18000,
			slowestYear: 2025,
			teamsPerYear: 3,
			years: 2
		});
	});

	it("liefert je Altersklasse, Geschlecht und Disziplin genau eine Zeile", () => {
		expect(waveStatistics([Y2019, Y2024, Y2025])).toHaveLength(4);
	});
});

describe("waveYearSeries", () => {
	it("liefert den Verlauf einer Gruppe nach Jahr aufsteigend, Schreibweise egal", () => {
		const series = waveYearSeries([Y2025, Y2019, Y2024], entry("akw offen", "male", RETTEN, 0));
		expect(series.map((point) => point.year)).toEqual([2019, 2024, 2025]);
		expect(series[2]).toEqual({ year: 2025, time: 16000, average: 16500, slowest: 17000, teams: 1 });
	});
});

describe("currentDisciplines", () => {
	it("nennt die Disziplinen des jüngsten Jahres", () => {
		expect(currentDisciplines([Y2019, Y2025, Y2024])).toEqual([RETTEN, GURT]);
		expect(currentDisciplines([])).toEqual([]);
	});
});

describe("findNewRecords", () => {
	it("meldet Zeiten, die alle anderen Jahre unterbieten, und erste Zeiten einer Disziplin", () => {
		expect(findNewRecords(Y2025, [Y2019, Y2024, Y2025])).toEqual([
			{
				record: { ...entry("AkW offen", "male", RETTEN, 16000), year: 2025 },
				previous: { ...entry("AkW offen", "male", RETTEN, 16221), year: 2019 }
			},
			{ record: { ...entry("AkW 13/14", "female", GURT, 11660), year: 2025 }, previous: null }
		]);
	});

	it("vergleicht nicht mit dem eigenen Jahr", () => {
		const slower: BestTimes = { year: 2025, entries: [entry("AkW offen", "male", RETTEN, 16500)] };
		expect(findNewRecords(slower, [Y2019, Y2025])).toEqual([]);
		expect(findNewRecords(Y2025, [Y2025])).toHaveLength(3);
	});
});

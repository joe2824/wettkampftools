import { describe, expect, it } from "vitest";
import type { BestTimes } from "$lib/records/bestTimes";
import { waveStatistics } from "$lib/records/waveRecords";
import { applyFilter, chartSeries, disciplinesLabel, EMPTY_FILTER, filterOptions } from "./waveTimesFilter";

const RETTEN = "4*50m Retten in der Welle";
const GURT = "4*50m Retten in der Welle mit Gurtretter";
const entry = (ageGroup: string, gender: "female" | "male", discipline: string, time: number) => ({
	ageGroup,
	gender,
	discipline,
	time,
	slowest: time + 1000,
	average: time + 500,
	teams: 3
});
const HISTORY: BestTimes[] = [
	{ year: 2024, entries: [entry("AkW offen", "male", RETTEN, 16500), entry("AkW offen", "female", RETTEN, 20000)] },
	{
		year: 2025,
		entries: [
			entry("AkW offen", "male", RETTEN, 16000),
			entry("AkW offen", "female", RETTEN, 20500),
			entry("AkW 13/14", "male", GURT, 12000)
		]
	}
];
const STATISTICS = waveStatistics(HISTORY);

describe("filterOptions", () => {
	it("nennt Altersklassen und Disziplinen in Reihenfolge der Statistik", () => {
		expect(filterOptions(STATISTICS)).toEqual({ ageGroups: ["AkW 13/14", "AkW offen"], disciplines: [GURT, RETTEN] });
	});
});

describe("disciplinesLabel", () => {
	it("beschreibt die Auswahl kurz", () => {
		expect(disciplinesLabel([], [RETTEN, GURT])).toBe("Keine");
		expect(disciplinesLabel([RETTEN], [RETTEN, GURT])).toBe(RETTEN);
		expect(disciplinesLabel([RETTEN, GURT], [RETTEN, GURT, "x"])).toBe("2 von 3");
		expect(disciplinesLabel([RETTEN, GURT], [RETTEN, GURT])).toBe("Alle");
	});
});

describe("applyFilter", () => {
	it("filtert nach Altersklasse, Geschlecht und Disziplin; null heißt alle", () => {
		const all = { ...EMPTY_FILTER, disciplines: [RETTEN, GURT] };
		expect(applyFilter(STATISTICS, all)).toHaveLength(3);
		expect(applyFilter(STATISTICS, EMPTY_FILTER)).toHaveLength(0);
		expect(applyFilter(STATISTICS, { ageGroup: "AkW offen", gender: null, disciplines: [RETTEN, GURT] })).toHaveLength(
			2
		);
		expect(applyFilter(STATISTICS, { ageGroup: null, gender: "male", disciplines: [RETTEN] })).toHaveLength(1);
	});
});

describe("chartSeries", () => {
	it("zeigt für eine Gruppe Schnellste, Durchschnitt und Längste je Jahr", () => {
		const single = applyFilter(STATISTICS, { ageGroup: "AkW offen", gender: "male", disciplines: [RETTEN] });
		const series = chartSeries(HISTORY, single, { ...EMPTY_FILTER, disciplines: [RETTEN, GURT] });
		expect(series.map((line) => line.label)).toEqual(["Schnellste", "Durchschnitt", "Längste"]);
		expect(series[0].points).toEqual([
			{ year: 2024, value: 16500 },
			{ year: 2025, value: 16000 }
		]);
		expect(series[2].points[1]).toEqual({ year: 2025, value: 17000 });
	});

	it("zeigt für mehrere Gruppen den Durchschnitt je Gruppe, ohne Disziplin im Namen bei Disziplin-Filter", () => {
		const filter = { ageGroup: "AkW offen", gender: null, disciplines: [RETTEN] };
		const series = chartSeries(HISTORY, applyFilter(STATISTICS, filter), filter);
		expect(series.map((line) => line.label)).toEqual(["AkW offen weiblich", "AkW offen männlich"]);
		expect(series[1].points).toEqual([
			{ year: 2024, value: 17000 },
			{ year: 2025, value: 16500 }
		]);
	});

	it("nennt die Disziplin, wenn nicht danach gefiltert wird", () => {
		const series = chartSeries(HISTORY, STATISTICS, { ...EMPTY_FILTER, disciplines: [RETTEN, GURT] });
		expect(series[0].label).toBe(`AkW 13/14 männlich · ${GURT}`);
	});
});

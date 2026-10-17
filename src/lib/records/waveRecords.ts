// Rekorde der Wellendisziplinen über alle Jahre: mitgelieferte Geschichte plus gespeicherte Bestzeiten.
import { bestTimeKey, compareEntries, type BestTimeEntry, type BestTimes, type BestTimeTarget } from "./bestTimes";

export interface WaveRecord extends BestTimeEntry {
	year: number;
}

/** Kennzahlen über alle Jahre fürs Planen des Zeitplans. */
export interface WaveStatistic extends BestTimeTarget {
	record: WaveRecord;
	/** Durchschnitt aller Mannschaften aller Jahre. */
	average: number;
	slowest: number;
	slowestYear: number;
	/** Mannschaften je Wettkampf im Durchschnitt. */
	teamsPerYear: number;
	/** Jahre mit Zeiten. */
	years: number;
}

export interface NewWaveRecord {
	record: WaveRecord;
	/** Bisheriger Rekord; null, wenn die Disziplin noch keinen hatte. */
	previous: WaveRecord | null;
}

/** Gespeicherte Jahre ersetzen gleiche Jahre der Geschichte; Ergebnis nach Jahr aufsteigend. */
export function mergeYears(history: readonly BestTimes[], stored: readonly BestTimes[]): BestTimes[] {
	const byYear = new Map<number, BestTimes>();
	for (const year of [...history, ...stored]) byYear.set(year.year, year);
	return [...byYear.values()].sort((a, b) => a.year - b.year);
}

/** Schnellste Zeit je Altersklasse, Geschlecht und Disziplin; bei Gleichstand zählt das frühere Jahr. */
export function waveRecordTable(years: readonly BestTimes[]): WaveRecord[] {
	const best = new Map<string, WaveRecord>();
	for (const { year, entries } of [...years].sort((a, b) => a.year - b.year)) {
		for (const entry of entries) {
			const key = bestTimeKey(entry);
			const current = best.get(key);
			if (!current || entry.time < current.time) best.set(key, { ...entry, year });
		}
	}
	return [...best.values()].sort(compareEntries);
}

/** Rekord, Durchschnitt, langsamste Zeit und Mannschaften je Altersklasse, Geschlecht und Disziplin. */
export function waveStatistics(years: readonly BestTimes[]): WaveStatistic[] {
	const records = waveRecordTable(years);
	const sums = new Map<string, { total: number; teams: number; slowest: number; slowestYear: number; years: number }>();
	for (const { year, entries } of [...years].sort((a, b) => a.year - b.year)) {
		for (const entry of entries) {
			const key = bestTimeKey(entry);
			const sum = sums.get(key) ?? { total: 0, teams: 0, slowest: 0, slowestYear: year, years: 0 };
			sum.total += entry.average * entry.teams;
			sum.teams += entry.teams;
			sum.years += 1;
			if (entry.slowest > sum.slowest) Object.assign(sum, { slowest: entry.slowest, slowestYear: year });
			sums.set(key, sum);
		}
	}
	return records.map((record) => {
		const sum = sums.get(bestTimeKey(record))!;
		const { ageGroup, gender, discipline } = record;
		return {
			ageGroup,
			gender,
			discipline,
			record,
			average: Math.round(sum.total / sum.teams),
			slowest: sum.slowest,
			slowestYear: sum.slowestYear,
			teamsPerYear: Math.round((sum.teams / sum.years) * 10) / 10,
			years: sum.years
		};
	});
}

export interface YearPoint {
	year: number;
	time: number;
	average: number;
	slowest: number;
	teams: number;
}

/** Verlauf einer Altersklasse, eines Geschlechts und einer Disziplin über die Jahre, aufsteigend. */
export function waveYearSeries(years: readonly BestTimes[], target: BestTimeTarget): YearPoint[] {
	const key = bestTimeKey(target);
	return [...years]
		.sort((a, b) => a.year - b.year)
		.flatMap(({ year, entries }) => {
			const entry = entries.find((candidate) => bestTimeKey(candidate) === key);
			return entry
				? [{ year, time: entry.time, average: entry.average, slowest: entry.slowest, teams: entry.teams }]
				: [];
		});
}

/** Disziplinen des jüngsten Jahres mit Zeiten; ältere, nicht mehr geschwommene Disziplinen fehlen. */
export function currentDisciplines(years: readonly BestTimes[]): string[] {
	const latest = [...years].sort((a, b) => b.year - a.year)[0];
	return latest ? [...new Set(latest.entries.map((entry) => entry.discipline))] : [];
}

export function findRecord(table: readonly WaveRecord[], target: BestTimeTarget): WaveRecord | undefined {
	const key = bestTimeKey(target);
	return table.find((record) => bestTimeKey(record) === key);
}

/** Zeiten eines Wettkampfs, die den Rekord aller anderen Jahre unterbieten; die erste Zeit einer Disziplin zählt mit. */
export function findNewRecords(current: BestTimes, years: readonly BestTimes[]): NewWaveRecord[] {
	const others = waveRecordTable(years.filter((year) => year.year !== current.year));
	return current.entries.flatMap((entry) => {
		const previous = findRecord(others, entry) ?? null;
		if (previous !== null && entry.time >= previous.time) return [];
		return [{ record: { ...entry, year: current.year }, previous }];
	});
}

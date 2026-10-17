// Filter und Verläufe für die Seite „Wellen-Zeiten“.
import type { BestTimes } from "$lib/records/bestTimes";
import type { RecordGender } from "$lib/records/rulebookRecords";
import { waveYearSeries, type WaveStatistic } from "$lib/records/waveRecords";

export interface WaveFilter {
	/** null = alle. */
	ageGroup: string | null;
	gender: RecordGender | null;
	/** Angewählte Disziplinen; leer = keine. */
	disciplines: string[];
}

export const EMPTY_FILTER: WaveFilter = { ageGroup: null, gender: null, disciplines: [] };

export interface FilterOptions {
	ageGroups: string[];
	disciplines: string[];
}

export const GENDER_LABELS: Record<RecordGender, string> = { female: "weiblich", male: "männlich" };

/** Auswahlmöglichkeiten in der Reihenfolge der Statistik. */
export function filterOptions(statistics: readonly WaveStatistic[]): FilterOptions {
	return {
		ageGroups: [...new Set(statistics.map((statistic) => statistic.ageGroup))],
		disciplines: [...new Set(statistics.map((statistic) => statistic.discipline))]
	};
}

export function applyFilter(statistics: readonly WaveStatistic[], filter: WaveFilter): WaveStatistic[] {
	return statistics.filter(
		(statistic) =>
			(filter.ageGroup === null || statistic.ageGroup === filter.ageGroup) &&
			(filter.gender === null || statistic.gender === filter.gender) &&
			filter.disciplines.includes(statistic.discipline)
	);
}

/** Beschriftung der Disziplin-Auswahl: „Alle“, „Keine“, der eine Name oder „2 von 3“. */
export function disciplinesLabel(selected: readonly string[], options: readonly string[]): string {
	if (selected.length === 0) return "Keine";
	if (selected.length === 1) return selected[0];
	return selected.length === options.length ? "Alle" : `${selected.length} von ${options.length}`;
}

export interface ChartPoint {
	year: number;
	/** Hundertstelsekunden. */
	value: number;
}

export interface ChartSeries {
	label: string;
	points: ChartPoint[];
}

/** Höchstens so viele Linien, damit die Grafik lesbar bleibt. */
export const MAX_SERIES = 12;

function seriesLabel(statistic: WaveStatistic, filter: WaveFilter): string {
	const parts = [`${statistic.ageGroup} ${GENDER_LABELS[statistic.gender]}`];
	if (filter.disciplines.length !== 1) parts.push(statistic.discipline);
	return parts.join(" · ");
}

/**
 * Eine Gruppe: Rekord, Durchschnitt und längste Zeit je Jahr.
 * Mehrere Gruppen: je Gruppe der Durchschnitt je Jahr.
 */
export function chartSeries(
	history: readonly BestTimes[],
	statistics: readonly WaveStatistic[],
	filter: WaveFilter
): ChartSeries[] {
	if (statistics.length === 1) {
		const points = waveYearSeries(history, statistics[0]);
		return [
			{ label: "Schnellste", points: points.map(({ year, time }) => ({ year, value: time })) },
			{ label: "Durchschnitt", points: points.map(({ year, average }) => ({ year, value: average })) },
			{ label: "Längste", points: points.map(({ year, slowest }) => ({ year, value: slowest })) }
		];
	}
	return statistics.slice(0, MAX_SERIES).map((statistic) => ({
		label: seriesLabel(statistic, filter),
		points: waveYearSeries(history, statistic).map(({ year, average }) => ({ year, value: average }))
	}));
}

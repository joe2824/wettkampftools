// Grobe Dauer des Wellenwettkampfs aus den gemeldeten Wellen-Mannschaften und den Durchschnittszeiten früherer Jahre.
import { parseGender, type BestTimeTarget } from "$lib/records/bestTimes";
import type { RecordGender } from "$lib/records/rulebookRecords";
import type { WaveStatistic } from "$lib/records/waveRecords";
import { toWaveAgeGroup } from "./ageGroups";
import type { Team } from "./registrations";

export interface WaveStartGroup {
	ageGroup: string;
	gender: RecordGender;
	teams: number;
}

export interface EstimateOptions {
	/** Mannschaften, die gleichzeitig starten. */
	teamsPerHeat: number;
	/** Pause zwischen zwei Läufen in Sekunden. */
	pauseS: number;
}

export interface DisciplineEstimate {
	discipline: string;
	teams: number;
	heats: number;
	/** Hundertstelsekunden. */
	duration: number;
	/** Gruppen ohne eigene Erfahrungswerte; dort gilt der Durchschnitt der Disziplin. */
	unknownGroups: string[];
}

export interface WaveEstimate {
	disciplines: DisciplineEstimate[];
	teams: number;
	/** Hundertstelsekunden, alle Disziplinen zusammen. */
	duration: number;
}

const HUNDREDTHS_PER_SECOND = 100;
const GENDER_LABELS: Record<RecordGender, string> = { female: "weiblich", male: "männlich" };

const normalize = (text: string): string => text.trim().toLowerCase();
const groupKey = ({ ageGroup, gender }: Pick<BestTimeTarget, "ageGroup" | "gender">): string =>
	`${normalize(ageGroup)}|${gender}`;

/** Gemeldete Wellen-Mannschaften je Wellen-Altersklasse und Geschlecht. */
export function countWaveStarts(teams: readonly Team[], selection: ReadonlySet<string>): WaveStartGroup[] {
	const groups = new Map<string, WaveStartGroup>();
	for (const team of teams) {
		if (!selection.has(team.id)) continue;
		const gender = parseGender(team.gender);
		if (gender === undefined) continue;
		const ageGroup = toWaveAgeGroup(team.ageGroup);
		const key = groupKey({ ageGroup, gender });
		const group = groups.get(key) ?? { ageGroup, gender, teams: 0 };
		group.teams += 1;
		groups.set(key, group);
	}
	return [...groups.values()];
}

function disciplineAverage(statistics: readonly WaveStatistic[]): number | null {
	let total = 0;
	let teams = 0;
	for (const statistic of statistics) {
		total += statistic.average * statistic.teamsPerYear;
		teams += statistic.teamsPerYear;
	}
	return teams > 0 ? Math.round(total / teams) : null;
}

function estimateDiscipline(
	discipline: string,
	starts: readonly WaveStartGroup[],
	statistics: readonly WaveStatistic[],
	options: EstimateOptions
): DisciplineEstimate | null {
	const own = statistics.filter((statistic) => normalize(statistic.discipline) === normalize(discipline));
	const fallback = disciplineAverage(own);
	if (fallback === null) return null;
	const pause = options.pauseS * HUNDREDTHS_PER_SECOND;
	const teamsPerHeat = Math.max(1, Math.floor(options.teamsPerHeat));
	let duration = 0;
	let heats = 0;
	let teams = 0;
	const unknownGroups: string[] = [];
	for (const group of starts) {
		const statistic = own.find((candidate) => groupKey(candidate) === groupKey(group));
		if (!statistic) unknownGroups.push(`${group.ageGroup} ${GENDER_LABELS[group.gender]}`);
		const groupHeats = Math.ceil(group.teams / teamsPerHeat);
		heats += groupHeats;
		teams += group.teams;
		duration += groupHeats * ((statistic?.average ?? fallback) + pause);
	}
	return { discipline, teams, heats, duration, unknownGroups };
}

/** Je Disziplin: Läufe mal (Durchschnittszeit der Gruppe plus Pause). Ohne Erfahrungswerte zur Disziplin entfällt sie. */
export function estimateWaveDuration(
	starts: readonly WaveStartGroup[],
	statistics: readonly WaveStatistic[],
	disciplines: readonly string[],
	options: EstimateOptions
): WaveEstimate {
	const estimates = disciplines.flatMap((discipline) => {
		const estimate = estimateDiscipline(discipline, starts, statistics, options);
		return estimate === null ? [] : [estimate];
	});
	return {
		disciplines: estimates,
		teams: starts.reduce((sum, group) => sum + group.teams, 0),
		duration: estimates.reduce((sum, estimate) => sum + estimate.duration, 0)
	};
}

/** „1 h 25 min“ oder „45 min“. */
export function formatDuration(hundredths: number): string {
	const minutes = Math.round(hundredths / HUNDREDTHS_PER_SECOND / 60);
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	return hours > 0 ? `${hours} h ${rest} min` : `${minutes} min`;
}

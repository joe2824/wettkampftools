/*
 * Pokalwertung der WWK: Pokalpunkte je Gruppe (Altersklasse, Geschlecht) und
 * Gesamtwertung je Ortsgruppe, getrennt nach Rettung und Welle.
 * Grundlage ist allein der Platz aus JAuswertung.
 */
import { classifyAgeGroup, compareAgeGroups, matchAgeGroup, type AgeGroupKind } from "./ageGroups";
import type { ResultRow } from "./results";

export interface ScoringOptions {
	excludeUnplaced: boolean;
}

export interface ScoredTeam {
	row: ResultRow;
	ageGroup: string;
	kind: AgeGroupKind;
	gender: string;
	place: number | null;
	n: number;
	trophyPoints: number;
	formula: string;
	warning?: "placeAboveCount";
}

export type NotScoredReason = "unknownAgeGroup" | "unplaced";

export interface NotScored {
	row: ResultRow;
	reason: NotScoredReason;
	message: string;
}

export interface ScoringResult {
	scored: ScoredTeam[];
	notScored: NotScored[];
}

export interface Standing {
	rank: number;
	organisation: string;
	trophyPoints: number;
	teams: ScoredTeam[];
}

export interface Ranking {
	standings: Standing[];
	tieForFirst: boolean;
}

const FIRST_PLACE = 1;
const BONUS_POINT = 1;
const MIN_POINTS = 0;

const NOT_SCORED_MESSAGES: Record<NotScoredReason, string> = {
	unknownAgeGroup: "Altersklasse unbekannt",
	unplaced: "ohne Platz",
};

interface GroupedRow {
	row: ResultRow;
	ageGroup: string;
	kind: AgeGroupKind;
	gender: string;
}

/** Platz 1: n + 1; sonst n + 1 − Platz; nie unter 0. */
export function trophyPointsFor(place: number, n: number): number {
	const raw = place === FIRST_PLACE ? n + BONUS_POINT : n + BONUS_POINT - place;
	return Math.max(MIN_POINTS, raw);
}

/** Rechnung mit eingesetzten Zahlen für die Aufschlüsselung. */
export function trophyFormula(place: number | null, n: number): string {
	if (place === null) return `ohne Platz = ${MIN_POINTS}`;
	if (place === FIRST_PLACE) return `${n} + ${BONUS_POINT} = ${trophyPointsFor(place, n)}`;
	const raw = n + BONUS_POINT - place;
	const sign = raw < MIN_POINTS ? "→" : "=";
	return `${n} + ${BONUS_POINT} − ${place} ${sign} ${trophyPointsFor(place, n)}`;
}

function notScored(row: ResultRow, reason: NotScoredReason): NotScored {
	return { row, reason, message: NOT_SCORED_MESSAGES[reason] };
}

function groupKey(entry: GroupedRow): string {
	return `${entry.ageGroup}\u0000${entry.gender.toLowerCase()}`;
}

function classify(row: ResultRow, order: readonly string[]): GroupedRow | null {
	const match = matchAgeGroup(row.ageGroupRaw, order);
	if (match.kind === "unknown") return null;
	const kind = classifyAgeGroup(match.name, order);
	return kind === null ? null : { row, ageGroup: match.name, kind, gender: row.gender.trim() };
}

function scoreEntry(entry: GroupedRow, n: number): ScoredTeam {
	const place = entry.row.place;
	const team: ScoredTeam = {
		...entry,
		place,
		n,
		trophyPoints: place === null ? MIN_POINTS : trophyPointsFor(place, n),
		formula: trophyFormula(place, n),
	};
	if (place !== null && place > n) team.warning = "placeAboveCount";
	return team;
}

/** Bewertet alle Zeilen; nicht Gewertetes wird mit Grund gesammelt. */
export function scoreTeams(rows: readonly ResultRow[], order: readonly string[], options: ScoringOptions): ScoringResult {
	const result: ScoringResult = { scored: [], notScored: [] };
	const counted: GroupedRow[] = [];
	for (const row of rows) {
		const entry = classify(row, order);
		if (entry === null) result.notScored.push(notScored(row, "unknownAgeGroup"));
		else if (options.excludeUnplaced && row.place === null) result.notScored.push(notScored(row, "unplaced"));
		else counted.push(entry);
	}
	const groupSizes = new Map<string, number>();
	for (const entry of counted) groupSizes.set(groupKey(entry), (groupSizes.get(groupKey(entry)) ?? 0) + 1);
	result.scored = counted.map((entry) => scoreEntry(entry, groupSizes.get(groupKey(entry)) ?? 0));
	return result;
}

function sumByOrganisation(teams: readonly ScoredTeam[]): Map<string, ScoredTeam[]> {
	const byOrganisation = new Map<string, ScoredTeam[]>();
	for (const team of teams) {
		const organisation = team.row.organisation.trim();
		byOrganisation.set(organisation, [...(byOrganisation.get(organisation) ?? []), team]);
	}
	return byOrganisation;
}

function sortTeams(teams: ScoredTeam[], order: readonly string[]): ScoredTeam[] {
	const byAgeGroup = compareAgeGroups(order);
	return [...teams].sort((a, b) => byAgeGroup(a.ageGroup, b.ageGroup) || a.gender.localeCompare(b.gender, "de"));
}

/** Dichte Rangfolge: gleiche Punkte, gleicher Rang; nächster Rang ohne Lücke. */
function assignDenseRanks(standings: Omit<Standing, "rank">[]): Standing[] {
	let rank = 0;
	let previous: number | null = null;
	return standings.map((standing) => {
		if (standing.trophyPoints !== previous) rank += 1;
		previous = standing.trophyPoints;
		return { rank, ...standing };
	});
}

/** Gesamtwertung je Ortsgruppe für Rettung oder Welle. */
export function rankOrganisations(
	scored: readonly ScoredTeam[],
	kind: AgeGroupKind,
	order: readonly string[] = [],
): Ranking {
	const byOrganisation = sumByOrganisation(scored.filter((team) => team.kind === kind));
	const unranked = [...byOrganisation].map(([organisation, teams]) => ({
		organisation,
		trophyPoints: teams.reduce((sum, team) => sum + team.trophyPoints, 0),
		teams: sortTeams(teams, order),
	}));
	unranked.sort((a, b) => b.trophyPoints - a.trophyPoints || a.organisation.localeCompare(b.organisation, "de"));
	const standings = assignDenseRanks(unranked);
	const tieForFirst = standings.filter((standing) => standing.rank === FIRST_PLACE).length > 1;
	return { standings, tieForFirst };
}

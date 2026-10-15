// Excel-Blätter der Pokalwertung: Gesamtwertungen, Aufschlüsselung, Quelldaten mit Pokalpunkten.
import type { Cell, Sheet } from "$lib/platform/workbook";
import type { AgeGroupKind } from "./ageGroups";
import type { NotScored, ScoredTeam, Standing } from "./scoring";

export interface EvaluationInput {
	rescue: Standing[];
	wave: Standing[];
	scored: ScoredTeam[];
	notScored: NotScored[];
	source: Sheet;
}

const TROPHY_POINTS_HEADER = "Pokalpunkte";

const STANDINGS_HEADER: Cell[] = ["Platz", "Gliederung", TROPHY_POINTS_HEADER];
const BREAKDOWN_HEADER: Cell[] = [
	"Wertung",
	"Gliederung",
	"Mannschaft",
	"Altersklasse",
	"Geschlecht",
	"Platz",
	"Anzahl Mannschaften",
	"Rechnung",
	TROPHY_POINTS_HEADER
];
const KIND_LABELS: Record<AgeGroupKind, string> = {
	rescue: "Rettungswertung",
	wave: "Wellenwertung"
};

function standingsSheet(name: string, standings: readonly Standing[]): Sheet {
	const rows = standings.map((s): Cell[] => [s.rank, s.organisation, s.trophyPoints]);
	return { name, rows: [STANDINGS_HEADER, ...rows] };
}

function scoredRow(team: ScoredTeam): Cell[] {
	const { row } = team;
	return [
		KIND_LABELS[team.kind],
		row.organisation,
		row.name,
		team.ageGroup,
		team.gender,
		team.place,
		team.n,
		team.formula,
		team.trophyPoints
	];
}

function notScoredRow(entry: NotScored): Cell[] {
	const { row } = entry;
	return [
		null,
		row.organisation,
		row.name,
		row.ageGroupRaw,
		row.gender,
		row.place,
		null,
		`nicht gewertet: ${entry.message}`,
		null
	];
}

function breakdownSheet(input: EvaluationInput): Sheet {
	const teams = [...input.rescue, ...input.wave].flatMap((standing) => standing.teams);
	return {
		name: "Aufschlüsselung",
		rows: [BREAKDOWN_HEADER, ...teams.map(scoredRow), ...input.notScored.map(notScoredRow)]
	};
}

/** Quellblatt kopieren und Pokalpunkte je Datenzeile (Zeile 1 = erste nach der Kopfzeile) anhängen. */
function sourceSheet(source: Sheet, scored: readonly ScoredTeam[]): Sheet {
	const pointsByRow = new Map(scored.map((team) => [team.row.sourceRow, team.trophyPoints]));
	const width = Math.max(0, ...source.rows.map((row) => row.length));
	const pad = (row: readonly Cell[]): Cell[] => [...row, ...Array<Cell>(width - row.length).fill(null)];
	const [header = [], ...dataRows] = source.rows;
	return {
		name: "Quelldaten",
		rows: [
			[...pad(header), TROPHY_POINTS_HEADER],
			...dataRows.map((row, index) => [...pad(row), pointsByRow.get(index + 1) ?? null])
		]
	};
}

export function buildEvaluationSheets(input: EvaluationInput): Sheet[] {
	return [
		standingsSheet("Rettungswettkampf", input.rescue),
		standingsSheet("Wellenwettkampf", input.wave),
		breakdownSheet(input),
		sourceSheet(input.source, input.scored)
	];
}

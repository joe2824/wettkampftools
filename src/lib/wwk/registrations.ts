import type { CsvRow } from "../io/csv";
import type { Settings } from "../settings/settings";
import { buildAgeGroupOrder, matchAgeGroup, normalizeAgeGroupSpelling, simplifySeniorAgeGroup } from "./ageGroups";

export const MAX_MEMBERS = 5;

export interface Member {
	lastName: string;
	firstName: string;
	yearOfBirth: string;
}

export interface Team {
	id: string;
	sourceRow: number;
	organisation: string;
	originalName: string;
	name: string;
	ageGroup: string;
	ageGroupKnown: boolean;
	gender: string;
	qualification: string;
	reportedPoints: string;
	members: Member[];
}

export interface Rename {
	teamId: string;
	from: string;
	to: string;
}

export interface ParsedRegistrations {
	teams: Team[];
	renames: Rename[];
}

const cell = (row: CsvRow, column: string): string => (row[column] ?? "").trim();

function readMembers(row: CsvRow): Member[] {
	const members: Member[] = [];
	for (let n = 1; n <= MAX_MEMBERS; n++) {
		const member = {
			lastName: cell(row, `Nachname ${n}`),
			firstName: cell(row, `Vorname ${n}`),
			yearOfBirth: cell(row, `Jahrgang ${n}`),
		};
		if (member.lastName !== "" || member.firstName !== "") members.push(member);
	}
	return members;
}

/** Schreibweise vereinheitlichen, gegen die AK-Liste prüfen, dann Senioren zusammenfassen. */
function resolveAgeGroup(raw: string, order: readonly string[], settings: Settings) {
	const match = matchAgeGroup(normalizeAgeGroupSpelling(raw), order);
	const name = match.kind === "known" ? match.name : match.raw;
	return { ageGroup: simplifySeniorAgeGroup(name, settings), ageGroupKnown: match.kind === "known" };
}

function toTeam(row: CsvRow, index: number, order: readonly string[], settings: Settings): Team {
	const sourceRow = index + 1;
	const originalName = cell(row, "name");
	return {
		id: `r${sourceRow}`,
		sourceRow,
		organisation: cell(row, "gliederung"),
		originalName,
		name: originalName,
		...resolveAgeGroup(cell(row, "ak"), order, settings),
		gender: cell(row, "geschlecht"),
		qualification: cell(row, "qualifikation"),
		reportedPoints: cell(row, "meldepunkte"),
		members: readMembers(row),
	};
}

const groupKey = (team: Team): string =>
	JSON.stringify([team.organisation, team.ageGroup.toLowerCase(), team.gender]);

/** Name = Gliederung; mehrere Teams einer Gruppe werden in Dateireihenfolge nummeriert. */
export function assignTeamNames(teams: readonly Team[]): Team[] {
	const sizes = new Map<string, number>();
	for (const team of teams) sizes.set(groupKey(team), (sizes.get(groupKey(team)) ?? 0) + 1);
	const counters = new Map<string, number>();
	return teams.map((team) => {
		const key = groupKey(team);
		if (sizes.get(key) === 1) return { ...team, name: team.organisation };
		const number = (counters.get(key) ?? 0) + 1;
		counters.set(key, number);
		return { ...team, name: `${team.organisation} ${number}` };
	});
}

export function parseRegistrations(rows: readonly CsvRow[], settings: Settings): ParsedRegistrations {
	const order = buildAgeGroupOrder(settings);
	const teams = assignTeamNames(rows.map((row, index) => toTeam(row, index, order, settings)));
	const renames = teams
		.filter((team) => team.name !== team.originalName)
		.map((team) => ({ teamId: team.id, from: team.originalName, to: team.name }));
	return { teams, renames };
}

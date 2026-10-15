// Meldungen für JAuswertung: alle Teams plus Wellen-Kopien als Blatt „Meldungen“.
import type { Cell, Sheet, Workbook } from "$lib/platform/workbook";
import type { Settings } from "../settings/settings";
import {
	buildAgeGroupOrder,
	compareAgeGroups,
	equalsAgeGroup,
	toWaveAgeGroup,
	waveEligibleAgeGroups
} from "./ageGroups";
import { MAX_MEMBERS, type Member, type Team } from "./registrations";

export const REGISTRATION_SHEET = "Meldungen";
const WAVE_ID_SUFFIX = ":wave";
const LOCALE = "de";

const BASE_HEADERS = ["gliederung", "name", "ak", "geschlecht", "qualifikation", "meldepunkte"] as const;
const MEMBER_HEADERS = Array.from({ length: MAX_MEMBERS }, (_, i) => [
	`Nachname ${i + 1}`,
	`Vorname ${i + 1}`,
	`Jahrgang ${i + 1}`
]).flat();
export const REGISTRATION_HEADERS: readonly string[] = [...BASE_HEADERS, ...MEMBER_HEADERS];

const COLUMN = { organisation: 0, name: 1, ageGroup: 2, gender: 3 } as const;
const REQUIRED_COLUMNS = Object.values(COLUMN);
const DECIMAL_TEXT = /^-?\d+(?:[.,]\d+)?$/;
const INTEGER_TEXT = /^\d+$/;

export type ExportRow = Team & { isWaveCopy: boolean };

export interface GroupCount {
	ageGroup: string;
	gender: string;
	count: number;
}

export interface ExpectedCounts {
	total: number;
	byGroup: GroupCount[];
}

export interface VerificationResult {
	ok: boolean;
	problems: string[];
}

/** Vorauswahl: Teams, deren AK auch in der Welle startet. */
export function defaultWaveSelection(teams: readonly Team[], settings: Settings): Set<string> {
	const eligible = waveEligibleAgeGroups(settings);
	return new Set(
		teams.filter((team) => eligible.some((name) => equalsAgeGroup(name, team.ageGroup))).map((team) => team.id)
	);
}

function waveCopy(team: Team): ExportRow {
	return { ...team, id: team.id + WAVE_ID_SUFFIX, ageGroup: toWaveAgeGroup(team.ageGroup), isWaveCopy: true };
}

/** Sortierung wie bisher: AK aufsteigend, Geschlecht und Gliederung absteigend. */
export function buildRegistrationRows(
	teams: readonly Team[],
	waveSelection: ReadonlySet<string>,
	settings: Settings
): ExportRow[] {
	const originals: ExportRow[] = teams.map((team) => ({ ...team, isWaveCopy: false }));
	const copies = teams.filter((team) => waveSelection.has(team.id)).map(waveCopy);
	const byAgeGroup = compareAgeGroups(buildAgeGroupOrder(settings));
	return [...originals, ...copies].sort(
		(a, b) =>
			byAgeGroup(a.ageGroup, b.ageGroup) ||
			b.gender.localeCompare(a.gender, LOCALE) ||
			b.organisation.localeCompare(a.organisation, LOCALE)
	);
}

const textCell = (value: string): Cell => (value === "" ? null : value);

function decimalCell(value: string): Cell {
	return DECIMAL_TEXT.test(value) ? Number(value.replace(",", ".")) : textCell(value);
}

function yearCell(value: string): Cell {
	return INTEGER_TEXT.test(value) ? Number(value) : textCell(value);
}

function memberCells(member: Member | undefined): Cell[] {
	if (!member) return [null, null, null];
	return [textCell(member.lastName), textCell(member.firstName), yearCell(member.yearOfBirth)];
}

function toSheetRow(row: ExportRow): Cell[] {
	const members = Array.from({ length: MAX_MEMBERS }, (_, i) => memberCells(row.members[i])).flat();
	return [
		textCell(row.organisation),
		textCell(row.name),
		textCell(row.ageGroup),
		textCell(row.gender),
		textCell(row.qualification),
		decimalCell(row.reportedPoints),
		...members
	];
}

export function toRegistrationSheet(rows: readonly ExportRow[]): Sheet {
	return { name: REGISTRATION_SHEET, rows: [[...REGISTRATION_HEADERS], ...rows.map(toSheetRow)] };
}

const groupKey = (ageGroup: string, gender: string): string =>
	JSON.stringify([ageGroup.trim().toLowerCase(), gender.trim().toLowerCase()]);

/** Gruppen in der Reihenfolge ihres ersten Auftretens, also wie die Zeilen sortiert. */
function countGroups(entries: readonly { ageGroup: string; gender: string }[]): Map<string, GroupCount> {
	const groups = new Map<string, GroupCount>();
	for (const { ageGroup, gender } of entries) {
		const key = groupKey(ageGroup, gender);
		const group = groups.get(key) ?? { ageGroup, gender, count: 0 };
		group.count += 1;
		groups.set(key, group);
	}
	return groups;
}

export function expectedCounts(rows: readonly ExportRow[]): ExpectedCounts {
	return { total: rows.length, byGroup: [...countGroups(rows).values()] };
}

const cellText = (cell: Cell | undefined): string => (cell === null || cell === undefined ? "" : String(cell).trim());

function headerMatches(header: readonly Cell[] | undefined): boolean {
	if (!header) return false;
	const extra = header.slice(REGISTRATION_HEADERS.length);
	return (
		REGISTRATION_HEADERS.every((name, i) => cellText(header[i]).toLowerCase() === name.toLowerCase()) &&
		extra.every((cell) => cellText(cell) === "")
	);
}

const isEmptyRow = (row: readonly Cell[]): boolean => row.every((cell) => cellText(cell) === "");

interface DataRow {
	excelRow: number;
	cells: Cell[];
}

/** Zeilennummern wie in Excel (Kopfzeile = 1), leere Zeilen übersprungen. */
function dataRowsOf(sheet: Sheet): DataRow[] {
	return sheet.rows
		.map((cells, index) => ({ excelRow: index + 1, cells }))
		.slice(1)
		.filter((row) => !isEmptyRow(row.cells));
}

function incompleteRowProblems(dataRows: readonly DataRow[]): string[] {
	return dataRows
		.filter((row) => REQUIRED_COLUMNS.some((column) => cellText(row.cells[column]) === ""))
		.map((row) => `Zeile ${row.excelRow}: Gliederung, Name, Altersklasse oder Geschlecht fehlt.`);
}

function groupProblems(expected: readonly GroupCount[], actual: Map<string, GroupCount>): string[] {
	const problems: string[] = [];
	const expectedKeys = new Set<string>();
	for (const group of expected) {
		const key = groupKey(group.ageGroup, group.gender);
		expectedKeys.add(key);
		const found = actual.get(key)?.count ?? 0;
		if (found !== group.count) {
			problems.push(`${group.ageGroup} ${group.gender}: ${group.count} erwartet, ${found} gefunden.`);
		}
	}
	for (const [key, group] of actual) {
		if (!expectedKeys.has(key)) {
			problems.push(`${group.ageGroup} ${group.gender}: ${group.count} unerwartet gefunden.`);
		}
	}
	return problems;
}

/** Prüft die zurückgelesene Datei gegen die erwarteten Anzahlen. Meldungen enthalten keine Namen. */
export function verifyRegistrationSheet(workbook: Workbook, expected: ExpectedCounts): VerificationResult {
	const wanted = REGISTRATION_SHEET.toLowerCase();
	const sheet = workbook.sheets.find((candidate) => candidate.name.trim().toLowerCase() === wanted);
	if (!sheet) return { ok: false, problems: [`Das Blatt „${REGISTRATION_SHEET}“ fehlt in der Datei.`] };
	if (!headerMatches(sheet.rows[0])) {
		return { ok: false, problems: ["Die Spaltenüberschriften stimmen nicht mit der Meldedatei überein."] };
	}
	const dataRows = dataRowsOf(sheet);
	const problems: string[] = [];
	if (dataRows.length !== expected.total) {
		problems.push(`Anzahl Meldungen: ${expected.total} erwartet, ${dataRows.length} gefunden.`);
	}
	const actual = countGroups(
		dataRows.map(({ cells }) => ({
			ageGroup: cellText(cells[COLUMN.ageGroup]),
			gender: cellText(cells[COLUMN.gender])
		}))
	);
	problems.push(...groupProblems(expected.byGroup, actual), ...incompleteRowProblems(dataRows));
	return { ok: problems.length === 0, problems };
}

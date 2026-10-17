// Meldungen für JAuswertung: alle Teams plus Wellen-Kopien als CSV-Datei.
import type { Settings } from "../settings/settings";
import {
	buildAgeGroupOrder,
	compareAgeGroups,
	equalsAgeGroup,
	toWaveAgeGroup,
	waveEligibleAgeGroups
} from "./ageGroups";
import { MAX_MEMBERS, type Member, type Team } from "./registrations";

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

/** Trennzeichen, das JAuswertung in der Kopfzeile erkennt; die Kopfzeile enthält deshalb kein Komma. */
const CSV_SEPARATOR = ";";
const CSV_LINE_BREAK = "\r\n";
const LINE_BREAKS = /[\r\n]+/g;
const QUOTE = '"';

/**
 * JAuswertung kennt in CSV kein maskiertes Anführungszeichen und trennt stur am Semikolon;
 * beides wird deshalb im Wert ersetzt, Zeilenumbrüche werden zu Leerzeichen.
 */
function csvField(value: string): string {
	return value.replace(LINE_BREAKS, " ").replaceAll(CSV_SEPARATOR, ",").replaceAll(QUOTE, "'").trim();
}

function memberFields(member: Member | undefined): string[] {
	return member ? [member.lastName, member.firstName, member.yearOfBirth] : ["", "", ""];
}

function toFields(row: ExportRow): string[] {
	const members = Array.from({ length: MAX_MEMBERS }, (_, i) => memberFields(row.members[i])).flat();
	return [row.organisation, row.name, row.ageGroup, row.gender, row.qualification, row.reportedPoints, ...members].map(
		csvField
	);
}

/** CSV für den Meldungs-Import von JAuswertung: UTF-8 ohne BOM, sonst erkennt JAuswertung die erste Spalte nicht. */
export function encodeRegistrationCsv(rows: readonly ExportRow[]): Uint8Array {
	const lines = [[...REGISTRATION_HEADERS], ...rows.map(toFields)].map((fields) => fields.join(CSV_SEPARATOR));
	return new TextEncoder().encode(lines.join(CSV_LINE_BREAK) + CSV_LINE_BREAK);
}

/** Zerlegt eine Zeile wie JAuswertung: ein Wert in Anführungszeichen reicht bis zum nächsten Anführungszeichen. */
export function splitCsvLine(line: string, separator: string = CSV_SEPARATOR): string[] {
	const fields: string[] = [];
	let index = 0;
	while (index < line.length) {
		let end: number;
		if (line[index] === QUOTE) {
			const close = line.indexOf(QUOTE, index + 1);
			const quoteEnd = close < 0 ? line.length : close;
			fields.push(line.slice(index + 1, quoteEnd).trim());
			end = line.indexOf(separator, quoteEnd);
		} else {
			end = line.indexOf(separator, index);
			fields.push(line.slice(index, end < 0 ? line.length : end).trim());
		}
		if (end < 0) break;
		index = end + 1;
	}
	return fields;
}

const cellText = (cell: string | undefined): string => (cell ?? "").trim();

function headerMatches(header: readonly string[] | undefined): boolean {
	if (!header) return false;
	const extra = header.slice(REGISTRATION_HEADERS.length);
	return (
		REGISTRATION_HEADERS.every((name, i) => cellText(header[i]).toLowerCase() === name.toLowerCase()) &&
		extra.every((cell) => cellText(cell) === "")
	);
}

const isEmptyRow = (row: readonly string[]): boolean => row.every((cell) => cellText(cell) === "");

interface DataRow {
	line: number;
	cells: string[];
}

/** Zeilennummern wie im Texteditor (Kopfzeile = 1), leere Zeilen übersprungen. */
function dataRowsOf(table: readonly string[][]): DataRow[] {
	return table
		.map((cells, index) => ({ line: index + 1, cells }))
		.slice(1)
		.filter((row) => !isEmptyRow(row.cells));
}

function incompleteRowProblems(dataRows: readonly DataRow[]): string[] {
	return dataRows
		.filter((row) => REQUIRED_COLUMNS.some((column) => cellText(row.cells[column]) === ""))
		.map((row) => `Zeile ${row.line}: Gliederung, Name, Altersklasse oder Geschlecht fehlt.`);
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

const BYTE_ORDER_MARK = "\uFEFF";
const NOT_UTF8 = "Die Datei ist nicht in UTF-8 gespeichert; JAuswertung würde Umlaute falsch lesen.";

/** Liest die gespeicherte CSV wie JAuswertung und prüft sie gegen die erwarteten Anzahlen. Meldungen enthalten keine Namen. */
export function verifyRegistrationCsv(bytes: Uint8Array, expected: ExpectedCounts): VerificationResult {
	let text: string;
	try {
		text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
	} catch {
		return { ok: false, problems: [NOT_UTF8] };
	}
	const table = text.split(/\r?\n/).map((line) => splitCsvLine(line));
	// JAuswertung schneidet ein BOM nicht ab und findet dann die Spalte „gliederung“ nicht.
	if (text.startsWith(BYTE_ORDER_MARK) || !headerMatches(table[0])) {
		return { ok: false, problems: ["Die Spaltenüberschriften stimmen nicht mit der Meldedatei überein."] };
	}
	const dataRows = dataRowsOf(table);
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

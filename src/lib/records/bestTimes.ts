// Wellen-Zeiten eines Wettkampfs aus dem Blatt „Daten“ – je Altersklasse, Geschlecht und Disziplin die schnellste
// Zeit ohne Strafe sowie langsamste Zeit, Durchschnitt und Anzahl aller Mannschaften; keine Namen. JAuswertung schreibt je Disziplin „Zeit n“ als Excel-Zeitwert (Tagesbruchteil) und „Strafe n“ als
// Kurztext: leer, „0“ oder „-“ ohne Strafe, sonst Strafpunkte oder „disq.“, „n.a.“, „ausg.“. Die Spalte
// „Disziplinen“ nennt die Namen in der Reihenfolge der Zeitspalten, durch „;“ getrennt.
import { parseRecTime } from "$lib/format/time";
import type { Cell, Workbook } from "$lib/platform/workbook";
import { findSheet } from "$lib/wwk/results";
import { isWaveDiscipline } from "./mapping";
import { GENDER_ORDER, type RecordGender } from "./rulebookRecords";

export interface BestTimeTarget {
	ageGroup: string;
	gender: RecordGender;
	discipline: string;
}

export interface BestTimeEntry extends BestTimeTarget {
	/** Schnellste Zeit ohne Strafe in Hundertstelsekunden. */
	time: number;
	/** Langsamste Zeit, auch mit Strafe. */
	slowest: number;
	/** Durchschnitt aller Zeiten, auch mit Strafe. */
	average: number;
	/** Mannschaften mit Zeit. */
	teams: number;
}

export interface BestTimes {
	year: number;
	entries: BestTimeEntry[];
}

interface DisciplineColumns {
	/** Position in der Spalte „Disziplinen“. */
	index: number;
	time: number;
	penalty: number;
}

const HUNDREDTHS_PER_DAY = 24 * 60 * 60 * 100;
const TIME_HEADER = /^zeit (\d+)$/;
const PENALTY_HEADER = "strafe";
const DISCIPLINE_SEPARATOR = ";";
const NO_PENALTY = ["", "0", "-"];
const GENDER_TEXTS: Record<string, RecordGender> = {
	weiblich: "female",
	w: "female",
	female: "female",
	männlich: "male",
	m: "male",
	male: "male"
};

const normalize = (text: string): string => text.trim().toLowerCase();

/** „weiblich“, „w“, „männlich“, „m“ (Groß- und Kleinschreibung egal); sonst undefined. */
export const parseGender = (text: string): RecordGender | undefined =>
	GENDER_TEXTS[text.trim().normalize("NFC").toLowerCase()];

/** Gleiche Altersklasse, Geschlecht und Disziplin, Schreibweise egal. */
export const bestTimeKey = ({ ageGroup, gender, discipline }: BestTimeTarget): string =>
	JSON.stringify([normalize(ageGroup), gender, normalize(discipline)]);

const cellText = (cell: Cell | undefined): string => (cell === null || cell === undefined ? "" : String(cell).trim());

function disciplineColumns(headers: string[]): DisciplineColumns[] {
	return headers.flatMap((header, time) => {
		const match = TIME_HEADER.exec(header);
		if (!match) return [];
		const penalty = headers.indexOf(`${PENALTY_HEADER} ${match[1]}`);
		return [{ index: Number(match[1]) - 1, time, penalty }];
	});
}

function cellTime(cell: Cell | undefined): number | null {
	if (typeof cell === "number") {
		const time = Math.round(cell * HUNDREDTHS_PER_DAY);
		return time > 0 ? time : null;
	}
	return parseRecTime(cellText(cell));
}

/** Gültig nur ohne jede Strafe. */
const withoutPenalty = (cell: Cell | undefined): boolean => NO_PENALTY.includes(cellText(cell));

interface RowColumns {
	ageGroup: number;
	gender: number;
	disciplines: number;
	times: DisciplineColumns[];
}

interface RowTime extends BestTimeTarget {
	time: number;
	penalized: boolean;
}

function rowTimes(row: Cell[], columns: RowColumns): RowTime[] {
	const ageGroup = cellText(row[columns.ageGroup]);
	const gender = parseGender(cellText(row[columns.gender]));
	const disciplines = cellText(row[columns.disciplines])
		.split(DISCIPLINE_SEPARATOR)
		.map((name) => name.trim());
	if (!ageGroup || !gender) return [];
	return columns.times.flatMap(({ index, time, penalty }) => {
		const discipline = disciplines[index] ?? "";
		if (!isWaveDiscipline(discipline)) return [];
		const value = cellTime(row[time]);
		if (value === null) return [];
		return [{ ageGroup, gender, discipline, time: value, penalized: penalty >= 0 && !withoutPenalty(row[penalty]) }];
	});
}

interface Accumulator extends BestTimeTarget {
	fastest: number | null;
	slowest: number;
	total: number;
	teams: number;
}

/** Je Altersklasse, Geschlecht und Wellendisziplin: schnellste Zeit ohne Strafe, langsamste, Durchschnitt, Anzahl. */
export function extractBestTimes(workbook: Workbook, year: number): BestTimes {
	const [headerRow = [], ...rows] = findSheet(workbook).rows;
	const headers = headerRow.map((cell) => cellText(cell).toLowerCase());
	const columns: RowColumns = {
		ageGroup: headers.indexOf("altersklasse"),
		gender: headers.indexOf("geschlecht"),
		disciplines: headers.indexOf("disziplinen"),
		times: disciplineColumns(headers)
	};
	const groups = new Map<string, Accumulator>();
	for (const { time, penalized, ...target } of rows.flatMap((row) => rowTimes(row, columns))) {
		const key = bestTimeKey(target);
		const group = groups.get(key) ?? { ...target, fastest: null, slowest: 0, total: 0, teams: 0 };
		group.slowest = Math.max(group.slowest, time);
		group.total += time;
		group.teams += 1;
		if (!penalized && (group.fastest === null || time < group.fastest)) group.fastest = time;
		groups.set(key, group);
	}
	// Ohne straffreie Zeit gibt es keine Bestzeit, und damit auch keinen Eintrag.
	const entries = [...groups.values()].flatMap(({ fastest, slowest, total, teams, ...target }) =>
		fastest === null ? [] : [{ ...target, time: fastest, slowest, average: Math.round(total / teams), teams }]
	);
	return { year, entries: entries.sort(compareEntries) };
}

/** Altersklasse, dann weiblich vor männlich, dann Disziplin. */
export function compareEntries(a: BestTimeTarget, b: BestTimeTarget): number {
	return (
		a.ageGroup.localeCompare(b.ageGroup) ||
		GENDER_ORDER.indexOf(a.gender) - GENDER_ORDER.indexOf(b.gender) ||
		a.discipline.localeCompare(b.discipline)
	);
}

function isEntry(input: unknown): input is BestTimeEntry {
	if (typeof input !== "object" || input === null) return false;
	const entry = input as Partial<BestTimeEntry>;
	return (
		typeof entry.ageGroup === "string" &&
		GENDER_ORDER.includes(entry.gender as RecordGender) &&
		typeof entry.discipline === "string" &&
		Number.isInteger(entry.time) &&
		Number.isInteger(entry.slowest) &&
		Number.isInteger(entry.average) &&
		Number.isInteger(entry.teams)
	);
}

/** Gespeicherte Bestzeiten prüfen; null bei ungültigem Inhalt. */
export function parseBestTimes(input: unknown): BestTimes | null {
	if (typeof input !== "object" || input === null) return null;
	const { year, entries } = input as Partial<BestTimes>;
	if (!Number.isInteger(year) || !Array.isArray(entries) || !entries.every(isEntry)) return null;
	return {
		year: year as number,
		entries: entries.map(({ ageGroup, gender, discipline, time, slowest, average, teams }) => ({
			ageGroup,
			gender,
			discipline,
			time,
			slowest,
			average,
			teams
		}))
	};
}

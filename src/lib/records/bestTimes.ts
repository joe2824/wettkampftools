// Bestzeiten eines Wettkampfs aus dem Blatt „Daten“ – nur Altersklasse, Geschlecht und Zeit, keine Namen.
// JAuswertung schreibt je Disziplin „Zeit n“ als Excel-Zeitwert (Tagesbruchteil) und „Strafe n“ als Kurztext:
// leer bzw. Leerzeichen ohne Strafe, sonst Strafpunkte oder „disq.“, „n.a.“, „ausg.“. Ohne Zeit bleibt die Zelle leer.
import { parseRecTime } from "$lib/format/time";
import type { Cell, Workbook } from "$lib/platform/workbook";
import { findSheet } from "$lib/wwk/results";
import { GENDER_ORDER, recKey, type RecordGender, type RecTarget } from "./rulebookRecords";

export interface BestTimeEntry extends RecTarget {
	/** Hundertstelsekunden. */
	time: number;
}

export interface BestTimes {
	year: number;
	entries: BestTimeEntry[];
}

interface DisciplineColumns {
	disciplineIndex: number;
	time: number;
	penalty: number;
}

const HUNDREDTHS_PER_DAY = 24 * 60 * 60 * 100;
const TIME_HEADER = /^zeit (\d+)$/;
const PENALTY_HEADER = "strafe";
const GENDER_TEXTS: Record<string, RecordGender> = {
	weiblich: "female",
	w: "female",
	female: "female",
	männlich: "male",
	m: "male",
	male: "male"
};

const cellText = (cell: Cell | undefined): string => (cell === null || cell === undefined ? "" : String(cell).trim());

function disciplineColumns(headers: string[]): DisciplineColumns[] {
	return headers.flatMap((header, time) => {
		const match = TIME_HEADER.exec(header);
		if (!match) return [];
		const penalty = headers.indexOf(`${PENALTY_HEADER} ${match[1]}`);
		return [{ disciplineIndex: Number(match[1]) - 1, time, penalty }];
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
const withoutPenalty = (cell: Cell | undefined): boolean => ["", "0"].includes(cellText(cell));

function rowEntries(row: Cell[], ageGroupColumn: number, genderColumn: number, columns: DisciplineColumns[]): BestTimeEntry[] {
	const ageGroup = cellText(row[ageGroupColumn]);
	const gender = GENDER_TEXTS[cellText(row[genderColumn]).normalize("NFC").toLowerCase()];
	if (!ageGroup || !gender) return [];
	return columns.flatMap(({ disciplineIndex, time, penalty }) => {
		const value = cellTime(row[time]);
		if (value === null || (penalty >= 0 && !withoutPenalty(row[penalty]))) return [];
		return [{ ageGroup, gender, disciplineIndex, time: value }];
	});
}

/** Schnellste gültige Zeit je Altersklasse, Geschlecht und Disziplin. */
export function extractBestTimes(workbook: Workbook, year: number): BestTimes {
	const [headerRow = [], ...rows] = findSheet(workbook).rows;
	const headers = headerRow.map((cell) => cellText(cell).toLowerCase());
	const columns = disciplineColumns(headers);
	const ageGroupColumn = headers.indexOf("altersklasse");
	const genderColumn = headers.indexOf("geschlecht");
	const best = new Map<string, BestTimeEntry>();
	for (const entry of rows.flatMap((row) => rowEntries(row, ageGroupColumn, genderColumn, columns))) {
		const key = recKey(entry);
		const current = best.get(key);
		if (!current || entry.time < current.time) best.set(key, entry);
	}
	return { year, entries: [...best.values()].sort(compareEntries) };
}

function compareEntries(a: BestTimeEntry, b: BestTimeEntry): number {
	return (
		a.ageGroup.localeCompare(b.ageGroup) ||
		GENDER_ORDER.indexOf(a.gender) - GENDER_ORDER.indexOf(b.gender) ||
		a.disciplineIndex - b.disciplineIndex
	);
}

function isEntry(input: unknown): input is BestTimeEntry {
	if (typeof input !== "object" || input === null) return false;
	const entry = input as Partial<BestTimeEntry>;
	return (
		typeof entry.ageGroup === "string" &&
		GENDER_ORDER.includes(entry.gender as RecordGender) &&
		Number.isInteger(entry.disciplineIndex) &&
		Number.isInteger(entry.time)
	);
}

/** Gespeicherte Bestzeiten prüfen; null bei ungültigem Inhalt. */
export function parseBestTimes(input: unknown): BestTimes | null {
	if (typeof input !== "object" || input === null) return null;
	const { year, entries } = input as Partial<BestTimes>;
	if (!Number.isInteger(year) || !Array.isArray(entries) || !entries.every(isEntry)) return null;
	return { year: year as number, entries: entries.map((entry) => ({ ...entry })) };
}

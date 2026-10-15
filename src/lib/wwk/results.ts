/*
 * Blatt „Daten“ des JAuswertung-Excel-Exports (results(wk, false) in DataTableUtils).
 * Überschriften in Zeile 1, deutsche Texte aus jauswertung.properties:
 * - Mannschaft: Platz, Name, Mitglied 1..n, Gliederung, Qualifikationsgliederung,
 *   Altersklasse, Geschlecht, Bemerkung, Meldepunkte, Punkte, Differenz, Startnummer,
 *   Außer Konkurrenz, Disziplinen, je Disziplin „Platz n“, „Zeit n“, „Punkte n“, „Strafe n“,
 *   danach Zusatzwertung (z. B. HLW) und ggf. Qualifiziert.
 * - Einzel: wie oben, aber statt Mitglied-Spalten Nachname, Vorname, Jahrgang.
 * Platz ist leer bei „keine Wertung“. Daher zählt nur exakte Übereinstimmung, die erste gewinnt.
 */

import type { Cell, Sheet, Workbook, WorkbookProperties } from "$lib/platform/workbook";

export type CompetitionKind = "team" | "individual";

export interface ResultRow {
	sourceRow: number;
	place: number | null;
	name: string;
	organisation: string;
	ageGroupRaw: string;
	gender: string;
	competitionPoints: number | null;
	members: string[];
}

export interface ResultsData {
	kind: CompetitionKind;
	rows: ResultRow[];
}

export class ResultsError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ResultsError";
	}
}

const RESULTS_SHEET = "Daten";

const HEADER = {
	place: "Platz",
	name: "Name",
	organisation: "Gliederung",
	ageGroup: "Altersklasse",
	gender: "Geschlecht",
	points: "Punkte"
} as const;

const REQUIRED_COLUMNS = ["place", "name", "organisation", "ageGroup", "gender"] as const;
const MEMBER_HEADER = /^mitglied (\d+)$/;
const INTEGER_TEXT = /^\d+$/;
const DECIMAL_TEXT = /^-?\d+(?:[.,]\d+)?$/;

type ColumnKey = keyof typeof HEADER;
type ColumnMap = Record<ColumnKey, number>;

function normalizeHeader(cell: Cell): string {
	return cellText(cell).toLowerCase();
}

function cellText(cell: Cell | undefined): string {
	return cell === null || cell === undefined ? "" : String(cell).trim();
}

/** Blatt „Daten“; wirft ResultsError, wenn es fehlt. */
export function findSheet(workbook: Workbook): Sheet {
	const wanted = RESULTS_SHEET.toLowerCase();
	const sheet = workbook.sheets.find((s) => s.name.trim().toLowerCase() === wanted);
	if (!sheet) {
		throw new ResultsError("Das Blatt „Daten“ fehlt – bitte den Excel-Export aus JAuswertung verwenden.");
	}
	return sheet;
}

function mapColumns(headers: string[]): ColumnMap {
	const entries = (Object.keys(HEADER) as ColumnKey[]).map(
		(key) => [key, headers.indexOf(HEADER[key].toLowerCase())] as const
	);
	const columns = Object.fromEntries(entries) as ColumnMap;
	const missing = REQUIRED_COLUMNS.filter((key) => columns[key] < 0).map((key) => HEADER[key]);
	if (missing.length > 0) {
		throw new ResultsError(`Im Blatt „Daten“ fehlen die Spalten: ${missing.join(", ")}.`);
	}
	return columns;
}

/** Spaltenindizes der Mitglieder, nach Mitgliedsnummer sortiert. */
function memberColumns(headers: string[]): number[] {
	return headers
		.map((header, index) => ({ match: MEMBER_HEADER.exec(header), index }))
		.filter((entry) => entry.match !== null)
		.sort((a, b) => Number(a.match?.[1]) - Number(b.match?.[1]))
		.map((entry) => entry.index);
}

function parsePlace(cell: Cell | undefined): number | null {
	if (typeof cell === "number") return Number.isInteger(cell) ? cell : null;
	const text = cellText(cell);
	return INTEGER_TEXT.test(text) ? Number(text) : null;
}

function parsePoints(cell: Cell | undefined): number | null {
	if (typeof cell === "number") return Number.isFinite(cell) ? cell : null;
	const text = cellText(cell);
	return DECIMAL_TEXT.test(text) ? Number(text.replace(",", ".")) : null;
}

function isEmptyRow(row: Cell[]): boolean {
	return row.every((cell) => cellText(cell) === "");
}

function toResultRow(row: Cell[], sourceRow: number, columns: ColumnMap, members: number[]): ResultRow {
	return {
		sourceRow,
		place: parsePlace(row[columns.place]),
		name: cellText(row[columns.name]),
		organisation: cellText(row[columns.organisation]),
		ageGroupRaw: cellText(row[columns.ageGroup]),
		gender: cellText(row[columns.gender]),
		competitionPoints: columns.points < 0 ? null : parsePoints(row[columns.points]),
		members: members.map((index) => cellText(row[index])).filter((name) => name !== "")
	};
}

/** Liest das Blatt „Daten“; wirft ResultsError bei fehlendem Blatt oder fehlenden Spalten. */
export function readJAuswertungResults(workbook: Workbook): ResultsData {
	const [headerRow = [], ...dataRows] = findSheet(workbook).rows;
	const headers = headerRow.map(normalizeHeader);
	const columns = mapColumns(headers);
	const members = memberColumns(headers);
	const rows = dataRows
		.map((row, index) => ({ row, sourceRow: index + 1 }))
		.filter(({ row }) => !isEmptyRow(row))
		.map(({ row, sourceRow }) => toResultRow(row, sourceRow, columns, members));
	return { kind: members.length > 0 ? "team" : "individual", rows };
}

function yearOf(value: string | null): number | null {
	if (value === null) return null;
	const time = Date.parse(value);
	return Number.isNaN(time) ? null : new Date(time).getFullYear();
}

/** Zeiten aus dem Dateisystem; null, wenn unbekannt. */
export interface FileDates {
	createdMs: number | null;
	modifiedMs: number | null;
}

export interface FileYear {
	/** Frühestes bekanntes Jahr; null ohne jede Angabe. */
	year: number | null;
	/** Ist das Erstellungsdatum im Dateisystem bekannt? */
	creationKnown: boolean;
}

const yearOfMs = (ms: number | null): number | null => (ms === null ? null : new Date(ms).getFullYear());

/**
 * Frühestes Jahr aus Erstellungs- und Änderungsdatum der Datei und den Dokumenteigenschaften.
 * Kopieren setzt unter Windows das Erstellungsdatum neu, das Änderungsdatum bleibt – daher das Minimum.
 */
export function workbookYear(properties: WorkbookProperties, dates: FileDates): FileYear {
	const years = [
		yearOfMs(dates.createdMs),
		yearOfMs(dates.modifiedMs),
		yearOf(properties.created),
		yearOf(properties.modified)
	].filter((year): year is number => year !== null);
	return { year: years.length > 0 ? Math.min(...years) : null, creationKnown: dates.createdMs !== null };
}

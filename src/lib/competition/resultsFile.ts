// Gesicherte Ergebnisdatei in eigener Datei: Sie ist groß und ändert sich selten.
// Enthält Personendaten: nie protokollieren, nur Codes.
import { appDataStore, writeJson } from "$lib/platform/fs";
import type { Cell, Sheet, Workbook } from "$lib/platform/workbook";
import { isRecord } from "$lib/settings/validate";

export const COMPETITION_RESULTS_PATH = "competition/results.json";
const SCHEMA_VERSION = 1;

export interface StoredResults {
	fileName: string;
	/** Zeiten aus dem Dateisystem; null, wenn unbekannt. */
	createdMs: number | null;
	modifiedMs: number | null;
	workbook: Workbook;
	/** Beim Sichern angemahntes Dateijahr; eine Bestätigung gilt nur für dieses Jahr. */
	yearWarning: number | null;
	yearConfirmed: boolean;
}

const isString = (value: unknown): value is string => typeof value === "string";

const isNullableString = (value: unknown): value is string | null => value === null || isString(value);

const isCell = (value: unknown): value is Cell =>
	value === null || ["string", "number", "boolean"].includes(typeof value);

const finiteOrNull = (value: unknown): number | null => (Number.isFinite(value) ? (value as number) : null);

function parseSheet(raw: unknown): Sheet | null {
	if (!isRecord(raw) || !isString(raw.name) || !Array.isArray(raw.rows)) return null;
	const valid = raw.rows.every((row) => Array.isArray(row) && row.every(isCell));
	return valid ? { name: raw.name, rows: raw.rows as Cell[][] } : null;
}

function parseWorkbook(raw: unknown): Workbook | null {
	if (!isRecord(raw) || !Array.isArray(raw.sheets) || !isRecord(raw.properties)) return null;
	const { created, modified } = raw.properties;
	if (!isNullableString(created) || !isNullableString(modified)) return null;
	const sheets = raw.sheets.map(parseSheet);
	if (sheets.some((sheet) => sheet === null)) return null;
	return { sheets: sheets as Sheet[], properties: { created, modified } };
}

/** Gemeinsame Felder beider Formate; fehlende Jahresangaben ergeben Vorgaben. */
function parseCommon(
	raw: Record<string, unknown>
): Pick<StoredResults, "fileName" | "workbook" | "yearWarning" | "yearConfirmed"> | null {
	const workbook = parseWorkbook(raw.workbook);
	if (!isString(raw.fileName) || workbook === null) return null;
	const yearWarning = Number.isInteger(raw.yearWarning) ? (raw.yearWarning as number) : null;
	return { fileName: raw.fileName, workbook, yearWarning, yearConfirmed: raw.yearConfirmed === true };
}

/** Inhalt von results.json; Unbrauchbares ergibt null. */
export function parseStoredResults(raw: unknown): StoredResults | null {
	if (!isRecord(raw) || raw.schemaVersion !== SCHEMA_VERSION) return null;
	const common = parseCommon(raw);
	if (common === null) return null;
	return { ...common, createdMs: finiteOrNull(raw.createdMs), modifiedMs: finiteOrNull(raw.modifiedMs) };
}

/** Ergebnisse aus einem alten, einteiligen Wettkampfstand; die Erstellungszeit kannte er nicht. */
export function parseLegacyResults(raw: unknown): StoredResults | null {
	if (!isRecord(raw) || !Number.isFinite(raw.lastModified)) return null;
	const common = parseCommon(raw);
	if (common === null) return null;
	return { ...common, createdMs: null, modifiedMs: raw.lastModified as number };
}

export function saveStoredResults(results: StoredResults): Promise<void> {
	return writeJson(COMPETITION_RESULTS_PATH, { schemaVersion: SCHEMA_VERSION, ...results });
}

export function clearStoredResults(): Promise<void> {
	return appDataStore().remove(COMPETITION_RESULTS_PATH);
}

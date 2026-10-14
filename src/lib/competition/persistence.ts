// Gesicherter Wettkampfstand im App-Datenordner. Enthält Personendaten: nie protokollieren, nur Codes.
import { logError } from "$lib/log";
import { appDataStore, readJson, writeJson } from "$lib/platform/fs";
import type { Cell, Sheet, Workbook } from "$lib/platform/workbook";
import { isRecord } from "$lib/settings/validate";
import type { AgeGroupKind } from "$lib/wwk/ageGroups";

export const COMPETITION_STATE_PATH = "competition/state.json";
export const SCHEMA_VERSION = 1;

export interface StoredRegistration {
	fileName: string;
	/** Original-CSV, Base64-kodiert. */
	csvBase64: string;
	waveSelection: string[];
}

export interface StoredResults {
	fileName: string;
	lastModified: number;
	workbook: Workbook;
	yearWarning: number | null;
	creationUnknown: boolean;
	yearConfirmed: boolean;
}

export interface StoredHidden {
	ageGroups: string[];
	genders: string[];
	kinds: AgeGroupKind[];
}

export interface StoredCertificateSelection {
	hidden: StoredHidden;
	excluded: string[];
}

export interface CompetitionState {
	/** ISO-Zeitpunkt der Sicherung. */
	savedAt: string;
	registration?: StoredRegistration;
	results?: StoredResults;
	certificateSelection?: StoredCertificateSelection;
}

const KINDS: readonly AgeGroupKind[] = ["rescue", "wave"];
const CHUNK = 0x8000;

export function encodeBase64(bytes: Uint8Array): string {
	let binary = "";
	for (let i = 0; i < bytes.length; i += CHUNK) binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
	return btoa(binary);
}

export function decodeBase64(text: string): Uint8Array {
	return Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
}

const isString = (value: unknown): value is string => typeof value === "string";

function stringList(value: unknown): string[] | null {
	return Array.isArray(value) ? value.filter(isString) : null;
}

function isCell(value: unknown): value is Cell {
	return value === null || ["string", "number", "boolean"].includes(typeof value);
}

function isNullableString(value: unknown): value is string | null {
	return value === null || isString(value);
}

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

function parseRegistration(raw: unknown): StoredRegistration | null {
	if (!isRecord(raw) || !isString(raw.fileName) || !isString(raw.csvBase64)) return null;
	const waveSelection = stringList(raw.waveSelection);
	return waveSelection ? { fileName: raw.fileName, csvBase64: raw.csvBase64, waveSelection } : null;
}

function parseResults(raw: unknown): StoredResults | null {
	if (!isRecord(raw) || !isString(raw.fileName) || !Number.isFinite(raw.lastModified)) return null;
	const yearWarning = Number.isInteger(raw.yearWarning) ? (raw.yearWarning as number) : null;
	const workbook = parseWorkbook(raw.workbook);
	if (workbook === null) return null;
	// Ältere Stände kennen die beiden Angaben noch nicht.
	const creationUnknown = raw.creationUnknown === true;
	const yearConfirmed = raw.yearConfirmed === true;
	const lastModified = raw.lastModified as number;
	return { fileName: raw.fileName, lastModified, workbook, yearWarning, creationUnknown, yearConfirmed };
}

function parseHidden(raw: unknown): StoredHidden | null {
	if (!isRecord(raw)) return null;
	const ageGroups = stringList(raw.ageGroups);
	const genders = stringList(raw.genders);
	const kinds = stringList(raw.kinds)?.filter((kind): kind is AgeGroupKind => KINDS.includes(kind as AgeGroupKind));
	return ageGroups && genders && kinds ? { ageGroups, genders, kinds } : null;
}

function parseSelection(raw: unknown): StoredCertificateSelection | null {
	if (!isRecord(raw)) return null;
	const hidden = parseHidden(raw.hidden);
	const excluded = stringList(raw.excluded);
	return hidden && excluded ? { hidden, excluded } : null;
}

function isIsoTime(value: unknown): value is string {
	return isString(value) && !Number.isNaN(Date.parse(value));
}

/** Nur bekannte Felder; kaputte Teile fallen einzeln weg, Unbrauchbares ergibt null. */
export function parseCompetitionState(raw: unknown): CompetitionState | null {
	if (!isRecord(raw) || raw.schemaVersion !== SCHEMA_VERSION || !isIsoTime(raw.savedAt)) return null;
	const state: CompetitionState = { savedAt: raw.savedAt };
	const registration = parseRegistration(raw.registration);
	const results = parseResults(raw.results);
	const certificateSelection = parseSelection(raw.certificateSelection);
	if (registration) state.registration = registration;
	if (results) state.results = results;
	if (certificateSelection) state.certificateSelection = certificateSelection;
	return state;
}

export function saveCompetitionState(state: CompetitionState): Promise<void> {
	return writeJson(COMPETITION_STATE_PATH, { schemaVersion: SCHEMA_VERSION, ...state });
}

/** Fehlt die Datei, kommt null; eine unbrauchbare Datei wird nur mit Code protokolliert. */
export async function loadCompetitionState(): Promise<CompetitionState | null> {
	if (!(await appDataStore().exists(COMPETITION_STATE_PATH))) return null;
	const state = await readJson(COMPETITION_STATE_PATH, parseCompetitionState);
	if (state === null) logError("competition.stateInvalid");
	return state;
}

export function clearCompetitionState(): Promise<void> {
	return appDataStore().remove(COMPETITION_STATE_PATH);
}

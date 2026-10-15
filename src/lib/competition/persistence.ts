// Gesicherter Wettkampfstand im App-Datenordner. Enthält Personendaten: nie protokollieren, nur Codes.
// Der kleine Stand (state.json) wird oft gesichert, die Ergebnisse (results.json) nur bei Änderung.
import { logError } from "$lib/log";
import { appDataStore, readJsonOrSetAside, writeJson } from "$lib/platform/fs";
import { isRecord } from "$lib/settings/validate";
import type { AgeGroupKind } from "$lib/wwk/ageGroups";
import {
	clearStoredResults,
	parseLegacyResults,
	parseStoredResults,
	COMPETITION_RESULTS_PATH,
	type StoredResults
} from "./resultsFile";

export const COMPETITION_STATE_PATH = "competition/state.json";
const SCHEMA_VERSION = 2;
/** Erste Version: Ergebnisse steckten noch im Stand. */
const LEGACY_SCHEMA_VERSION = 1;

export interface StoredRegistration {
	fileName: string;
	/** Original-CSV, Base64-kodiert. */
	csvBase64: string;
	waveSelection: string[];
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
	certificateSelection?: StoredCertificateSelection;
}

export interface ParsedCompetitionState {
	state: CompetitionState;
	/** Nur im alten Format: dort eingebettete Ergebnisse. */
	legacyResults: StoredResults | null;
}

export interface LoadedCompetition {
	state: CompetitionState | null;
	results: StoredResults | null;
	/** Alter Stand mit eingebetteten Ergebnissen: neu sichern. */
	needsMigration: boolean;
	/** Unlesbare, beiseitegelegte Dateien. */
	setAside: string[];
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

function parseRegistration(raw: unknown): StoredRegistration | null {
	if (!isRecord(raw) || !isString(raw.fileName) || !isString(raw.csvBase64)) return null;
	const waveSelection = stringList(raw.waveSelection);
	return waveSelection ? { fileName: raw.fileName, csvBase64: raw.csvBase64, waveSelection } : null;
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

const KNOWN_VERSIONS: readonly unknown[] = [SCHEMA_VERSION, LEGACY_SCHEMA_VERSION];

/** Nur bekannte Felder; kaputte Teile fallen einzeln weg, Unbrauchbares ergibt null. */
export function parseCompetitionState(raw: unknown): ParsedCompetitionState | null {
	if (!isRecord(raw) || !KNOWN_VERSIONS.includes(raw.schemaVersion) || !isIsoTime(raw.savedAt)) return null;
	const state: CompetitionState = { savedAt: raw.savedAt };
	const registration = parseRegistration(raw.registration);
	const certificateSelection = parseSelection(raw.certificateSelection);
	if (registration) state.registration = registration;
	if (certificateSelection) state.certificateSelection = certificateSelection;
	const legacyResults = raw.schemaVersion === LEGACY_SCHEMA_VERSION ? parseLegacyResults(raw.results) : null;
	return { state, legacyResults };
}

/** Inhalt von state.json; Ergebnisse gehören in ihre eigene Datei. */
export function serializeCompetitionState({ savedAt, registration, certificateSelection }: CompetitionState): object {
	return { schemaVersion: SCHEMA_VERSION, savedAt, registration, certificateSelection };
}

export function saveCompetitionState(state: CompetitionState): Promise<void> {
	return writeJson(COMPETITION_STATE_PATH, serializeCompetitionState(state));
}

/** Lädt beide Dateien; unlesbare werden beiseitegelegt und nur mit Code protokolliert. */
export async function loadCompetition(now: Date = new Date()): Promise<LoadedCompetition> {
	const stateFile = await readJsonOrSetAside(COMPETITION_STATE_PATH, parseCompetitionState, now);
	const resultsFile = await readJsonOrSetAside(COMPETITION_RESULTS_PATH, parseStoredResults, now);
	if (stateFile.setAsideAs !== null) logError("competition.stateInvalid");
	if (resultsFile.setAsideAs !== null) logError("competition.resultsInvalid");
	const legacyResults = stateFile.value?.legacyResults ?? null;
	return {
		state: stateFile.value?.state ?? null,
		results: resultsFile.value ?? legacyResults,
		needsMigration: legacyResults !== null,
		setAside: [stateFile.setAsideAs, resultsFile.setAsideAs].filter((path): path is string => path !== null)
	};
}

export async function clearCompetitionState(): Promise<void> {
	await appDataStore().remove(COMPETITION_STATE_PATH);
	await clearStoredResults();
}

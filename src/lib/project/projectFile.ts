// Projektdatei (.wwkprojekt): der komplette Wettkampfstand als ZIP für einen anderen Rechner.
// Die Teile nutzen dieselben Formate wie der App-Datenordner. Enthält Personendaten.
// Weitere Dateien des Datenordners (Entfernungen, Rec-Werte) liegen unverändert unter „appdata/“;
// ältere Programme lassen sie beim Lesen einfach weg.
import { strFromU8, strToU8, unzipSync, zipSync, type Unzipped, type Zippable } from "fflate";
import { SIGNATURE_SLOTS, type LayoutSet, type SignatureSlot } from "$lib/certificates/layout";
import { parseLayoutSet, serializeLayoutSet } from "$lib/certificates/layoutParse";
import { detectImageType } from "$lib/certificates/layoutStore.svelte";
import { parseCompetitionState, serializeCompetitionState, type CompetitionState } from "$lib/competition/persistence";
import { parseStoredResults, serializeStoredResults, type StoredResults } from "$lib/competition/resultsFile";
import { eventHeadline } from "$lib/settings/eventInfo";
import { issueMessages } from "$lib/settings/issueMessages";
import { parseSettings, serializeSettingsForExport, type Settings } from "$lib/settings/settings";
import { isRecord } from "$lib/settings/validate";
import { isProjectDataPath, isValidProjectData, projectDataLabel, type ProjectData } from "./projectData";

export const PROJECT_EXTENSION = "wwkprojekt";
export const PROJECT_FORMAT = "wettkampftools-projekt";
export const PROJECT_VERSION = 1;

const BYTES_PER_MB = 1024 * 1024;
const MAX_PROJECT_MB = 50;
const MAX_UNPACKED_MB = 200;
/** Größte Projektdatei, die gelesen wird. */
export const MAX_PROJECT_BYTES = MAX_PROJECT_MB * BYTES_PER_MB;
/** Schutz vor Dateien, die beim Entpacken riesig werden. */
const MAX_UNPACKED_BYTES = MAX_UNPACKED_MB * BYTES_PER_MB;

const MANIFEST = "manifest.json";
const SETTINGS = "settings.json";
const LAYOUT = "layout.json";
const STATE = "competition/state.json";
const RESULTS = "competition/results.json";
const IMAGE_DIR = "images";
const DATA_PREFIX = "appdata/";
const IMAGE_EXTENSIONS = ["png", "jpg"] as const;

const signatureEntries = (slot: SignatureSlot): string[] =>
	IMAGE_EXTENSIONS.map((ext) => `${IMAGE_DIR}/${slot}.${ext}`);
const KNOWN_ENTRIES = new Set([
	MANIFEST,
	SETTINGS,
	LAYOUT,
	STATE,
	RESULTS,
	...SIGNATURE_SLOTS.flatMap(signatureEntries)
]);

/** Bekannter Eintrag: fester Teil, Unterschrift oder Datei aus dem Datenordner. */
const isKnownEntry = (name: string): boolean =>
	KNOWN_ENTRIES.has(name) || (name.startsWith(DATA_PREFIX) && isProjectDataPath(name.slice(DATA_PREFIX.length)));

const PART_NAMES: Record<string, string> = {
	[SETTINGS]: "Einstellungen",
	[LAYOUT]: "Urkunden-Layout",
	[STATE]: "Wettkampfstand",
	[RESULTS]: "Ergebnisse",
	signature1: "Unterschrift 1",
	signature2: "Unterschrift 2"
};

const NOT_A_PROJECT = "Die Datei ist keine Projektdatei der Wettkampftools.";
const TOO_NEW =
	"Die Projektdatei stammt aus einer neueren Version der Wettkampftools. Bitte zuerst das Programm aktualisieren.";
const TOO_LARGE = "Die Projektdatei ist zu groß.";
const brokenNamed = (name: string): string => `Die Projektdatei ist beschädigt: ${name} konnte nicht gelesen werden.`;
const brokenPart = (key: string): string => brokenNamed(PART_NAMES[key]);

export type Signatures = Record<SignatureSlot, Uint8Array | null>;

/** Aktueller Stand, aus dem die Datei gebaut wird. */
export interface ProjectSnapshot {
	settings: Settings;
	layouts: LayoutSet;
	signatures: Signatures;
	competition: CompetitionState | null;
	results: StoredResults | null;
	/** Weitere Dateien aus dem Datenordner. */
	data: ProjectData;
}

export interface ProjectManifest {
	format: typeof PROJECT_FORMAT;
	version: number;
	createdAt: string;
	appVersion: string;
	eventHeadline: string;
	/** Unterschriften wurden mitgenommen. */
	signatures: boolean;
}

export interface Project {
	manifest: ProjectManifest;
	settings: Settings;
	layouts: LayoutSet;
	/** null: Unterschriften wurden nicht mitgenommen. */
	signatures: Signatures | null;
	competition: CompetitionState | null;
	results: StoredResults | null;
	/** Weitere Dateien aus dem Datenordner; leer bei älteren Projekten. */
	data: ProjectData;
	/** Hinweise zu einzelnen Werten, die auf Standard gesetzt wurden. */
	warnings: string[];
}

export type ProjectReadResult = { ok: true; project: Project } | { ok: false; message: string };

export interface BuildOptions {
	includeSignatures: boolean;
	now: Date;
	appVersion: string;
}

const jsonEntry = (value: unknown): Uint8Array => strToU8(JSON.stringify(value, null, "\t"));

function signatureFiles(signatures: Signatures): Zippable {
	const files: Zippable = {};
	for (const slot of SIGNATURE_SLOTS) {
		const bytes = signatures[slot];
		const type = bytes === null ? null : detectImageType(bytes);
		if (bytes !== null && type !== null) files[`${IMAGE_DIR}/${slot}.${type}`] = bytes;
	}
	return files;
}

export function buildProjectFile(snapshot: ProjectSnapshot, options: BuildOptions): Uint8Array {
	const manifest: ProjectManifest = {
		format: PROJECT_FORMAT,
		version: PROJECT_VERSION,
		createdAt: options.now.toISOString(),
		appVersion: options.appVersion,
		eventHeadline: eventHeadline(snapshot.settings.event),
		signatures: options.includeSignatures
	};
	const files: Zippable = {
		[MANIFEST]: jsonEntry(manifest),
		[SETTINGS]: jsonEntry(serializeSettingsForExport(snapshot.settings)),
		[LAYOUT]: jsonEntry(serializeLayoutSet(snapshot.layouts))
	};
	if (snapshot.competition) files[STATE] = jsonEntry(serializeCompetitionState(snapshot.competition));
	if (snapshot.results) files[RESULTS] = jsonEntry(serializeStoredResults(snapshot.results));
	if (options.includeSignatures) Object.assign(files, signatureFiles(snapshot.signatures));
	for (const [path, bytes] of Object.entries(snapshot.data)) files[`${DATA_PREFIX}${path}`] = bytes;
	return zipSync(files);
}

class Rejected extends Error {}

export interface ReadLimits {
	maxUnpackedBytes: number;
}

const DEFAULT_LIMITS: ReadLimits = { maxUnpackedBytes: MAX_UNPACKED_BYTES };

/**
 * Nur bekannte Einträge; kaputte, doppelte oder beim Entpacken zu große Dateien werden abgelehnt.
 * Die angegebene Größe kann gefälscht sein, darum zählt mindestens die gepackte.
 */
function unpack(bytes: Uint8Array, limits: ReadLimits): Unzipped {
	let unpacked = 0;
	const names = new Set<string>();
	try {
		return unzipSync(bytes, {
			filter: (file) => {
				if (names.has(file.name)) throw new Rejected(NOT_A_PROJECT);
				names.add(file.name);
				if (!isKnownEntry(file.name)) return false;
				unpacked += Math.max(file.size, file.originalSize);
				if (unpacked > limits.maxUnpackedBytes) throw new Rejected(TOO_LARGE);
				return true;
			}
		});
	} catch (error) {
		throw error instanceof Rejected ? error : new Rejected(NOT_A_PROJECT);
	}
}

function parseJson(bytes: Uint8Array | undefined): unknown {
	if (bytes === undefined) return undefined;
	try {
		return JSON.parse(strFromU8(bytes));
	} catch {
		return undefined;
	}
}

function parseManifest(raw: unknown): ProjectManifest | string {
	if (!isRecord(raw) || raw.format !== PROJECT_FORMAT || !Number.isInteger(raw.version)) return NOT_A_PROJECT;
	if ((raw.version as number) > PROJECT_VERSION) return TOO_NEW;
	if (raw.version !== PROJECT_VERSION) return NOT_A_PROJECT;
	const text = (value: unknown): string => (typeof value === "string" ? value : "");
	return {
		format: PROJECT_FORMAT,
		version: PROJECT_VERSION,
		createdAt: text(raw.createdAt),
		appVersion: text(raw.appVersion),
		eventHeadline: text(raw.eventHeadline),
		signatures: raw.signatures === true
	};
}

function optionalPart<T>(entries: Unzipped, key: string, parse: (raw: unknown) => T | null): T | null {
	return key in entries ? requiredPart(entries, key, parse) : null;
}

/** Fehlt der Teil oder besteht er die Prüfung nicht, wird abgebrochen. */
function requiredPart<T>(entries: Unzipped, key: string, parse: (raw: unknown) => T | null): T {
	const raw = parseJson(entries[key]);
	const value = isRecord(raw) ? parse(raw) : null;
	if (value === null) throw new Rejected(brokenPart(key));
	return value;
}

function readSignatures(entries: Unzipped): Signatures {
	const signatures: Signatures = { signature1: null, signature2: null };
	for (const slot of SIGNATURE_SLOTS) {
		const name = signatureEntries(slot).find((entry) => entry in entries);
		if (name === undefined) continue;
		const bytes = entries[name];
		if (`${IMAGE_DIR}/${slot}.${detectImageType(bytes)}` !== name) throw new Rejected(brokenPart(slot));
		signatures[slot] = bytes;
	}
	return signatures;
}

function readData(entries: Unzipped): ProjectData {
	const data: ProjectData = {};
	for (const [name, bytes] of Object.entries(entries)) {
		if (!name.startsWith(DATA_PREFIX)) continue;
		const path = name.slice(DATA_PREFIX.length);
		if (!isValidProjectData(path, bytes)) throw new Rejected(brokenNamed(projectDataLabel(path)));
		data[path] = bytes;
	}
	return data;
}

function readParts(entries: Unzipped, manifest: ProjectManifest): Project {
	const settings = requiredPart(entries, SETTINGS, parseSettings);
	const layouts = requiredPart(entries, LAYOUT, parseLayoutSet);
	return {
		manifest,
		settings: settings.settings,
		layouts: layouts.layouts,
		signatures: manifest.signatures ? readSignatures(entries) : null,
		competition: optionalPart(entries, STATE, (raw) => parseCompetitionState(raw)?.state ?? null),
		results: optionalPart(entries, RESULTS, parseStoredResults),
		data: readData(entries),
		warnings: [...issueMessages(settings.issues), ...layouts.issues]
	};
}

function readProject(bytes: Uint8Array, limits: ReadLimits): Project {
	if (bytes.length > MAX_PROJECT_BYTES) throw new Rejected(TOO_LARGE);
	const entries = unpack(bytes, limits);
	const manifest = parseManifest(parseJson(entries[MANIFEST]));
	if (typeof manifest === "string") throw new Rejected(manifest);
	return readParts(entries, manifest);
}

/** Prüft die Datei vollständig, bevor etwas übernommen wird. */
export function readProjectFile(bytes: Uint8Array, limits: ReadLimits = DEFAULT_LIMITS): ProjectReadResult {
	try {
		return { ok: true, project: readProject(bytes, limits) };
	} catch (error) {
		if (error instanceof Rejected) return { ok: false, message: error.message };
		throw error;
	}
}

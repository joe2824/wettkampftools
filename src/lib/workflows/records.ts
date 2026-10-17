// Rec-Werte fürs neue Jahr: Regelwerke laden, Bestzeiten nachtragen, neues Regelwerk speichern.
import { parseRulebook } from "$lib/io/rulebook";
import { saveFile, writePenaltyCatalogNextTo } from "$lib/platform/files";
import { platformFetch } from "$lib/platform/http";
import { readWorkbook } from "$lib/platform/workbook";
import { toRecUpdates, type RecChange } from "$lib/records/proposal";
import {
	disqualifyingAgeGroups,
	parseRulebookRecords,
	writeRulebookRecords,
	type RulebookRecord
} from "$lib/records/rulebookRecords";
import {
	loadAllBestTimes,
	loadClubRulebook,
	rememberBestTimes,
	saveClubRulebook,
	type StoredRulebook
} from "$lib/records/storage";
import { WAVE_HISTORY } from "$lib/records/waveHistory";
import {
	currentDisciplines,
	mergeYears,
	waveRecordTable,
	waveStatistics,
	type WaveRecord,
	type WaveStatistic
} from "$lib/records/waveRecords";
import type { BestTimes } from "$lib/records/bestTimes";
import { workbookYear } from "$lib/wwk/results";
import { userMessage } from "./errors";
import type { ResultsFile } from "./results";

export interface LoadedRulebook extends StoredRulebook {
	description: string;
	records: RulebookRecord[];
}

export type RulebookOutcome = { ok: true; rulebook: LoadedRulebook } | { ok: false; message: string };
export interface SavedRulebook {
	rulebookPath: string;
	/** Pfad des Strafenkatalogs; null, wenn keiner mitgespeichert wurde. */
	penaltyPath: string | null;
	penaltyError: string | null;
}

export type BestTimesOutcome = { ok: true; year: number; entries: number } | { ok: false; message: string };

export interface WaveRecords {
	table: WaveRecord[];
	statistics: WaveStatistic[];
	/** Zeiten je Jahr, aufsteigend; Grundlage für Verläufe. */
	history: BestTimes[];
	/** Disziplinen des jüngsten Jahres. */
	disciplines: string[];
	/** Jahre, aus denen Zeiten vorliegen, aufsteigend. */
	years: number[];
}

export const EMPTY_WAVE_RECORDS: WaveRecords = { table: [], statistics: [], history: [], disciplines: [], years: [] };

const OFFICIAL_BASE_URL =
	"https://raw.githubusercontent.com/dennisfabri/JAuswertung/main/jauswertung-files/src/main/resources/aks/";
const HTTP_NOT_FOUND = 404;
const RULEBOOK_FILTERS = [{ name: "JAuswertung-Regelwerk", extensions: ["rwm"] }];
const UNREADABLE_RULEBOOK = "Die Datei ist kein JAuswertung-Regelwerk.";
const DOWNLOAD_FAILED = "Das offizielle Regelwerk konnte nicht geladen werden. Besteht eine Internetverbindung?";
const UNREADABLE_RESULTS = "Die Ergebnisdatei konnte nicht gelesen werden.";
const NO_TIMES = "Die Ergebnisdatei enthält keine gültigen Zeiten aus der Welle.";
const PENALTY_WRITE_FAILED = "Der Strafenkatalog konnte nicht neben das Regelwerk geschrieben werden.";

const RULEBOOK_EXTENSION = /\.rwm$/i;

const officialFileName = (year: number): string => `DLRG ${year}.rwm`;

const notPublished = (year: number): string =>
	`Das Regelwerk „${officialFileName(year)}“ ist im JAuswertung-Projekt noch nicht veröffentlicht. ` +
	"Bitte später erneut versuchen oder die Datei aus einem JAuswertung-Programmordner wählen.";

/** Name für die Herkunft der Rec-Werte: Dateiname ohne Endung, sonst die Beschreibung. */
export function officialRulebookName(rulebook: Pick<LoadedRulebook, "name" | "description"> | null): string | null {
	if (rulebook === null) return null;
	const name = rulebook.name.replace(RULEBOOK_EXTENSION, "").trim() || rulebook.description.trim();
	return name || null;
}

/** Offizielles Regelwerk eines Jahres im JAuswertung-Projekt auf GitHub. */
export const officialRulebookUrl = (year: number): string =>
	OFFICIAL_BASE_URL + encodeURIComponent(officialFileName(year));

export const newRulebookDescription = (year: number): string => `Wellen-Wk ${year} (mit Rec-Werten für ${year - 1})`;

export const newRulebookFileName = (year: number): string => `Regelwerk_${year}.rwm`;

/** So sucht JAuswertung den Katalog neben dem Regelwerk. */
export const newPenaltyCatalogFileName = (year: number): string => `Regelwerk_${year}m.def`;

export function readRulebookFile(name: string, bytes: Uint8Array): RulebookOutcome {
	try {
		const description = parseRulebook(bytes).name;
		return { ok: true, rulebook: { name, bytes, description, records: parseRulebookRecords(bytes) } };
	} catch (error) {
		return { ok: false, message: userMessage(error, UNREADABLE_RULEBOOK) };
	}
}

/** Liest das Vereins-Regelwerk und merkt es sich fürs nächste Mal. */
export async function useClubRulebook(file: StoredRulebook): Promise<RulebookOutcome> {
	const outcome = readRulebookFile(file.name, file.bytes);
	if (outcome.ok) await saveClubRulebook(file);
	return outcome;
}

export async function restoreClubRulebook(): Promise<LoadedRulebook | null> {
	const stored = await loadClubRulebook();
	if (stored === null) return null;
	const outcome = readRulebookFile(stored.name, stored.bytes);
	return outcome.ok ? outcome.rulebook : null;
}

export async function downloadOfficialRulebook(year: number): Promise<RulebookOutcome> {
	let response: Response;
	try {
		response = await platformFetch(officialRulebookUrl(year));
	} catch {
		return { ok: false, message: DOWNLOAD_FAILED };
	}
	if (response.status === HTTP_NOT_FOUND) {
		return { ok: false, message: notPublished(year) };
	}
	if (!response.ok) return { ok: false, message: DOWNLOAD_FAILED };
	return readRulebookFile(officialFileName(year), new Uint8Array(await response.arrayBuffer()));
}

/** Gespeicherte Bestzeiten; ohne Datenordner (etwa im Browser) nur die mitgelieferte Geschichte. */
async function storedBestTimes(): Promise<BestTimes[]> {
	try {
		return await loadAllBestTimes();
	} catch {
		return [];
	}
}

/** Rekorde der Wellendisziplinen aus der mitgelieferten Geschichte und den gespeicherten Bestzeiten. */
export async function loadWaveRecords(): Promise<WaveRecords> {
	const years = mergeYears(WAVE_HISTORY, await storedBestTimes());
	return {
		table: waveRecordTable(years),
		statistics: waveStatistics(years),
		history: years,
		disciplines: currentDisciplines(years),
		years: years.map((bestTimes) => bestTimes.year)
	};
}

/** Bestzeiten aus einer älteren Ergebnisdatei nachtragen; Jahr aus den Dateidaten. */
export async function importBestTimesFile(file: ResultsFile, today: Date = new Date()): Promise<BestTimesOutcome> {
	try {
		const workbook = await readWorkbook(file.bytes);
		const year = workbookYear(workbook.properties, file).year ?? today.getFullYear();
		const entries = await rememberBestTimes(workbook, year);
		return entries > 0 ? { ok: true, year, entries } : { ok: false, message: NO_TIMES };
	} catch (error) {
		return { ok: false, message: userMessage(error, UNREADABLE_RESULTS) };
	}
}

/** Gilt im Regelwerk „jede Strafe disqualifiziert“, greifen Strafpunkte nicht; das soll nirgends so sein. */
export function penaltyDisqualifyingWarning(club: LoadedRulebook): string | null {
	const groups = disqualifyingAgeGroups(club.bytes);
	if (groups.length === 0) return null;
	return (
		`Im Regelwerk führt in ${groups.join(", ")} jede Strafe zur Disqualifikation. ` +
		"Strafpunkte (z. B. 100 für den Fehlstart) wirken dort nicht. Bitte in JAuswertung im Regelwerk ändern."
	);
}

/**
 * Schreibt das neue Regelwerk über den Speichern-Dialog und, falls vorhanden, den
 * Strafenkatalog als „<Name>m.def“ daneben. Bei Abbruch null.
 */
export async function saveNewRulebook(
	club: LoadedRulebook,
	rows: readonly RecChange[],
	year: number,
	penaltyCatalog: Uint8Array | null
): Promise<SavedRulebook | null> {
	const bytes = writeRulebookRecords(club.bytes, toRecUpdates(rows), newRulebookDescription(year));
	const rulebookPath = await saveFile({ defaultName: newRulebookFileName(year), filters: RULEBOOK_FILTERS, bytes });
	if (rulebookPath === null) return null;
	if (penaltyCatalog === null) return { rulebookPath, penaltyPath: null, penaltyError: null };
	try {
		const penaltyPath = await writePenaltyCatalogNextTo(rulebookPath, penaltyCatalog);
		return { rulebookPath, penaltyPath, penaltyError: null };
	} catch (error) {
		return { rulebookPath, penaltyPath: null, penaltyError: userMessage(error, PENALTY_WRITE_FAILED) };
	}
}

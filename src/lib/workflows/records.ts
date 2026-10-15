// Rec-Werte fürs neue Jahr: Regelwerke laden, Bestzeiten nachtragen, neues Regelwerk speichern.
import { parseRulebook } from "$lib/io/rulebook";
import { saveFile } from "$lib/platform/files";
import { platformFetch } from "$lib/platform/http";
import { readWorkbook } from "$lib/platform/workbook";
import { toRecUpdates, type RecChange } from "$lib/records/proposal";
import { parseRulebookRecords, writeRulebookRecords, type RulebookRecord } from "$lib/records/rulebookRecords";
import { loadClubRulebook, rememberBestTimes, saveClubRulebook, type StoredRulebook } from "$lib/records/storage";
import { workbookYear } from "$lib/wwk/results";
import { userMessage } from "./errors";
import type { ResultsFile } from "./results";

export interface LoadedRulebook extends StoredRulebook {
	description: string;
	records: RulebookRecord[];
}

export type RulebookOutcome = { ok: true; rulebook: LoadedRulebook } | { ok: false; message: string };
export type BestTimesOutcome = { ok: true; year: number; entries: number } | { ok: false; message: string };

const OFFICIAL_BASE_URL =
	"https://raw.githubusercontent.com/dennisfabri/JAuswertung/main/jauswertung-files/src/main/resources/aks/";
const HTTP_NOT_FOUND = 404;
const RULEBOOK_FILTERS = [{ name: "JAuswertung-Regelwerk", extensions: ["rwm"] }];
const UNREADABLE_RULEBOOK = "Die Datei ist kein JAuswertung-Regelwerk.";
const DOWNLOAD_FAILED = "Das offizielle Regelwerk konnte nicht geladen werden. Besteht eine Internetverbindung?";
const UNREADABLE_RESULTS = "Die Ergebnisdatei konnte nicht gelesen werden.";
const NO_TIMES = "Die Ergebnisdatei enthält keine gültigen Zeiten.";

const RULEBOOK_EXTENSION = /\.rwm$/i;

const officialFileName = (year: number): string => `DLRG ${year}.rwm`;

const notPublished = (year: number): string =>
	`Das Regelwerk „${officialFileName(year)}“ ist bei JAuswertung noch nicht veröffentlicht. ` +
	"Bitte später erneut versuchen oder die Datei aus dem JAuswertung-Programmordner wählen.";

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

/** Bestzeiten aus einer älteren Ergebnisdatei nachtragen; Jahr aus den Dateidaten. */
export async function importBestTimesFile(file: ResultsFile, today: Date = new Date()): Promise<BestTimesOutcome> {
	try {
		const workbook = await readWorkbook(file.bytes);
		const dates = { createdMs: file.createdMs, modifiedMs: file.lastModified };
		const year = workbookYear(workbook.properties, dates).year ?? today.getFullYear();
		const entries = await rememberBestTimes(workbook, year);
		return entries > 0 ? { ok: true, year, entries } : { ok: false, message: NO_TIMES };
	} catch (error) {
		return { ok: false, message: userMessage(error, UNREADABLE_RESULTS) };
	}
}

/** Schreibt das neue Regelwerk; gibt den Pfad zurück, bei Abbruch null. */
export function saveNewRulebook(
	club: LoadedRulebook,
	rows: readonly RecChange[],
	year: number
): Promise<string | null> {
	const bytes = writeRulebookRecords(club.bytes, toRecUpdates(rows), newRulebookDescription(year));
	return saveFile({ defaultName: newRulebookFileName(year), filters: RULEBOOK_FILTERS, bytes });
}

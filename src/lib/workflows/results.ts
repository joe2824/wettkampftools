// Ergebnisdatei aus JAuswertung laden; genutzt von Auswertung und Urkunden.
import { logError, logInfo } from "$lib/log";
import { readWorkbook, type Workbook } from "$lib/platform/workbook";
import { rememberBestTimes } from "$lib/records/storage";
import { session, type SessionResults } from "$lib/session.svelte";
import { readJAuswertungResults, workbookYear, type CompetitionKind, type FileDates } from "$lib/wwk/results";
import { userMessage } from "./errors";

export interface ResultsFile {
	name: string;
	bytes: Uint8Array;
	/** Änderungszeit; null, wenn unbekannt. */
	modifiedMs: number | null;
	/** Erstellungszeit im Dateisystem; null, wenn unbekannt. */
	createdMs: number | null;
}

export interface YearCheck {
	/** Jahr der Datei, wenn es nicht das laufende ist; sonst null. */
	yearWarning: number | null;
	/** Erstellungsdatum der Datei war nicht ermittelbar. */
	creationUnknown: boolean;
}

export interface ResultsSummary extends YearCheck {
	kind: CompetitionKind;
	rowCount: number;
}

export type ResultsOutcome = { ok: true; summary: ResultsSummary } | { ok: false; message: string };

const UNREADABLE = "Die Ergebnisdatei konnte nicht gelesen werden.";
const EMPTY = "Die Ergebnisdatei enthält keine Einträge.";

/** Prüft, ob die Datei aus dem laufenden Jahr stammt. */
export function resultsYearCheck(workbook: Workbook, dates: FileDates, today: Date): YearCheck {
	const { year, creationKnown } = workbookYear(workbook.properties, dates);
	const yearWarning = year === null || year === today.getFullYear() ? null : year;
	return { yearWarning, creationUnknown: !creationKnown };
}

/** Vor Auswertung und Druck muss eine Datei aus einem anderen Jahr bestätigt sein. */
export function needsYearConfirmation(results: SessionResults | null): boolean {
	return results !== null && results.yearWarning !== null && !results.yearConfirmed;
}

/** Bestzeiten fürs Rec-Werte-Werkzeug merken; ein Fehler dabei stört das Laden nicht. */
async function keepBestTimes(workbook: Workbook, year: number): Promise<void> {
	try {
		const entries = await rememberBestTimes(workbook, year);
		logInfo("records.bestTimesStored", { year, entries });
	} catch {
		logError("records.bestTimesFailed");
	}
}

/** Bestätigt die geladene Datei; Arbeitsmappe und Zeilen bleiben dieselben. Bestzeiten zählen dann fürs Dateijahr. */
export async function confirmResultsYear(): Promise<void> {
	const results = session.results;
	if (results === null) return;
	session.setResults({ ...results, yearConfirmed: true });
	logInfo("results.yearConfirmed");
	if (results.yearWarning !== null) await keepBestTimes(results.workbook, results.yearWarning);
}

/** Liest die Datei; nur bei Erfolg wird die Sitzung ersetzt. */
export async function loadResultsFile(file: ResultsFile, today: Date = new Date()): Promise<ResultsOutcome> {
	try {
		const workbook = await readWorkbook(file.bytes);
		const { kind, rows } = readJAuswertungResults(workbook);
		if (rows.length === 0) return { ok: false, message: EMPTY };
		const check = resultsYearCheck(workbook, file, today);
		const { name: fileName, createdMs, modifiedMs } = file;
		session.setResults({ fileName, createdMs, modifiedMs, workbook, kind, rows, ...check, yearConfirmed: false });
		logInfo("results.loaded", { rows: rows.length, team: kind === "team", creationUnknown: check.creationUnknown });
		if (check.yearWarning === null) await keepBestTimes(workbook, today.getFullYear());
		return { ok: true, summary: { kind, rowCount: rows.length, ...check } };
	} catch (error) {
		return { ok: false, message: userMessage(error, UNREADABLE) };
	}
}

/** Hinweis an gesperrten Schritten, solange das Dateijahr nicht bestätigt ist. */
export const YEAR_CONFIRMATION_HINT =
	"Zuerst oben bestätigen, dass die Ergebnisdatei die richtige ist, oder eine andere Datei laden.";

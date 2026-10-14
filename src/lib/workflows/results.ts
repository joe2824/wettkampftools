// Ergebnisdatei aus JAuswertung laden; genutzt von Auswertung und Urkunden.
import { logInfo } from "$lib/log";
import { readWorkbook, type Workbook } from "$lib/platform/workbook";
import { session } from "$lib/session.svelte";
import { readJAuswertungResults, workbookYear, type CompetitionKind } from "$lib/wwk/results";
import { userMessage } from "./errors";

export interface ResultsFile {
	name: string;
	bytes: Uint8Array;
	lastModified: number;
}

export interface ResultsSummary {
	kind: CompetitionKind;
	rowCount: number;
	/** Jahr der Datei, wenn es nicht das laufende ist; sonst null. */
	yearWarning: number | null;
}

export type ResultsOutcome = { ok: true; summary: ResultsSummary } | { ok: false; message: string };

const UNREADABLE = "Die Ergebnisdatei konnte nicht gelesen werden.";
const EMPTY = "Die Ergebnisdatei enthält keine Einträge.";

/** Jahr der Datei, wenn es nicht das laufende ist; sonst null. */
export function resultsYearWarning(workbook: Workbook, lastModified: number, today: Date): number | null {
	const year = workbookYear(workbook.properties, lastModified);
	return year === today.getFullYear() ? null : year;
}

/** Liest die Datei; nur bei Erfolg wird die Sitzung ersetzt. */
export async function loadResultsFile(file: ResultsFile, today: Date = new Date()): Promise<ResultsOutcome> {
	try {
		const workbook = await readWorkbook(file.bytes);
		const { kind, rows } = readJAuswertungResults(workbook);
		if (rows.length === 0) return { ok: false, message: EMPTY };
		const yearWarning = resultsYearWarning(workbook, file.lastModified, today);
		session.setResults({ fileName: file.name, lastModified: file.lastModified, workbook, kind, rows, yearWarning });
		logInfo("results.loaded", { rows: rows.length, team: kind === "team" });
		return { ok: true, summary: { kind, rowCount: rows.length, yearWarning } };
	} catch (error) {
		return { ok: false, message: userMessage(error, UNREADABLE) };
	}
}

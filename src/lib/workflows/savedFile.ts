// Gemeinsames für gespeicherte Ausgabedateien: Dateifilter und Öffnen nach dem Speichern.
import { logError } from "$lib/log";
import { openOutputFile } from "$lib/platform/output";

export const PDF_FILTER = { name: "PDF-Datei", extensions: ["pdf"] };
export const EXCEL_FILTER = { name: "Excel-Datei", extensions: ["xlsx"] };
export const CSV_FILTER = { name: "CSV-Datei", extensions: ["csv"] };

/** Öffnet die Datei; scheitert das, wird nur der Code protokolliert. */
export async function openAfterSave(path: string, failureCode: string): Promise<boolean> {
	try {
		await openOutputFile(path);
		return true;
	} catch {
		logError(failureCode);
		return false;
	}
}

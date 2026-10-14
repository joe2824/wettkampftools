// Dateien in der Desktop-Hülle wählen und lesen; Datum kommt aus dem Dateisystem.
import { logError } from "$lib/log";
import { pickInputFile, readInputFile } from "$lib/platform/inputFiles";
import { userMessage } from "$lib/workflows/errors";
import { checkInputFile, DEFAULT_MAX_BYTES, dialogFilters, type FileKind, type ReadFileResult } from "./fileCheck";

const UNREADABLE = "Die Datei konnte nicht gelesen werden. Bitte erneut versuchen.";

/** Öffnen-Dialog mit den erlaubten Endungen; bei Abbruch null. */
export async function chooseNativeFile(kinds: FileKind[]): Promise<string | null> {
	try {
		return await pickInputFile(dialogFilters(kinds));
	} catch {
		logError("input.pickFailed");
		return null;
	}
}

/** Liest eine gewählte oder abgelegte Datei und prüft sie. */
export async function loadNativeFile(
	path: string,
	kinds: FileKind[],
	maxBytes: number = DEFAULT_MAX_BYTES
): Promise<ReadFileResult> {
	try {
		return checkInputFile(await readInputFile(path), kinds, maxBytes);
	} catch (error) {
		return { ok: false, message: userMessage(error, UNREADABLE) };
	}
}

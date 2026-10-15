// Fehler in Meldungen für die Oberfläche übersetzen.

/** Pflichtspalten fehlen: vermutlich die falsche CSV-Datei. */
export const NOT_A_TEAM_EXPORT =
	"Diese Datei scheint kein Mannschaften-Export zu sein. Bitte im DLRG-Meldeportal die Mannschaften als CSV exportieren und diese Datei laden.";

const PROGRAM_ERRORS = [TypeError, RangeError, ReferenceError, SyntaxError];

/** Texte der Desktop-Hülle und eigene Fehler sind deutsch; Programmfehler nicht. */
export function userMessage(error: unknown, fallback: string): string {
	if (typeof error === "string") return error.trim() === "" ? fallback : error;
	if (!(error instanceof Error) || PROGRAM_ERRORS.some((type) => error instanceof type)) return fallback;
	return error.message.trim() === "" ? fallback : error.message;
}

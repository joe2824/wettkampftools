// Fehler in Meldungen für die Oberfläche übersetzen.

const PROGRAM_ERRORS = [TypeError, RangeError, ReferenceError, SyntaxError];

/** Texte der Desktop-Hülle und eigene Fehler sind deutsch; Programmfehler nicht. */
export function userMessage(error: unknown, fallback: string): string {
	if (typeof error === "string") return error.trim() === "" ? fallback : error;
	if (!(error instanceof Error) || PROGRAM_ERRORS.some((type) => error instanceof type)) return fallback;
	return error.message.trim() === "" ? fallback : error.message;
}

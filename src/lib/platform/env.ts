// Wo das Programm gerade läuft.

/** Läuft das Programm in der Desktop-Hülle? */
export function isTauri(): boolean {
	return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

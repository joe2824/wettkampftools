// Gemerkter Bearbeitungsmodus für alle Listen in den Einstellungen (nur Komfort, pro Gerät).

export type ListEditMode = "list" | "text";

const STORAGE_KEY = "wettkampftools.listEditMode";

function readStoredMode(): ListEditMode {
	try {
		return globalThis.localStorage?.getItem(STORAGE_KEY) === "text" ? "text" : "list";
	} catch {
		return "list";
	}
}

class ListEditModeState {
	current = $state<ListEditMode>(readStoredMode());

	set(mode: ListEditMode): void {
		this.current = mode;
		try {
			globalThis.localStorage?.setItem(STORAGE_KEY, mode);
		} catch {
			// Speichern ist optional, der Modus gilt dann nur bis zum Neustart.
		}
	}
}

export const listEditMode = new ListEditModeState();

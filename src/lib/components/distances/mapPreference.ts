// Ob die Karte unter „Entfernungen“ gezeigt wird; nur eine Bequemlichkeit, daher Fehler still übergehen.
export const MAP_VISIBLE_KEY = "distances.mapVisible";

export function readMapVisible(): boolean {
	try {
		return globalThis.localStorage?.getItem(MAP_VISIBLE_KEY) !== "false";
	} catch {
		return true;
	}
}

export function writeMapVisible(visible: boolean): void {
	try {
		globalThis.localStorage?.setItem(MAP_VISIBLE_KEY, String(visible));
	} catch {
		// Ohne Speicher gilt die Wahl nur bis zum Neustart.
	}
}

// Ein-/Aus-Schalter im Browser-Speicher merken; nur Bequemlichkeit, daher Fehler still übergehen.

export function readStoredFlag(key: string, fallback: boolean): boolean {
	try {
		const stored = globalThis.localStorage?.getItem(key);
		return stored === "true" || stored === "false" ? stored === "true" : fallback;
	} catch {
		return fallback;
	}
}

export function writeStoredFlag(key: string, value: boolean): void {
	try {
		globalThis.localStorage?.setItem(key, String(value));
	} catch {
		// Ohne Speicher gilt die Wahl nur bis zum Neustart.
	}
}

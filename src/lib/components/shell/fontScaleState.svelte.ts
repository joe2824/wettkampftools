// Schriftgröße pro Rechner im Browser-Speicher, wie das Farbschema; nicht Teil der Einstellungen.
import { DEFAULT_FONT_SCALE, parseFontScale, stepFontScale, type FontScaleAction } from "./fontScale";

const STORAGE_KEY = "wettkampftools.fontScale";

function readStored(): number {
	try {
		return parseFontScale(globalThis.localStorage?.getItem(STORAGE_KEY));
	} catch {
		return DEFAULT_FONT_SCALE;
	}
}

class FontScaleState {
	current = $state(readStored());

	apply(action: FontScaleAction): void {
		this.current = stepFontScale(this.current, action);
		try {
			globalThis.localStorage?.setItem(STORAGE_KEY, String(this.current));
		} catch {
			// Ohne Speicher gilt die Größe nur bis zum Neustart.
		}
	}
}

export const fontScale = new FontScaleState();

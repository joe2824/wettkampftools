// Mitgelieferte Nunito-Schnitte für Urkunden, Aushang und Vorschau.
import { loadStaticAsset } from "$lib/platform/assets";
import { loadFontBytes, type FontBytes } from "./fonts";

const FONT_LOAD_ERROR = "Die Schriftdateien konnten nicht geladen werden.";

let fontCache: Promise<FontBytes> | null = null;

/** Einmal geladen, danach aus dem Zwischenspeicher; nach einem Fehler neuer Versuch. */
export function loadAppFonts(): Promise<FontBytes> {
	if (fontCache === null) {
		fontCache = loadFontBytes(loadStaticAsset).catch(() => {
			fontCache = null;
			throw new Error(FONT_LOAD_ERROR);
		});
	}
	return fontCache;
}

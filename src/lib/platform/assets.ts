// Mitgelieferte Dateien aus dem Programmordner (static/) laden.
import { loadFontBytes, type FontBytes } from "$lib/certificates/fonts";

const FONT_LOAD_ERROR = "Die Schriftdateien konnten nicht geladen werden.";

let fontCache: Promise<FontBytes> | null = null;

async function fetchAsset(path: string): Promise<Uint8Array> {
	const response = await globalThis.fetch(path);
	if (!response.ok) throw new Error(FONT_LOAD_ERROR);
	return new Uint8Array(await response.arrayBuffer());
}

/** Nunito-Schnitte; einmal geladen, danach aus dem Zwischenspeicher. */
export function loadAppFonts(): Promise<FontBytes> {
	if (fontCache === null) {
		fontCache = loadFontBytes(fetchAsset).catch(() => {
			fontCache = null;
			throw new Error(FONT_LOAD_ERROR);
		});
	}
	return fontCache;
}

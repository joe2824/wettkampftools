import fontkit, { type Font } from "@cantoo/fontkit";
import { FONT_WEIGHTS, ptToMm, type FontWeight } from "./layout";

export const FONT_FILES: Record<FontWeight, string> = {
	light: "/fonts/Nunito-Light.ttf",
	regular: "/fonts/Nunito-Regular.ttf",
	bold: "/fonts/Nunito-Bold.ttf",
	black: "/fonts/Nunito-Black.ttf"
};

export type FontBytes = Record<FontWeight, Uint8Array>;
export type FontLoader = (path: string) => Promise<Uint8Array>;

export interface TextMetrics {
	widthMm(text: string, weight: FontWeight, sizePt: number): number;
	ascentMm(weight: FontWeight, sizePt: number): number;
}

export async function loadFontBytes(loader: FontLoader): Promise<FontBytes> {
	const entries = await Promise.all(
		FONT_WEIGHTS.map(async (weight) => [weight, await loader(FONT_FILES[weight])] as const)
	);
	return Object.fromEntries(entries) as FontBytes;
}

function openFont(bytes: Uint8Array): Font {
	const font = fontkit.create(bytes);
	// Nunito liegt als Einzelschrift vor, keine Sammlung.
	if (!("unitsPerEm" in font)) throw new Error("Schriftsammlungen werden nicht unterstützt");
	return font;
}

export function createMetrics(fonts: FontBytes): TextMetrics {
	const cache = new Map<FontWeight, Font>();
	const fontFor = (weight: FontWeight): Font => {
		let font = cache.get(weight);
		if (!font) {
			font = openFont(fonts[weight]);
			cache.set(weight, font);
		}
		return font;
	};
	const emToMm = (font: Font, units: number, sizePt: number) => ptToMm((units / font.unitsPerEm) * sizePt);

	return {
		widthMm(text, weight, sizePt) {
			if (text === "") return 0;
			const font = fontFor(weight);
			return emToMm(font, font.layout(text).advanceWidth, sizePt);
		},
		ascentMm(weight, sizePt) {
			const font = fontFor(weight);
			return emToMm(font, font.ascent, sizePt);
		}
	};
}

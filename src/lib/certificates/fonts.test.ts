import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { FONT_FILES, createMetrics, loadFontBytes } from "./fonts";
import { FONT_WEIGHTS } from "./layout";

const readStatic = async (path: string) => new Uint8Array(await readFile(`static${path}`));

describe("loadFontBytes", () => {
	it("lädt alle Schnitte über den übergebenen Loader", async () => {
		const requested: string[] = [];
		const fonts = await loadFontBytes(async (path) => {
			requested.push(path);
			return readStatic(path);
		});
		expect(requested.sort()).toEqual(Object.values(FONT_FILES).sort());
		for (const weight of FONT_WEIGHTS) expect(fonts[weight].length).toBeGreaterThan(0);
	});

	it("verweist auf die Nunito-Dateien", () => {
		expect(FONT_FILES.black).toBe("/fonts/Nunito-Black.ttf");
		expect(FONT_FILES.light).toBe("/fonts/Nunito-Light.ttf");
	});
});

describe("createMetrics", async () => {
	const metrics = createMetrics(await loadFontBytes(readStatic));

	it("Breite wächst mit der Textlänge und der Schriftgröße", () => {
		const short = metrics.widthMm("Anna", "regular", 12);
		expect(short).toBeGreaterThan(0);
		expect(metrics.widthMm("Anna Meier", "regular", 12)).toBeGreaterThan(short);
		expect(metrics.widthMm("Anna", "regular", 24)).toBeCloseTo(short * 2, 6);
	});

	it("Black ist breiter als Light", () => {
		expect(metrics.widthMm("Musterstadt", "black", 12)).toBeGreaterThan(metrics.widthMm("Musterstadt", "light", 12));
	});

	it("leerer Text hat Breite 0", () => {
		expect(metrics.widthMm("", "bold", 12)).toBe(0);
	});

	it("Oberlänge ist positiv und skaliert mit der Größe", () => {
		const ascent = metrics.ascentMm("regular", 10);
		expect(ascent).toBeGreaterThan(0);
		expect(metrics.ascentMm("regular", 20)).toBeCloseTo(ascent * 2, 6);
	});
});

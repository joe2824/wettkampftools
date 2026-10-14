import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FONT_FILES } from "$lib/certificates/fonts";

const fetchMock = vi.fn<(path: string) => Promise<Response>>();

async function freshModule() {
	vi.resetModules();
	return import("./assets");
}

beforeEach(() => {
	fetchMock.mockReset();
	fetchMock.mockImplementation(async (path) => new Response(await readFile(`static${path}`)));
	vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("loadAppFonts", () => {
	it("lädt alle Schnitte aus den mitgelieferten Dateien", async () => {
		const { loadAppFonts } = await freshModule();
		const fonts = await loadAppFonts();
		expect(fetchMock.mock.calls.map(([path]) => path).sort()).toEqual(Object.values(FONT_FILES).sort());
		expect(fonts.bold).toBeInstanceOf(Uint8Array);
		expect(fonts.bold.length).toBeGreaterThan(0);
	});

	it("lädt nur einmal und liefert danach den Zwischenspeicher", async () => {
		const { loadAppFonts } = await freshModule();
		const first = await loadAppFonts();
		const second = await loadAppFonts();
		expect(second).toBe(first);
		expect(fetchMock).toHaveBeenCalledTimes(Object.keys(FONT_FILES).length);
	});

	it("meldet fehlende Dateien verständlich und versucht es beim nächsten Mal erneut", async () => {
		const { loadAppFonts } = await freshModule();
		fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
		await expect(loadAppFonts()).rejects.toThrow("Die Schriftdateien konnten nicht geladen werden.");
		fetchMock.mockImplementation(async (path) => new Response(await readFile(`static${path}`)));
		await expect(loadAppFonts()).resolves.toHaveProperty("regular");
	});
});

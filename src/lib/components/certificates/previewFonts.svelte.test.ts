import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { loadFontBytes } from "$lib/certificates/fonts";

const assetsMock = vi.hoisted(() => ({ loadAppFonts: vi.fn() }));
vi.mock("$lib/certificates/appFonts", () => assetsMock);

import { PreviewFonts } from "./previewFonts.svelte";

describe("PreviewFonts", () => {
	it("stellt nach dem Laden die Textmaße bereit", async () => {
		assetsMock.loadAppFonts.mockResolvedValue(
			await loadFontBytes(async (path) => new Uint8Array(await readFile(`static${path}`)))
		);
		const fonts = new PreviewFonts();
		expect(fonts.metrics).toBeNull();
		await fonts.load();
		expect(fonts.metrics).not.toBeNull();
		expect(fonts.failed).toBe(false);
	});

	it("merkt sich, wenn die Schriften fehlen", async () => {
		assetsMock.loadAppFonts.mockRejectedValue(new Error("fehlt"));
		const fonts = new PreviewFonts();
		await fonts.load();
		expect(fonts.metrics).toBeNull();
		expect(fonts.failed).toBe(true);
	});
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { loadStaticAsset } from "./assets";

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("loadStaticAsset", () => {
	it("liefert die Bytes der mitgelieferten Datei", async () => {
		const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
		vi.stubGlobal("fetch", fetchMock);
		expect(await loadStaticAsset("/fonts/a.ttf")).toEqual(new Uint8Array([1, 2, 3]));
		expect(fetchMock).toHaveBeenCalledWith("/fonts/a.ttf");
	});

	it("scheitert, wenn die Datei fehlt", async () => {
		vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));
		await expect(loadStaticAsset("/fonts/a.ttf")).rejects.toThrow("/fonts/a.ttf");
	});
});

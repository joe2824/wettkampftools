// @vitest-environment happy-dom
import { flushSync } from "svelte";
import { describe, expect, it, vi } from "vitest";
import { LayoutStore } from "$lib/certificates/layoutStore.svelte";
import { ImageUrls } from "./imageUrls.svelte";

const PNG = new Uint8Array([1, 2, 3]);

describe("ImageUrls", () => {
	it("legt Adressen nur für vorhandene Bilder an und gibt alte wieder frei", () => {
		const revoke = vi.spyOn(URL, "revokeObjectURL");
		const store = new LayoutStore();
		store.images.signature1 = PNG;
		const imageUrls = new ImageUrls();
		const stop = imageUrls.track(() => store.images);
		flushSync();
		expect(Object.keys(imageUrls.urls)).toEqual(["signature1"]);

		store.images.background = PNG;
		flushSync();
		expect(Object.keys(imageUrls.urls)).toEqual(["signature1", "background"]);
		expect(revoke).toHaveBeenCalledTimes(1);

		stop();
		expect(revoke).toHaveBeenCalledTimes(3);
		revoke.mockRestore();
	});
});

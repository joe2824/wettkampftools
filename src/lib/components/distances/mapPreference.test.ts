// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { MAP_VISIBLE_KEY, readMapVisible, writeMapVisible } from "./mapPreference";

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

describe("Kartenwahl merken", () => {
	it("zeigt die Karte, solange nichts gemerkt ist", () => {
		expect(readMapVisible()).toBe(true);
	});

	it("merkt sich das Ausblenden", () => {
		writeMapVisible(false);
		expect(localStorage.getItem(MAP_VISIBLE_KEY)).toBe("false");
		expect(readMapVisible()).toBe(false);
		writeMapVisible(true);
		expect(readMapVisible()).toBe(true);
	});

	it("übersteht gesperrten Speicher", () => {
		vi.spyOn(localStorage, "getItem").mockImplementation(() => {
			throw new Error("gesperrt");
		});
		vi.spyOn(localStorage, "setItem").mockImplementation(() => {
			throw new Error("gesperrt");
		});
		expect(() => writeMapVisible(false)).not.toThrow();
		expect(readMapVisible()).toBe(true);
	});
});

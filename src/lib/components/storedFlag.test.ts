// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { readStoredFlag, writeStoredFlag } from "./storedFlag";

const KEY = "test.flag";

afterEach(() => {
	localStorage.clear();
	vi.restoreAllMocks();
});

describe("gemerkte Schalter", () => {
	it("nutzt den Standard, solange nichts gemerkt ist", () => {
		expect(readStoredFlag(KEY, true)).toBe(true);
		expect(readStoredFlag(KEY, false)).toBe(false);
	});

	it("merkt sich die Wahl", () => {
		writeStoredFlag(KEY, false);
		expect(localStorage.getItem(KEY)).toBe("false");
		expect(readStoredFlag(KEY, true)).toBe(false);
		writeStoredFlag(KEY, true);
		expect(readStoredFlag(KEY, false)).toBe(true);
	});

	it("übersteht gesperrten Speicher", () => {
		vi.spyOn(localStorage, "getItem").mockImplementation(() => {
			throw new Error("gesperrt");
		});
		vi.spyOn(localStorage, "setItem").mockImplementation(() => {
			throw new Error("gesperrt");
		});
		expect(() => writeStoredFlag(KEY, false)).not.toThrow();
		expect(readStoredFlag(KEY, true)).toBe(true);
	});
});

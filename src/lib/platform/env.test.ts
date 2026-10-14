import { afterEach, describe, expect, it, vi } from "vitest";
import { isTauri } from "./env";

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("isTauri", () => {
	it("ist ohne Fenster false", () => {
		expect(isTauri()).toBe(false);
	});

	it("erkennt die Desktop-Hülle", () => {
		vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
		expect(isTauri()).toBe(true);
	});

	it("ist im normalen Browser false", () => {
		vi.stubGlobal("window", {});
		expect(isTauri()).toBe(false);
	});
});

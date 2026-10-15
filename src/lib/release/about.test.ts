import { beforeEach, describe, expect, it, vi } from "vitest";

const opener = vi.hoisted(() => ({ openUrl: vi.fn(async () => {}) }));
vi.mock("@tauri-apps/plugin-opener", () => opener);

const env = vi.hoisted(() => ({ isTauri: vi.fn(() => true) }));
vi.mock("$lib/platform/env", () => env);

import { isPrerelease, openExternalUrl, PROJECT_URL } from "./about";

beforeEach(() => vi.clearAllMocks());

describe("openExternalUrl", () => {
	it("öffnet die Projektseite im Standardbrowser", async () => {
		await openExternalUrl(PROJECT_URL);
		expect(PROJECT_URL).toBe("https://github.com/joe2824/wettkampftools");
		expect(opener.openUrl).toHaveBeenCalledWith(PROJECT_URL);
	});

	it("öffnet außerhalb der Desktop-Anwendung einen neuen Tab", async () => {
		env.isTauri.mockReturnValue(false);
		const open = vi.fn();
		vi.stubGlobal("window", { open });
		await openExternalUrl(PROJECT_URL);
		expect(open).toHaveBeenCalledWith(PROJECT_URL, "_blank", "noopener");
		expect(opener.openUrl).not.toHaveBeenCalled();
		vi.unstubAllGlobals();
	});

	it("öffnet eine beliebige Adresse im Standardbrowser", async () => {
		env.isTauri.mockReturnValue(true);
		await openExternalUrl("https://fonts.google.com/specimen/Nunito");
		expect(opener.openUrl).toHaveBeenCalledWith("https://fonts.google.com/specimen/Nunito");
	});
});

describe("isPrerelease", () => {
	it.each([
		["2.1.0-beta.1", true],
		["2.1.0", false],
		["", false]
	])("erkennt %s als Vorabversion: %s", (version, expected) => {
		expect(isPrerelease(version)).toBe(expected);
	});
});

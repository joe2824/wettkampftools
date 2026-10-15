import { beforeEach, describe, expect, it, vi } from "vitest";

const opener = vi.hoisted(() => ({ openUrl: vi.fn(async () => {}) }));
vi.mock("@tauri-apps/plugin-opener", () => opener);

const env = vi.hoisted(() => ({ isTauri: vi.fn(() => true) }));
vi.mock("$lib/platform/env", () => env);

import { isPrerelease, openProjectPage, PROJECT_URL } from "./about";

beforeEach(() => vi.clearAllMocks());

describe("openProjectPage", () => {
	it("öffnet die Projektseite im Standardbrowser", async () => {
		await openProjectPage();
		expect(PROJECT_URL).toBe("https://github.com/joe2824/wettkampftools");
		expect(opener.openUrl).toHaveBeenCalledWith(PROJECT_URL);
	});

	it("öffnet außerhalb der Desktop-Anwendung einen neuen Tab", async () => {
		env.isTauri.mockReturnValue(false);
		const open = vi.fn();
		vi.stubGlobal("window", { open });
		await openProjectPage();
		expect(open).toHaveBeenCalledWith(PROJECT_URL, "_blank", "noopener");
		expect(opener.openUrl).not.toHaveBeenCalled();
		vi.unstubAllGlobals();
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

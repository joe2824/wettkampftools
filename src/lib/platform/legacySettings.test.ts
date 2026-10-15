import { beforeEach, describe, expect, it, vi } from "vitest";

const coreMock = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@tauri-apps/api/core", () => coreMock);

import { readLegacySettings, type LegacySettings } from "./legacySettings";

describe("readLegacySettings", () => {
	beforeEach(() => {
		coreMock.invoke.mockReset();
	});

	it("ruft den Befehl auf und gibt die Einstellungen zurück", async () => {
		const legacy: LegacySettings = {
			ageGroups: ["AK 10", "AK 12"],
			waveStartAgeGroup: "AK 12",
			simplifySeniorAgeGroups: false,
			warnings: ["drop_not_started_teams.undecodable"]
		};
		coreMock.invoke.mockResolvedValue(legacy);
		expect(await readLegacySettings()).toEqual(legacy);
		expect(coreMock.invoke).toHaveBeenCalledWith("read_legacy_settings");
	});

	it("gibt null zurück, wenn es keine alten Einstellungen gibt", async () => {
		coreMock.invoke.mockResolvedValue(null);
		expect(await readLegacySettings()).toBeNull();
	});

	it("reicht Fehler weiter", async () => {
		coreMock.invoke.mockRejectedValue("kaputt");
		await expect(readLegacySettings()).rejects.toBe("kaputt");
	});
});

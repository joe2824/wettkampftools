import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logError } from "$lib/log";
import { resetAppDataStore, setAppDataStore } from "$lib/platform/fs";
import { createFakeStore, type FakeStore } from "$lib/testing/fakeFs";
import { FIELD_AUTOSAVE_DELAY_MS, FieldAutosave } from "./fieldAutosave.svelte";
import { defaultSettings } from "./settings";
import { SETTINGS_FILE, SettingsStore } from "./settingsStore.svelte";

vi.mock("$lib/log", async (original) => ({ ...(await original<typeof import("$lib/log")>()), logError: vi.fn() }));

let fs: FakeStore;
let store: SettingsStore;

function savedFile(): ReturnType<typeof defaultSettings> {
	return JSON.parse(new TextDecoder().decode(fs.files.get(SETTINGS_FILE)));
}

beforeEach(async () => {
	vi.useFakeTimers();
	fs = createFakeStore();
	setAppDataStore(fs);
	store = new SettingsStore({ readLegacy: async () => null });
	await store.load();
});

afterEach(() => {
	resetAppDataStore();
	vi.useRealTimers();
});

describe("FieldAutosave", () => {
	it("speichert nur das angegebene Feld nach einer Pause", async () => {
		const autosave = new FieldAutosave(store, "teamNameOverrides", "settings.teamNamesSaveFailed");
		store.settings.waveStartAgeGroup = "AK 15/16";
		store.settings.teamNameOverrides = { Musterstadt: "Musterstadt / Süd" };
		autosave.schedule();
		expect(autosave.status).toBe("pending");
		await vi.advanceTimersByTimeAsync(FIELD_AUTOSAVE_DELAY_MS);
		await autosave.idle();
		expect(savedFile().teamNameOverrides).toEqual({ Musterstadt: "Musterstadt / Süd" });
		expect(savedFile().waveStartAgeGroup).toBe(defaultSettings().waveStartAgeGroup);
		expect(autosave.status).toBe("saved");
	});

	it("meldet einen Fehler mit dem angegebenen Code", async () => {
		const autosave = new FieldAutosave(store, "teamNameOverrides", "settings.teamNamesSaveFailed");
		vi.spyOn(fs, "writeText").mockRejectedValue(new Error("voll"));
		autosave.schedule();
		await autosave.flush();
		expect(autosave.status).toBe("failed");
		expect(logError).toHaveBeenCalledWith("settings.teamNamesSaveFailed");
	});
});

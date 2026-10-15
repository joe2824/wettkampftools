import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAppDataStore, setAppDataStore } from "$lib/platform/fs";
import { flushPendingSaves, pendingSaveCount } from "$lib/pendingSaves";
import { createFakeStore, type FakeStore } from "$lib/testing/fakeFs";
import { EVENT_AUTOSAVE_DELAY_MS, EventAutosave } from "./eventAutosave.svelte";
import { defaultSettings } from "./settings";
import { SETTINGS_FILE, SettingsStore } from "./settingsStore.svelte";

let fs: FakeStore;
let store: SettingsStore;
let autosave: EventAutosave;

function savedFile(): ReturnType<typeof defaultSettings> {
	return JSON.parse(new TextDecoder().decode(fs.files.get(SETTINGS_FILE)));
}

function type(text: string) {
	for (let length = 1; length <= text.length; length++) {
		store.settings.event.title = text.slice(0, length);
		autosave.schedule();
	}
}

beforeEach(async () => {
	vi.useFakeTimers();
	fs = createFakeStore();
	setAppDataStore(fs);
	store = new SettingsStore({ readLegacy: async () => null });
	await store.load();
	autosave = new EventAutosave(store);
});

afterEach(() => {
	resetAppDataStore();
	vi.useRealTimers();
});

describe("EventAutosave", () => {
	it("schreibt bei schnellem Tippen nur einmal", async () => {
		const write = vi.spyOn(fs, "writeText");
		type("Pokalturnier");
		expect(autosave.status).toBe("pending");
		await vi.advanceTimersByTimeAsync(EVENT_AUTOSAVE_DELAY_MS - 1);
		expect(write).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		await autosave.idle();
		expect(write).toHaveBeenCalledTimes(1);
		expect(savedFile().event.title).toBe("Pokalturnier");
		expect(autosave.status).toBe("saved");
	});

	it("speichert andere ungespeicherte Einstellungen nicht mit", async () => {
		store.settings.waveStartAgeGroup = "AK 15/16";
		store.settings.event.number = "39";
		autosave.schedule();
		await vi.advanceTimersByTimeAsync(EVENT_AUTOSAVE_DELAY_MS);
		await autosave.idle();
		expect(savedFile().event.number).toBe("39");
		expect(savedFile().waveStartAgeGroup).toBe(defaultSettings().waveStartAgeGroup);
		expect(store.settings.waveStartAgeGroup).toBe("AK 15/16");
		expect(store.dirty).toBe(true);
	});

	it("behält Eingaben, die während des Schreibens gemacht werden", async () => {
		let release = () => {};
		const gate = new Promise<void>((resolve) => (release = resolve));
		const original = fs.writeText;
		vi.spyOn(fs, "writeText").mockImplementation(async (path, text) => {
			await gate;
			await original(path, text);
		});
		store.settings.event.title = "Pokal";
		autosave.schedule();
		await vi.advanceTimersByTimeAsync(EVENT_AUTOSAVE_DELAY_MS);
		store.settings.event.title = "Pokalturnier";
		release();
		await autosave.idle();
		expect(store.settings.event.title).toBe("Pokalturnier");
		expect(savedFile().event.title).toBe("Pokal");
		expect(store.dirty).toBe(true);
	});

	it("schreibt beim Verlassen sofort", async () => {
		store.settings.event.venue = "Musterstadt";
		autosave.schedule();
		await autosave.flush();
		expect(savedFile().event.venue).toBe("Musterstadt");
		await vi.advanceTimersByTimeAsync(EVENT_AUTOSAVE_DELAY_MS);
		expect(autosave.status).toBe("saved");
	});

	it("schreibt beim Verlassen nichts ohne Änderung", async () => {
		const write = vi.spyOn(fs, "writeText");
		await autosave.flush();
		expect(write).not.toHaveBeenCalled();
		expect(autosave.status).toBe("idle");
	});

	it("meldet einen Fehler beim Schreiben", async () => {
		vi.spyOn(fs, "writeText").mockRejectedValue(new Error("voll"));
		vi.spyOn(console, "error").mockImplementation(() => {});
		autosave.schedule();
		await vi.advanceTimersByTimeAsync(EVENT_AUTOSAVE_DELAY_MS);
		await autosave.idle();
		expect(autosave.status).toBe("failed");
	});

	it("schreibt beim Schließen des Fensters sofort und meldet sich danach ab", async () => {
		type("Pokal");
		expect(pendingSaveCount()).toBe(1);
		await flushPendingSaves();
		expect(savedFile().event.title).toBe("Pokal");
		expect(pendingSaveCount()).toBe(0);
	});
});

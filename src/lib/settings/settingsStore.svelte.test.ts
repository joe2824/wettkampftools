import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeStore, type FakeStore } from "$lib/testing/fakeFs";
import { resetAppDataStore, setAppDataStore } from "$lib/platform/fs";
import { defaultSettings, type LegacySettings } from "./settings";
import { SETTINGS_FILE, SettingsStore } from "./settingsStore.svelte";

let fs: FakeStore;
const decoder = new TextDecoder();
const encoder = new TextEncoder();

const legacy: LegacySettings = {
	ageGroups: ["AK 10", "AK 12", "AK 13/14"],
	excludeUnplacedTeams: "kaputt" as unknown as boolean,
	warnings: ["value.unreadable"]
};

function savedFile(): Record<string, unknown> {
	return JSON.parse(decoder.decode(fs.files.get(SETTINGS_FILE)));
}

beforeEach(() => {
	fs = createFakeStore();
	setAppDataStore(fs);
});

afterEach(() => resetAppDataStore());

describe("SettingsStore.load", () => {
	it("übernimmt beim ersten Start die alte Version genau einmal", async () => {
		const readLegacy = vi.fn(async () => structuredClone(legacy));
		const first = new SettingsStore({ readLegacy });
		const report = await first.load();
		expect(report).toEqual({
			applied: ["ageGroups"],
			fellBack: ["excludeUnplacedTeams"],
			warnings: ["value.unreadable"]
		});
		expect(first.settings.ageGroups).toEqual(["AK 10", "AK 12", "AK 13/14"]);
		expect(first.settings.legacyMigrated).toBe(true);
		expect(first.dirty).toBe(false);
		expect(savedFile().legacyMigrated).toBe(true);

		const second = new SettingsStore({ readLegacy });
		expect(await second.load()).toBeNull();
		expect(readLegacy).toHaveBeenCalledTimes(1);
		expect(second.settings.ageGroups).toEqual(["AK 10", "AK 12", "AK 13/14"]);
	});

	it("migriert nicht, wenn eine Datei ohne Übernahme-Merker existiert", async () => {
		fs.files.set(SETTINGS_FILE, encoder.encode(JSON.stringify({ excludeUnplacedTeams: false })));
		const readLegacy = vi.fn(async () => legacy);
		const store = new SettingsStore({ readLegacy });
		expect(await store.load()).toBeNull();
		expect(readLegacy).not.toHaveBeenCalled();
		expect(store.settings.excludeUnplacedTeams).toBe(false);
	});

	it("migriert nicht bei kaputter Datei und nutzt Standard", async () => {
		fs.files.set(SETTINGS_FILE, encoder.encode("{kaputt"));
		const readLegacy = vi.fn(async () => legacy);
		const store = new SettingsStore({ readLegacy });
		expect(await store.load()).toBeNull();
		expect(readLegacy).not.toHaveBeenCalled();
		expect(store.settings).toEqual(defaultSettings());
	});

	it("nutzt Standard ohne Speichern, wenn der Leser scheitert", async () => {
		const store = new SettingsStore({
			readLegacy: async () => {
				throw new Error("registry");
			}
		});
		expect(await store.load()).toBeNull();
		expect(store.settings).toEqual(defaultSettings());
		expect(fs.files.has(SETTINGS_FILE)).toBe(false);
	});

	it("nutzt Standard ohne Speichern, wenn es keine alte Version gibt", async () => {
		const store = new SettingsStore({ readLegacy: async () => null });
		expect(await store.load()).toBeNull();
		expect(store.settings).toEqual(defaultSettings());
		expect(fs.files.has(SETTINGS_FILE)).toBe(false);
		expect(store.dirty).toBe(false);
	});
});

describe("SettingsStore Änderungen", () => {
	it("merkt ungespeicherte Änderungen und speichert", async () => {
		const store = new SettingsStore({ readLegacy: async () => null });
		await store.load();
		store.settings.event.title = "Pokalturnier";
		expect(store.dirty).toBe(true);
		await store.save();
		expect(store.dirty).toBe(false);
		expect((savedFile().event as { title: string }).title).toBe("Pokalturnier");

		const reloaded = new SettingsStore({ readLegacy: async () => null });
		await reloaded.load();
		expect(reloaded.settings.event.title).toBe("Pokalturnier");
	});

	it("setzt auf Standard zurück, bis zum Speichern ungespeichert", async () => {
		const store = new SettingsStore({ readLegacy: async () => structuredClone(legacy) });
		await store.load();
		store.resetToDefaults();
		expect(store.settings.ageGroups).toEqual(defaultSettings().ageGroups);
		expect(store.settings.legacyMigrated).toBe(true);
		expect(store.dirty).toBe(true);
		expect(savedFile().ageGroups).toEqual(["AK 10", "AK 12", "AK 13/14"]);
	});
});

describe("SettingsStore Export und Import", () => {
	it("exportiert ohne Übernahme-Merker", async () => {
		const store = new SettingsStore({ readLegacy: async () => structuredClone(legacy) });
		await store.load();
		const exported = JSON.parse(decoder.decode(store.exportJson()));
		expect(exported.legacyMigrated).toBeUndefined();
		expect(exported.ageGroups).toEqual(["AK 10", "AK 12", "AK 13/14"]);
	});

	it("importiert, behält den Übernahme-Merker und meldet Probleme", async () => {
		const store = new SettingsStore({ readLegacy: async () => structuredClone(legacy) });
		await store.load();
		const data = { excludeUnplacedTeams: false, legacyMigrated: false, unbekannt: 1 };
		const issues = store.importJson(encoder.encode(JSON.stringify(data)));
		expect(issues).toContain("unknownKeys.dropped");
		expect(store.settings.excludeUnplacedTeams).toBe(false);
		expect(store.settings.ageGroups).toEqual(defaultSettings().ageGroups);
		expect(store.settings.legacyMigrated).toBe(true);
		expect(store.dirty).toBe(true);
	});

	it("lässt die Einstellungen bei unlesbarer Datei unverändert", async () => {
		const store = new SettingsStore({ readLegacy: async () => null });
		await store.load();
		store.settings.event.title = "Pokalturnier";
		expect(store.importJson(encoder.encode("kein json"))).toEqual(["root.invalid"]);
		expect(store.importJson(encoder.encode("[1]"))).toEqual(["root.invalid"]);
		expect(store.settings.event.title).toBe("Pokalturnier");
	});
});

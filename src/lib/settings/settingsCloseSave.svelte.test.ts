// @vitest-environment happy-dom
import { flushSync } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAppDataStore, setAppDataStore } from "$lib/platform/fs";
import { flushPendingSaves, pendingSaveCount } from "$lib/pendingSaves";
import { createFakeStore, type FakeStore } from "$lib/testing/fakeFs";
import { saveSettingsOnClose } from "./settingsCloseSave.svelte";
import { SETTINGS_FILE, SettingsStore } from "./settingsStore.svelte";

let fs: FakeStore;
let store: SettingsStore;
let save: ReturnType<typeof vi.fn<() => Promise<void>>>;
let stop: () => void;

const savedFile = () => JSON.parse(new TextDecoder().decode(fs.files.get(SETTINGS_FILE)));

beforeEach(async () => {
	fs = createFakeStore();
	setAppDataStore(fs);
	store = new SettingsStore({ readLegacy: async () => null });
	await store.load();
	save = vi.fn(() => store.save());
	stop = $effect.root(() => saveSettingsOnClose(store, save));
	flushSync();
});

afterEach(() => {
	stop();
	resetAppDataStore();
});

describe("saveSettingsOnClose", () => {
	it("meldet ungespeicherte Einstellungen zum Speichern beim Schließen an", async () => {
		expect(pendingSaveCount()).toBe(0);
		store.settings.certificates.copiesPerTeam = 4;
		flushSync();
		expect(pendingSaveCount()).toBe(1);
		await flushPendingSaves();
		expect(save).toHaveBeenCalledTimes(1);
		expect(savedFile().certificates.copiesPerTeam).toBe(4);
		flushSync();
		expect(pendingSaveCount()).toBe(0);
	});

	it("meldet wieder ab, sobald gespeichert oder verworfen wurde", () => {
		store.settings.certificates.copiesPerTeam = 4;
		flushSync();
		store.discardChanges();
		flushSync();
		expect(pendingSaveCount()).toBe(0);
	});

	it("meldet beim Beenden ab", () => {
		store.settings.certificates.copiesPerTeam = 4;
		flushSync();
		stop();
		expect(pendingSaveCount()).toBe(0);
	});
});

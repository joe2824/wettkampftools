import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeStore, type FakeStore } from "$lib/testing/fakeFs";
import { resetAppDataStore, setAppDataStore } from "$lib/platform/fs";
import { flushLog } from "$lib/log";
import { SettingsStore } from "$lib/settings/settingsStore.svelte";
import { LayoutStore } from "$lib/certificates/layoutStore.svelte";
import { CompetitionStore } from "$lib/workflows/competitionStore.svelte";
import { SelectionState } from "$lib/certificates/selectionState.svelte";
import { SessionState } from "$lib/session.svelte";
import { initApp, migrationMessage, setAsideMessage } from "./appInit";

let fs: FakeStore;
const encoder = new TextEncoder();
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function fakeTarget() {
	return { addEventListener: vi.fn(), removeEventListener: vi.fn() };
}

beforeEach(() => {
	fs = createFakeStore();
	setAppDataStore(fs);
	vi.spyOn(console, "info").mockImplementation(() => {});
	vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	resetAppDataStore();
	vi.restoreAllMocks();
});

describe("initApp", () => {
	it("richtet Protokoll ein, räumt auf und lädt alles", async () => {
		fs.files.set("logs/2020-01-01.log", encoder.encode("alt"));
		fs.files.set("images/signature1.png", png);
		const settings = new SettingsStore({ readLegacy: async () => ({ ageGroups: ["AK 13/14"], warnings: [] }) });
		const layouts = new LayoutStore();
		const target = fakeTarget();

		const report = await initApp({ settings, layouts, errorTarget: target, today: new Date(2026, 9, 14) });

		expect(target.addEventListener).toHaveBeenCalledWith("error", expect.any(Function));
		expect(fs.files.has("logs/2020-01-01.log")).toBe(false);
		expect(report.migration?.applied).toEqual(["ageGroups"]);
		expect(report.setAside).toEqual([]);
		expect(settings.settings.ageGroups).toEqual(["AK 13/14"]);
		expect(layouts.images.signature1).toEqual(png);
	});

	it("macht nach einem Fehler weiter und protokolliert nur den Code", async () => {
		const settings = new SettingsStore({ readLegacy: async () => null });
		const layouts = new LayoutStore();
		vi.spyOn(settings, "load").mockRejectedValue(new Error("Anna Meier"));
		const loadImages = vi.spyOn(layouts, "loadImages");

		const report = await initApp({ settings, layouts, errorTarget: fakeTarget() });
		await flushLog();

		expect(report).toEqual({ migration: null, setAside: [] });
		expect(loadImages).toHaveBeenCalled();
		const log = [...fs.files.entries()].filter(([path]) => path.startsWith("logs/"));
		const text = new TextDecoder().decode(log[0][1]);
		expect(text).toContain("init.settingsFailed");
		expect(text).not.toContain("Anna Meier");
	});

	it("stellt den Wettkampfstand mit den geladenen Einstellungen wieder her und sichert danach", async () => {
		const settings = new SettingsStore({ readLegacy: async () => null });
		const competition = new CompetitionStore({ session: new SessionState(), selection: new SelectionState() });
		const order: string[] = [];
		vi.spyOn(settings, "load").mockImplementation(async () => {
			order.push("settings");
			return null;
		});
		const restore = vi.spyOn(competition, "restore").mockImplementation(async () => void order.push("restore"));
		const autosave = vi.spyOn(competition, "startAutosave").mockImplementation(() => () => {});

		await initApp({ settings, layouts: new LayoutStore(), competition, errorTarget: fakeTarget() });

		expect(order).toEqual(["settings", "restore"]);
		expect(restore).toHaveBeenCalledWith(settings.settings);
		expect(autosave).toHaveBeenCalledOnce();
	});

	it("meldet beiseitegelegte, unlesbare Dateien je Bereich", async () => {
		fs.files.set("settings.json", encoder.encode("{kaputt"));
		fs.files.set("layout.json", encoder.encode("[]"));
		fs.files.set("competition/state.json", encoder.encode("null"));
		const settings = new SettingsStore({ readLegacy: async () => null });
		const competition = new CompetitionStore({ session: new SessionState(), selection: new SelectionState() });
		vi.spyOn(competition, "startAutosave").mockImplementation(() => () => {});

		const report = await initApp({ settings, layouts: new LayoutStore(), competition, errorTarget: fakeTarget() });

		expect(report.setAside.map((notice) => notice.area)).toEqual(["settings", "layout", "competition"]);
		expect(report.setAside[0].files).toEqual([expect.stringMatching(/^settings\.json\.unreadable-/)]);
	});
});

describe("setAsideMessage", () => {
	it("nennt die gesicherte Datei und die Folge", () => {
		expect(setAsideMessage({ area: "settings", files: ["settings.json.unreadable-20261015-070509"] })).toEqual({
			title: "Gespeicherte Daten nicht lesbar",
			description:
				"Gespeicherte Einstellungen konnten nicht gelesen werden und wurden im App-Datenordner gesichert als „settings.json.unreadable-20261015-070509“; es gelten Standardwerte."
		});
		expect(setAsideMessage({ area: "layout", files: ["layout.json.unreadable-1"] }).description).toBe(
			"Gespeichertes Layout konnte nicht gelesen werden und wurde im App-Datenordner gesichert als „layout.json.unreadable-1“; es gelten Standardwerte."
		);
	});

	it("nennt beim Wettkampfstand alle gesicherten Dateien", () => {
		const message = setAsideMessage({ area: "competition", files: ["competition/a", "competition/b"] });
		expect(message.description).toBe(
			"Gespeicherter Wettkampfstand konnte nicht gelesen werden und wurde im App-Datenordner gesichert als „competition/a“, „competition/b“; es wird ohne gespeicherten Stand begonnen."
		);
	});
});

describe("migrationMessage", () => {
	it("nennt die Zahl der übernommenen Einstellungen", () => {
		expect(migrationMessage({ applied: ["a", "b"], fellBack: [], warnings: [] })).toEqual({
			title: "Einstellungen der alten Version übernommen",
			description: "2 Einstellungen wurden übernommen."
		});
		expect(migrationMessage({ applied: ["a"], fellBack: [], warnings: [] }).description).toBe(
			"1 Einstellung wurde übernommen."
		);
	});

	it("weist auf Standardwerte hin", () => {
		const message = migrationMessage({ applied: [], fellBack: ["a"], warnings: [] });
		expect(message.description).toBe(
			"0 Einstellungen wurden übernommen. Einige Werte konnten nicht gelesen werden und stehen auf Standard."
		);
		expect(migrationMessage({ applied: ["a"], fellBack: [], warnings: ["x"] }).description).toContain("Standard");
	});
});

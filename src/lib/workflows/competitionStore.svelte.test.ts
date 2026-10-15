// @vitest-environment happy-dom
import { flushSync } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NO_HIDDEN } from "$lib/certificates/selection";
import { SelectionState } from "$lib/certificates/selectionState.svelte";
import {
	COMPETITION_STATE_PATH,
	encodeBase64,
	loadCompetition,
	saveCompetitionState
} from "$lib/competition/persistence";
import { COMPETITION_RESULTS_PATH, saveStoredResults } from "$lib/competition/resultsFile";
import { flushPendingSaves, pendingSaveCount } from "$lib/pendingSaves";
import { resetAppDataStore, setAppDataStore } from "$lib/platform/fs";
import type { Sheet } from "$lib/platform/workbook";
import { SessionState } from "$lib/session.svelte";
import { defaultSettings } from "$lib/settings/settings";
import { SETTINGS_FILE, SettingsStore } from "$lib/settings/settingsStore.svelte";
import { createFakeStore, type FakeStore } from "$lib/testing/fakeFs";
import { buildRegistrationCsv } from "$lib/testing/fixtures";
import { AUTOSAVE_DELAY_MS, CompetitionStore } from "./competitionStore.svelte";
import { loadRegistrations } from "./preparation";

const settings = defaultSettings();
const SAVED_AT = "2026-10-14T09:30:00.000Z";
const NOW = new Date("2026-10-15T07:00:00.000Z");
const csv = new TextEncoder().encode(
	buildRegistrationCsv([
		{ gliederung: "Musterstadt", ak: "AK 12" },
		{ gliederung: "Beispielhausen", ak: "AK 13/14" }
	])
);
const DATA_SHEET: Sheet = {
	name: "Daten",
	rows: [
		["Platz", "Name", "Mitglied 1", "Gliederung", "Altersklasse", "Geschlecht", "Punkte"],
		[1, "Musterstadt", "Anna Meier", "Musterstadt", "AK 12", "weiblich", 1234.5]
	]
};
const WORKBOOK = { sheets: [DATA_SHEET], properties: { created: null, modified: null } };
const at = (year: number) => new Date(year, 5, 1).getTime();
const STORED_RESULTS = {
	fileName: "JAuswertung.xlsx",
	createdMs: at(2025),
	modifiedMs: at(2025),
	workbook: WORKBOOK,
	yearWarning: 2025,
	yearConfirmed: true
};

let fs: FakeStore;
let session: SessionState;
let selection: SelectionState;
let store: CompetitionStore;
let settingsStore: SettingsStore;

function loadRegistration() {
	const outcome = loadRegistrations(csv, "meldungen.csv", settings);
	if (!outcome.ok) throw new Error(outcome.message);
	session.setRegistration(outcome.registration);
}

function setResults() {
	session.setResults({
		fileName: "JAuswertung.xlsx",
		createdMs: null,
		modifiedMs: 0,
		workbook: WORKBOOK,
		kind: "team",
		rows: [],
		yearWarning: 2025,
		creationUnknown: false,
		yearConfirmed: true
	});
}

beforeEach(() => {
	fs = createFakeStore();
	setAppDataStore(fs);
	session = new SessionState();
	selection = new SelectionState();
	settingsStore = new SettingsStore({ readLegacy: async () => null });
	store = new CompetitionStore({ session, selection, settings: settingsStore, now: () => NOW });
	vi.spyOn(console, "info").mockImplementation(() => {});
	vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	resetAppDataStore();
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("restore", () => {
	it("liest Meldungen neu ein und übernimmt nur bekannte Wellen-Teams", async () => {
		await saveCompetitionState({
			savedAt: SAVED_AT,
			registration: { fileName: "meldungen.csv", csvBase64: encodeBase64(csv), waveSelection: ["r1", "weg"] }
		});
		await store.restore(settings);
		expect(session.registration?.fileName).toBe("meldungen.csv");
		expect(session.registration?.teams).toHaveLength(2);
		expect(session.registration?.sourceBytes).toEqual(csv);
		expect([...(session.registration?.waveSelection ?? [])]).toEqual(["r1"]);
		expect(store.savedAt).toBe(SAVED_AT);
	});

	it("wendet beim Wiederherstellen die eigenen Mannschaftsnamen an", async () => {
		await saveCompetitionState({
			savedAt: SAVED_AT,
			registration: { fileName: "meldungen.csv", csvBase64: encodeBase64(csv), waveSelection: ["r1"] }
		});
		await store.restore({ ...settings, teamNameOverrides: { musterstadt: "Musterstadt / Süd" } });
		const teams = session.registration?.teams ?? [];
		expect(teams.map((team) => team.name)).toEqual(["Musterstadt / Süd", "Beispielhausen"]);
		expect(teams[0].organisation).toBe("Musterstadt");
		expect([...(session.registration?.waveSelection ?? [])]).toEqual(["r1"]);
	});

	it("stellt Ergebnisse samt neu geprüftem Jahreshinweis und Urkunden-Auswahl wieder her", async () => {
		await saveStoredResults(STORED_RESULTS);
		await saveCompetitionState({
			savedAt: SAVED_AT,
			certificateSelection: { hidden: { ageGroups: ["AK 12"], genders: [], kinds: [] }, excluded: ["e1"] }
		});
		await store.restore(settings);
		expect(session.results?.rows).toHaveLength(1);
		expect(session.results?.kind).toBe("team");
		expect(session.results).toMatchObject({
			createdMs: at(2025),
			modifiedMs: at(2025),
			yearWarning: 2025,
			creationUnknown: false,
			yearConfirmed: true
		});
		selection.attach(session.results?.workbook ?? null);
		expect(selection.hidden.ageGroups).toEqual(["AK 12"]);
		expect([...selection.excluded]).toEqual(["e1"]);
	});

	it("verwirft eine Bestätigung, die für ein anderes Dateijahr galt", async () => {
		await saveStoredResults({ ...STORED_RESULTS, createdMs: null, modifiedMs: at(2024), yearWarning: 2025 });
		await store.restore(settings);
		expect(session.results).toMatchObject({ yearWarning: 2024, creationUnknown: true, yearConfirmed: false });
	});

	it("stellt Ergebnisse auch ohne kleinen Stand wieder her", async () => {
		await saveStoredResults(STORED_RESULTS);
		await store.restore(settings);
		expect(session.results?.fileName).toBe("JAuswertung.xlsx");
		expect(store.savedAt).toBeNull();
	});

	it("übernimmt den alten einteiligen Stand und teilt ihn gleich auf", async () => {
		const legacy = {
			schemaVersion: 1,
			savedAt: SAVED_AT,
			results: { ...STORED_RESULTS, lastModified: at(2025), creationUnknown: false }
		};
		fs.files.set(COMPETITION_STATE_PATH, new TextEncoder().encode(JSON.stringify(legacy)));
		await store.restore(settings);
		expect(session.results).toMatchObject({ yearWarning: 2025, yearConfirmed: true });
		expect(fs.files.has(COMPETITION_RESULTS_PATH)).toBe(true);
		const state = JSON.parse(new TextDecoder().decode(fs.files.get(COMPETITION_STATE_PATH)));
		expect(state).toMatchObject({ schemaVersion: 2 });
		expect(state).not.toHaveProperty("results");
	});

	it("meldet beiseitegelegte, unlesbare Dateien", async () => {
		fs.files.set(COMPETITION_STATE_PATH, new TextEncoder().encode("{kaputt"));
		await store.restore(settings);
		expect(store.setAside).toEqual([expect.stringMatching(/^competition\/state\.json\.unreadable-/)]);
		expect(session.registration).toBeNull();
	});

	it("lässt eine unbrauchbare Meldedatei weg", async () => {
		await saveCompetitionState({
			savedAt: SAVED_AT,
			registration: {
				fileName: "x.csv",
				csvBase64: encodeBase64(new TextEncoder().encode("a;b\n1;2\n")),
				waveSelection: []
			}
		});
		await store.restore(settings);
		expect(session.registration).toBeNull();
	});

	it("tut nichts ohne gespeicherten Stand", async () => {
		await store.restore(settings);
		expect(session.registration).toBeNull();
		expect(store.savedAt).toBeNull();
	});
});

describe("Autosave", () => {
	it("speichert nach schnellen Änderungen nur einmal", async () => {
		vi.useFakeTimers();
		const writeText = vi.spyOn(fs, "writeText");
		const write = {
			calls: (path: string) => writeText.mock.calls.filter(([target]) => target === path)
		};
		const stop = store.startAutosave();
		loadRegistration();
		flushSync();
		session.setWaveSelection(["r1"]);
		flushSync();
		setResults();
		flushSync();
		selection.attach(session.results?.workbook ?? null);
		selection.excluded = new Set(["e1"]);
		flushSync();
		await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS - 1);
		expect(writeText).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		await store.idle();
		expect(write.calls(COMPETITION_STATE_PATH)).toHaveLength(1);
		expect(write.calls(COMPETITION_RESULTS_PATH)).toHaveLength(1);

		// Nur die Auswahl ändert sich: Die großen Ergebnisse werden nicht neu geschrieben.
		selection.excluded = new Set(["e1", "e2"]);
		flushSync();
		await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS);
		await store.idle();
		expect(write.calls(COMPETITION_STATE_PATH)).toHaveLength(2);
		expect(write.calls(COMPETITION_RESULTS_PATH)).toHaveLength(1);
		stop();

		const { state, results } = await loadCompetition();
		expect(state?.savedAt).toBe(NOW.toISOString());
		expect(state?.registration?.waveSelection).toEqual(["r1"]);
		expect(state?.registration?.csvBase64).toBe(encodeBase64(csv));
		expect(results).toMatchObject({ yearWarning: 2025, yearConfirmed: true });
		expect(state?.certificateSelection).toEqual({ hidden: NO_HIDDEN, excluded: ["e1", "e2"] });
		expect(store.savedAt).toBe(NOW.toISOString());
	});

	it("entfernt die gesicherten Ergebnisse, wenn keine mehr geladen sind", async () => {
		loadRegistration();
		setResults();
		await store.saveNow();
		session.setResults(null);
		await store.saveNow();
		expect(fs.files.has(COMPETITION_RESULTS_PATH)).toBe(false);
		expect(fs.files.has(COMPETITION_STATE_PATH)).toBe(true);
	});

	it("schreibt beim Schließen des Fensters sofort und meldet sich danach ab", async () => {
		vi.useFakeTimers();
		const stop = store.startAutosave();
		flushSync();
		expect(pendingSaveCount()).toBe(0);
		loadRegistration();
		flushSync();
		expect(pendingSaveCount()).toBe(1);
		await flushPendingSaves();
		expect(fs.files.has(COMPETITION_STATE_PATH)).toBe(true);
		expect(pendingSaveCount()).toBe(0);
		stop();
	});

	it("meldet sich beim Beenden ohne Schreiben ab", () => {
		vi.useFakeTimers();
		const stop = store.startAutosave();
		flushSync();
		loadRegistration();
		flushSync();
		stop();
		expect(pendingSaveCount()).toBe(0);
	});

	it("speichert nicht schon beim Start", async () => {
		vi.useFakeTimers();
		loadRegistration();
		const write = vi.spyOn(fs, "writeText");
		const stop = store.startAutosave();
		flushSync();
		await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS * 2);
		expect(write).not.toHaveBeenCalled();
		stop();
	});
});

describe("newCompetition", () => {
	it("leert Sitzung, Urkunden-Auswahl und gespeicherten Stand", async () => {
		loadRegistration();
		setResults();
		selection.attach(session.results?.workbook ?? null);
		selection.excluded = new Set(["e1"]);
		await store.saveNow();
		expect(fs.files.has(COMPETITION_STATE_PATH)).toBe(true);

		await store.newCompetition();

		expect(session.registration).toBeNull();
		expect(session.results).toBeNull();
		expect(selection.excluded.size).toBe(0);
		expect(fs.files.has(COMPETITION_STATE_PATH)).toBe(false);
		expect(fs.files.has(COMPETITION_RESULTS_PATH)).toBe(false);
		expect(store.savedAt).toBeNull();
	});

	it("zählt die Nummer hoch, leert das Datum und behält den Rest der Veranstaltung", async () => {
		await settingsStore.load();
		settingsStore.settings.waveStartAgeGroup = "AK 15/16";
		settingsStore.settings.event.number = "39";
		settingsStore.settings.event.date = "2026-11-14";
		settingsStore.settings.event.signers[0].name = "Anna Meier";

		await store.newCompetition();

		const event = settingsStore.settings.event;
		expect(event).toMatchObject({ number: "40", date: "", title: defaultSettings().event.title });
		expect(event.signers[0].name).toBe("Anna Meier");
		const saved = JSON.parse(new TextDecoder().decode(fs.files.get(SETTINGS_FILE)));
		expect(saved.event).toMatchObject({ number: "40", date: "" });
		expect(saved.waveStartAgeGroup).toBe(defaultSettings().waveStartAgeGroup);
	});

	it("verwirft eine noch ausstehende Sicherung", async () => {
		vi.useFakeTimers();
		const stop = store.startAutosave();
		loadRegistration();
		flushSync();
		await store.newCompetition();
		flushSync();
		await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS);
		await store.idle();
		expect(fs.files.has(COMPETITION_STATE_PATH)).toBe(false);
		stop();
	});
});

describe("stored", () => {
	it("liefert Stand und Ergebnisse im Format der Sicherung", () => {
		loadRegistration();
		setResults();
		selection.attach(session.results?.workbook ?? null);
		selection.excluded = new Set(["e1"]);
		const { state, results } = store.stored();
		expect(state?.registration?.csvBase64).toBe(encodeBase64(csv));
		expect(state?.certificateSelection?.excluded).toEqual(["e1"]);
		expect(results).toEqual({
			fileName: "JAuswertung.xlsx",
			createdMs: null,
			modifiedMs: 0,
			workbook: WORKBOOK,
			yearWarning: 2025,
			yearConfirmed: true
		});
	});

	it("liefert nichts ohne geladene Dateien", () => {
		expect(store.stored()).toEqual({ state: null, results: null });
	});
});

describe("replace", () => {
	const projectState = {
		savedAt: SAVED_AT,
		registration: { fileName: "projekt.csv", csvBase64: encodeBase64(csv), waveSelection: ["r1"] },
		certificateSelection: { hidden: { ageGroups: ["AK 12"], genders: [], kinds: [] }, excluded: ["e1"] }
	};

	it("ersetzt den Stand, prüft das Dateijahr neu und sichert sofort", async () => {
		loadRegistration();
		await store.replace({ state: projectState, results: STORED_RESULTS }, settings);
		expect(session.registration?.fileName).toBe("projekt.csv");
		expect([...(session.registration?.waveSelection ?? [])]).toEqual(["r1"]);
		expect(session.results).toMatchObject({ createdMs: at(2025), yearWarning: 2025, yearConfirmed: true });
		expect([...selection.excluded]).toEqual(["e1"]);
		const { state, results } = await loadCompetition();
		expect(state?.registration?.fileName).toBe("projekt.csv");
		expect(results?.fileName).toBe("JAuswertung.xlsx");
		expect(store.savedAt).toBe(NOW.toISOString());
	});

	it("entfernt vorhandene Dateien, wenn das Projekt keinen Stand hat", async () => {
		loadRegistration();
		setResults();
		await store.saveNow();
		await store.replace({ state: null, results: null }, settings);
		expect(session.registration).toBeNull();
		expect(session.results).toBeNull();
		expect(fs.files.has(COMPETITION_STATE_PATH)).toBe(false);
		expect(fs.files.has(COMPETITION_RESULTS_PATH)).toBe(false);
	});

	it("übernimmt nicht die Speicherzeit aus dem Projekt, wenn das Sichern scheitert", async () => {
		loadRegistration();
		await store.saveNow();
		expect(store.savedAt).toBe(NOW.toISOString());
		vi.spyOn(fs, "writeText").mockRejectedValue(new Error("Platte voll"));
		await store.replace({ state: projectState, results: null }, settings).catch(() => undefined);
		expect(store.savedAt).toBeNull();
	});

	it("meldet ein gescheitertes Sichern, damit das Öffnen den alten Stand zurückholen kann", async () => {
		vi.spyOn(fs, "writeText").mockRejectedValue(new Error("Platte voll"));
		await expect(store.replace({ state: projectState, results: null }, settings)).rejects.toThrow("Platte voll");
		// Normales Sichern meldet den Fehler weiterhin nur im Protokoll.
		await expect(store.saveNow()).resolves.toBeUndefined();
	});
});

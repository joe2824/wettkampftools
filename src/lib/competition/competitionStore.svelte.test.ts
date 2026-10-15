// @vitest-environment happy-dom
import { flushSync } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NO_HIDDEN } from "$lib/components/certificates/certificateSelection";
import { SelectionState } from "$lib/components/certificates/selectionState.svelte";
import { resetAppDataStore, setAppDataStore } from "$lib/platform/fs";
import type { Sheet } from "$lib/platform/workbook";
import { SessionState } from "$lib/session.svelte";
import { defaultSettings } from "$lib/settings/settings";
import { SETTINGS_FILE, SettingsStore } from "$lib/settings/settingsStore.svelte";
import { createFakeStore, type FakeStore } from "$lib/testing/fakeFs";
import { buildRegistrationCsv } from "$lib/testing/fixtures";
import { loadRegistrations } from "$lib/workflows/preparation";
import { AUTOSAVE_DELAY_MS, CompetitionStore } from "./competitionStore.svelte";
import { COMPETITION_STATE_PATH, encodeBase64, loadCompetitionState, saveCompetitionState } from "./persistence";

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
	session.setResults({ fileName: "JAuswertung.xlsx", lastModified: 0, workbook: WORKBOOK, kind: "team", rows: [], yearWarning: 2025, creationUnknown: false, yearConfirmed: true });
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

	it("stellt Ergebnisse samt Jahreshinweis und Urkunden-Auswahl wieder her", async () => {
		await saveCompetitionState({
			savedAt: SAVED_AT,
			results: {
				fileName: "JAuswertung.xlsx",
				lastModified: 5,
				workbook: WORKBOOK,
				yearWarning: 2025,
				creationUnknown: true,
				yearConfirmed: true
			},
			certificateSelection: { hidden: { ageGroups: ["AK 12"], genders: [], kinds: [] }, excluded: ["e1"] }
		});
		await store.restore(settings);
		expect(session.results?.rows).toHaveLength(1);
		expect(session.results?.kind).toBe("team");
		expect(session.results).toMatchObject({ yearWarning: 2025, creationUnknown: true, yearConfirmed: true });
		selection.attach(session.results?.workbook ?? null);
		expect(selection.hidden.ageGroups).toEqual(["AK 12"]);
		expect([...selection.excluded]).toEqual(["e1"]);
	});

	it("lässt eine unbrauchbare Meldedatei weg", async () => {
		await saveCompetitionState({
			savedAt: SAVED_AT,
			registration: { fileName: "x.csv", csvBase64: encodeBase64(new TextEncoder().encode("a;b\n1;2\n")), waveSelection: [] }
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
		const write = vi.spyOn(fs, "writeText");
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
		expect(write).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		await store.idle();
		expect(write).toHaveBeenCalledTimes(1);
		stop();

		const saved = await loadCompetitionState();
		expect(saved?.savedAt).toBe(NOW.toISOString());
		expect(saved?.registration?.waveSelection).toEqual(["r1"]);
		expect(saved?.registration?.csvBase64).toBe(encodeBase64(csv));
		expect(saved?.results).toMatchObject({ yearWarning: 2025, creationUnknown: false, yearConfirmed: true });
		expect(saved?.certificateSelection).toEqual({ hidden: NO_HIDDEN, excluded: ["e1"] });
		expect(store.savedAt).toBe(NOW.toISOString());
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

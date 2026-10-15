import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushLog } from "$lib/log";
import { resetAppDataStore, setAppDataStore } from "$lib/platform/fs";
import { storedResults } from "$lib/testing/competitionFixtures";
import { createFakeStore, type FakeStore } from "$lib/testing/fakeFs";
import {
	COMPETITION_STATE_PATH,
	clearCompetitionState,
	decodeBase64,
	encodeBase64,
	loadCompetition,
	parseCompetitionState,
	saveCompetitionState,
	serializeCompetitionState,
	type CompetitionState
} from "./persistence";
import { COMPETITION_RESULTS_PATH, saveStoredResults } from "./resultsFile";

const csvBytes = new TextEncoder().encode("Gliederung;Name\nMusterstadt;Anna Meier\n");
const SAVED_AT = "2026-10-14T09:30:00.000Z";
const NOW = new Date(2026, 9, 15, 7, 5, 9);
const SET_ASIDE_SUFFIX = ".unreadable-20261015-070509";

function fullState(): CompetitionState {
	return {
		savedAt: SAVED_AT,
		registration: { fileName: "meldungen.csv", csvBase64: encodeBase64(csvBytes), waveSelection: ["r1", "r2"] },
		certificateSelection: { hidden: { ageGroups: ["AK 12"], genders: ["weiblich"], kinds: ["wave"] }, excluded: ["e1"] }
	};
}

/** Einteiliger Stand der ersten Version mit eingebetteten Ergebnissen. */
function legacyFile(): Record<string, unknown> {
	const { fileName, modifiedMs, workbook, yearWarning, yearConfirmed } = storedResults();
	const results = { fileName, lastModified: modifiedMs, workbook, yearWarning, creationUnknown: false, yearConfirmed };
	return { schemaVersion: 1, ...fullState(), results };
}

const writeRaw = (path: string, value: unknown): void =>
	void fs.files.set(path, new TextEncoder().encode(typeof value === "string" ? value : JSON.stringify(value)));

let fs: FakeStore;

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

describe("Base64", () => {
	it("kodiert Bytes verlustfrei hin und zurück", () => {
		const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
		expect(decodeBase64(encodeBase64(bytes))).toEqual(bytes);
		expect(encodeBase64(new Uint8Array())).toBe("");
	});
});

describe("parseCompetitionState", () => {
	it("übernimmt einen vollständigen Stand", () => {
		expect(parseCompetitionState({ schemaVersion: 2, ...fullState() })).toEqual({
			state: fullState(),
			legacyResults: null
		});
	});

	it("lässt fehlende Teile weg", () => {
		expect(parseCompetitionState({ schemaVersion: 2, savedAt: SAVED_AT })?.state).toEqual({ savedAt: SAVED_AT });
	});

	it("verwirft kaputte Teile einzeln", () => {
		const raw = {
			schemaVersion: 2,
			...fullState(),
			registration: { fileName: "x.csv", csvBase64: 5, waveSelection: [] },
			certificateSelection: { hidden: { ageGroups: [1] }, excluded: ["e1"] }
		};
		expect(parseCompetitionState(raw)?.state).toEqual({ savedAt: SAVED_AT });
	});

	it("filtert unbekannte Werte und Felder", () => {
		const raw = {
			schemaVersion: 2,
			savedAt: SAVED_AT,
			extra: "weg",
			registration: { fileName: "m.csv", csvBase64: "", waveSelection: ["a", 3], secret: 1 },
			certificateSelection: { hidden: { ageGroups: [], genders: [], kinds: ["rescue", "other"] }, excluded: [] }
		};
		expect(parseCompetitionState(raw)?.state).toEqual({
			savedAt: SAVED_AT,
			registration: { fileName: "m.csv", csvBase64: "", waveSelection: ["a"] },
			certificateSelection: { hidden: { ageGroups: [], genders: [], kinds: ["rescue"] }, excluded: [] }
		});
	});

	it("liest den alten einteiligen Stand samt Ergebnissen", () => {
		const parsed = parseCompetitionState(legacyFile());
		expect(parsed?.state).toEqual(fullState());
		expect(parsed?.legacyResults).toEqual({ ...storedResults(), createdMs: null });
	});

	it("lehnt Unsinn und unbekannte Versionen ab", () => {
		expect(parseCompetitionState(null)).toBeNull();
		expect(parseCompetitionState("Anna Meier")).toBeNull();
		expect(parseCompetitionState({ ...fullState() })).toBeNull();
		expect(parseCompetitionState({ schemaVersion: 3, ...fullState() })).toBeNull();
		expect(parseCompetitionState({ schemaVersion: 2, savedAt: "gestern" })).toBeNull();
	});
});

describe("serializeCompetitionState", () => {
	it("ergibt das Format, das parseCompetitionState wieder liest", () => {
		const raw = serializeCompetitionState(fullState());
		expect(parseCompetitionState(JSON.parse(JSON.stringify(raw)))?.state).toEqual(fullState());
	});
});

describe("Speichern und Laden", () => {
	it("liest Stand und Ergebnisse aus ihren Dateien", async () => {
		await saveCompetitionState(fullState());
		await saveStoredResults(storedResults());
		expect(await loadCompetition(NOW)).toEqual({
			state: fullState(),
			results: storedResults(),
			needsMigration: false,
			setAside: []
		});
	});

	it("schreibt Ergebnisse nie in den kleinen Stand", async () => {
		await saveCompetitionState({ ...fullState(), results: storedResults() } as CompetitionState);
		const raw = JSON.parse(new TextDecoder().decode(fs.files.get(COMPETITION_STATE_PATH)));
		expect(raw).not.toHaveProperty("results");
		expect(raw.schemaVersion).toBe(2);
	});

	it("liefert ohne Dateien nichts", async () => {
		expect(await loadCompetition(NOW)).toEqual({ state: null, results: null, needsMigration: false, setAside: [] });
	});

	it("übernimmt Ergebnisse aus dem alten Format und verlangt eine neue Sicherung", async () => {
		writeRaw(COMPETITION_STATE_PATH, legacyFile());
		const loaded = await loadCompetition(NOW);
		expect(loaded.state).toEqual(fullState());
		expect(loaded.results).toEqual({ ...storedResults(), createdMs: null });
		expect(loaded.needsMigration).toBe(true);
	});

	it("legt unlesbare Dateien beiseite und protokolliert nur Codes", async () => {
		writeRaw(COMPETITION_STATE_PATH, { schemaVersion: 2, savedAt: "Anna Meier" });
		writeRaw(COMPETITION_RESULTS_PATH, "{kaputt");
		const loaded = await loadCompetition(NOW);
		expect(loaded).toMatchObject({ state: null, results: null, needsMigration: false });
		expect(loaded.setAside).toEqual([
			COMPETITION_STATE_PATH + SET_ASIDE_SUFFIX,
			COMPETITION_RESULTS_PATH + SET_ASIDE_SUFFIX
		]);
		expect(fs.files.has(COMPETITION_STATE_PATH)).toBe(false);
		await flushLog();
		const log = [...fs.files.entries()].find(([path]) => path.startsWith("logs/"));
		const text = new TextDecoder().decode(log?.[1]);
		expect(text).toContain("competition.stateInvalid");
		expect(text).toContain("competition.resultsInvalid");
		expect(text).not.toContain("Anna Meier");
	});

	it("löscht Stand und Ergebnisse", async () => {
		await saveCompetitionState(fullState());
		await saveStoredResults(storedResults());
		await clearCompetitionState();
		expect(fs.files.has(COMPETITION_STATE_PATH)).toBe(false);
		expect(fs.files.has(COMPETITION_RESULTS_PATH)).toBe(false);
	});
});

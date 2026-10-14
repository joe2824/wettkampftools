import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushLog } from "$lib/log";
import { resetAppDataStore, setAppDataStore } from "$lib/platform/fs";
import { createFakeStore, type FakeStore } from "$lib/testing/fakeFs";
import {
	COMPETITION_STATE_PATH,
	clearCompetitionState,
	decodeBase64,
	encodeBase64,
	loadCompetitionState,
	parseCompetitionState,
	saveCompetitionState,
	type CompetitionState
} from "./persistence";

const csvBytes = new TextEncoder().encode("Gliederung;Name\nMusterstadt;Anna Meier\n");

function fullState(): CompetitionState {
	return {
		savedAt: "2026-10-14T09:30:00.000Z",
		registration: { fileName: "meldungen.csv", csvBase64: encodeBase64(csvBytes), waveSelection: ["r1", "r2"] },
		results: {
			fileName: "JAuswertung.xlsx",
			lastModified: 1_700_000_000_000,
			workbook: {
				sheets: [{ name: "Daten", rows: [["Platz", "Name"], [1, "Musterstadt"], [null, true]] }],
				properties: { created: "2026-10-01T10:00:00Z", modified: null }
			},
			yearWarning: 2025,
			creationUnknown: true,
			yearConfirmed: true
		},
		certificateSelection: { hidden: { ageGroups: ["AK 12"], genders: ["weiblich"], kinds: ["wave"] }, excluded: ["e1"] }
	};
}

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
		expect(parseCompetitionState({ schemaVersion: 1, ...fullState() })).toEqual(fullState());
	});

	it("lässt fehlende Teile weg", () => {
		expect(parseCompetitionState({ schemaVersion: 1, savedAt: "2026-10-14T09:30:00.000Z" })).toEqual({
			savedAt: "2026-10-14T09:30:00.000Z"
		});
	});

	it("verwirft kaputte Teile einzeln", () => {
		const raw = {
			schemaVersion: 1,
			...fullState(),
			registration: { fileName: "x.csv", csvBase64: 5, waveSelection: [] },
			results: { ...fullState().results, workbook: { sheets: [{ name: "Daten", rows: [[{}]] }] } },
			certificateSelection: { hidden: { ageGroups: [1] }, excluded: ["e1"] }
		};
		expect(parseCompetitionState(raw)).toEqual({ savedAt: "2026-10-14T09:30:00.000Z" });
	});

	it("filtert unbekannte Werte und Felder", () => {
		const raw = {
			schemaVersion: 1,
			savedAt: "2026-10-14T09:30:00.000Z",
			extra: "weg",
			registration: { fileName: "m.csv", csvBase64: "", waveSelection: ["a", 3], secret: 1 },
			certificateSelection: { hidden: { ageGroups: [], genders: [], kinds: ["rescue", "other"] }, excluded: [] }
		};
		expect(parseCompetitionState(raw)).toEqual({
			savedAt: "2026-10-14T09:30:00.000Z",
			registration: { fileName: "m.csv", csvBase64: "", waveSelection: ["a"] },
			certificateSelection: { hidden: { ageGroups: [], genders: [], kinds: ["rescue"] }, excluded: [] }
		});
	});

	it("ergänzt fehlende Angaben zum Dateijahr mit Vorgaben", () => {
		const { fileName, lastModified, workbook, yearWarning } = fullState().results!;
		const older = { fileName, lastModified, workbook, yearWarning };
		const parsed = parseCompetitionState({ schemaVersion: 1, ...fullState(), results: { ...older, yearConfirmed: "ja" } });
		expect(parsed?.results).toEqual({ ...older, creationUnknown: false, yearConfirmed: false });
	});

	it("lehnt Unsinn und andere Versionen ab", async () => {
		expect(parseCompetitionState(null)).toBeNull();
		expect(parseCompetitionState("Anna Meier")).toBeNull();
		expect(parseCompetitionState({ ...fullState() })).toBeNull();
		expect(parseCompetitionState({ schemaVersion: 2, ...fullState() })).toBeNull();
		expect(parseCompetitionState({ schemaVersion: 1, savedAt: "gestern" })).toBeNull();
	});
});

describe("Speichern und Laden", () => {
	it("liest den gespeicherten Stand wieder ein", async () => {
		await saveCompetitionState(fullState());
		expect(fs.files.has(COMPETITION_STATE_PATH)).toBe(true);
		expect(await loadCompetitionState()).toEqual(fullState());
	});

	it("liefert null ohne Datei", async () => {
		expect(await loadCompetitionState()).toBeNull();
	});

	it("protokolliert kaputte Dateien nur mit Code", async () => {
		fs.files.set(COMPETITION_STATE_PATH, new TextEncoder().encode('{"schemaVersion":1,"savedAt":"Anna Meier"}'));
		expect(await loadCompetitionState()).toBeNull();
		await flushLog();
		const log = [...fs.files.entries()].find(([path]) => path.startsWith("logs/"));
		const text = new TextDecoder().decode(log?.[1]);
		expect(text).toContain("competition.stateInvalid");
		expect(text).not.toContain("Anna Meier");
	});

	it("löscht den Stand", async () => {
		await saveCompetitionState(fullState());
		await clearCompetitionState();
		expect(fs.files.has(COMPETITION_STATE_PATH)).toBe(false);
	});
});

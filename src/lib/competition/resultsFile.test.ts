import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetAppDataStore, setAppDataStore } from "$lib/platform/fs";
import { createFakeStore, type FakeStore } from "$lib/testing/fakeFs";
import {
	COMPETITION_RESULTS_PATH,
	clearStoredResults,
	parseLegacyResults,
	parseStoredResults,
	saveStoredResults
} from "./resultsFile";
import { storedResults } from "$lib/testing/competitionFixtures";

let fs: FakeStore;

beforeEach(() => {
	fs = createFakeStore();
	setAppDataStore(fs);
});

afterEach(() => resetAppDataStore());

describe("parseStoredResults", () => {
	it("übernimmt vollständige Ergebnisse", () => {
		expect(parseStoredResults({ schemaVersion: 1, ...storedResults() })).toEqual(storedResults());
	});

	it("lässt unbekannte Zeiten unbekannt", () => {
		const raw = { schemaVersion: 1, ...storedResults(), createdMs: null, modifiedMs: "gestern" };
		expect(parseStoredResults(raw)).toMatchObject({ createdMs: null, modifiedMs: null });
	});

	it("ergänzt fehlende Angaben zum Dateijahr mit Vorgaben", () => {
		const { yearWarning: _w, yearConfirmed: _c, ...rest } = storedResults();
		expect(parseStoredResults({ schemaVersion: 1, ...rest, yearConfirmed: "ja" })).toMatchObject({
			yearWarning: null,
			yearConfirmed: false
		});
	});

	it("lehnt Unsinn, kaputte Arbeitsmappen und andere Versionen ab", () => {
		expect(parseStoredResults(null)).toBeNull();
		expect(parseStoredResults({ ...storedResults() })).toBeNull();
		expect(parseStoredResults({ schemaVersion: 2, ...storedResults() })).toBeNull();
		const broken = { sheets: [{ name: "Daten", rows: [[{}]] }], properties: { created: null, modified: null } };
		expect(parseStoredResults({ schemaVersion: 1, ...storedResults(), workbook: broken })).toBeNull();
	});
});

describe("parseLegacyResults", () => {
	it("übernimmt Ergebnisse aus dem alten Wettkampfstand ohne Erstellungszeit", () => {
		const { fileName, workbook } = storedResults();
		const legacy = {
			fileName,
			lastModified: 5,
			workbook,
			yearWarning: 2025,
			creationUnknown: false,
			yearConfirmed: true
		};
		expect(parseLegacyResults(legacy)).toEqual({
			fileName,
			createdMs: null,
			modifiedMs: 5,
			workbook,
			yearWarning: 2025,
			yearConfirmed: true
		});
	});

	it("lehnt unvollständige alte Ergebnisse ab", () => {
		expect(parseLegacyResults({ ...storedResults() })).toBeNull();
		expect(parseLegacyResults(undefined)).toBeNull();
	});
});

describe("Speichern und Löschen", () => {
	it("schreibt die Ergebnisse in eine eigene Datei und entfernt sie wieder", async () => {
		await saveStoredResults(storedResults());
		const raw: unknown = JSON.parse(new TextDecoder().decode(fs.files.get(COMPETITION_RESULTS_PATH)));
		expect(parseStoredResults(raw)).toEqual(storedResults());
		await clearStoredResults();
		expect(fs.files.has(COMPETITION_RESULTS_PATH)).toBe(false);
	});
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetAppDataStore, setAppDataStore } from "$lib/platform/fs";
import { createFakeStore, type FakeStore } from "$lib/testing/fakeFs";
import { DEFAULT_REC_MAPPING } from "./mapping";
import {
	listBestTimeYears,
	loadAllBestTimes,
	loadBestTimes,
	loadClubRulebook,
	loadRecMapping,
	rememberBestTimes,
	saveBestTimes,
	saveClubRulebook,
	saveRecMapping
} from "./storage";

let store: FakeStore;

beforeEach(() => {
	store = createFakeStore();
	setAppDataStore(store);
});

afterEach(() => resetAppDataStore());

describe("Bestzeiten", () => {
	const best = {
		year: 2025,
		entries: [
			{
				ageGroup: "AkW offen",
				gender: "male" as const,
				discipline: "4*50m Retten in der Welle",
				time: 16510,
				slowest: 18000,
				average: 17200,
				teams: 3
			}
		]
	};

	it("speichert je Jahr und listet die Jahre absteigend", async () => {
		await saveBestTimes(best);
		await saveBestTimes({ year: 2024, entries: [] });
		expect([...store.files.keys()].sort()).toEqual(["records/best-times-2024.json", "records/best-times-2025.json"]);
		expect(await loadBestTimes(2025)).toEqual(best);
		expect(await listBestTimeYears()).toEqual([2025, 2024]);
	});

	it("liefert null ohne oder bei kaputter Datei", async () => {
		expect(await loadBestTimes(2023)).toBeNull();
		await store.writeText("records/best-times-2023.json", "{kaputt");
		expect(await loadBestTimes(2023)).toBeNull();
	});

	it("übergeht fremde Dateien beim Auflisten", async () => {
		await store.writeText("records/mapping.json", "{}");
		expect(await listBestTimeYears()).toEqual([]);
	});

	it("lädt alle lesbaren Jahre auf einmal", async () => {
		await saveBestTimes(best);
		await store.writeText("records/best-times-2023.json", "{kaputt");
		expect(await loadAllBestTimes()).toEqual([best]);
	});
});

describe("Zuordnung", () => {
	it("beginnt mit der Standardzuordnung", async () => {
		expect(await loadRecMapping()).toEqual(DEFAULT_REC_MAPPING);
	});

	it("bleibt nach dem Speichern erhalten", async () => {
		const mapping = { ageGroups: { "AK 10": "AK 13/14" }, disciplineAliases: {} };
		await saveRecMapping(mapping);
		expect(await loadRecMapping()).toEqual(mapping);
	});

	it("fällt bei kaputter Datei auf die Standardzuordnung zurück", async () => {
		await store.writeText("records/mapping.json", "[1]");
		expect(await loadRecMapping()).toEqual(DEFAULT_REC_MAPPING);
	});
});

describe("Vereins-Regelwerk", () => {
	it("merkt sich die Datei", async () => {
		expect(await loadClubRulebook()).toBeNull();
		await saveClubRulebook({ name: "Regelwerk_2025.rwm", bytes: new Uint8Array([1, 2, 3]) });
		expect(await loadClubRulebook()).toEqual({ name: "Regelwerk_2025.rwm", bytes: new Uint8Array([1, 2, 3]) });
	});
});

describe("rememberBestTimes", () => {
	const workbook = (rows: (string | number)[][]) => ({
		sheets: [{ name: "Daten", rows: [["Altersklasse", "Geschlecht", "Disziplinen", "Zeit 1", "Strafe 1"], ...rows] }],
		properties: { created: null, modified: null }
	});

	it("speichert die Bestzeiten und meldet die Anzahl", async () => {
		expect(
			await rememberBestTimes(workbook([["AkW offen", "weiblich", "4*50m Retten in der Welle", "3:20,00", ""]]), 2025)
		).toBe(1);
		expect((await loadBestTimes(2025))?.entries[0].time).toBe(20000);
	});

	it("legt ohne Zeiten nichts an", async () => {
		expect(await rememberBestTimes(workbook([]), 2025)).toBe(0);
		expect(store.files.size).toBe(0);
	});
});

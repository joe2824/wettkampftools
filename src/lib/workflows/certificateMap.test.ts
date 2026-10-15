import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetAppDataStore, setAppDataStore } from "$lib/platform/fs";
import { createFakeStore, type FakeStore } from "$lib/testing/fakeFs";
import { certificateMapData, loadLocationData, participantNames } from "./certificateMap";
import { CHOICES_FILE, GLD_CACHE_FILE } from "./distances";

let fs: FakeStore;
const organisations = [
	{ name: "Ortsgruppe Musterstadt", lat: 53.55, lon: 9.99, id: "1" },
	{ name: "Beispielhausen", lat: 48.14, lon: 11.58, id: "2" },
	{ name: "Beispielhausen", lat: 50.11, lon: 8.68, id: "3" }
];

function writeJsonFile(path: string, value: unknown) {
	fs.files.set(path, new TextEncoder().encode(JSON.stringify(value)));
}

beforeEach(() => {
	fs = createFakeStore();
	setAppDataStore(fs);
});

afterEach(() => resetAppDataStore());

describe("loadLocationData", () => {
	it("liest Standortdaten und gemerkte Zuordnungen, ohne abzurufen", async () => {
		writeJsonFile(GLD_CACHE_FILE, { fetchedAt: "2026-09-01T10:00:00.000Z", organisations });
		writeJsonFile(CHOICES_FILE, { beispielhausen: "3" });
		expect(await loadLocationData()).toEqual({ organisations, choices: { beispielhausen: "3" } });
	});

	it("liefert null ohne gespeicherte Standortdaten", async () => {
		expect(await loadLocationData()).toBeNull();
	});
});

describe("participantNames", () => {
	it("nimmt die Gliederungen der Ergebnisdatei", () => {
		const results = { rows: [{ organisation: "Musterstadt" }, { organisation: " Musterstadt " }] };
		const registration = { teams: [{ organisation: "Beispielhausen" }] };
		expect(participantNames(results, registration)).toEqual(["Musterstadt"]);
	});

	it("nimmt ohne Ergebnisdatei die Meldungen", () => {
		expect(participantNames(null, { teams: [{ organisation: "Beispielhausen" }, { organisation: "" }] })).toEqual([
			"Beispielhausen"
		]);
		expect(participantNames(null, null)).toEqual([]);
	});
});

describe("certificateMapData", () => {
	it("setzt die gefundenen Gliederungen als Punkte", () => {
		const data = certificateMapData(["Musterstadt", "Beispielhausen"], {
			organisations,
			choices: { beispielhausen: "3" }
		});
		expect(data?.markers.map((marker) => marker.name).sort()).toEqual(["Beispielhausen", "Musterstadt"]);
	});

	it("liefert ohne Standortdaten nichts", () => {
		expect(certificateMapData(["Musterstadt"], null)).toBeUndefined();
	});
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const httpMock = vi.hoisted(() => ({ platformFetch: vi.fn() }));
vi.mock("$lib/platform/http", () => httpMock);

import { resetAppDataStore, setAppDataStore } from "$lib/platform/fs";
import { createFakeStore, type FakeStore } from "$lib/testing/fakeFs";
import { buildRegistrationCsv } from "$lib/testing/fixtures";
import { POI_URL, type GldCache } from "$lib/distance/dlrgPoi";
import {
	computeDistances,
	distanceTableText,
	fetchPoiJson,
	formatDataDate,
	formatKm,
	GLD_CACHE_FILE,
	loadOrganisations,
	organisationsFromCsv,
	organisationsFromTeams
} from "./distances";

let fs: FakeStore;
const now = new Date("2026-10-14T08:00:00.000Z");
const cached: GldCache = {
	fetchedAt: "2026-09-01T10:00:00.000Z",
	organisations: [{ name: "Ortsgruppe Musterstadt", lat: 50.1, lon: 8.7 }]
};
const poiResponse = {
	locs: [{ typ: "Gld", lat: "50.2", lon: "8.6", pois: [{ name: "Ortsgruppe Beispielhausen e.V." }] }]
};

function writeCache(value: unknown) {
	fs.files.set(GLD_CACHE_FILE, new TextEncoder().encode(JSON.stringify(value)));
}

function readCache(): unknown {
	return JSON.parse(new TextDecoder().decode(fs.files.get(GLD_CACHE_FILE)));
}

beforeEach(() => {
	fs = createFakeStore();
	setAppDataStore(fs);
	httpMock.platformFetch.mockReset();
});

afterEach(() => resetAppDataStore());

describe("loadOrganisations", () => {
	it("nimmt den Zwischenspeicher, ohne abzurufen", async () => {
		writeCache(cached);
		const fetchJson = vi.fn();
		expect(await loadOrganisations({ fetchJson, now })).toEqual({ data: cached, status: "cache" });
		expect(fetchJson).not.toHaveBeenCalled();
	});

	it("ruft ohne Zwischenspeicher ab und speichert mit Datum", async () => {
		const fetchJson = vi.fn(async () => poiResponse);
		const outcome = await loadOrganisations({ fetchJson, now });
		const expected = {
			fetchedAt: "2026-10-14T08:00:00.000Z",
			organisations: [{ name: "Ortsgruppe Beispielhausen e.V.", lat: 50.2, lon: 8.6 }]
		};
		expect(outcome).toEqual({ data: expected, status: "fresh" });
		expect(fetchJson).toHaveBeenCalledWith(POI_URL);
		expect(readCache()).toEqual(expected);
	});

	it("aktualisiert auf Wunsch trotz Zwischenspeicher", async () => {
		writeCache(cached);
		const outcome = await loadOrganisations({ refresh: true, fetchJson: async () => poiResponse, now });
		expect(outcome.status).toBe("fresh");
		expect(outcome.data?.fetchedAt).toBe(now.toISOString());
	});

	it("fällt ohne Netz auf den Zwischenspeicher zurück", async () => {
		writeCache(cached);
		const fetchJson = vi.fn(async () => Promise.reject(new Error("offline")));
		expect(await loadOrganisations({ refresh: true, fetchJson, now })).toEqual({ data: cached, status: "offline" });
		expect(readCache()).toEqual(cached);
	});

	it("überschreibt den Zwischenspeicher nicht mit einer leeren Antwort", async () => {
		writeCache(cached);
		const outcome = await loadOrganisations({ refresh: true, fetchJson: async () => ({ locs: [] }), now });
		expect(outcome).toEqual({ data: cached, status: "offline" });
	});

	it("meldet, wenn weder Netz noch Zwischenspeicher da sind", async () => {
		writeCache({ kaputt: true });
		const outcome = await loadOrganisations({ fetchJson: async () => Promise.reject(new Error("x")), now });
		expect(outcome).toEqual({ data: null, status: "unavailable" });
	});
});

describe("fetchPoiJson", () => {
	it("liest die Antwort als JSON", async () => {
		httpMock.platformFetch.mockResolvedValue(new Response(JSON.stringify(poiResponse), { status: 200 }));
		expect(await fetchPoiJson(POI_URL)).toEqual(poiResponse);
		expect(httpMock.platformFetch).toHaveBeenCalledWith(POI_URL);
	});

	it("wirft bei Serverfehlern", async () => {
		httpMock.platformFetch.mockResolvedValue(new Response("", { status: 503 }));
		await expect(fetchPoiJson(POI_URL)).rejects.toThrow("503");
	});
});

describe("organisationsFromCsv", () => {
	it("liefert jede Gliederung einmal", () => {
		const csv = buildRegistrationCsv([
			{ gliederung: "Musterstadt" },
			{ gliederung: "Beispielhausen" },
			{ gliederung: "Musterstadt" }
		]);
		expect(organisationsFromCsv(new TextEncoder().encode(csv))).toEqual({
			ok: true,
			names: ["Musterstadt", "Beispielhausen"]
		});
	});

	it("meldet freundlich, wenn die Spalte fehlt", () => {
		const outcome = organisationsFromCsv(new TextEncoder().encode("vorname;nachname\nAnna;Meier\n"));
		expect(outcome).toEqual({
			ok: false,
			message: expect.stringContaining("kein Mannschaften-Export")
		});
	});
});

describe("organisationsFromTeams", () => {
	it("liefert jede Gliederung einmal und ohne Leere", () => {
		const teams = [{ organisation: "Musterstadt" }, { organisation: " " }, { organisation: "Musterstadt" }];
		expect(organisationsFromTeams(teams)).toEqual(["Musterstadt"]);
	});
});

describe("computeDistances", () => {
	it("gleicht mit den Standortdaten ab", () => {
		const result = computeDistances(["Musterstadt", "Nirgendwo"], cached);
		expect(result.matched.map((row) => row.name)).toEqual(["Musterstadt"]);
		expect(result.unmatched).toEqual(["Nirgendwo"]);
	});
});

describe("Formatierung", () => {
	it("schreibt Kilometer mit zwei Nachkommastellen und Komma", () => {
		expect(formatKm(28.8)).toBe("28,80");
		expect(formatKm(1234.567)).toBe("1.234,57");
	});

	it("schreibt den Datenstand als deutsches Datum", () => {
		expect(formatDataDate("2026-09-01T10:00:00.000Z")).toBe("01.09.2026");
	});

	it("baut die Tabelle als Text zum Einfügen", () => {
		const text = distanceTableText({
			matched: [
				{ name: "Beispielhausen", km: 40.5 },
				{ name: "Musterstadt", km: 12 }
			],
			unmatched: []
		});
		expect(text).toBe("Platz\tGliederung\tEntfernung (km)\n1\tBeispielhausen\t40,50\n2\tMusterstadt\t12,00");
	});
});

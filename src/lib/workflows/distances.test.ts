import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const httpMock = vi.hoisted(() => ({ platformFetch: vi.fn() }));
vi.mock("$lib/platform/http", () => httpMock);

import { resetAppDataStore, setAppDataStore } from "$lib/platform/fs";
import { createFakeStore, type FakeStore } from "$lib/testing/fakeFs";
import { buildRegistrationCsv } from "$lib/testing/fixtures";
import { POI_URL, type GldCache } from "$lib/distance/dlrgPoi";
import {
	candidateText,
	CHOICES_FILE,
	computeDistances,
	distanceSummary,
	distanceTableText,
	fetchPoiJson,
	formatDataDate,
	formatKm,
	GLD_CACHE_FILE,
	loadChoices,
	loadOrganisations,
	organisationsFromCsv,
	organisationsFromTeams,
	saveChoice,
	teamNamesByOrganisation
} from "./distances";

let fs: FakeStore;
const now = new Date("2026-10-14T08:00:00.000Z");
const cached: GldCache = {
	fetchedAt: "2026-09-01T10:00:00.000Z",
	organisations: [{ name: "Ortsgruppe Musterstadt", lat: 50.1, lon: 8.7, id: "1" }]
};
const poiResponse = {
	locs: [{ typ: "Gld", lat: "50.2", lon: "8.6", pois: [{ name: "Ortsgruppe Beispielhausen e.V.", id: "2" }] }]
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
			organisations: [{ name: "Ortsgruppe Beispielhausen e.V.", lat: 50.2, lon: 8.6, id: "2" }]
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

	it("ruft neu ab, wenn dem Zwischenspeicher die Kennungen fehlen", async () => {
		const outdated = { ...cached, organisations: [{ name: "Ortsgruppe Musterstadt", lat: 50.1, lon: 8.7 }] };
		writeCache(outdated);
		expect((await loadOrganisations({ fetchJson: async () => poiResponse, now })).status).toBe("fresh");
		const offline = await loadOrganisations({ fetchJson: async () => Promise.reject(new Error("x")), now });
		expect(offline.status).toBe("cache");
	});

	it("nimmt einen veralteten Zwischenspeicher, wenn kein Netz da ist", async () => {
		const outdated = { ...cached, organisations: [{ name: "Ortsgruppe Musterstadt", lat: 50.1, lon: 8.7 }] };
		writeCache(outdated);
		const outcome = await loadOrganisations({ fetchJson: async () => Promise.reject(new Error("x")), now });
		expect(outcome).toEqual({ data: outdated, status: "offline" });
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
			names: ["Musterstadt", "Beispielhausen"],
			teamNames: expect.any(Object)
		});
	});

	it("liefert die Mannschaftsnamen je Gliederung", () => {
		const csv = buildRegistrationCsv([
			{ gliederung: "Musterstadt", name: "Musterstadt / Taunus" },
			{ gliederung: "Beispielhausen", name: "Beispielhausen" }
		]);
		const outcome = organisationsFromCsv(new TextEncoder().encode(csv));
		expect(outcome.ok && outcome.teamNames).toEqual({
			Musterstadt: ["Musterstadt / Taunus"],
			Beispielhausen: ["Beispielhausen"]
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

describe("teamNamesByOrganisation", () => {
	it("sammelt verschiedene, nicht leere Namen", () => {
		const teams = [
			{ organisation: "Musterstadt", name: "Musterstadt / Taunus 1", originalName: "Musterstadt" },
			{ organisation: "Musterstadt", name: "Musterstadt / Taunus 2", originalName: "Musterstadt" },
			{ organisation: "Beispielhausen", name: "", originalName: "" }
		];
		expect(teamNamesByOrganisation(teams)).toEqual({
			Musterstadt: ["Musterstadt / Taunus 1", "Musterstadt", "Musterstadt / Taunus 2"],
			Beispielhausen: []
		});
	});
});

describe("computeDistances", () => {
	const twins: GldCache = {
		fetchedAt: cached.fetchedAt,
		organisations: [
			{ name: "Musterstadt", lat: 49.3, lon: 7.05, id: "1", plz: "66280", ort: "Musterstadt", bez: "Ortsgruppe" },
			{
				name: "Musterstadt",
				lat: 50.13,
				lon: 8.53,
				id: "2",
				plz: "65843",
				ort: "Musterstadt am Taunus",
				bez: "Ortsgruppe"
			}
		]
	};
	const source = (teamNames: Record<string, string[]> = {}) => ({ names: ["Musterstadt"], teamNames });

	it("gleicht mit den Standortdaten ab", () => {
		const result = computeDistances({ names: ["Musterstadt", "Nirgendwo"], teamNames: {} }, cached);
		expect(result.matched.map((row) => row.name)).toEqual(["Musterstadt"]);
		expect(result.unmatched).toEqual(["Nirgendwo"]);
	});

	it("lässt gleichnamige Gliederungen ohne Hinweis offen", () => {
		expect(computeDistances(source(), twins).ambiguous.map((row) => row.name)).toEqual(["Musterstadt"]);
	});

	it("nutzt Mannschaftsnamen aus der Meldedatei als Hinweis", () => {
		const result = computeDistances(source({ Musterstadt: ["Musterstadt Taunus"] }), twins);
		expect(result.matched[0].choice).toMatchObject({ selectedId: "2", automatic: true });
	});

	it("nutzt den eigenen Mannschaftsnamen als Hinweis", () => {
		const result = computeDistances(source(), twins, { overrides: { musterstadt: "Musterstadt / Taunus" } });
		expect(result.matched[0].choice).toMatchObject({ selectedId: "2", automatic: true });
	});

	it("wendet die gemerkte Wahl an", () => {
		const result = computeDistances(source(), twins, { choices: { musterstadt: "1" } });
		expect(result.matched[0].choice).toMatchObject({ selectedId: "1", automatic: false });
	});
});

describe("gemerkte Zuordnungen", () => {
	it("liefert ohne Datei keine Zuordnungen", async () => {
		expect(await loadChoices()).toEqual({});
	});

	it("verwirft eine unlesbare Datei", async () => {
		fs.files.set(CHOICES_FILE, new TextEncoder().encode("kaputt"));
		expect(await loadChoices()).toEqual({});
	});

	it("speichert eine Wahl und liest sie wieder", async () => {
		const next = await saveChoice({ beispielhausen: "7" }, "Musterstadt", "2");
		expect(next).toEqual({ beispielhausen: "7", musterstadt: "2" });
		expect(CHOICES_FILE).toBe("distances/choices.json");
		expect(await loadChoices()).toEqual(next);
	});
});

describe("distanceSummary", () => {
	it("zählt gefundene, mehrdeutige und fehlende Gliederungen", () => {
		const candidates = [
			{ id: "1", label: "A", km: 1 },
			{ id: "2", label: "B", km: 2 }
		];
		const summary = distanceSummary({
			matched: [
				{ name: "Musterstadt", km: 1 },
				{ name: "Beispielhausen", km: 2, choice: { candidates, selectedId: "1", automatic: false } },
				{ name: "Musterdorf", km: 2, choice: { candidates, selectedId: "2", automatic: true } }
			],
			ambiguous: [{ name: "Beispieldorf", candidates }],
			unmatched: ["Nirgendwo"]
		});
		expect(summary).toBe("2 gefunden · 2 mehrdeutig · 1 nicht gefunden");
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

	it("beschreibt eine Gliederung zur Auswahl mit Entfernung", () => {
		expect(candidateText({ id: "1", label: "Musterstadt – 12345 Musterstadt (Ortsgruppe)", km: 28.8 })).toBe(
			"Musterstadt – 12345 Musterstadt (Ortsgruppe) · 28,80 km"
		);
	});

	it("baut die Tabelle als Text zum Einfügen", () => {
		const text = distanceTableText({
			matched: [
				{ name: "Beispielhausen", km: 40.5 },
				{ name: "Musterstadt", km: 12 }
			],
			ambiguous: [],
			unmatched: []
		});
		expect(text).toBe("Platz\tGliederung\tEntfernung (km)\n1\tBeispielhausen\t40,50\n2\tMusterstadt\t12,00");
	});
});

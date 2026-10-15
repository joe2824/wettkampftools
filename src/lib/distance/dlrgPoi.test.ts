import { describe, expect, it, vi } from "vitest";
import {
	BAD_NAUHEIM,
	POI_URL,
	cleanName,
	distanceKm,
	distancesToBadNauheim,
	fetchOrganisations,
	parseGldCache,
	parsePoiResponse,
	type Organisation
} from "./dlrgPoi";

const FRANKFURT = { lat: 50.1109, lon: 8.6821 };
// Referenzwert mit geopy.geodesic bzw. Geodesic.WGS84.Inverse ermittelt
const FRANKFURT_KM = 28.8;

describe("cleanName", () => {
	it("entfernt Gliederungsbezeichnungen ohne Beachtung der Groß-/Kleinschreibung", () => {
		expect(cleanName("Ortsgruppe Musterstadt e.V.")).toBe("Musterstadt");
		expect(cleanName("BEZIRK Beispielhausen")).toBe("Beispielhausen");
		expect(cleanName("Ortsverband Musterstadt")).toBe("Musterstadt");
		expect(cleanName("Landesverband Hessen E.V.")).toBe("Hessen");
	});

	it("lässt normale Namen unverändert und trimmt", () => {
		expect(cleanName("  Musterstadt  ")).toBe("Musterstadt");
		expect(cleanName("Musterstadt-Nord")).toBe("Musterstadt-Nord");
	});

	it("behandelt Punkte wörtlich", () => {
		expect(cleanName("Musterstadt eXvX")).toBe("Musterstadt eXvX");
	});
});

describe("distanceKm", () => {
	it("berechnet die geodätische Entfernung Bad Nauheim – Frankfurt", () => {
		expect(Math.abs(distanceKm(BAD_NAUHEIM, FRANKFURT) - FRANKFURT_KM)).toBeLessThan(0.01);
	});

	it("liefert 0 für identische Punkte", () => {
		expect(distanceKm(BAD_NAUHEIM, BAD_NAUHEIM)).toBe(0);
	});
});

describe("parsePoiResponse", () => {
	it("findet Gliederungen auch an Orten mit mehreren Einträgen (Typ am Eintrag)", () => {
		const json = {
			locs: [
				{
					typ: "multiple",
					lat: "50.34",
					lon: "8.79",
					pois: [
						{ typ: "Jug", name: "Musterstadt " },
						{ typ: "Gld", name: "Musterstadt  e.V." }
					]
				}
			]
		};
		expect(parsePoiResponse(json)).toEqual([{ name: "Musterstadt  e.V.", lat: 50.34, lon: 8.79 }]);
	});

	it("ordnet Namen mit doppelten Leerzeichen zu", () => {
		const orgs = [{ name: "Musterstadt  e.V.", lat: 50.34, lon: 8.79 }];
		expect(distancesToBadNauheim(["Musterstadt"], orgs).matched.map((m) => m.name)).toEqual(["Musterstadt"]);
	});

	it("übernimmt nur Gliederungen mit gültigen Koordinaten", () => {
		const json = {
			locs: [
				{
					typ: "Gld",
					lat: "50.1",
					lon: "8.6",
					pois: [{ name: "Ortsgruppe Musterstadt e.V." }, { name: "Bezirk Musterstadt" }]
				},
				{ typ: "Gld", lat: 50.2, lon: 8.7, pois: [{ name: "Ortsgruppe Beispielhausen" }] },
				{ typ: "Bad", lat: 50.3, lon: 8.8, pois: [{ name: "Hallenbad Musterstadt" }] },
				{ typ: "Gld", lat: "abc", lon: 8.8, pois: [{ name: "Ortsgruppe Kaputt" }] },
				{ typ: "Gld", lat: 99, lon: 8.8, pois: [{ name: "Ortsgruppe Zuweit" }] },
				{ typ: "Gld", lat: 50, pois: [{ name: "Ortsgruppe Ohnelon" }] },
				{ typ: "Gld", lat: 50, lon: 8, pois: [{ name: 42 }, null, { name: "" }] },
				{ typ: "Gld", lat: 50, lon: 8, pois: "keine Liste" },
				null,
				"Müll"
			]
		};
		expect(parsePoiResponse(json)).toEqual([
			{ name: "Ortsgruppe Musterstadt e.V.", lat: 50.1, lon: 8.6 },
			{ name: "Bezirk Musterstadt", lat: 50.1, lon: 8.6 },
			{ name: "Ortsgruppe Beispielhausen", lat: 50.2, lon: 8.7 }
		]);
	});

	it("liefert eine leere Liste bei unbrauchbaren Daten", () => {
		expect(parsePoiResponse(null)).toEqual([]);
		expect(parsePoiResponse("x")).toEqual([]);
		expect(parsePoiResponse({ locs: "x" })).toEqual([]);
		expect(parsePoiResponse({})).toEqual([]);
	});
});

describe("fetchOrganisations", () => {
	it("ruft den DLRG-Dienst ab und filtert die Antwort", async () => {
		const fetchFn = vi.fn().mockResolvedValue({
			locs: [{ typ: "Gld", lat: 50, lon: 8, pois: [{ name: "Ortsgruppe Musterstadt" }] }]
		});
		await expect(fetchOrganisations(fetchFn)).resolves.toEqual([{ name: "Ortsgruppe Musterstadt", lat: 50, lon: 8 }]);
		expect(fetchFn).toHaveBeenCalledWith(POI_URL);
		expect(POI_URL).toBe("https://services.dlrg.net/service.php?doc=poi&strict=1&limit=5000");
	});
});

describe("distancesToBadNauheim", () => {
	const orgs: Organisation[] = [
		{ name: "Ortsgruppe Musterstadt e.V.", ...FRANKFURT },
		{ name: "Musterstadt", lat: 51, lon: 9 },
		{ name: "Bezirk Beispielhausen", lat: 50.4, lon: 8.75 }
	];

	it("ordnet über bereinigte Namen zu und sortiert absteigend nach Entfernung", () => {
		const result = distancesToBadNauheim(["Musterstadt e.V.", "beispielhausen", "Unbekanntdorf"], orgs);
		expect(result.matched.map((m) => m.name)).toEqual(["Musterstadt e.V.", "beispielhausen"]);
		expect(result.matched[0].km).toBe(FRANKFURT_KM);
		expect(result.matched[1].km).toBe(Math.round(distanceKm(BAD_NAUHEIM, orgs[2]) * 100) / 100);
		expect(result.unmatched).toEqual(["Unbekanntdorf"]);
	});

	it("liefert alles als nicht zugeordnet ohne Gliederungsdaten", () => {
		expect(distancesToBadNauheim(["Musterstadt"], [])).toEqual({ matched: [], unmatched: ["Musterstadt"] });
	});
});

describe("parseGldCache", () => {
	const valid = { fetchedAt: "2026-10-14T08:00:00.000Z", organisations: [{ name: "Musterstadt", lat: 50, lon: 8 }] };

	it("akzeptiert einen gültigen Cache", () => {
		expect(parseGldCache(valid)).toEqual(valid);
	});

	it("verwirft ungültige Caches", () => {
		expect(parseGldCache(null)).toBeNull();
		expect(parseGldCache({ ...valid, fetchedAt: "kein Datum" })).toBeNull();
		expect(parseGldCache({ ...valid, fetchedAt: 5 })).toBeNull();
		expect(parseGldCache({ ...valid, organisations: "x" })).toBeNull();
		expect(parseGldCache({ ...valid, organisations: [{ name: "Musterstadt", lat: "50", lon: 8 }] })).toBeNull();
		expect(parseGldCache({ ...valid, organisations: [{ name: "Musterstadt", lat: 120, lon: 8 }] })).toBeNull();
	});
});

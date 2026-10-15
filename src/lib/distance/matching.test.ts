import { describe, expect, it } from "vitest";
import { BAD_NAUHEIM, distanceKm, type Organisation } from "./dlrgPoi";
import { candidateLabel, choiceKey, distancesToBadNauheim, parseChoiceMap, withChoice } from "./matching";

const FRANKFURT = { lat: 50.1109, lon: 8.6821 };
const FRANKFURT_KM = 28.8;
const roundKm = (org: Organisation) => Math.round(distanceKm(BAD_NAUHEIM, org) * 100) / 100;

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
		expect(result.matched[1].km).toBe(roundKm(orgs[2]));
		expect(result.unmatched).toEqual(["Unbekanntdorf"]);
		expect(result.ambiguous).toEqual([]);
	});

	it("ordnet Namen mit doppelten Leerzeichen zu", () => {
		const doubled = [{ name: "Musterstadt  e.V.", lat: 50.34, lon: 8.79 }];
		expect(distancesToBadNauheim(["Musterstadt"], doubled).matched.map((m) => m.name)).toEqual(["Musterstadt"]);
	});

	it("liefert alles als nicht zugeordnet ohne Gliederungsdaten", () => {
		expect(distancesToBadNauheim(["Musterstadt"], [])).toEqual({
			matched: [],
			ambiguous: [],
			unmatched: ["Musterstadt"]
		});
	});
});

describe("gleichnamige Gliederungen", () => {
	const saar: Organisation = {
		name: "Musterstadt e.V.",
		lat: 49.3,
		lon: 7.05,
		id: "1",
		plz: "66280",
		ort: "Musterstadt",
		bez: "Ortsgruppe"
	};
	const taunus: Organisation = {
		name: "Musterstadt",
		lat: 50.13,
		lon: 8.53,
		id: "2",
		plz: "65843",
		ort: "Musterstadt am Taunus",
		bez: "Ortsgruppe"
	};
	// Dieselbe Gliederung steht an zwei Orten.
	const taunusSecondSite: Organisation = { ...taunus, lat: 50.2, lon: 8.6 };
	const orgs = [saar, taunus, taunusSecondSite];

	it("markiert mehrdeutige Namen mit Auswahl, sortiert nach Entfernung", () => {
		const result = distancesToBadNauheim(["Musterstadt"], orgs);
		expect(result.matched).toEqual([]);
		expect(result.ambiguous).toEqual([
			{
				name: "Musterstadt",
				candidates: [
					{ id: "2", label: "Musterstadt – 65843 Musterstadt am Taunus (Ortsgruppe)", km: roundKm(taunus) },
					{ id: "1", label: "Musterstadt – 66280 Musterstadt (Ortsgruppe)", km: roundKm(saar) }
				]
			}
		]);
	});

	it("zählt mehrere Orte derselben Gliederung nicht als mehrdeutig", () => {
		const result = distancesToBadNauheim(["Musterstadt"], [taunus, taunusSecondSite]);
		expect(result.matched).toEqual([{ name: "Musterstadt", km: roundKm(taunus) }]);
		expect(result.ambiguous).toEqual([]);
	});

	it("wendet eine gemerkte Zuordnung an (Groß-/Kleinschreibung egal)", () => {
		const result = distancesToBadNauheim(["MUSTERSTADT"], orgs, { choices: { musterstadt: "1" } });
		expect(result.ambiguous).toEqual([]);
		expect(result.matched).toEqual([
			{
				name: "MUSTERSTADT",
				km: roundKm(saar),
				choice: { selectedId: "1", automatic: false, candidates: expect.any(Array) }
			}
		]);
		expect(result.matched[0].choice?.candidates.map((c) => c.id)).toEqual(["2", "1"]);
	});

	it("übergeht eine gemerkte Zuordnung, die es nicht mehr gibt", () => {
		const result = distancesToBadNauheim(["Musterstadt"], orgs, { choices: { musterstadt: "99" } });
		expect(result.ambiguous.map((a) => a.name)).toEqual(["Musterstadt"]);
	});

	it("ordnet über einen Hinweis im Mannschaftsnamen automatisch zu", () => {
		const result = distancesToBadNauheim(["Musterstadt"], orgs, { hints: { Musterstadt: ["Musterstadt / Taunus"] } });
		expect(result.ambiguous).toEqual([]);
		expect(result.matched[0]).toMatchObject({ km: roundKm(taunus), choice: { selectedId: "2", automatic: true } });
	});

	it("bevorzugt die gemerkte Zuordnung vor dem Hinweis", () => {
		const result = distancesToBadNauheim(["Musterstadt"], orgs, {
			choices: { musterstadt: "1" },
			hints: { Musterstadt: ["Musterstadt Taunus"] }
		});
		expect(result.matched[0].choice).toMatchObject({ selectedId: "1", automatic: false });
	});
});

describe("candidateLabel", () => {
	it("setzt Name, Postleitzahl, Ort und Art zusammen", () => {
		const org = {
			name: "Ortsgruppe  Musterstadt e.V.",
			lat: 50,
			lon: 8,
			plz: "12345",
			ort: "Musterstadt",
			bez: "Ortsgruppe"
		};
		expect(candidateLabel(org)).toBe("Musterstadt – 12345 Musterstadt (Ortsgruppe)");
	});

	it("lässt fehlende Angaben weg", () => {
		expect(candidateLabel({ name: "Musterstadt", lat: 50, lon: 8 })).toBe("Musterstadt");
		expect(candidateLabel({ name: "Musterstadt", lat: 50, lon: 8, ort: "Musterstadt", bez: "" })).toBe(
			"Musterstadt – Musterstadt"
		);
	});
});

describe("Zuordnungen", () => {
	it("schlüsselt Namen ohne Groß-/Kleinschreibung und Leerraum", () => {
		expect(choiceKey("  Musterstadt ")).toBe("musterstadt");
	});

	it("merkt eine Wahl und ersetzt eine frühere", () => {
		expect(withChoice({ musterstadt: "1", beispielhausen: "7" }, "Musterstadt", "2")).toEqual({
			musterstadt: "2",
			beispielhausen: "7"
		});
	});

	it("liest gespeicherte Zuordnungen und verwirft Ungültiges", () => {
		expect(parseChoiceMap({ musterstadt: "1" })).toEqual({ musterstadt: "1" });
		expect(parseChoiceMap({ Musterstadt: "1", kaputt: 3, "": "2", leer: "" })).toEqual({ musterstadt: "1" });
		expect(parseChoiceMap(null)).toBeNull();
		expect(parseChoiceMap(["1"])).toBeNull();
	});
});

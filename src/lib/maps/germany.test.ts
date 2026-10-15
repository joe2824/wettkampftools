import { describe, expect, it } from "vitest";
import { BAD_NAUHEIM } from "$lib/distance/dlrgPoi";
import { decodeRing, GERMAN_STATES, stateAt } from "./germany";

describe("decodeRing", () => {
	it("liest Tausendstel Grad mit Differenzen", () => {
		expect(decodeRing("8741 50367 10 -5 -20 0")).toEqual([
			{ lon: 8.741, lat: 50.367 },
			{ lon: 8.751, lat: 50.362 },
			{ lon: 8.731, lat: 50.362 }
		]);
	});
});

describe("GERMAN_STATES", () => {
	it("enthält alle 16 Bundesländer", () => {
		expect(GERMAN_STATES).toHaveLength(16);
		expect(new Set(GERMAN_STATES.map((state) => state.code)).size).toBe(16);
	});

	it("liegt innerhalb Deutschlands", () => {
		const points = GERMAN_STATES.flatMap((state) => state.rings.flat());
		const lons = points.map((point) => point.lon);
		const lats = points.map((point) => point.lat);
		expect(Math.min(...lons)).toBeCloseTo(5.87, 1);
		expect(Math.max(...lons)).toBeCloseTo(15.04, 1);
		expect(Math.min(...lats)).toBeCloseTo(47.27, 1);
		expect(Math.max(...lats)).toBeCloseTo(55.06, 1);
	});
});

describe("stateAt", () => {
	it("findet Hessen für Bad Nauheim", () => {
		expect(stateAt(BAD_NAUHEIM)?.name).toBe("Hessen");
	});

	it("findet die Stadtstaaten", () => {
		expect(stateAt({ lat: 53.55, lon: 9.99 })?.name).toBe("Hamburg");
		expect(stateAt({ lat: 53.08, lon: 8.8 })?.name).toBe("Bremen");
		expect(stateAt({ lat: 52.52, lon: 13.405 })?.name).toBe("Berlin");
	});

	it("findet Flächenländer um Stadtstaaten herum", () => {
		expect(stateAt({ lat: 52.4, lon: 13.06 })?.name).toBe("Brandenburg");
		expect(stateAt({ lat: 48.14, lon: 11.58 })?.name).toBe("Bayern");
	});

	it("liefert null außerhalb Deutschlands", () => {
		expect(stateAt({ lat: 48.21, lon: 16.37 })).toBeNull();
		expect(stateAt({ lat: 48.86, lon: 2.35 })).toBeNull();
	});
});

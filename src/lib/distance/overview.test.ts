import { describe, expect, it } from "vitest";
import type { DistanceRow } from "./matching";
import { distanceOverview } from "./overview";

const row = (name: string, km: number, lat: number, lon: number): DistanceRow => ({
	name,
	km,
	position: { lat, lon }
});

describe("distanceOverview", () => {
	it("zählt Gliederungen, findet die weiteste Anreise und den Durchschnitt", () => {
		const overview = distanceOverview([
			row("Musterstadt", 400, 53.55, 9.99),
			row("Beispielhausen", 100, 50.11, 8.68),
			row("Musterdorf", 300, 48.14, 11.58)
		]);
		expect(overview.count).toBe(3);
		expect(overview.farthest).toEqual({ name: "Musterstadt", km: 400 });
		expect(overview.averageKm).toBeCloseTo(266.67, 2);
	});

	it("listet die Bundesländer alphabetisch und ohne Doppelte", () => {
		const overview = distanceOverview([
			row("Musterstadt", 400, 53.55, 9.99),
			row("Beispielhausen", 100, 50.11, 8.68),
			row("Musterdorf", 30, 50.2, 8.6),
			row("Grenzhausen", 500, 48.21, 16.37)
		]);
		expect(overview.states).toEqual(["Hamburg", "Hessen"]);
	});

	it("bleibt ohne Gliederungen leer", () => {
		expect(distanceOverview([])).toEqual({ count: 0, farthest: null, averageKm: null, states: [] });
	});
});

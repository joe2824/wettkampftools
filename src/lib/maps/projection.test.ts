import { describe, expect, it } from "vitest";
import { BAD_NAUHEIM } from "$lib/distance/dlrgPoi";
import { GERMAN_STATES } from "./germany";
import { fitMap, MAP_BOUNDS, project } from "./projection";

const allPoints = GERMAN_STATES.flatMap((state) => state.rings.flat());

describe("project", () => {
	it("staucht die Länge mit dem Kosinus der mittleren Breite und dreht die Breite nach unten", () => {
		const point = project(BAD_NAUHEIM);
		expect(point.x).toBeCloseTo(BAD_NAUHEIM.lon * Math.cos((51.2 * Math.PI) / 180), 6);
		expect(point.y).toBeCloseTo(-BAD_NAUHEIM.lat, 6);
		expect(project({ lat: 54, lon: 10 }).y).toBeLessThan(project({ lat: 48, lon: 10 }).y);
	});
});

describe("MAP_BOUNDS", () => {
	it("umschließt alle Bundesländer und ist hochkant", () => {
		for (const point of allPoints) {
			const { x, y } = project(point);
			expect(x).toBeGreaterThanOrEqual(MAP_BOUNDS.x);
			expect(x).toBeLessThanOrEqual(MAP_BOUNDS.x + MAP_BOUNDS.width);
			expect(y).toBeGreaterThanOrEqual(MAP_BOUNDS.y);
			expect(y).toBeLessThanOrEqual(MAP_BOUNDS.y + MAP_BOUNDS.height);
		}
		expect(MAP_BOUNDS.width / MAP_BOUNDS.height).toBeGreaterThan(0.7);
		expect(MAP_BOUNDS.width / MAP_BOUNDS.height).toBeLessThan(0.78);
	});
});

describe("fitMap", () => {
	const box = { x: 10, y: 20, width: 100, height: 100 };
	const fit = fitMap(box);

	it("legt die Karte vollständig und mittig in den Rahmen", () => {
		for (const point of allPoints) {
			const { x, y } = fit.toBox(point);
			expect(x).toBeGreaterThanOrEqual(box.x - 1e-9);
			expect(x).toBeLessThanOrEqual(box.x + box.width + 1e-9);
			expect(y).toBeGreaterThanOrEqual(box.y - 1e-9);
			expect(y).toBeLessThanOrEqual(box.y + box.height + 1e-9);
		}
		expect(fit.frame.height).toBeCloseTo(box.height, 9);
		expect(fit.frame.x + fit.frame.width / 2).toBeCloseTo(box.x + box.width / 2, 9);
	});

	it("behält das Seitenverhältnis", () => {
		expect(fit.frame.width / fit.frame.height).toBeCloseTo(MAP_BOUNDS.width / MAP_BOUNDS.height, 9);
		expect(fit.scale).toBeCloseTo(box.height / MAP_BOUNDS.height, 9);
	});

	it("passt auch in flache Rahmen", () => {
		const flat = fitMap({ x: 0, y: 0, width: 100, height: 20 });
		expect(flat.frame.height).toBeCloseTo(20, 9);
		expect(flat.frame.width).toBeLessThan(20);
	});
});

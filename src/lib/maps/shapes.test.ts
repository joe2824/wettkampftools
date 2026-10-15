import { describe, expect, it } from "vitest";
import { BAD_NAUHEIM } from "$lib/distance/dlrgPoi";
import { mapScene, ringsPath, starPoints, thinRing } from "./shapes";

const box = { x: 10, y: 10, width: 60, height: 80 };
const inside = (point: { x: number; y: number }) =>
	point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height;

describe("thinRing", () => {
	it("lässt zu dicht liegende Punkte weg", () => {
		const ring = [
			{ x: 0, y: 0 },
			{ x: 0.1, y: 0 },
			{ x: 1, y: 0 },
			{ x: 1, y: 1 },
			{ x: 0, y: 1 }
		];
		expect(thinRing(ring, 0.5)).toEqual([ring[0], ring[2], ring[3], ring[4]]);
	});

	it("behält kleine Ringe mit mindestens drei Punkten", () => {
		const tiny = [
			{ x: 0, y: 0 },
			{ x: 0.01, y: 0 },
			{ x: 0, y: 0.01 }
		];
		expect(thinRing(tiny, 1)).toEqual(tiny);
	});
});

describe("ringsPath", () => {
	it("schließt jeden Ring und rundet", () => {
		const path = ringsPath([
			[
				{ x: 1.234, y: 2 },
				{ x: 3, y: 4.5678 },
				{ x: 5, y: 6 }
			],
			[
				{ x: 0, y: 0 },
				{ x: 1, y: 0 },
				{ x: 1, y: 1 }
			]
		]);
		expect(path).toBe("M1.23 2L3 4.57L5 6ZM0 0L1 0L1 1Z");
	});
});

describe("starPoints", () => {
	it("liefert zehn Ecken abwechselnd außen und innen", () => {
		const points = starPoints({ x: 0, y: 0 }, 2);
		expect(points).toHaveLength(10);
		expect(Math.hypot(points[0].x, points[0].y)).toBeCloseTo(2, 9);
		expect(Math.hypot(points[1].x, points[1].y)).toBeLessThan(1.5);
		expect(points[0].y).toBeCloseTo(-2, 9);
	});
});

describe("mapScene", () => {
	const markers = [
		{ name: "Musterstadt", position: { lat: 53.55, lon: 9.99 } },
		{ name: "Beispielhausen", position: { lat: 48.14, lon: 11.58 } }
	];
	const scene = mapScene(box, markers, { minStep: 0.3, homeRadius: 2 });

	it("zeichnet alle Bundesländer im Rahmen", () => {
		expect(scene.states).toHaveLength(16);
		for (const state of scene.states) for (const ring of state.rings) expect(ring.every(inside)).toBe(true);
	});

	it("setzt einen Punkt je Gliederung und Bad Nauheim als Stern", () => {
		expect(scene.markers.map((marker) => marker.name)).toEqual(["Musterstadt", "Beispielhausen"]);
		expect(scene.markers.every(inside)).toBe(true);
		expect(scene.markers[0].y).toBeLessThan(scene.markers[1].y);
		expect(scene.home.center).toEqual(scene.fit.toBox(BAD_NAUHEIM));
		expect(scene.home.points).toHaveLength(10);
	});

	it("vereinfacht kleine Karten stärker", () => {
		const count = (minStep: number) =>
			mapScene(box, [], { minStep, homeRadius: 2 }).states.reduce(
				(sum, state) => sum + state.rings.reduce((ringSum, ring) => ringSum + ring.length, 0),
				0
			);
		expect(count(1)).toBeLessThan(count(0));
	});
});

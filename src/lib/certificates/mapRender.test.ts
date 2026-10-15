import { describe, expect, it } from "vitest";
import type { MapObject } from "./layout";
import { mapOps } from "./mapRender";
import type { CircleOp, DrawOp, PathOp } from "./render";

const object: MapObject = {
	id: "map",
	kind: "map",
	label: "Deutschlandkarte",
	xMm: 150,
	yMm: 40,
	widthMm: 45,
	heightMm: 55,
	highlightOwn: false
};

const markers = [
	{ name: "Musterstadt", position: { lat: 53.55, lon: 9.99 } },
	{ name: "Beispielhausen", position: { lat: 48.14, lon: 11.58 } },
	{ name: "Musterdorf", position: { lat: 50.11, lon: 8.68 } }
];

const circles = (ops: DrawOp[]) => ops.filter((op): op is CircleOp => op.kind === "circle");
const paths = (ops: DrawOp[]) => ops.filter((op): op is PathOp => op.kind === "path");

function insideBox(x: number, y: number): boolean {
	const epsilon = 1e-9;
	return (
		x >= object.xMm - epsilon &&
		x <= object.xMm + object.widthMm + epsilon &&
		y >= object.yMm - epsilon &&
		y <= object.yMm + object.heightMm + epsilon
	);
}

describe("mapOps", () => {
	it("zeichnet 16 Bundesländer, einen Punkt je Gliederung und den Stern für Bad Nauheim", () => {
		const ops = mapOps(object, { markers }, "Musterstadt");
		expect(paths(ops)).toHaveLength(17);
		expect(circles(ops)).toHaveLength(3);
		expect(ops.at(-1)?.kind).toBe("path");
	});

	it("bleibt vollständig im Rahmen des Objekts", () => {
		const ops = mapOps(object, { markers }, "");
		for (const op of paths(ops))
			for (const ring of op.rings) for (const p of ring) expect(insideBox(p.x, p.y)).toBe(true);
		for (const op of circles(ops)) {
			expect(insideBox(op.cxMm - op.rMm, op.cyMm - op.rMm)).toBe(true);
			expect(insideBox(op.cxMm + op.rMm, op.cyMm + op.rMm)).toBe(true);
		}
	});

	it("zeichnet ohne Standortdaten nur die Karte", () => {
		const ops = mapOps(object, undefined, "Musterstadt");
		expect(circles(ops)).toHaveLength(0);
		expect(paths(ops)).toHaveLength(17);
	});

	it("hebt die eigene Gliederung nur auf Wunsch hervor und zeichnet sie zuletzt", () => {
		const plain = circles(mapOps(object, { markers }, "Musterstadt"));
		expect(new Set(plain.map((op) => op.rMm)).size).toBe(1);
		const highlighted = circles(mapOps({ ...object, highlightOwn: true }, { markers }, " musterstadt "));
		const own = highlighted.at(-1)!;
		expect(own.rMm).toBeGreaterThan(highlighted[0].rMm);
		expect(own.fillGray).toBeLessThan(highlighted[0].fillGray);
	});

	it("bleibt bei kleinen Karten schlank", () => {
		const small = paths(mapOps({ ...object, widthMm: 20, heightMm: 25 }, undefined, ""));
		const large = paths(mapOps({ ...object, widthMm: 150, heightMm: 200 }, undefined, ""));
		const points = (ops: PathOp[]) => ops.reduce((sum, op) => sum + op.rings.flat().length, 0);
		expect(points(small)).toBeLessThan(points(large));
	});
});

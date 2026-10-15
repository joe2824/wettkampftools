import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createMetrics, loadFontBytes } from "$lib/certificates/fonts";
import type { DrawOp } from "$lib/certificates/render";
import type { DistanceRow } from "./matching";
import { distanceMapPages, MAP_PAGE_SIZE } from "./mapPdf";

const metrics = createMetrics(await loadFontBytes(async (path) => new Uint8Array(await readFile(`static${path}`))));

const rows: DistanceRow[] = [
	{ name: "Musterstadt", km: 412.5, position: { lat: 53.55, lon: 9.99 } },
	{ name: "Beispielhausen", km: 302, position: { lat: 48.14, lon: 11.58 } },
	{ name: "Musterdorf", km: 28.8, position: { lat: 50.11, lon: 8.68 } }
];

const texts = (ops: DrawOp[]) => ops.flatMap((op) => (op.kind === "text" ? [op.text] : []));

describe("distanceMapPages", () => {
	it("setzt Karte, Übersicht und Tabelle auf eine Seite im Querformat", () => {
		expect(MAP_PAGE_SIZE).toEqual({ widthMm: 297, heightMm: 210 });
		const [page, ...rest] = distanceMapPages(rows, metrics);
		expect(rest).toEqual([]);
		expect(page.filter((op) => op.kind === "circle")).toHaveLength(3);
		expect(page.filter((op) => op.kind === "path")).toHaveLength(17);
		const text = texts(page).join(" ");
		expect(text).toContain("Anreise nach Bad Nauheim");
		expect(text).toContain("Musterstadt (412,50 km)");
		expect(text).toContain("Hamburg");
		expect(text).toContain("Beispielhausen");
	});

	it("bleibt innerhalb der Seite", () => {
		for (const op of distanceMapPages(rows, metrics)[0]) {
			if (op.kind === "path") {
				for (const point of op.rings.flat()) {
					expect(point.x).toBeGreaterThan(0);
					expect(point.x).toBeLessThan(MAP_PAGE_SIZE.widthMm);
					expect(point.y).toBeLessThan(MAP_PAGE_SIZE.heightMm);
				}
			}
			if (op.kind === "text") expect(op.baselineMm).toBeLessThan(MAP_PAGE_SIZE.heightMm);
		}
	});

	it("bricht lange Tabellen auf Folgeseiten um", () => {
		const many = Array.from({ length: 80 }, (_, index) => ({ ...rows[0], name: `Musterstadt ${index}` }));
		const pages = distanceMapPages(many, metrics);
		expect(pages.length).toBeGreaterThan(1);
		expect(pages[1].some((op) => op.kind === "circle")).toBe(false);
	});
});

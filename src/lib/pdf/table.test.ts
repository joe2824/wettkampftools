import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createMetrics, loadFontBytes } from "$lib/certificates/fonts";
import { ptToMm } from "$lib/certificates/layout";
import type { DrawOp, TextOp } from "$lib/certificates/render";
import { CELL_PADDING_MM, DEFAULT_ROW_GAP_FACTOR, ELLIPSIS, layoutTable, type TableOptions } from "./table";

const metrics = createMetrics(await loadFontBytes(async (path) => new Uint8Array(await readFile(`static${path}`))));
const SIZE_PT = 10;
const ROW_HEIGHT_MM = ptToMm(SIZE_PT) * DEFAULT_ROW_GAP_FACTOR;
const HEADERS = ["Platz", "Gliederung", "Punkte"];

function options(rows: string[][], overrides: Partial<TableOptions> = {}): TableOptions {
	return {
		columns: [
			{ header: "Platz", widthMm: 15, align: "right" },
			{ header: "Gliederung", widthMm: 60, align: "left" },
			{ header: "Punkte", widthMm: 25, align: "right" }
		],
		rows,
		xMm: 20,
		topMm: 20,
		bottomMm: 280,
		sizePt: SIZE_PT,
		headerWeight: "bold",
		bodyWeight: "regular",
		metrics,
		...overrides
	};
}

const rowsOf = (count: number) =>
	Array.from({ length: count }, (_, index) => [String(index + 1), `Musterstadt ${index + 1}`, String(100 - index)]);
const texts = (ops: DrawOp[]) => ops.filter((op): op is TextOp => op.kind === "text");
const rightEdge = (op: TextOp) => op.xMm + metrics.widthMm(op.text, op.font, op.sizePt);

describe("layoutTable – Seitenumbruch", () => {
	it("verteilt lange Tabellen auf Seiten und wiederholt die Kopfzeile", () => {
		const rows = rowsOf(100);
		const { pages } = layoutTable(options(rows));
		expect(pages.length).toBeGreaterThan(1);
		for (const page of pages) {
			const pageTexts = texts(page);
			expect(pageTexts.slice(0, 3).map((op) => op.text)).toEqual(HEADERS);
			expect(pageTexts.slice(0, 3).every((op) => op.font === "bold")).toBe(true);
			expect(page.filter((op) => op.kind === "line")).toHaveLength(1);
			expect(pageTexts.every((op) => op.baselineMm <= 280)).toBe(true);
		}
		const body = pages.flatMap((page) => texts(page).slice(3).map((op) => op.text));
		expect(body).toEqual(rows.flat());
	});

	it("beginnt auf der ersten Seite tiefer, wenn angegeben", () => {
		const plain = layoutTable(options(rowsOf(100)));
		const lowered = layoutTable(options(rowsOf(100), { firstPageTopMm: 150 }));
		expect(texts(lowered.pages[0])[0].baselineMm).toBeCloseTo(texts(plain.pages[0])[0].baselineMm + 130, 6);
		expect(texts(lowered.pages[0]).length).toBeLessThan(texts(plain.pages[0]).length);
		expect(texts(lowered.pages[1])[0].baselineMm).toBeCloseTo(texts(plain.pages[0])[0].baselineMm, 6);
	});

	it("lässt die erste Seite leer, wenn dort keine Zeile mehr passt", () => {
		const { pages } = layoutTable(options(rowsOf(2), { firstPageTopMm: 278 }));
		expect(pages).toHaveLength(2);
		expect(pages[0]).toEqual([]);
		expect(texts(pages[1]).map((op) => op.text)).toEqual([...HEADERS, ...rowsOf(2).flat()]);
	});
});

describe("layoutTable – Zellen", () => {
	it("kürzt zu lange Texte mit Auslassungszeichen", () => {
		const long = "Ortsgruppe Beispielhausen-Musterstadt mit sehr langem Namen";
		const { pages } = layoutTable(options([["1", long, "99"]]));
		const cell = texts(pages[0]).find((op) => op.text.startsWith("Ortsgruppe"))!;
		expect(cell.text.endsWith(ELLIPSIS)).toBe(true);
		expect(cell.text.length).toBeLessThan(long.length);
		expect(metrics.widthMm(cell.text, "regular", SIZE_PT)).toBeLessThanOrEqual(60 - 2 * CELL_PADDING_MM);
	});

	it("lässt passende Texte unverändert und richtet rechts aus", () => {
		const { pages } = layoutTable(options([["1", "Musterstadt", "99"]]));
		const [place, name, points] = texts(pages[0]).slice(3);
		expect(name.text).toBe("Musterstadt");
		expect(name.xMm).toBeCloseTo(20 + 15 + CELL_PADDING_MM, 9);
		expect(rightEdge(place)).toBeCloseTo(20 + 15 - CELL_PADDING_MM, 6);
		expect(rightEdge(points)).toBeCloseTo(20 + 100 - CELL_PADDING_MM, 6);
	});

	it("zieht die Linie unter der Kopfzeile über die ganze Breite", () => {
		const { pages } = layoutTable(options([]));
		const [rule] = pages[0].filter((op) => op.kind === "line");
		expect(rule).toMatchObject({ x1Mm: 20, x2Mm: 120 });
	});
});

describe("layoutTable – Ende", () => {
	it("meldet das Ende der Tabelle auf der letzten Seite", () => {
		const one = layoutTable(options(rowsOf(1)));
		const two = layoutTable(options(rowsOf(2)));
		expect(two.endMm - one.endMm).toBeCloseTo(ROW_HEIGHT_MM, 9);
		const lastBaseline = Math.max(...texts(two.pages[0]).map((op) => op.baselineMm));
		expect(two.endMm).toBeGreaterThan(lastBaseline);
	});

	it("berücksichtigt den Zeilenabstand", () => {
		const normal = layoutTable(options(rowsOf(2)));
		const wide = layoutTable(options(rowsOf(2), { rowGapFactor: DEFAULT_ROW_GAP_FACTOR * 2 }));
		expect(wide.endMm).toBeGreaterThan(normal.endMm);
	});

	it("liefert ohne Zeilen nur die Kopfzeile", () => {
		const { pages, endMm } = layoutTable(options([]));
		expect(pages).toHaveLength(1);
		expect(texts(pages[0]).map((op) => op.text)).toEqual(HEADERS);
		expect(endMm).toBeGreaterThan(20);
	});
});

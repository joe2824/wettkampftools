import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { calibrationPage } from "./calibration";
import { createMetrics, loadFontBytes } from "./fonts";
import { PAGE_WIDTH_MM } from "./layout";
import type { DrawOp, LineOp, TextOp } from "./render";

const metrics = createMetrics(await loadFontBytes(async (path) => new Uint8Array(await readFile(`static${path}`))));

const lines = (ops: DrawOp[]) => ops.filter((op): op is LineOp => op.kind === "line");
const texts = (ops: DrawOp[]) => ops.filter((op): op is TextOp => op.kind === "text");
const isVertical = (line: LineOp) => line.x1Mm === line.x2Mm;
const length = (line: LineOp) => Math.hypot(line.x2Mm - line.x1Mm, line.y2Mm - line.y1Mm);
const midpoint = (line: LineOp) => [(line.x1Mm + line.x2Mm) / 2, (line.y1Mm + line.y2Mm) / 2];

function crosshairCenters(ops: DrawOp[]): number[][] {
	return lines(ops)
		.filter((line) => length(line) === 10)
		.map(midpoint)
		.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

describe("calibrationPage", () => {
	const ops = calibrationPage({ x: 0, y: 0 }, metrics);

	it("setzt Kreuze 20 mm von jeder Ecke", () => {
		const unique = [...new Map(crosshairCenters(ops).map((c) => [c.join(","), c])).values()];
		expect(unique).toEqual([
			[20, 20],
			[190, 20],
			[20, 277],
			[190, 277]
		]);
		expect(crosshairCenters(ops)).toHaveLength(8);
	});

	it("zeichnet Millimeterlineale mit kurzen, mittleren und langen Strichen", () => {
		const topTicks = lines(ops).filter((line) => isVertical(line) && line.y1Mm === 10);
		const leftTicks = lines(ops).filter((line) => !isVertical(line) && line.x1Mm === 10);
		expect(topTicks).toHaveLength(171);
		expect(leftTicks).toHaveLength(258);
		const countByLength = (ticks: LineOp[], mm: number) => ticks.filter((t) => length(t) === mm).length;
		expect(countByLength(topTicks, 4)).toBe(18);
		expect(countByLength(topTicks, 2)).toBe(17);
		expect(countByLength(topTicks, 1)).toBe(171 - 35);
		expect(countByLength(leftTicks, 4)).toBe(26);
		expect(countByLength(leftTicks, 2)).toBe(26);
	});

	it("beschriftet jeden Zentimeter klein", () => {
		const labels = texts(ops).filter((op) => op.sizePt === 6);
		expect(labels).toHaveLength(18 + 26);
		expect(labels.every((op) => op.font === "regular")).toBe(true);
		expect(labels.map((op) => op.text)).toContain("190");
		expect(labels.map((op) => op.text)).toContain("270");
	});

	it("zeigt Titel und Anleitung mittig", () => {
		const title = texts(ops).find((op) => op.text === "Kalibrierungsseite");
		expect(title).toBeDefined();
		const width = metrics.widthMm(title!.text, title!.font, title!.sizePt);
		expect(title!.xMm + width / 2).toBeCloseTo(PAGE_WIDTH_MM / 2, 6);
		const all = texts(ops)
			.map((op) => op.text)
			.join(" ");
		expect(all).toContain("In tatsächlicher Größe drucken.");
		expect(all).toContain("Soll 20 mm.");
	});

	it("verschiebt alles um den Versatz", () => {
		const shifted = calibrationPage({ x: 2, y: -1.5 }, metrics);
		expect(crosshairCenters(shifted)[0]).toEqual([22, 18.5]);
		const base = texts(ops).find((op) => op.text === "Kalibrierungsseite")!;
		const moved = texts(shifted).find((op) => op.text === "Kalibrierungsseite")!;
		expect(moved.xMm).toBeCloseTo(base.xMm + 2, 9);
		expect(moved.baselineMm).toBeCloseTo(base.baselineMm - 1.5, 9);
		expect(
			texts(shifted)
				.map((op) => op.text)
				.join(" ")
		).toContain("waagerecht 2,0 mm, senkrecht -1,5 mm");
	});
});

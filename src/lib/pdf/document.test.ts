import { readFile } from "node:fs/promises";
import {
	PDFArray,
	PDFDict,
	PDFDocument,
	PDFName,
	PDFRawStream,
	PrintScaling,
	decodePDFRawStream,
	type PDFObject
} from "@cantoo/pdf-lib";
import { describe, expect, it } from "vitest";
import { loadFontBytes } from "$lib/certificates/fonts";
import type { DrawOp, ImageOp, TextOp } from "$lib/certificates/render";
import { jpegBytes, pngBytes } from "$lib/testing/images";
import { mmToPt, renderPdf } from "./document";

const fonts = await loadFontBytes(async (path) => new Uint8Array(await readFile(`static${path}`)));
const META = { title: "Urkunden Testwettkampf" };
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const PERFORMANCE_PAGES = 600;
const OPS_PER_PAGE = 15;
const PERFORMANCE_LIMIT_MS = 5000;

function textOp(overrides: Partial<TextOp> = {}): TextOp {
	return { kind: "text", text: "Anna Meier", font: "regular", sizePt: 12, xMm: 20, baselineMm: 50, ...overrides };
}

function imageOp(overrides: Partial<ImageOp> = {}): ImageOp {
	return { kind: "image", slot: "signature1", xMm: 30, topMm: 200, widthMm: 40, heightMm: 20, ...overrides };
}

function objectsOf(pdf: PDFDocument): PDFObject[] {
	return pdf.context.enumerateIndirectObjects().map(([, object]) => object);
}

function dictOf(object: PDFObject): PDFDict | undefined {
	if (object instanceof PDFDict) return object;
	if (object instanceof PDFRawStream) return object.dict;
	return undefined;
}

function countByName(pdf: PDFDocument, key: string, value: string): number {
	return objectsOf(pdf).filter((object) => dictOf(object)?.get(PDFName.of(key)) === PDFName.of(value)).length;
}

function pageContent(pdf: PDFDocument): string {
	const contents = pdf.getPage(0).node.Contents();
	const streams = contents instanceof PDFArray ? contents.asArray().map((ref) => pdf.context.lookup(ref)) : [contents];
	return streams
		.map((stream) => new TextDecoder().decode(decodePDFRawStream(stream as PDFRawStream).decode()))
		.join("\n");
}

/** Zahlen der ersten Zeile, die mit dem Operator endet */
function numbersBefore(content: string, operator: string): number[] {
	const line = content.split("\n").find((candidate) => candidate.endsWith(` ${operator}`));
	return (line ?? "").split(" ").slice(0, -1).map(Number);
}

const load = (bytes: Uint8Array) => PDFDocument.load(bytes, { updateMetadata: false });
const images = { signature1: pngBytes(), signature2: jpegBytes() };

describe("renderPdf – Dokument", () => {
	it("erzeugt eine A4-Seite pro Seitenliste", async () => {
		const pdf = await load(await renderPdf([[textOp()], [textOp()], []], { fonts, images: {} }, META));
		expect(pdf.getPageCount()).toBe(3);
		for (const page of pdf.getPages()) {
			const box = page.getMediaBox();
			expect(Math.abs(box.width - A4_WIDTH_PT)).toBeLessThan(0.01);
			expect(Math.abs(box.height - A4_HEIGHT_PT)).toBeLessThan(0.01);
		}
	});

	it("schaltet die Druckskalierung ab und setzt die Metadaten", async () => {
		const pdf = await load(await renderPdf([[textOp()]], { fonts, images: {} }, META));
		expect(pdf.catalog.getViewerPreferences()?.getPrintScaling()).toBe(PrintScaling.None);
		expect(pdf.getTitle()).toBe(META.title);
		expect(pdf.getCreator()).toBe("Wettkampftools");
		expect(pdf.getLanguage()).toBe("de-DE");
	});

	it("bettet jeden benutzten Schnitt genau einmal ein", async () => {
		const page: DrawOp[] = [textOp(), textOp({ font: "bold" }), textOp({ text: "Max Mustermann" })];
		const pdf = await load(await renderPdf([page, page, page], { fonts, images: {} }, META));
		expect(countByName(pdf, "Subtype", "Type0")).toBe(2);
		expect(countByName(pdf, "Type", "FontDescriptor")).toBe(2);
	});
});

describe("renderPdf – Koordinaten", () => {
	it("rechnet y von der Oberkante in PDF-Punkte um", async () => {
		const line: DrawOp = { kind: "line", x1Mm: 10, y1Mm: 20, x2Mm: 110, y2Mm: 20, thicknessMm: 0.5 };
		const pdf = await load(await renderPdf([[line, imageOp()]], { fonts, images }, META));
		const content = pageContent(pdf);
		const [moveX, moveY] = numbersBefore(content, "m");
		expect(moveX).toBeCloseTo(mmToPt(10), 6);
		expect(moveY).toBeCloseTo(A4_HEIGHT_PT - mmToPt(20), 1);
		const [, , , , imageX, imageY] = numbersBefore(content, "cm");
		expect(imageX).toBeCloseTo(mmToPt(30), 6);
		expect(imageY).toBeCloseTo(A4_HEIGHT_PT - mmToPt(220), 1);
	});

	it("rechnet Millimeter in Punkte um", () => {
		expect(mmToPt(25.4)).toBeCloseTo(72, 9);
	});
});

describe("renderPdf – Bilder", () => {
	it("bettet jedes Bild nur einmal ein, auch über mehrere Seiten", async () => {
		const page: DrawOp[] = [imageOp(), imageOp({ slot: "signature2", xMm: 120 })];
		const pdf = await load(await renderPdf([page, page, page], { fonts, images }, META));
		expect(countByName(pdf, "Subtype", "Image")).toBe(2);
	});

	it("überspringt Bilder ohne Daten", async () => {
		const page: DrawOp[] = [imageOp(), imageOp({ slot: "signature2" })];
		const pdf = await load(await renderPdf([page], { fonts, images: { signature1: pngBytes() } }, META));
		expect(countByName(pdf, "Subtype", "Image")).toBe(1);
	});

	it("meldet nicht unterstützte Bildformate verständlich", async () => {
		const gif = new TextEncoder().encode("GIF89a");
		await expect(renderPdf([[imageOp()]], { fonts, images: { signature1: gif } }, META)).rejects.toThrow(
			/PNG oder JPEG/
		);
	});
});

describe("renderPdf – Geschwindigkeit", () => {
	it(`setzt ${PERFORMANCE_PAGES} Seiten in unter fünf Sekunden`, async () => {
		const page: DrawOp[] = Array.from({ length: OPS_PER_PAGE }, (_, index) =>
			textOp({ text: `Max Mustermann ${index}`, baselineMm: 20 + index * 10, font: index % 2 ? "bold" : "regular" })
		);
		const pages = Array.from({ length: PERFORMANCE_PAGES }, () => page);
		const start = performance.now();
		const bytes = await renderPdf(pages, { fonts, images }, META);
		expect(performance.now() - start).toBeLessThan(PERFORMANCE_LIMIT_MS);
		expect((await load(bytes)).getPageCount()).toBe(PERFORMANCE_PAGES);
	});
});

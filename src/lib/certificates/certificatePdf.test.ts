import { readFile } from "node:fs/promises";
import { PDFDocument } from "@cantoo/pdf-lib";
import { describe, expect, it } from "vitest";
import { pngBytes } from "$lib/testing/images";
import {
	buildCalibrationPdf,
	buildCertificatesPdf,
	certificatePageOps,
	type CertificatePdfInput
} from "./certificatePdf";
import { createMetrics, loadFontBytes } from "./fonts";
import { defaultLayouts } from "./layoutDefaults";
import { setMapEnabled } from "./mapObject";
import type { CertificatePage } from "./model";
import type { DrawOp } from "./render";

const fonts = await loadFontBytes(async (path) => new Uint8Array(await readFile(`static${path}`)));
const metrics = createMetrics(fonts);

function page(name: string, copyIndex = 0, mitglied = ""): CertificatePage {
	return {
		entryId: `row-${name}`,
		copyIndex,
		values: { name, gliederung: name, mitglied, platz: "1", altersklasse: "AK 12", wertung: "Rettungswertung" }
	};
}

function input(overrides: Partial<CertificatePdfInput> = {}): CertificatePdfInput {
	return {
		pages: [page("Musterstadt"), page("Beispielhausen")],
		layout: defaultLayouts().team,
		withMemberNames: false,
		offsetMm: { x: 0, y: 0 },
		fonts,
		images: {},
		...overrides
	};
}

const texts = (ops: DrawOp[]): string[] => ops.flatMap((op) => (op.kind === "text" ? [op.text] : []));
const imageSlots = (ops: DrawOp[]): string[] => ops.flatMap((op) => (op.kind === "image" ? [op.slot] : []));

describe("certificatePageOps", () => {
	it("zeichnet die Karte mit den teilnehmenden Gliederungen und hebt die eigene hervor", () => {
		const layout = setMapEnabled(defaultLayouts().team, true);
		const highlighted = {
			...layout,
			objects: layout.objects.map((o) => (o.kind === "map" ? { ...o, highlightOwn: true } : o))
		};
		const markers = [
			{ name: "Musterstadt", position: { lat: 53.55, lon: 9.99 } },
			{ name: "Beispielhausen", position: { lat: 48.14, lon: 11.58 } }
		];
		const pages = certificatePageOps(input({ layout: highlighted, map: { markers } }), metrics);
		const radii = (ops: DrawOp[]) => ops.flatMap((op) => (op.kind === "circle" ? [op.rMm] : []));
		expect(radii(pages[0])).toHaveLength(2);
		expect(radii(pages[0])[1]).toBeGreaterThan(radii(pages[0])[0]);
		expect(pages[0].filter((op) => op.kind === "image")).toEqual([]);
	});

	it("liefert je Urkunde eine Seite mit deren Werten", () => {
		const pages = certificatePageOps(input(), metrics);
		expect(pages).toHaveLength(2);
		expect(texts(pages[0]).join(" ")).toContain("Musterstadt");
		expect(texts(pages[1]).join(" ")).toContain("Beispielhausen");
	});

	it("zeichnet nur Unterschriften, für die ein Bild vorliegt", () => {
		const [ops] = certificatePageOps(input({ images: { signature2: pngBytes() } }), metrics);
		expect(imageSlots(ops)).toEqual(["signature2"]);
	});

	it("verschiebt alles um den Druckversatz", () => {
		const [plain] = certificatePageOps(input(), metrics);
		const [shifted] = certificatePageOps(input({ offsetMm: { x: 2, y: -1.5 } }), metrics);
		const first = plain.find((op) => op.kind === "text");
		const moved = shifted.find((op) => op.kind === "text");
		expect(moved?.kind === "text" && first?.kind === "text" && moved.xMm - first.xMm).toBeCloseTo(2);
		expect(moved?.kind === "text" && first?.kind === "text" && moved.baselineMm - first.baselineMm).toBeCloseTo(-1.5);
	});

	it("druckt Mitgliedernamen nur mit eingeschaltetem Schalter", () => {
		const pages = [page("Musterstadt", 0, "Anna Meier")];
		const [without] = certificatePageOps(input({ pages }), metrics);
		const [withNames] = certificatePageOps(input({ pages, withMemberNames: true }), metrics);
		expect(texts(without).join(" ")).not.toContain("Anna Meier");
		expect(texts(withNames).join(" ")).toContain("Anna Meier");
	});
});

describe("buildCertificatesPdf", () => {
	it("erzeugt ein PDF mit einer Seite je Urkunde und Titel „Urkunden“", async () => {
		const bytes = await buildCertificatesPdf(input({ images: { signature1: pngBytes() } }));
		const pdf = await PDFDocument.load(bytes);
		expect(pdf.getPageCount()).toBe(2);
		expect(pdf.getTitle()).toBe("Urkunden");
	});

	it("lehnt eine leere Auswahl ab", async () => {
		await expect(buildCertificatesPdf(input({ pages: [] }))).rejects.toThrow("Es sind keine Urkunden ausgewählt.");
	});
});

describe("buildCalibrationPdf", () => {
	it("erzeugt eine einzelne Kalibrierungsseite", async () => {
		const pdf = await PDFDocument.load(await buildCalibrationPdf({ x: 1, y: 0 }, fonts));
		expect(pdf.getPageCount()).toBe(1);
		expect(pdf.getTitle()).toBe("Kalibrierungsseite");
	});
});

import { readFile } from "node:fs/promises";
import { PDFDocument } from "@cantoo/pdf-lib";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadFontBytes } from "$lib/certificates/fonts";
import type { DistanceRow } from "$lib/distance/matching";

const filesMock = vi.hoisted(() => ({ saveFile: vi.fn() }));
const assetsMock = vi.hoisted(() => ({ loadAppFonts: vi.fn() }));

vi.mock("$lib/platform/files", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/platform/files")>()),
	saveFile: filesMock.saveFile
}));
vi.mock("$lib/certificates/appFonts", () => assetsMock);

import { saveMapPdf, saveMapPng } from "./distanceMap";

const NOW = new Date(2026, 10, 14);
const fonts = await loadFontBytes(async (path) => new Uint8Array(await readFile(`static${path}`)));
const rows: DistanceRow[] = [{ name: "Musterstadt", km: 412.5, position: { lat: 53.55, lon: 9.99 } }];
const request = () => filesMock.saveFile.mock.calls[0][0];

beforeEach(() => {
	filesMock.saveFile.mockReset();
	filesMock.saveFile.mockResolvedValue("/tmp/Karte");
	assetsMock.loadAppFonts.mockReset();
	assetsMock.loadAppFonts.mockResolvedValue(fonts);
});

describe("saveMapPdf", () => {
	it("speichert die Karte als PDF im Querformat", async () => {
		expect(await saveMapPdf(rows, NOW)).toEqual({ status: "saved", path: "/tmp/Karte" });
		expect(request().defaultName).toBe("20261114_Anreise-Karte.pdf");
		expect(request().filters).toEqual([{ name: "PDF-Datei", extensions: ["pdf"] }]);
		const pdf = await PDFDocument.load(request().bytes);
		const box = pdf.getPage(0).getMediaBox();
		expect(box.width).toBeGreaterThan(box.height);
	});

	it("meldet Abbruch und Fehler", async () => {
		filesMock.saveFile.mockResolvedValueOnce(null);
		expect(await saveMapPdf(rows, NOW)).toEqual({ status: "cancelled" });
		assetsMock.loadAppFonts.mockRejectedValueOnce(new Error("fehlt"));
		expect((await saveMapPdf(rows, NOW)).status).toBe("failed");
	});
});

describe("saveMapPng", () => {
	it("rechnet das SVG in ein PNG um und speichert es", async () => {
		const png = new Uint8Array([0x89, 0x50]);
		const rasterize = vi.fn(async () => png);
		expect(await saveMapPng(rows, rasterize, NOW)).toEqual({ status: "saved", path: "/tmp/Karte" });
		expect(rasterize).toHaveBeenCalledWith(expect.stringContaining("<svg"), 1200, 1600);
		expect(request().defaultName).toBe("20261114_Anreise-Karte.png");
		expect(request().filters).toEqual([{ name: "PNG-Bild", extensions: ["png"] }]);
		expect(request().bytes).toBe(png);
	});

	it("meldet Fehler beim Umrechnen verständlich", async () => {
		const outcome = await saveMapPng(rows, async () => Promise.reject(new Error("canvas")), NOW);
		expect(outcome).toEqual({ status: "failed", message: "Die Karte konnte nicht gespeichert werden." });
		expect(filesMock.saveFile).not.toHaveBeenCalled();
	});
});

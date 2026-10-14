import { readFile } from "node:fs/promises";
import { PDFDocument } from "@cantoo/pdf-lib";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMetrics, loadFontBytes } from "$lib/certificates/fonts";
import { defaultLayouts } from "$lib/certificates/layoutDefaults";
import { IMAGE_FORMAT_ERROR } from "$lib/certificates/layoutStore.svelte";
import type { DrawOp, TextOp } from "$lib/certificates/render";
import { defaultSettings } from "$lib/settings/settings";

const filesMock = vi.hoisted(() => ({ saveFile: vi.fn() }));
const outputMock = vi.hoisted(() => ({ openOutputFile: vi.fn() }));
const assetsMock = vi.hoisted(() => ({ loadAppFonts: vi.fn() }));

vi.mock("$lib/platform/files", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/platform/files")>()),
	saveFile: filesMock.saveFile
}));
vi.mock("$lib/platform/output", () => outputMock);
vi.mock("$lib/platform/assets", () => assetsMock);

import {
	exportLayout,
	importLayout,
	layoutSnapshot,
	previewOps,
	printCalibration,
	sampleValues,
	saveLayoutEditor,
	storeBackground
} from "./layoutEditor";

const NOW = new Date(2026, 10, 14);
const fonts = await loadFontBytes(async (path) => new Uint8Array(await readFile(`static${path}`)));
const metrics = createMetrics(fonts);

beforeEach(() => {
	filesMock.saveFile.mockReset();
	outputMock.openOutputFile.mockReset();
	assetsMock.loadAppFonts.mockReset();
	assetsMock.loadAppFonts.mockResolvedValue(fonts);
	outputMock.openOutputFile.mockResolvedValue(undefined);
});

describe("sampleValues", () => {
	it("liefert Beispieldaten und die Veranstaltung aus den Einstellungen", () => {
		const event = { ...defaultSettings().event, number: "7", date: "2026-11-14" };
		expect(sampleValues("team", event)).toMatchObject({
			name: "Musterstadt 2",
			mitglied: "Anna Meier",
			gliederung: "Musterstadt",
			altersklasse: "AK 13/14",
			geschlecht: "weiblich",
			wettkampfpunkte: "1234,56",
			platz: "3",
			nr: "7",
			titel: "Wellenwettkampf",
			datum: "14. November 2026"
		});
	});

	it("füllt leere Veranstaltungsangaben mit Beispielen", () => {
		const values = sampleValues("team", defaultSettings().event);
		expect(values.nr).not.toBe("");
		expect(values.datum).not.toBe("");
		expect(values.unterzeichner1).not.toBe("");
		expect(values.unterzeichner2).not.toBe("");
	});

	it("zeigt im Einzelwettkampf eine Person als Namen", () => {
		expect(sampleValues("individual", defaultSettings().event)).toMatchObject({ name: "Anna Meier", mitglied: "" });
	});
});

describe("previewOps", () => {
	it("nutzt dieselbe Berechnung wie das PDF, ohne Druckversatz", () => {
		const layout = defaultLayouts().team;
		const values = sampleValues("team", defaultSettings().event);
		const options = { withMemberNames: false, availableSlots: new Set<"signature1">(["signature1"]) };
		const ops = previewOps(layout, values, options, metrics);
		const name = ops.find((op): op is TextOp => op.kind === "text" && op.text === "Musterstadt 2");
		expect(name?.baselineMm).toBe(layout.objects[0].yMm);
		expect(ops.filter((op) => op.kind === "image")).toHaveLength(1);
		const memberLine = (op: DrawOp) => op.kind === "text" && op.baselineMm === layout.objects[1].yMm;
		expect(ops.some(memberLine)).toBe(false);
		const withNames = previewOps(layout, values, { ...options, withMemberNames: true }, metrics);
		expect(withNames.find(memberLine)).toMatchObject({ text: "Anna Meier" });
	});
});

describe("exportLayout", () => {
	const store = { exportLayoutJson: () => new TextEncoder().encode("{}") };

	it("speichert die Layout-Datei mit Datum im Namen", async () => {
		filesMock.saveFile.mockResolvedValue("/tmp/layout.json");
		expect(await exportLayout(store, NOW)).toEqual({ status: "saved", path: "/tmp/layout.json" });
		const request = filesMock.saveFile.mock.calls[0][0];
		expect(request.defaultName).toBe("20261114_Urkunden-Layout.json");
		expect(request.filters).toEqual([{ name: "Layout-Datei", extensions: ["json"] }]);
		expect(new TextDecoder().decode(request.bytes)).toBe("{}");
	});

	it("meldet Abbruch und Schreibfehler", async () => {
		filesMock.saveFile.mockResolvedValue(null);
		expect(await exportLayout(store, NOW)).toEqual({ status: "cancelled" });
		filesMock.saveFile.mockRejectedValue("Kein Zugriff auf den Ordner.");
		expect(await exportLayout(store, NOW)).toEqual({ status: "failed", message: "Kein Zugriff auf den Ordner." });
	});
});

describe("importLayout", () => {
	it("gibt die Hinweise des Imports weiter", () => {
		const store = { importLayoutJson: vi.fn(() => ["Hinweis"]) };
		const bytes = new Uint8Array([1]);
		expect(importLayout(store, bytes)).toEqual(["Hinweis"]);
		expect(store.importLayoutJson).toHaveBeenCalledWith(bytes);
	});
});

describe("printCalibration", () => {
	it("speichert die Kalibrierungsseite mit dem eingestellten Versatz und öffnet sie", async () => {
		filesMock.saveFile.mockResolvedValue("/tmp/Kalibrierung.pdf");
		const outcome = await printCalibration({ x: -1.5, y: 0.5 }, NOW);
		expect(outcome).toEqual({ status: "saved", path: "/tmp/Kalibrierung.pdf", opened: true });
		const request = filesMock.saveFile.mock.calls[0][0];
		expect(request.defaultName).toBe("20261114_Kalibrierungsseite.pdf");
		expect((await PDFDocument.load(request.bytes)).getPageCount()).toBe(1);
		expect(outputMock.openOutputFile).toHaveBeenCalledWith("/tmp/Kalibrierung.pdf");
	});

	it("bleibt erfolgreich, wenn das Öffnen scheitert", async () => {
		filesMock.saveFile.mockResolvedValue("/tmp/Kalibrierung.pdf");
		outputMock.openOutputFile.mockRejectedValue("Kein PDF-Programm gefunden.");
		expect(await printCalibration({ x: 0, y: 0 }, NOW)).toMatchObject({ status: "saved", opened: false });
	});

	it("meldet Abbruch und fehlende Schriften", async () => {
		filesMock.saveFile.mockResolvedValue(null);
		expect(await printCalibration({ x: 0, y: 0 }, NOW)).toEqual({ status: "cancelled" });
		assetsMock.loadAppFonts.mockRejectedValue(new Error("Die Schriftdateien konnten nicht geladen werden."));
		expect(await printCalibration({ x: 0, y: 0 }, NOW)).toEqual({
			status: "failed",
			message: "Die Schriftdateien konnten nicht geladen werden."
		});
	});
});

describe("storeBackground", () => {
	it("speichert den Scan als Hintergrund", async () => {
		const store = { setImage: vi.fn(async () => undefined) };
		const bytes = new Uint8Array([1]);
		expect(await storeBackground(store, bytes)).toBeNull();
		expect(store.setImage).toHaveBeenCalledWith("background", bytes);
	});

	it("meldet ein falsches Bildformat und andere Fehler verständlich", async () => {
		const wrongFormat = { setImage: vi.fn(async () => Promise.reject(new Error(IMAGE_FORMAT_ERROR))) };
		expect(await storeBackground(wrongFormat, new Uint8Array())).toBe(IMAGE_FORMAT_ERROR);
		const broken = { setImage: vi.fn(async () => Promise.reject(new TypeError("x"))) };
		expect(await storeBackground(broken, new Uint8Array())).toBe(
			"Der Hintergrund-Scan konnte nicht gespeichert werden. Bitte erneut versuchen."
		);
	});
});

describe("saveLayoutEditor", () => {
	it("speichert das Layout und geänderte Einstellungen", async () => {
		const layouts = { save: vi.fn(async () => undefined) };
		const settings = { dirty: true, save: vi.fn(async () => undefined) };
		await saveLayoutEditor(layouts, settings);
		expect(layouts.save).toHaveBeenCalledOnce();
		expect(settings.save).toHaveBeenCalledOnce();
	});

	it("lässt unveränderte Einstellungen in Ruhe", async () => {
		const settings = { dirty: false, save: vi.fn(async () => undefined) };
		await saveLayoutEditor({ save: async () => undefined }, settings);
		expect(settings.save).not.toHaveBeenCalled();
	});
});

describe("layoutSnapshot", () => {
	it("erkennt Änderungen am Layout", () => {
		const layouts = defaultLayouts();
		const before = layoutSnapshot(layouts);
		expect(layoutSnapshot(defaultLayouts())).toBe(before);
		layouts.team.objects[0].xMm += 1;
		expect(layoutSnapshot(layouts)).not.toBe(before);
	});
});

import { readFile } from "node:fs/promises";
import { PDFDocument } from "@cantoo/pdf-lib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadFontBytes } from "$lib/certificates/fonts";
import { defaultLayouts } from "$lib/certificates/layoutDefaults";
import { setMapEnabled } from "$lib/certificates/mapObject";
import { eligibleEntries } from "$lib/certificates/model";
import { setWorkbookAdapter, type Sheet } from "$lib/platform/workbook";
import { defaultSettings, type Settings } from "$lib/settings/settings";
import { createFakeWorkbookAdapter } from "$lib/testing/fakeWorkbook";
import { pngBytes } from "$lib/testing/images";
import { buildAgeGroupOrder } from "$lib/wwk/ageGroups";
import type { ResultRow } from "$lib/wwk/results";

const filesMock = vi.hoisted(() => ({ saveFile: vi.fn() }));
const outputMock = vi.hoisted(() => ({ openOutputFile: vi.fn() }));
const assetsMock = vi.hoisted(() => ({ loadAppFonts: vi.fn() }));

vi.mock("$lib/platform/files", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/platform/files")>()),
	saveFile: filesMock.saveFile
}));
vi.mock("$lib/platform/output", () => outputMock);
vi.mock("$lib/certificates/appFonts", () => assetsMock);

import { createCertificatesPdf, saveSerialLetter, type CertificateJob } from "./certificates";

const NOW = new Date(2026, 10, 14);
const fonts = await loadFontBytes(async (path) => new Uint8Array(await readFile(`static${path}`)));

function row(sourceRow: number, place: number, name: string, overrides: Partial<ResultRow> = {}): ResultRow {
	return {
		sourceRow,
		place,
		name,
		organisation: name,
		ageGroupRaw: "AK 12",
		gender: "weiblich",
		competitionPoints: 1000 - place,
		members: ["Anna Meier", "Max Mustermann"],
		...overrides
	};
}

const ROWS = [
	row(1, 1, "Musterstadt"),
	row(2, 2, "Beispielhausen"),
	row(3, 1, "Musterdorf", { ageGroupRaw: "AkW 13/14" })
];

function job(overrides: Partial<CertificateJob> = {}, settings: Settings = defaultSettings()): CertificateJob {
	return {
		entries: eligibleEntries(ROWS, buildAgeGroupOrder(settings)),
		competition: "team",
		settings,
		layouts: defaultLayouts(),
		images: { signature1: pngBytes(), signature2: null },
		...overrides
	};
}

const savedBytes = (): Uint8Array => filesMock.saveFile.mock.calls[0][0].bytes;

beforeEach(() => {
	filesMock.saveFile.mockReset();
	outputMock.openOutputFile.mockReset();
	assetsMock.loadAppFonts.mockReset();
	assetsMock.loadAppFonts.mockResolvedValue(fonts);
	filesMock.saveFile.mockResolvedValue("/tmp/Urkunden.pdf");
	outputMock.openOutputFile.mockResolvedValue(undefined);
});

afterEach(() => {
	setWorkbookAdapter(null);
});

describe("createCertificatesPdf", () => {
	it("speichert ein PDF mit allen Ausfertigungen und öffnet es", async () => {
		const outcome = await createCertificatesPdf(job(), NOW);
		expect(outcome).toEqual({ status: "saved", path: "/tmp/Urkunden.pdf", pageCount: 15, opened: true });
		const request = filesMock.saveFile.mock.calls[0][0];
		expect(request.defaultName).toBe("20261114_Urkunden.pdf");
		expect(request.filters).toEqual([{ name: "PDF-Datei", extensions: ["pdf"] }]);
		expect((await PDFDocument.load(savedBytes())).getPageCount()).toBe(15);
		expect(outputMock.openOutputFile).toHaveBeenCalledWith("/tmp/Urkunden.pdf");
	});

	it("zeichnet die Punkte der Deutschlandkarte, wenn Standortdaten übergeben werden", async () => {
		const layouts = defaultLayouts();
		layouts.team = setMapEnabled(layouts.team, true);
		const markers = [{ name: "Musterstadt", position: { lat: 53.55, lon: 9.99 } }];
		await createCertificatesPdf(job({ layouts }), NOW);
		await createCertificatesPdf(job({ layouts, map: { markers } }), NOW);
		const [withoutDots, withDots] = filesMock.saveFile.mock.calls.map((call) => call[0].bytes.length);
		expect(withDots).toBeGreaterThan(withoutDots);
	});

	it("nimmt im Einzelwettkampf die Anzahl je Person", async () => {
		const outcome = await createCertificatesPdf(job({ competition: "individual" }), NOW);
		expect(outcome.status === "saved" && outcome.pageCount).toBe(3);
	});

	it("bricht ohne Speichern ab, wenn der Dialog abgebrochen wird", async () => {
		filesMock.saveFile.mockResolvedValue(null);
		expect(await createCertificatesPdf(job(), NOW)).toEqual({ status: "cancelled" });
		expect(outputMock.openOutputFile).not.toHaveBeenCalled();
	});

	it("bleibt erfolgreich, wenn das Öffnen scheitert", async () => {
		outputMock.openOutputFile.mockRejectedValue("Kein PDF-Programm gefunden.");
		const outcome = await createCertificatesPdf(job(), NOW);
		expect(outcome).toMatchObject({ status: "saved", opened: false });
	});

	it("meldet eine leere Auswahl, ohne zu speichern", async () => {
		const outcome = await createCertificatesPdf(job({ entries: [] }), NOW);
		expect(outcome).toEqual({ status: "failed", message: "Es sind keine Urkunden ausgewählt." });
		expect(filesMock.saveFile).not.toHaveBeenCalled();
	});

	it("meldet fehlende Schriften verständlich", async () => {
		assetsMock.loadAppFonts.mockRejectedValue(new Error("Die Schriftdateien konnten nicht geladen werden."));
		const outcome = await createCertificatesPdf(job(), NOW);
		expect(outcome).toEqual({ status: "failed", message: "Die Schriftdateien konnten nicht geladen werden." });
	});
});

describe("saveSerialLetter", () => {
	beforeEach(() => {
		setWorkbookAdapter(createFakeWorkbookAdapter());
		filesMock.saveFile.mockResolvedValue("/tmp/Seriendruck.xlsx");
	});

	it("speichert die Seriendruck-Tabelle der übergebenen Einträge", async () => {
		const settings = defaultSettings();
		const outcome = await saveSerialLetter(job({}, settings), NOW);
		expect(outcome).toEqual({ status: "saved", path: "/tmp/Seriendruck.xlsx" });
		const request = filesMock.saveFile.mock.calls[0][0];
		expect(request.defaultName).toBe("20261114_Seriendruck.xlsx");
		const [sheet] = JSON.parse(new TextDecoder().decode(request.bytes)) as Sheet[];
		expect(sheet.name).toBe("Seriendruck");
		expect(sheet.rows.slice(1).map((cells) => cells[1])).toEqual(["Beispielhausen", "Musterstadt", "Musterdorf"]);
		expect(outputMock.openOutputFile).not.toHaveBeenCalled();
	});

	it("bricht ohne Speichern ab", async () => {
		filesMock.saveFile.mockResolvedValue(null);
		expect(await saveSerialLetter(job(), NOW)).toEqual({ status: "cancelled" });
	});

	it("meldet Schreibfehler der Desktop-Hülle", async () => {
		filesMock.saveFile.mockRejectedValue("Die Datei ist in einem anderen Programm geöffnet.");
		expect(await saveSerialLetter(job(), NOW)).toEqual({
			status: "failed",
			message: "Die Datei ist in einem anderen Programm geöffnet."
		});
	});
});

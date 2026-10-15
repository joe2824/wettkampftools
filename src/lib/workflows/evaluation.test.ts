import { readFile } from "node:fs/promises";
import { PDFDocument } from "@cantoo/pdf-lib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadFontBytes } from "$lib/certificates/fonts";
import { setWorkbookAdapter, type Sheet } from "$lib/platform/workbook";
import type { SessionResults } from "$lib/session.svelte";
import { defaultSettings, type Settings } from "$lib/settings/settings";
import { createFakeWorkbookAdapter } from "$lib/testing/fakeWorkbook";
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

import {
	computeEvaluation,
	INDIVIDUAL_COMPETITION_MESSAGE,
	saveEvaluationExcel,
	saveNoticePdf,
	type Evaluation
} from "./evaluation";

const NOW = new Date(2026, 10, 14);
const fonts = await loadFontBytes(async (path) => new Uint8Array(await readFile(`static${path}`)));

function row(sourceRow: number, place: number | null, organisation: string, ageGroupRaw = "AK 12"): ResultRow {
	return {
		sourceRow,
		place,
		name: `${organisation} ${sourceRow}`,
		organisation,
		ageGroupRaw,
		gender: "weiblich",
		competitionPoints: null,
		members: ["Anna Meier", "Max Mustermann"]
	};
}

const DATA_SHEET: Sheet = {
	name: "Daten",
	rows: [
		["Platz", "Name"],
		[1, "x"],
		[2, "y"],
		[null, "z"],
		[1, "w"]
	]
};

const ROWS = [
	row(1, 1, "Musterstadt"),
	row(2, 2, "Beispielhausen"),
	row(3, null, "Beispielhausen"),
	row(4, 1, "Musterstadt", "AkW 13/14"),
	row(5, 1, "Musterdorf", "AK 99")
];

function results(overrides: Partial<SessionResults> = {}): SessionResults {
	return {
		fileName: "JAuswertung.xlsx",
		lastModified: NOW.getTime(),
		workbook: { sheets: [{ name: "Übersicht", rows: [] }, DATA_SHEET], properties: { created: null, modified: null } },
		kind: "team",
		rows: ROWS,
		yearWarning: null,
		creationUnknown: false,
		yearConfirmed: false,
		...overrides
	};
}

function ready(settings: Settings = defaultSettings()): Evaluation {
	const outcome = computeEvaluation(results(), settings);
	if (outcome.status !== "ready") throw new Error("Auswertung erwartet");
	return outcome.evaluation;
}

const savedRequest = () => filesMock.saveFile.mock.calls[0][0];

beforeEach(() => {
	filesMock.saveFile.mockReset();
	outputMock.openOutputFile.mockReset();
	assetsMock.loadAppFonts.mockReset();
	assetsMock.loadAppFonts.mockResolvedValue(fonts);
	outputMock.openOutputFile.mockResolvedValue(undefined);
	setWorkbookAdapter(createFakeWorkbookAdapter());
});

afterEach(() => {
	setWorkbookAdapter(null);
});

describe("computeEvaluation", () => {
	it("weist bei einem Einzelwettkampf auf die Urkunden hin", () => {
		const outcome = computeEvaluation(results({ kind: "individual" }), defaultSettings());
		expect(outcome).toEqual({ status: "individualOnly", message: INDIVIDUAL_COMPETITION_MESSAGE });
		expect(INDIVIDUAL_COMPETITION_MESSAGE).toContain("Urkunden");
	});

	it("wertet Rettung und Welle getrennt und sammelt nicht Gewertetes", () => {
		const evaluation = ready();
		expect(evaluation.rescue.standings.map((s) => [s.rank, s.organisation, s.trophyPoints])).toEqual([
			[1, "Musterstadt", 3],
			[2, "Beispielhausen", 1]
		]);
		expect(evaluation.rescue.tieForFirst).toBe(false);
		expect(evaluation.wave.standings.map((s) => [s.organisation, s.trophyPoints])).toEqual([["Musterstadt", 2]]);
		expect(evaluation.scored).toHaveLength(3);
		expect(evaluation.notScored.map((entry) => entry.reason).sort()).toEqual(["unknownAgeGroup", "unplaced"]);
	});

	it("zählt ohne Ausschluss auch Teams ohne Platz mit", () => {
		const evaluation = ready({ ...defaultSettings(), excludeUnplacedTeams: false });
		expect(evaluation.rescue.standings.map((s) => s.trophyPoints)).toEqual([4, 2]);
		expect(evaluation.notScored.map((entry) => entry.reason)).toEqual(["unknownAgeGroup"]);
	});

	it("nutzt die eingestellten Altersklassen", () => {
		const settings = { ...defaultSettings(), ageGroups: ["AK 10", "AK 99"] };
		const evaluation = ready(settings);
		expect(evaluation.rescue.standings.map((s) => s.organisation)).toContain("Musterdorf");
		expect(evaluation.notScored.some((entry) => entry.row.ageGroupRaw === "AK 12")).toBe(true);
	});

	it("markiert Gleichstand um Platz 1", () => {
		const rows = [row(1, 1, "Musterstadt"), row(2, 1, "Beispielhausen")];
		const outcome = computeEvaluation(results({ rows }), defaultSettings());
		expect(outcome.status === "ready" && outcome.evaluation.rescue.tieForFirst).toBe(true);
	});
});

describe("saveEvaluationExcel", () => {
	it("speichert alle Blätter mit Quelldaten aus dem Blatt „Daten“", async () => {
		filesMock.saveFile.mockResolvedValue("/tmp/WWK_Auswertung.xlsx");
		const outcome = await saveEvaluationExcel(results(), ready(), NOW);
		expect(outcome).toEqual({ status: "saved", path: "/tmp/WWK_Auswertung.xlsx" });
		expect(savedRequest().defaultName).toBe("20261114_WWK_Auswertung.xlsx");
		expect(savedRequest().filters).toEqual([{ name: "Excel-Datei", extensions: ["xlsx"] }]);
		const sheets: Sheet[] = JSON.parse(new TextDecoder().decode(savedRequest().bytes));
		expect(sheets.map((sheet) => sheet.name)).toEqual([
			"Rettungswettkampf",
			"Wellenwettkampf",
			"Aufschlüsselung",
			"Quelldaten"
		]);
		expect(sheets[3].rows[1]).toEqual([1, "x", 3]);
	});

	it("meldet Abbruch", async () => {
		filesMock.saveFile.mockResolvedValue(null);
		expect(await saveEvaluationExcel(results(), ready(), NOW)).toEqual({ status: "cancelled" });
	});

	it("meldet einen Fehler verständlich", async () => {
		setWorkbookAdapter({ read: vi.fn(), write: () => Promise.reject(new TypeError("kaputt")) });
		const outcome = await saveEvaluationExcel(results(), ready(), NOW);
		expect(outcome).toEqual({ status: "failed", message: "Die Auswertung konnte nicht gespeichert werden." });
	});

	it("meldet ein fehlendes Blatt „Daten“", async () => {
		const workbook = { sheets: [], properties: { created: null, modified: null } };
		const outcome = await saveEvaluationExcel(results({ workbook }), ready(), NOW);
		expect(outcome.status === "failed" && outcome.message).toContain("Daten");
		expect(filesMock.saveFile).not.toHaveBeenCalled();
	});
});

describe("saveNoticePdf", () => {
	it("speichert den Aushang und öffnet ihn", async () => {
		filesMock.saveFile.mockResolvedValue("/tmp/WWK_Gesamtwertung.pdf");
		const outcome = await saveNoticePdf(ready(), defaultSettings(), NOW);
		expect(outcome).toEqual({ status: "saved", path: "/tmp/WWK_Gesamtwertung.pdf", opened: true });
		expect(savedRequest().defaultName).toBe("20261114_WWK_Gesamtwertung.pdf");
		expect(savedRequest().filters).toEqual([{ name: "PDF-Datei", extensions: ["pdf"] }]);
		expect((await PDFDocument.load(savedRequest().bytes)).getPageCount()).toBeGreaterThan(0);
		expect(outputMock.openOutputFile).toHaveBeenCalledWith("/tmp/WWK_Gesamtwertung.pdf");
	});

	it("speichert die Aufschlüsselung als eigenes PDF", async () => {
		filesMock.saveFile.mockResolvedValue("/tmp/WWK_Aufschluesselung.pdf");
		const outcome = await saveNoticePdf(ready(), defaultSettings(), NOW, "breakdown");
		expect(outcome.status).toBe("saved");
		expect(savedRequest().defaultName).toBe("20261114_WWK_Aufschluesselung.pdf");
		const pdf = await PDFDocument.load(savedRequest().bytes);
		expect(pdf.getTitle()).toBe("Aufschlüsselung der Gesamtwertung");
	});

	it("bleibt gespeichert, wenn das Öffnen scheitert", async () => {
		filesMock.saveFile.mockResolvedValue("/tmp/WWK_Gesamtwertung.pdf");
		outputMock.openOutputFile.mockRejectedValue("kein Programm");
		const outcome = await saveNoticePdf(ready(), defaultSettings(), NOW);
		expect(outcome).toEqual({ status: "saved", path: "/tmp/WWK_Gesamtwertung.pdf", opened: false });
	});

	it("meldet Abbruch ohne zu öffnen", async () => {
		filesMock.saveFile.mockResolvedValue(null);
		expect(await saveNoticePdf(ready(), defaultSettings(), NOW)).toEqual({ status: "cancelled" });
		expect(outputMock.openOutputFile).not.toHaveBeenCalled();
	});

	it("meldet einen Fehler beim Erzeugen", async () => {
		assetsMock.loadAppFonts.mockRejectedValue(new RangeError("x"));
		const outcome = await saveNoticePdf(ready(), defaultSettings(), NOW);
		expect(outcome).toEqual({ status: "failed", message: "Der Aushang konnte nicht erzeugt werden." });
	});
});

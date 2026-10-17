import { beforeEach, describe, expect, it, vi } from "vitest";

const outputMock = vi.hoisted(() => ({ openOutputFile: vi.fn() }));
const logMock = vi.hoisted(() => ({ logError: vi.fn() }));
vi.mock("$lib/platform/output", () => outputMock);
vi.mock("$lib/log", () => logMock);

import { CSV_FILTER, EXCEL_FILTER, openAfterSave, PDF_FILTER } from "./savedFile";

beforeEach(() => {
	outputMock.openOutputFile.mockReset();
	logMock.logError.mockReset();
});

describe("openAfterSave", () => {
	it("meldet true, wenn die Datei geöffnet wurde", async () => {
		outputMock.openOutputFile.mockResolvedValue(undefined);
		expect(await openAfterSave("/tmp/a.pdf", "notice.openFailed")).toBe(true);
		expect(outputMock.openOutputFile).toHaveBeenCalledWith("/tmp/a.pdf");
		expect(logMock.logError).not.toHaveBeenCalled();
	});

	it("meldet false und protokolliert den Code, wenn das Öffnen scheitert", async () => {
		outputMock.openOutputFile.mockRejectedValue(new Error("kaputt"));
		expect(await openAfterSave("/tmp/a.pdf", "notice.openFailed")).toBe(false);
		expect(logMock.logError).toHaveBeenCalledWith("notice.openFailed");
	});
});

describe("Dateifilter", () => {
	it("beschreiben PDF und Excel", () => {
		expect(PDF_FILTER).toEqual({ name: "PDF-Datei", extensions: ["pdf"] });
		expect(EXCEL_FILTER).toEqual({ name: "Excel-Datei", extensions: ["xlsx"] });
		expect(CSV_FILTER).toEqual({ name: "CSV-Datei", extensions: ["csv"] });
	});
});

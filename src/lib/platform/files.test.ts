import { beforeEach, describe, expect, it, vi } from "vitest";

const dialogMock = vi.hoisted(() => ({ save: vi.fn() }));
const fsMock = vi.hoisted(() => ({ writeFile: vi.fn() }));

vi.mock("@tauri-apps/plugin-dialog", () => dialogMock);
vi.mock("@tauri-apps/plugin-fs", () => fsMock);

import { datedFileName, saveFile } from "./files";

describe("datedFileName", () => {
	it("stellt das Datum als JJJJMMTT voran", () => {
		expect(datedFileName("WWK_Meldungen.xlsx", new Date(2026, 10, 14))).toBe("20261114_WWK_Meldungen.xlsx");
	});

	it("füllt Monat und Tag mit Nullen auf", () => {
		expect(datedFileName("Urkunden.pdf", new Date(2026, 0, 5))).toBe("20260105_Urkunden.pdf");
	});
});

describe("saveFile", () => {
	const filters = [{ name: "Excel", extensions: ["xlsx"] }];
	const bytes = new Uint8Array([1, 2]);

	beforeEach(() => {
		dialogMock.save.mockReset();
		fsMock.writeFile.mockReset();
	});

	it("schreibt an den gewählten Ort", async () => {
		dialogMock.save.mockResolvedValue("/tmp/x.xlsx");
		expect(await saveFile({ defaultName: "x.xlsx", filters, bytes })).toBe("/tmp/x.xlsx");
		expect(dialogMock.save).toHaveBeenCalledWith({ defaultPath: "x.xlsx", filters });
		expect(fsMock.writeFile).toHaveBeenCalledWith("/tmp/x.xlsx", bytes);
	});

	it("schreibt nichts nach Abbruch", async () => {
		dialogMock.save.mockResolvedValue(null);
		expect(await saveFile({ defaultName: "x.xlsx", filters, bytes })).toBeNull();
		expect(fsMock.writeFile).not.toHaveBeenCalled();
	});
});

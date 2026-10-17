import { beforeEach, describe, expect, it, vi } from "vitest";

const coreMock = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@tauri-apps/api/core", () => coreMock);

import { datedFileName, saveFile, writePenaltyCatalogNextTo } from "./files";

describe("datedFileName", () => {
	it("stellt das Datum als JJJJMMTT voran", () => {
		expect(datedFileName("WWK_Meldungen.csv", new Date(2026, 10, 14))).toBe("20261114_WWK_Meldungen.csv");
	});

	it("füllt Monat und Tag mit Nullen auf", () => {
		expect(datedFileName("Urkunden.pdf", new Date(2026, 0, 5))).toBe("20260105_Urkunden.pdf");
	});
});

describe("saveFile", () => {
	const filters = [{ name: "Excel", extensions: ["xlsx"] }];
	const bytes = new Uint8Array([1, 2]);

	beforeEach(() => {
		coreMock.invoke.mockReset();
	});

	it("schreibt über die Desktop-Hülle an den gewählten Ort, Bytes roh und Pfad kodiert", async () => {
		const path = "C:\\Urkunden\\Müller & Co.xlsx";
		coreMock.invoke.mockResolvedValueOnce(path);
		expect(await saveFile({ defaultName: "x.xlsx", filters, bytes })).toBe(path);
		expect(coreMock.invoke).toHaveBeenCalledWith("pick_save_path", { defaultName: "x.xlsx", filters });
		expect(coreMock.invoke).toHaveBeenCalledWith("write_output_file", bytes, {
			headers: { "x-output-path": encodeURIComponent(path) }
		});
	});

	it("schreibt nichts nach Abbruch", async () => {
		coreMock.invoke.mockResolvedValueOnce(null);
		expect(await saveFile({ defaultName: "x.xlsx", filters, bytes })).toBeNull();
		expect(coreMock.invoke).toHaveBeenCalledTimes(1);
	});
});

describe("writePenaltyCatalogNextTo", () => {
	it("schreibt neben das gespeicherte Regelwerk und gibt den Pfad zurück", async () => {
		coreMock.invoke.mockReset();
		coreMock.invoke.mockResolvedValue("C:\\Regeln\\Regelwerk_2026m.def");
		const bytes = new Uint8Array([1]);
		expect(await writePenaltyCatalogNextTo("C:\\Regeln\\Regelwerk_2026.rwm", bytes)).toBe(
			"C:\\Regeln\\Regelwerk_2026m.def"
		);
		expect(coreMock.invoke).toHaveBeenCalledWith("write_penalty_catalog", bytes, {
			headers: { "x-output-path": encodeURIComponent("C:\\Regeln\\Regelwerk_2026.rwm") }
		});
	});
});

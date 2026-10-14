import { beforeEach, describe, expect, it, vi } from "vitest";

const inputMock = vi.hoisted(() => ({ pickInputFile: vi.fn(), readInputFile: vi.fn() }));
vi.mock("$lib/platform/inputFiles", () => inputMock);

import { chooseNativeFile, loadNativeFile } from "./nativeFile";

const OLE = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x01]);

beforeEach(() => {
	inputMock.pickInputFile.mockReset();
	inputMock.readInputFile.mockReset();
});

describe("loadNativeFile", () => {
	it("liest und prüft die Datei samt Zeiten", async () => {
		inputMock.readInputFile.mockResolvedValue({ name: "Ergebnisse.xls", bytes: OLE, createdMs: 1, modifiedMs: 2 });
		const result = await loadNativeFile("/tmp/Ergebnisse.xls", ["excel"]);
		expect(result).toEqual({
			ok: true,
			file: { name: "Ergebnisse.xls", bytes: OLE, createdMs: 1, lastModified: 2, kind: "excel" }
		});
	});

	it("gibt die Meldung der Desktop-Hülle weiter", async () => {
		inputMock.readInputFile.mockRejectedValue("Die Datei ist größer als 20 MB.");
		expect(await loadNativeFile("/tmp/gross.xls", ["excel"])).toEqual({
			ok: false,
			message: "Die Datei ist größer als 20 MB."
		});
	});

	it("meldet unerwartete Fehler allgemein", async () => {
		inputMock.readInputFile.mockRejectedValue(new TypeError("x"));
		expect(await loadNativeFile("/tmp/a.xls", ["excel"])).toEqual({
			ok: false,
			message: "Die Datei konnte nicht gelesen werden. Bitte erneut versuchen."
		});
	});
});

describe("chooseNativeFile", () => {
	it("öffnet den Dialog mit den passenden Endungen", async () => {
		inputMock.pickInputFile.mockResolvedValue("/tmp/export.csv");
		await expect(chooseNativeFile(["csv"])).resolves.toBe("/tmp/export.csv");
		expect(inputMock.pickInputFile).toHaveBeenCalledWith([{ name: "CSV-Datei", extensions: ["csv"] }]);
	});

	it("liefert null bei Abbruch oder Dialogfehler", async () => {
		inputMock.pickInputFile.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error("x"));
		await expect(chooseNativeFile(["csv"])).resolves.toBeNull();
		await expect(chooseNativeFile(["csv"])).resolves.toBeNull();
	});
});

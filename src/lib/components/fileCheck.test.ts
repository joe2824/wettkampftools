import { describe, expect, it } from "vitest";
import {
	acceptAttribute,
	checkFile,
	checkInputFile,
	DEFAULT_MAX_BYTES,
	dialogFilters,
	readCheckedFile,
	takeInputFile
} from "./fileCheck";

const ZIP = [0x50, 0x4b, 0x03, 0x04];
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a];
const JPEG = [0xff, 0xd8, 0xff, 0xe0];

const bytes = (...values: number[]): Uint8Array => new Uint8Array([...values, 0x01, 0x02]);
const text = (value: string): Uint8Array => new TextEncoder().encode(value);

describe("checkFile", () => {
	it("erkennt Excel-Dateien an Endung und Signatur", () => {
		expect(checkFile({ name: "Meldungen.xlsx", bytes: bytes(...ZIP) }, ["excel"])).toEqual({ ok: true, kind: "excel" });
		expect(checkFile({ name: "Makro.XLSM", bytes: bytes(...ZIP) }, ["excel"])).toEqual({ ok: true, kind: "excel" });
		expect(checkFile({ name: "Alt.xls", bytes: bytes(...OLE) }, ["excel"])).toEqual({ ok: true, kind: "excel" });
	});

	it("lehnt Excel-Endung mit falscher Signatur ab", () => {
		const result = checkFile({ name: "Alt.xls", bytes: bytes(...ZIP) }, ["excel"]);
		expect(result).toEqual({
			ok: false,
			message: "Der Inhalt passt nicht zur Dateiendung. Erwartet: Excel-Datei (.xlsx, .xlsm, .xls)."
		});
		expect(checkFile({ name: "Meldungen.xlsx", bytes: text("a;b;c") }, ["excel"]).ok).toBe(false);
	});

	it("lehnt falsche Endung mit Hinweis auf erwartete Arten ab", () => {
		expect(checkFile({ name: "Bild.png", bytes: bytes(...PNG) }, ["excel"])).toEqual({
			ok: false,
			message: "Diese Datei passt hier nicht. Erwartet: Excel-Datei (.xlsx, .xlsm, .xls)."
		});
		expect(checkFile({ name: "ohne-endung", bytes: text("x") }, ["csv", "json"])).toEqual({
			ok: false,
			message: "Diese Datei passt hier nicht. Erwartet: CSV-Datei (.csv) oder JSON-Datei (.json)."
		});
	});

	it("erkennt Bilder (PNG und JPEG)", () => {
		expect(checkFile({ name: "Scan.png", bytes: bytes(...PNG) }, ["image"])).toEqual({ ok: true, kind: "image" });
		expect(checkFile({ name: "Scan.jpg", bytes: bytes(...JPEG) }, ["image"])).toEqual({ ok: true, kind: "image" });
		expect(checkFile({ name: "Scan.jpeg", bytes: bytes(...JPEG) }, ["image"])).toEqual({ ok: true, kind: "image" });
		expect(checkFile({ name: "Scan.png", bytes: bytes(...JPEG) }, ["image"]).ok).toBe(false);
	});

	it("erkennt Wettkampfregelwerke (.rwm als ZIP)", () => {
		expect(checkFile({ name: "Regelwerk.rwm", bytes: bytes(...ZIP) }, ["rulebook"])).toEqual({
			ok: true,
			kind: "rulebook"
		});
		expect(checkFile({ name: "Regelwerk.rwm", bytes: text("<xml/>") }, ["rulebook"]).ok).toBe(false);
	});

	it("erkennt Projektdateien (.wwkprojekt als ZIP)", () => {
		expect(checkFile({ name: "39. Wellenwettkampf.wwkprojekt", bytes: bytes(...ZIP) }, ["project"])).toEqual({
			ok: true,
			kind: "project"
		});
		expect(checkFile({ name: "Projekt.wwkprojekt", bytes: text("{}") }, ["project"])).toEqual({
			ok: false,
			message: "Der Inhalt passt nicht zur Dateiendung. Erwartet: Wettkampf-Projekt (.wwkprojekt)."
		});
	});

	it("erkennt Strafenkataloge (.def) und Wettkampfdateien (.wk) als ZIP", () => {
		expect(checkFile({ name: "defaultm.def", bytes: bytes(...ZIP) }, ["penalties"])).toEqual({
			ok: true,
			kind: "penalties"
		});
		expect(checkFile({ name: "Wellenwettkampf.wk", bytes: bytes(...ZIP) }, ["competition"])).toEqual({
			ok: true,
			kind: "competition"
		});
		expect(checkFile({ name: "Wellenwettkampf.wk", bytes: text("<xml/>") }, ["competition"])).toEqual({
			ok: false,
			message: "Der Inhalt passt nicht zur Dateiendung. Erwartet: JAuswertung-Wettkampf (.wk)."
		});
		expect(checkFile({ name: "defaultm.def", bytes: text("x") }, ["penalties"]).ok).toBe(false);
	});

	it("nimmt CSV- und JSON-Text an", () => {
		expect(checkFile({ name: "export.csv", bytes: text("gliederung;ak\nMusterstadt;AK 12") }, ["csv"])).toEqual({
			ok: true,
			kind: "csv"
		});
		expect(checkFile({ name: "layout.json", bytes: text("{}") }, ["json"])).toEqual({ ok: true, kind: "json" });
	});

	it("lehnt CSV mit Binärinhalt (NUL-Bytes) ab", () => {
		const result = checkFile({ name: "export.csv", bytes: bytes(...ZIP, 0x00, 0x00) }, ["csv"]);
		expect(result).toEqual({
			ok: false,
			message: "Der Inhalt passt nicht zur Dateiendung. Erwartet: CSV-Datei (.csv)."
		});
	});

	it("prüft NUL-Bytes nur in den ersten 4 KB", () => {
		const content = new Uint8Array(5000).fill(0x41);
		content[4500] = 0x00;
		expect(checkFile({ name: "export.csv", bytes: content }, ["csv"]).ok).toBe(true);
	});

	it("lehnt leere Dateien ab", () => {
		expect(checkFile({ name: "export.csv", bytes: new Uint8Array() }, ["csv"])).toEqual({
			ok: false,
			message: "Die Datei ist leer."
		});
	});

	it("lehnt zu große Dateien ab", () => {
		const big = new Uint8Array(DEFAULT_MAX_BYTES + 1).fill(0x41);
		expect(checkFile({ name: "export.csv", bytes: big }, ["csv"])).toEqual({
			ok: false,
			message: "Die Datei ist größer als 20 MB."
		});
		expect(checkFile({ name: "export.csv", bytes: text("abc") }, ["csv"], 2)).toEqual({
			ok: false,
			message: "Die Datei ist größer als 0 MB."
		});
	});

	it("wählt bei mehreren erlaubten Arten die passende", () => {
		expect(checkFile({ name: "Datei.xlsx", bytes: bytes(...ZIP) }, ["csv", "excel"])).toEqual({
			ok: true,
			kind: "excel"
		});
	});
});

describe("acceptAttribute", () => {
	it("listet alle Endungen der erlaubten Arten", () => {
		expect(acceptAttribute(["excel", "csv"])).toBe(".xlsx,.xlsm,.xls,.csv");
	});
});

describe("takeInputFile", () => {
	it("liefert die gewählte Datei und leert das Feld", () => {
		const file = new File(["a"], "export.csv");
		const target = { files: [file], value: "C:\\fakepath\\export.csv" };
		expect(takeInputFile({ currentTarget: target } as unknown as Event)).toBe(file);
		expect(target.value).toBe("");
	});

	it("liefert ohne Auswahl nichts", () => {
		const target = { files: null, value: "" };
		expect(takeInputFile({ currentTarget: target } as unknown as Event)).toBeUndefined();
	});
});

describe("readCheckedFile", () => {
	it("liefert Bytes, Name, Änderungszeit und Art", async () => {
		const file = new File(["a;b"], "export.csv", { lastModified: 1234 });
		const result = await readCheckedFile(file, ["csv"]);
		expect(result).toEqual({
			ok: true,
			file: { name: "export.csv", bytes: text("a;b"), modifiedMs: 1234, createdMs: null, kind: "csv" }
		});
	});

	it("lehnt zu große Dateien ab, ohne sie zu lesen", async () => {
		const file = new File(["abcdef"], "export.csv");
		file.arrayBuffer = () => Promise.reject(new Error("nicht lesen"));
		expect(await readCheckedFile(file, ["csv"], 3)).toEqual({ ok: false, message: "Die Datei ist größer als 0 MB." });
	});

	it("meldet Lesefehler verständlich", async () => {
		const file = new File(["abc"], "export.csv");
		file.arrayBuffer = () => Promise.reject(new Error("kaputt"));
		expect(await readCheckedFile(file, ["csv"])).toEqual({
			ok: false,
			message: "Die Datei konnte nicht gelesen werden. Bitte erneut versuchen."
		});
	});
});

describe("dialogFilters", () => {
	it("bildet je Art einen Filter für den Öffnen-Dialog", () => {
		expect(dialogFilters(["excel", "csv"])).toEqual([
			{ name: "Excel-Datei", extensions: ["xlsx", "xlsm", "xls"] },
			{ name: "CSV-Datei", extensions: ["csv"] }
		]);
	});
});

describe("checkInputFile", () => {
	it("übernimmt Erstellungs- und Änderungszeit aus dem Dateisystem", () => {
		const input = { name: "Ergebnisse.xls", bytes: bytes(...OLE), createdMs: 1000, modifiedMs: 2000 };
		expect(checkInputFile(input, ["excel"], DEFAULT_MAX_BYTES)).toEqual({
			ok: true,
			file: { name: "Ergebnisse.xls", bytes: bytes(...OLE), modifiedMs: 2000, createdMs: 1000, kind: "excel" }
		});
	});

	it("lässt eine unbekannte Änderungszeit unbekannt", () => {
		const input = { name: "export.csv", bytes: text("a;b"), createdMs: null, modifiedMs: null };
		const result = checkInputFile(input, ["csv"], DEFAULT_MAX_BYTES);
		expect(result.ok && result.file).toMatchObject({ modifiedMs: null, createdMs: null });
	});

	it("meldet unpassende Dateien wie beim Ablegen", () => {
		const input = { name: "Bild.png", bytes: bytes(...PNG), createdMs: 1, modifiedMs: 1 };
		const result = checkInputFile(input, ["excel"], DEFAULT_MAX_BYTES);
		expect(result).toEqual({ ok: false, message: expect.stringContaining("Diese Datei passt hier nicht.") });
	});
});

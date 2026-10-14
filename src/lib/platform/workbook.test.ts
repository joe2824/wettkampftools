import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeWorkbookAdapter } from "$lib/testing/fakeWorkbook";

const coreMock = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@tauri-apps/api/core", () => coreMock);

import { readWorkbook, setWorkbookAdapter, writeWorkbook, type Sheet, type Workbook } from "./workbook";

const sheets: Sheet[] = [
	{
		name: "Daten",
		rows: [
			["Name", "Punkte", "Mitglied"],
			["Anna Meier", 1234.5, true],
			["Max Mustermann", null, false]
		]
	}
];

beforeEach(() => {
	coreMock.invoke.mockReset();
});

afterEach(() => {
	setWorkbookAdapter(null);
});

describe("Rust-Anbindung", () => {
	it("schickt die Dateibytes roh an read_workbook", async () => {
		const book: Workbook = {
			sheets,
			properties: { created: "2025-06-01T08:30:00Z", modified: null }
		};
		coreMock.invoke.mockResolvedValue(book);
		const bytes = new Uint8Array([1, 2, 3]);
		expect(await readWorkbook(bytes)).toEqual(book);
		expect(coreMock.invoke).toHaveBeenCalledWith("read_workbook", bytes);
	});

	it("liefert die geschriebene Datei als Uint8Array", async () => {
		coreMock.invoke.mockResolvedValue(new Uint8Array([80, 75]).buffer);
		const bytes = await writeWorkbook(sheets);
		expect(bytes).toBeInstanceOf(Uint8Array);
		expect([...bytes]).toEqual([80, 75]);
		expect(coreMock.invoke).toHaveBeenCalledWith("write_workbook", { sheets });
	});

	it("reicht Fehlermeldungen unverändert weiter", async () => {
		coreMock.invoke.mockRejectedValue("Die Datei konnte nicht als Excel-Tabelle gelesen werden.");
		await expect(readWorkbook(new Uint8Array())).rejects.toBe(
			"Die Datei konnte nicht als Excel-Tabelle gelesen werden."
		);
	});
});

describe("Austauschbare Anbindung", () => {
	it("nutzt die gesetzte Anbindung statt Rust", async () => {
		setWorkbookAdapter(createFakeWorkbookAdapter());
		const bytes = await writeWorkbook(sheets);
		const book = await readWorkbook(bytes);
		expect(book.sheets).toEqual(sheets);
		expect(coreMock.invoke).not.toHaveBeenCalled();
	});

	it("fällt nach dem Zurücksetzen auf Rust zurück", async () => {
		setWorkbookAdapter(createFakeWorkbookAdapter());
		setWorkbookAdapter(null);
		coreMock.invoke.mockResolvedValue(new ArrayBuffer(0));
		await writeWorkbook(sheets);
		expect(coreMock.invoke).toHaveBeenCalledOnce();
	});
});

describe("Arbeitsmappe im Speicher (Testhilfe)", () => {
	it("gibt vorgegebene Dokumenteigenschaften zurück", async () => {
		const properties = { created: "2024-05-01T10:00:00Z", modified: null };
		const fake = createFakeWorkbookAdapter({ properties });
		expect((await fake.read(await fake.write(sheets))).properties).toEqual(properties);
	});

	it("hat ohne Vorgabe keine Eigenschaften", async () => {
		const fake = createFakeWorkbookAdapter();
		expect((await fake.read(await fake.write([]))).properties).toEqual({
			created: null,
			modified: null
		});
	});

	it("lehnt fremde Bytes mit derselben Meldung wie Rust ab", async () => {
		const fake = createFakeWorkbookAdapter();
		await expect(fake.read(new TextEncoder().encode("kein Excel"))).rejects.toThrow(
			"Die Datei konnte nicht als Excel-Tabelle gelesen werden."
		);
	});

	it("liefert Kopien, damit Tests sich nicht gegenseitig beeinflussen", async () => {
		const fake = createFakeWorkbookAdapter();
		const book = await fake.read(await fake.write(sheets));
		book.sheets[0].rows[0][0] = "geändert";
		expect(sheets[0].rows[0][0]).toBe("Name");
	});
});

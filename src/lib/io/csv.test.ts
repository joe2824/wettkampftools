import { describe, expect, it } from "vitest";
import {
	MissingColumnsError,
	REQUIRED_REGISTRATION_COLUMNS,
	checkRequiredColumns,
	decodeText,
	parseCsv,
	parseRegistrationCsv
} from "./csv";
import { encodeWindows1252 } from "$lib/testing/latin1";
import { buildRegistrationCsv } from "$lib/testing/fixtures";

const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text);
const UTF8_BOM = [0xef, 0xbb, 0xbf];

describe("decodeText", () => {
	it("erkennt UTF-8", () => {
		expect(decodeText(utf8("Größe männlich"))).toEqual({ text: "Größe männlich", encoding: "utf-8" });
	});

	it("entfernt ein UTF-8-BOM", () => {
		const bytes = Uint8Array.from([...UTF8_BOM, ...utf8("äöü")]);
		expect(decodeText(bytes)).toEqual({ text: "äöü", encoding: "utf-8" });
	});

	it("fällt bei ungültigem UTF-8 auf Windows-1252 zurück", () => {
		const result = decodeText(encodeWindows1252("ä ö ü ß Ä Ö Ü männlich €"));
		expect(result).toEqual({ text: "ä ö ü ß Ä Ö Ü männlich €", encoding: "windows-1252" });
	});

	it("liefert für leere Eingabe leeren Text", () => {
		expect(decodeText(new Uint8Array())).toEqual({ text: "", encoding: "utf-8" });
	});
});

describe("parseCsv", () => {
	it("verwirft die leere Spalte durch das abschließende Semikolon", () => {
		const { headers, rows } = parseCsv(buildRegistrationCsv([{}]));
		expect(headers).toHaveLength(21);
		expect(headers[0]).toBe("gliederung");
		expect(headers.at(-1)).toBe("Jahrgang 5");
		expect(headers).not.toContain("");
		expect(Object.keys(rows[0])).not.toContain("");
	});

	it("liest Werte, Zahlen und leere Jahrgänge", () => {
		const csv = buildRegistrationCsv([{ meldepunkte: 120, ak: "AK 13/14", geschlecht: "männlich" }]);
		const [row] = parseCsv(csv).rows;
		expect(row).toMatchObject({
			gliederung: "Musterstadt",
			ak: "AK 13/14",
			geschlecht: "männlich",
			meldepunkte: "120",
			"Nachname 1": "Meier",
			"Vorname 1": "Anna",
			"Jahrgang 1": "2010",
			"Nachname 5": "",
			"Jahrgang 5": ""
		});
	});

	it("behält Semikolon und Anführungszeichen innerhalb von Anführungszeichen", () => {
		const csv = buildRegistrationCsv([{ gliederung: 'Beispielhausen; "Nord"' }]);
		expect(parseCsv(csv).rows[0].gliederung).toBe('Beispielhausen; "Nord"');
	});

	it("entfernt Leerzeichen um Kopf und Werte", () => {
		const { headers, rows } = parseCsv(' gliederung ; ak \n" Musterstadt "; AK 12 \n');
		expect(headers).toEqual(["gliederung", "ak"]);
		expect(rows).toEqual([{ gliederung: "Musterstadt", ak: "AK 12" }]);
	});

	it("überspringt leere Zeilen", () => {
		const csv = buildRegistrationCsv([{}, { gliederung: "Beispielhausen" }], { lineEnding: "\n\n" });
		const { rows } = parseCsv(csv + ";;;\n");
		expect(rows.map((row) => row.gliederung)).toEqual(["Musterstadt", "Beispielhausen"]);
	});

	it("verarbeitet LF-Zeilenenden", () => {
		const { rows } = parseCsv(buildRegistrationCsv([{}, {}], { lineEnding: "\n" }));
		expect(rows).toHaveLength(2);
	});
});

describe("checkRequiredColumns", () => {
	it("meldet fehlende Pflichtspalten", () => {
		expect(checkRequiredColumns(["gliederung", "name"], REQUIRED_REGISTRATION_COLUMNS)).toEqual([
			"ak",
			"geschlecht"
		]);
	});

	it("liefert eine leere Liste, wenn alles vorhanden ist", () => {
		expect(checkRequiredColumns(["ak", "geschlecht", "gliederung"], REQUIRED_REGISTRATION_COLUMNS)).toEqual([]);
	});
});

describe("parseRegistrationCsv", () => {
	it("dekodiert und liest einen UTF-8-Export", () => {
		const result = parseRegistrationCsv(utf8(buildRegistrationCsv([{ geschlecht: "männlich" }])));
		expect(result.encoding).toBe("utf-8");
		expect(result.headers).toContain("Jahrgang 5");
		expect(result.rows[0].geschlecht).toBe("männlich");
	});

	it("dekodiert und liest einen Windows-1252-Export mit Umlauten", () => {
		const csv = buildRegistrationCsv([{ gliederung: "Großmusterstadt-Süd", geschlecht: "männlich" }]);
		const result = parseRegistrationCsv(encodeWindows1252(csv));
		expect(result.encoding).toBe("windows-1252");
		expect(result.rows[0]).toMatchObject({ gliederung: "Großmusterstadt-Süd", geschlecht: "männlich" });
	});

	it("wirft MissingColumnsError bei fehlenden Pflichtspalten", () => {
		const bytes = utf8("vorname;nachname\nAnna;Meier\n");
		expect(() => parseRegistrationCsv(bytes)).toThrow(MissingColumnsError);
		try {
			parseRegistrationCsv(bytes);
		} catch (error) {
			expect((error as MissingColumnsError).missing).toEqual(["gliederung", "ak", "geschlecht"]);
		}
	});
});

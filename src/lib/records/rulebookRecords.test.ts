// @vitest-environment happy-dom
import { existsSync, readFileSync } from "node:fs";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { RulebookError } from "$lib/io/rulebook";
import { rulebookFile, rulebookXml, type FixtureAgeGroup } from "$lib/testing/rulebookFixture";
import { parseRulebookRecords, writeRulebookRecords } from "./rulebookRecords";

const GROUPS: FixtureAgeGroup[] = [
	{
		name: "AK 12",
		female: [
			{ name: "4*25m Rettungsstaffel", rec: 5817 },
			{ name: "4*25m RLB", rec: 8219 }
		],
		male: [
			{ name: "4*25m Rettungsstaffel", rec: 5674 },
			{ name: "4*25m RLB", rec: 8026 }
		]
	},
	{
		name: "AkW offen",
		female: [{ name: "4*50m Retten in der Welle", rec: 20894 }],
		male: [{ name: "4*50m Retten in der Welle", rec: 16221 }]
	}
];

const dataXml = (bytes: Uint8Array): string => strFromU8(unzipSync(bytes)["data.xml"]);

describe("parseRulebookRecords", () => {
	it("liest Rec-Werte je Altersklasse, Geschlecht und Disziplin", () => {
		expect(parseRulebookRecords(rulebookFile(GROUPS))).toEqual([
			{ ageGroup: "AK 12", gender: "female", disciplineIndex: 0, discipline: "4*25m Rettungsstaffel", rec: 5817 },
			{ ageGroup: "AK 12", gender: "female", disciplineIndex: 1, discipline: "4*25m RLB", rec: 8219 },
			{ ageGroup: "AK 12", gender: "male", disciplineIndex: 0, discipline: "4*25m Rettungsstaffel", rec: 5674 },
			{ ageGroup: "AK 12", gender: "male", disciplineIndex: 1, discipline: "4*25m RLB", rec: 8026 },
			{
				ageGroup: "AkW offen",
				gender: "female",
				disciplineIndex: 0,
				discipline: "4*50m Retten in der Welle",
				rec: 20894
			},
			{ ageGroup: "AkW offen", gender: "male", disciplineIndex: 0, discipline: "4*50m Retten in der Welle", rec: 16221 }
		]);
	});

	it("lehnt Dateien ohne Regelwerk ab", () => {
		expect(() => parseRulebookRecords(strToU8("kein zip"))).toThrow(RulebookError);
	});

	it("lehnt Disziplinen ohne lesbaren Rec-Wert ab", () => {
		const xml = rulebookXml(GROUPS).replace("<rec>5817</rec>", "<rec>x</rec>");
		expect(() => parseRulebookRecords(zipSync({ "data.xml": strToU8(xml) }))).toThrow(RulebookError);
	});
});

describe("parseRulebookRecords: unvollständige Regelwerke", () => {
	const zipXml = (xml: string): Uint8Array => zipSync({ "data.xml": strToU8(xml) });

	it("lehnt Altersklassen ohne Namen ab", () => {
		const xml = rulebookXml(GROUPS).replace("<name>AK 12</name>", "<name></name>");
		expect(() => parseRulebookRecords(zipXml(xml))).toThrow(RulebookError);
	});

	it("lehnt Disziplinen ohne Rec-Wert ab", () => {
		const xml = rulebookXml(GROUPS).replace("<rec>5817</rec>", "");
		expect(() => parseRulebookRecords(zipXml(xml))).toThrow(RulebookError);
	});

	it("lehnt Regelwerke ohne Altersklassen ab", () => {
		expect(() => parseRulebookRecords(zipXml(rulebookXml([])))).toThrow(RulebookError);
		const withoutList = rulebookXml(GROUPS).replace(/<aks>[\s\S]*<\/aks>/, "");
		expect(() => parseRulebookRecords(zipXml(withoutList))).toThrow(RulebookError);
	});
});

describe("writeRulebookRecords", () => {
	it("ändert nur Rec-Werte und Beschreibung, alles andere bleibt Zeichen für Zeichen", () => {
		const original = rulebookFile(GROUPS, "Wellen-Wk 2025");
		const updated = writeRulebookRecords(
			original,
			[
				{ ageGroup: "AK 12", gender: "male", disciplineIndex: 1, rec: 7999 },
				{ ageGroup: "AkW offen", gender: "female", disciplineIndex: 0, rec: 20500 }
			],
			"Wellen-Wk 2026 (mit Rec-Werten für 2025)"
		);
		const expected = dataXml(original)
			.replace("<rec>8026</rec>", "<rec>7999</rec>")
			.replace("<rec>20894</rec>", "<rec>20500</rec>")
			.replace("Wellen-Wk 2025", "Wellen-Wk 2026 (mit Rec-Werten für 2025)");
		expect(dataXml(updated)).toBe(expected);
		expect(Object.keys(unzipSync(updated))).toEqual(["data.xml"]);
	});

	it("maskiert Sonderzeichen in der Beschreibung", () => {
		const updated = writeRulebookRecords(rulebookFile(GROUPS), [], "A & B <neu>");
		expect(dataXml(updated)).toContain("<beschreibung>A &amp; B &lt;neu&gt;</beschreibung>");
	});

	it("behält weitere Einträge im Archiv", () => {
		const original = zipSync({ "data.xml": strToU8(rulebookXml(GROUPS)), "extra.txt": strToU8("x") });
		expect(Object.keys(unzipSync(writeRulebookRecords(original, [], "neu"))).sort()).toEqual(["data.xml", "extra.txt"]);
	});

	it("ergänzt eine fehlende Beschreibung vor dem Ende", () => {
		const xml = rulebookXml(GROUPS).replace(/<beschreibung>[^<]*<\/beschreibung>/, "");
		const updated = dataXml(writeRulebookRecords(zipSync({ "data.xml": strToU8(xml) }), [], "neu"));
		expect(updated).toContain("  <beschreibung>neu</beschreibung>\n</Altersklassen>");
	});

	it("lehnt doppelte Beschreibungen und Rec-Werte außerhalb von Disziplinen ab", () => {
		const twice = rulebookXml(GROUPS).replace("</Altersklassen>", "<beschreibung>x</beschreibung></Altersklassen>");
		expect(() => writeRulebookRecords(zipSync({ "data.xml": strToU8(twice) }), [], "neu")).toThrow(RulebookError);
		const stray = rulebookXml(GROUPS).replace("</Altersklassen>", "<rec>1</rec></Altersklassen>");
		expect(() => writeRulebookRecords(zipSync({ "data.xml": strToU8(stray) }), [], "neu")).toThrow(RulebookError);
	});

	it("lehnt unbekannte Ziele und ungültige Werte ab", () => {
		const original = rulebookFile(GROUPS);
		const unknown = { ageGroup: "AK 99", gender: "male" as const, disciplineIndex: 0, rec: 1000 };
		expect(() => writeRulebookRecords(original, [unknown], "neu")).toThrow();
		const invalid = { ageGroup: "AK 12", gender: "male" as const, disciplineIndex: 0, rec: 0 };
		expect(() => writeRulebookRecords(original, [invalid], "neu")).toThrow();
	});
});

// Offizielles Regelwerk aus JAuswertung, falls lokal vorhanden (Pfad über DLRG_RULEBOOK_PATH).
const officialPath = process.env.DLRG_RULEBOOK_PATH ?? "";
const hasOfficial = officialPath !== "" && existsSync(officialPath);

describe.skipIf(!hasOfficial)("offizielles DLRG-Regelwerk", () => {
	const bytes = (): Uint8Array => new Uint8Array(readFileSync(officialPath));

	it("liest AK 12 mit langsameren Rec-Werten in der ersten (weiblichen) Liste", () => {
		const records = parseRulebookRecords(bytes());
		const relay = records.filter((r) => r.ageGroup === "AK 12" && r.discipline === "4*25m Rettungsstaffel");
		expect(relay.map((r) => r.gender)).toEqual(["female", "male"]);
		expect(relay[0].rec).toBeGreaterThan(relay[1].rec);
	});

	it("ändert beim Schreiben nur den gewünschten Wert", () => {
		const original = bytes();
		const [first] = parseRulebookRecords(original);
		const updated = writeRulebookRecords(original, [{ ...first, rec: first.rec + 1 }], "Test");
		const before = parseRulebookRecords(original);
		const after = parseRulebookRecords(updated);
		expect(after.slice(1)).toEqual(before.slice(1));
		expect(after[0].rec).toBe(first.rec + 1);
		const expected = dataXml(original)
			.replace(`<rec>${first.rec}</rec>`, `<rec>${first.rec + 1}</rec>`)
			.replace(/<beschreibung>[^<]*<\/beschreibung>/, "<beschreibung>Test</beschreibung>");
		expect(dataXml(updated)).toBe(expected);
	});
});

// @vitest-environment happy-dom
import { existsSync, readFileSync } from "node:fs";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { encodeWindows1252 } from "$lib/testing/latin1";
import { penaltyCatalogFile, penaltyCatalogXml } from "$lib/testing/penaltyFixture";
import {
	allPenalties,
	describePenalty,
	PenaltyCatalogError,
	readPenaltyCatalog,
	writePenaltyCatalog
} from "./penaltyCatalog";

describe("readPenaltyCatalog", () => {
	it("liest Kapitel, Paragraphen und Strafen", () => {
		const catalog = readPenaltyCatalog(penaltyCatalogFile());
		expect(catalog.chapters.map((c) => c.name)).toEqual([
			"Allgemeine Verstöße",
			"Verstöße in den Teilstrecken",
			"Sonstiges"
		]);
		const start = catalog.chapters[1].paragraphs[0];
		expect(start).toMatchObject({ name: "Start", number: "1" });
		expect(start.penalties[0]).toEqual({
			name: "Fehlstart",
			code: "V1",
			kind: "DISQUALIFIKATION",
			points: 0,
			announcement: ""
		});
		expect(allPenalties(catalog)).toHaveLength(9);
	});

	it("behält doppelt maskierte Zeichen als Text", () => {
		const s5 = allPenalties(readPenaltyCatalog(penaltyCatalogFile())).find((p) => p.code === "S5");
		expect(s5?.name).toBe("Rückenlage verlassen (Schultern &gt; 90°)");
	});

	it("liest Windows-1252 trotz UTF-8-Kopfzeile", () => {
		const bytes = zipSync({ "data.xml": encodeWindows1252(penaltyCatalogXml()) });
		const catalog = readPenaltyCatalog(bytes);
		expect(catalog.chapters[0].name).toBe("Allgemeine Verstöße");
	});

	it("lehnt Fremdes ab", () => {
		expect(() => readPenaltyCatalog(strToU8("kein zip"))).toThrow(PenaltyCatalogError);
		const wrongRoot = zipSync({ "data.xml": strToU8("<Altersklassen/>") });
		expect(() => readPenaltyCatalog(wrongRoot)).toThrow(PenaltyCatalogError);
		const badPoints = penaltyCatalogXml().replace("<hoehe>200</hoehe>", "<hoehe>viel</hoehe>");
		expect(() => readPenaltyCatalog(penaltyCatalogFile(badPoints))).toThrow(PenaltyCatalogError);
	});

	it("lehnt unbekannte Felder ab, damit beim Schreiben nichts verloren geht", () => {
		const extra = penaltyCatalogXml().replace("<durchsage></durchsage>", "<durchsage></durchsage><neu>1</neu>");
		expect(() => readPenaltyCatalog(penaltyCatalogFile(extra))).toThrow(PenaltyCatalogError);
	});
});

describe("writePenaltyCatalog", () => {
	it("schreibt denselben Katalog unverändert zurück", () => {
		const original = penaltyCatalogFile();
		const written = writePenaltyCatalog(original, readPenaltyCatalog(original));
		expect(strFromU8(unzipSync(written)["data.xml"])).toBe(penaltyCatalogXml());
	});

	it("legt data.xml als ersten Eintrag ab und behält weitere Einträge", () => {
		const original = zipSync({ "data.xml": strToU8(penaltyCatalogXml()), "info.txt": strToU8("x") });
		const written = writePenaltyCatalog(original, readPenaltyCatalog(original));
		expect(Object.keys(unzipSync(written))).toEqual(["data.xml", "info.txt"]);
	});

	it("maskiert Sonderzeichen und schreibt UTF-8", () => {
		const catalog = readPenaltyCatalog(penaltyCatalogFile());
		catalog.chapters[0].name = "Größe <&> „Test“";
		const xml = strFromU8(unzipSync(writePenaltyCatalog(penaltyCatalogFile(), catalog))["data.xml"]);
		expect(xml).toContain("<name>Größe &lt;&amp;&gt; „Test“</name>");
		expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
		expect(xml).toContain('<Strafen version="0">');
		expect(xml).not.toContain("reference=");
		expect(readPenaltyCatalog(zipSync({ "data.xml": strToU8(xml) })).chapters[0].name).toBe("Größe <&> „Test“");
	});
});

describe("describePenalty", () => {
	it("beschreibt Art und Höhe auf Deutsch", () => {
		expect(describePenalty({ kind: "STRAFPUNKTE", points: 100 })).toBe("100 Strafpunkte");
		expect(describePenalty({ kind: "DISQUALIFIKATION", points: 0 })).toBe("Disqualifikation");
		expect(describePenalty({ kind: "NICHT_ANGETRETEN", points: 0 })).toBe("Nicht angetreten");
		expect(describePenalty({ kind: "AUSSCHLUSS", points: 0 })).toBe("Ausschluss");
		expect(describePenalty({ kind: "NICHTS", points: 0 })).toBe("Keine Strafe");
		expect(describePenalty({ kind: "UNBEKANNT", points: 0 })).toBe("UNBEKANNT");
	});
});

const officialPath = process.env.DLRG_PENALTY_PATH ?? "";
const hasOfficial = officialPath !== "" && existsSync(officialPath);

describe.skipIf(!hasOfficial)("offizieller Katalog (DLRG_PENALTY_PATH)", () => {
	it("liest und schreibt den Katalog ohne Änderung", () => {
		const bytes = new Uint8Array(readFileSync(officialPath));
		const catalog = readPenaltyCatalog(bytes);
		expect(allPenalties(catalog).some((p) => p.code === "V1")).toBe(true);
		const original = strFromU8(unzipSync(bytes)["data.xml"]);
		const written = strFromU8(unzipSync(writePenaltyCatalog(bytes, catalog))["data.xml"]);
		expect(written).toBe(original);
	});
});

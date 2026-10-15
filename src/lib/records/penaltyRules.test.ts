// @vitest-environment happy-dom
import { existsSync, readFileSync } from "node:fs";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { penaltyCatalogFile, penaltyCatalogXml } from "$lib/testing/penaltyFixture";
import { allPenalties, readPenaltyCatalog, writePenaltyCatalog, type PenaltyCatalog } from "./penaltyCatalog";
import {
	applyClubPenaltyRules,
	DEFAULT_CLUB_PENALTY_RULES,
	verifyPenaltyCatalog,
	verifyPenaltyModel
} from "./penaltyRules";

const fixture = (): PenaltyCatalog => readPenaltyCatalog(penaltyCatalogFile());
const byCode = (catalog: PenaltyCatalog, code: string) => allPenalties(catalog).filter((p) => p.code === code);

describe("applyClubPenaltyRules", () => {
	it("macht den Fehlstart zu 100 Strafpunkten und lässt W4 unverändert", () => {
		const { catalog } = applyClubPenaltyRules(fixture());
		expect(byCode(catalog, "V1")[0]).toMatchObject({ kind: "STRAFPUNKTE", points: 100, name: "Fehlstart" });
		expect(byCode(catalog, "W4")[0]).toMatchObject({ kind: "STRAFPUNKTE", points: 200 });
		expect(byCode(catalog, "S1")[0].kind).toBe("DISQUALIFIKATION");
	});

	it("legt „Retten in der Welle“ samt Schwimmer-Varianten in einem eigenen Paragraphen an", () => {
		const { catalog } = applyClubPenaltyRules(fixture());
		const chapter = catalog.chapters[1];
		const paragraph = chapter.paragraphs.at(-1);
		expect(paragraph).toMatchObject({ name: "Wellenwettkampf", number: "4" });
		expect(paragraph?.penalties.map((p) => p.code)).toEqual(["RW1", "RW1#1", "RW1#2", "RW1#3", "RW1#4"]);
		expect(paragraph?.penalties[2]).toEqual({
			name: "Retten in der Welle: Opfer nicht mit Rautek- oder Schultertragegriff herausgetragen (2. Schwimmer)",
			code: "RW1#2",
			kind: "STRAFPUNKTE",
			points: 200,
			announcement: ""
		});
	});

	it("listet die Änderungen mit altem und neuem Wert", () => {
		const { changes } = applyClubPenaltyRules(fixture());
		expect(changes[0]).toEqual({
			code: "V1",
			name: "Fehlstart",
			before: { kind: "DISQUALIFIKATION", points: 0 },
			after: { kind: "STRAFPUNKTE", points: 100 }
		});
		expect(changes.slice(1).map((c) => [c.code, c.before])).toEqual([
			["RW1", null],
			["RW1#1", null],
			["RW1#2", null],
			["RW1#3", null],
			["RW1#4", null]
		]);
	});

	it("ändert das Original nicht und ist wiederholbar", () => {
		const original = fixture();
		const once = applyClubPenaltyRules(original);
		expect(byCode(original, "V1")[0].kind).toBe("DISQUALIFIKATION");
		const twice = applyClubPenaltyRules(once.catalog);
		expect(twice.changes).toEqual([]);
		expect(twice.catalog).toEqual(once.catalog);
	});

	it("korrigiert vorhandene Wellen-Einträge und ergänzt fehlende Varianten am selben Ort", () => {
		const { catalog } = applyClubPenaltyRules(fixture());
		const paragraph = catalog.chapters[1].paragraphs[3];
		paragraph.penalties = paragraph.penalties.filter((p) => p.code !== "RW1#3");
		paragraph.penalties[0] = { ...paragraph.penalties[0], points: 50 };
		const fixed = applyClubPenaltyRules(catalog);
		expect(fixed.changes.map((c) => c.code)).toEqual(["RW1", "RW1#3"]);
		expect(fixed.catalog.chapters[1].paragraphs).toHaveLength(4);
		expect(byCode(fixed.catalog, "RW1")[0].points).toBe(200);
	});

	it("nutzt einstellbare Werte", () => {
		const rules = {
			...DEFAULT_CLUB_PENALTY_RULES,
			falseStartPoints: 50,
			waveCode: "WR",
			wavePoints: 100,
			waveMemberVariants: 2
		};
		const { catalog } = applyClubPenaltyRules(fixture(), rules);
		expect(byCode(catalog, "V1")[0].points).toBe(50);
		expect(
			allPenalties(catalog)
				.filter((p) => p.code.startsWith("WR"))
				.map((p) => p.code)
		).toEqual(["WR", "WR#1", "WR#2"]);
		expect(verifyPenaltyModel(catalog, rules)).toEqual([]);
	});
});

describe("verifyPenaltyModel", () => {
	it("findet keine Probleme im angepassten Katalog", () => {
		expect(verifyPenaltyModel(applyClubPenaltyRules(fixture()).catalog)).toEqual([]);
	});

	it("meldet fehlende Vereinsregeln im unveränderten Katalog", () => {
		const issues = verifyPenaltyModel(fixture());
		expect(issues).toContain("„V1“ soll 100 Strafpunkte geben, ist aber: Disqualifikation.");
		expect(issues).toContain("„RW1#4“ fehlt.");
	});

	it("meldet unbekannte Strafarten, doppelte Kürzel und falsche Sonderkürzel", () => {
		const { catalog } = applyClubPenaltyRules(fixture());
		const penalties = catalog.chapters[2].paragraphs[0].penalties;
		penalties.push({ name: "x", code: "S1", kind: "STRAFPUNKTE", points: 1, announcement: "" });
		penalties.push({ name: "y", code: "n.b.", kind: "SONSTWAS", points: 0, announcement: "" });
		penalties.push({ name: "z", code: "DNS", kind: "DISQUALIFIKATION", points: 0, announcement: "" });
		catalog.chapters[0].paragraphs[0].penalties[0].code = "S1";
		catalog.chapters[0].paragraphs[0].penalties[0].kind = "STRAFPUNKTE";
		const issues = verifyPenaltyModel(catalog);
		expect(issues).toContain("Unbekannte Strafart „SONSTWAS“ bei „n.b.“.");
		expect(issues).toContain("Das Kürzel „S1“ kommt mehrfach vor; JAuswertung nimmt nur den ersten Eintrag.");
		expect(issues).toContain("„S1“ muss eine Disqualifikation sein.");
		expect(issues).toContain("„DNS“ muss „Nicht angetreten“ sein.");
	});

	it("lässt mehrere leere Kürzel zu", () => {
		const issues = verifyPenaltyModel(applyClubPenaltyRules(fixture()).catalog);
		expect(issues.some((issue) => issue.includes("mehrfach"))).toBe(false);
	});
});

describe("verifyPenaltyCatalog", () => {
	const adjusted = () => {
		const original = penaltyCatalogFile();
		return writePenaltyCatalog(original, applyClubPenaltyRules(readPenaltyCatalog(original)).catalog);
	};

	it("prüft die geschriebene Datei ohne Befund", () => {
		expect(verifyPenaltyCatalog(adjusted())).toEqual([]);
	});

	it("meldet unlesbare Dateien, Verweise, falsche Wurzel und falsche Reihenfolge", () => {
		expect(verifyPenaltyCatalog(strToU8("x"))).toEqual(["Die Datei ist kein JAuswertung-Strafenkatalog."]);
		const xml = strFromU8(unzipSync(adjusted())["data.xml"]);
		const withReference = xml.replace("<Strafe>", '<Strafe reference="../Strafe">');
		expect(verifyPenaltyCatalog(zipSync({ "data.xml": strToU8(withReference) }))).toContain(
			"Der Katalog enthält Verweise (reference) und kann so nicht eigenständig gelesen werden."
		);
		const version = xml.replace('<Strafen version="0">', '<Strafen version="1">');
		expect(verifyPenaltyCatalog(zipSync({ "data.xml": strToU8(version) }))).toContain(
			'Das Wurzelelement muss <Strafen version="0"> sein.'
		);
		const order = zipSync({ "a.txt": strToU8("x"), "data.xml": strToU8(xml) });
		expect(verifyPenaltyCatalog(order)).toContain("data.xml muss der erste Eintrag sein.");
	});

	it("meldet den unveränderten Katalog", () => {
		expect(verifyPenaltyCatalog(penaltyCatalogFile(penaltyCatalogXml()))).toContain("„RW1“ fehlt.");
	});
});

const officialPath = process.env.DLRG_PENALTY_PATH ?? "";
const hasOfficial = officialPath !== "" && existsSync(officialPath);

describe.skipIf(!hasOfficial)("offizieller Katalog (DLRG_PENALTY_PATH)", () => {
	it("übernimmt die Vereinsregeln ohne Befund", () => {
		const bytes = new Uint8Array(readFileSync(officialPath));
		const { catalog, changes } = applyClubPenaltyRules(readPenaltyCatalog(bytes));
		const written = writePenaltyCatalog(bytes, catalog);
		expect(verifyPenaltyCatalog(written)).toEqual([]);
		expect(changes.map((c) => c.code)).toEqual(["V1", "RW1", "RW1#1", "RW1#2", "RW1#3", "RW1#4"]);
	});
});

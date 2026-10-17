// @vitest-environment happy-dom
import { existsSync, readFileSync } from "node:fs";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
	competitionFile,
	competitionXml,
	penaltyCatalogFile,
	type FixtureCompetitionOptions
} from "$lib/testing/penaltyFixture";
import type { FixtureAgeGroup } from "$lib/testing/rulebookFixture";
import { checkBlockReferences } from "./xstreamReferences";
import { replaceCompetitionPenalties, updateCompetitionFile, type CompetitionUpdate } from "./competitionFile";
import { allPenalties, readCatalogElement, readPenaltyCatalog } from "./penaltyCatalog";
import { applyClubPenaltyRules } from "./penaltyRules";
import { parseRulebookRecords, readRulebookElementRecords } from "./rulebookRecords";
import { rulebookFile } from "$lib/testing/rulebookFixture";
import { findElementSpan } from "./xmlSpan";

const GROUPS: FixtureAgeGroup[] = [
	{
		name: "AK 12",
		female: [{ name: "4*25m Rettungsstaffel", rec: 5817 }],
		male: [{ name: "4*25m Rettungsstaffel", rec: 5674 }]
	},
	{
		name: "AkW offen",
		female: [{ name: "4*50m Retten in der Welle", rec: 20894 }],
		male: [{ name: "4*50m Retten in der Welle", rec: 16221 }]
	}
];

const catalog = () => applyClubPenaltyRules(readPenaltyCatalog(penaltyCatalogFile())).catalog;
const clubRecords = parseRulebookRecords(rulebookFile(GROUPS));
const LOGO = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);

const wk = (options: Partial<FixtureCompetitionOptions> = {}): { xml: string; bytes: Uint8Array } => {
	const xml = competitionXml({ groups: GROUPS, ...options });
	return { xml, bytes: competitionFile(xml, { "logo.png": LOGO }) };
};

const update = (): CompetitionUpdate => ({
	catalog: catalog(),
	clubRecords,
	updates: [{ ageGroup: "AkW offen", gender: "male", disciplineIndex: 0, rec: 15000 }],
	description: "Wellen-Wk 2026"
});

const rootOf = (bytes: Uint8Array): Element =>
	new DOMParser().parseFromString(strFromU8(unzipSync(bytes)["data.xml"]), "application/xml").documentElement;

const childOf = (parent: Element, tag: string): Element => Array.from(parent.children).find((c) => c.nodeName === tag)!;

describe("updateCompetitionFile", () => {
	it("ersetzt Strafenkatalog sowie Rec-Werte und Beschreibung des eingebetteten Regelwerks", () => {
		const outcome = updateCompetitionFile(wk().bytes, update());
		if (!outcome.ok) throw new Error(outcome.message);
		const root = rootOf(outcome.bytes);
		expect(readCatalogElement(childOf(root, "strafen"))).toEqual(update().catalog);
		const records = readRulebookElementRecords(childOf(root, "aks"));
		expect(records.map((r) => r.rec)).toEqual([5817, 5674, 20894, 15000]);
		expect(childOf(childOf(root, "aks"), "beschreibung").textContent).toBe("Wellen-Wk 2026");
		expect(outcome).toMatchObject({ teams: 2, ageGroups: 2 });
	});

	it("lässt alles außerhalb von Regelwerk und Katalog zeichengenau stehen", () => {
		const { xml, bytes } = wk();
		const outcome = updateCompetitionFile(bytes, update());
		if (!outcome.ok) throw new Error(outcome.message);
		const written = strFromU8(unzipSync(outcome.bytes)["data.xml"]);
		const spans = (text: string) => [
			findElementSpan(text, ["MannschaftWettkampf", "aks"])!,
			findElementSpan(text, ["MannschaftWettkampf", "strafen"])!
		];
		const outside = (text: string) => {
			const [aks, penalties] = spans(text);
			return [text.slice(0, aks.start), text.slice(aks.end, penalties.start), text.slice(penalties.end)];
		};
		expect(outside(written)).toEqual(outside(xml));
		const entries = unzipSync(outcome.bytes);
		expect(Object.keys(entries)).toEqual(["data.xml", "logo.png"]);
		expect(entries["logo.png"]).toEqual(LOGO);
		expect(written).not.toMatch(/<strafen>[\s\S]*reference=[\s\S]*<\/strafen>\s*<properties>/);
	});

	it("lehnt ab, wenn schon Strafen vergeben sind", () => {
		const outcome = updateCompetitionFile(wk({ assignedPenalty: true, catalogReference: true }).bytes, update());
		expect(outcome).toEqual({ ok: false, message: expect.stringContaining("bereits Strafen vergeben") });
	});

	it("lehnt ab, wenn allgemeine Strafen vergeben sind", () => {
		const xml = competitionXml({ groups: GROUPS }).replace(
			"<allgemeineStrafen/>",
			"<allgemeineStrafen><Strafe/></allgemeineStrafen>"
		);
		expect(updateCompetitionFile(competitionFile(xml), update()).ok).toBe(false);
	});

	it("lehnt Verweise in den Katalog ab", () => {
		const outcome = updateCompetitionFile(wk({ referenceIntoCatalog: true }).bytes, update());
		expect(outcome).toEqual({ ok: false, message: expect.stringContaining("verknüpft") });
	});

	it("lehnt Verweise aus dem Katalog heraus ab", () => {
		const { xml } = wk({ catalogReference: true, assignedPenalty: true });
		// Vergebene Strafe entfernen, damit nur die Verknüpfung auffällt; der Verweis zeigt dann ins Leere.
		const outcome = updateCompetitionFile(
			competitionFile(xml.replace(/<linked-list>\s*<Strafe>[\s\S]*?<\/Strafe>/, "<linked-list>")),
			update()
		);
		expect(outcome).toEqual({ ok: false, message: expect.stringContaining("verknüpft") });
	});

	it("lehnt Einzelwettkämpfe und fremde Dateien ab", () => {
		const single = updateCompetitionFile(wk({ root: "EinzelWettkampf" }).bytes, update());
		expect(single).toEqual({ ok: false, message: expect.stringContaining("Einzelwettkampf") });
		expect(updateCompetitionFile(strToU8("kein zip"), update())).toEqual({
			ok: false,
			message: "Die Datei ist keine JAuswertung-Wettkampfdatei."
		});
		const broken = zipSync({ "data.xml": strToU8("<MannschaftWettkampf><aks>") });
		expect(updateCompetitionFile(broken, update()).ok).toBe(false);
	});

	it("lehnt andere Altersklassen oder Disziplinen ab", () => {
		const other = parseRulebookRecords(rulebookFile([GROUPS[0]]));
		const outcome = updateCompetitionFile(wk().bytes, { ...update(), clubRecords: other });
		expect(outcome).toEqual({ ok: false, message: expect.stringContaining("passen nicht zum Vereins-Regelwerk") });
		const renamed = clubRecords.map((r, i) => (i === 0 ? { ...r, discipline: "Andere" } : r));
		expect(updateCompetitionFile(wk().bytes, { ...update(), clubRecords: renamed }).ok).toBe(false);
	});
});

describe("replaceCompetitionPenalties", () => {
	it("ersetzt nur den Katalog", () => {
		const { xml, bytes } = wk();
		const outcome = replaceCompetitionPenalties(bytes, catalog());
		if (!outcome.ok) throw new Error(outcome.message);
		const written = strFromU8(unzipSync(outcome.bytes)["data.xml"]);
		const span = (text: string) => findElementSpan(text, ["MannschaftWettkampf", "strafen"])!;
		expect(written.slice(0, span(written).start)).toBe(xml.slice(0, span(xml).start));
		expect(
			allPenalties(readCatalogElement(childOf(rootOf(outcome.bytes), "strafen"))).some((p) => p.code === "RW1")
		).toBe(true);
	});
});

// Echte Wettkampfdatei nur lokal (Pfad über WK_SAMPLE_PATH), nie im Repo.
const samplePath = process.env.WK_SAMPLE_PATH ?? "";
const hasSample = samplePath !== "" && existsSync(samplePath);

describe.skipIf(!hasSample)("echte Wettkampfdatei (WK_SAMPLE_PATH)", () => {
	const bytes = () => new Uint8Array(readFileSync(samplePath));

	it("löst alle Verweise auf", () => {
		const root = rootOf(bytes());
		expect(checkBlockReferences(root, root.ownerDocument.createElement("leer"))).toBe("ok");
	});

	it("aktualisiert die Datei oder lehnt mit Begründung ab", () => {
		const root = rootOf(bytes());
		const records = readRulebookElementRecords(childOf(root, "aks"));
		const outcome = updateCompetitionFile(bytes(), { ...update(), clubRecords: records, updates: [] });
		if (outcome.ok) expect(outcome.teams).toBeGreaterThanOrEqual(0);
		else expect(outcome.message).toMatch(/bereits Strafen vergeben|verknüpft|Format/);
	});
});

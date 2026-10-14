// @vitest-environment happy-dom
import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { parseRulebook, RulebookError } from "./rulebook";

function ageGroupXml(name: string, min: number, max: number): string {
	return `
    <Altersklasse>
      <name>${name}</name>
      <disziplinen>
        <Disziplin-array>
          <Disziplin><name>4*25m Beispielstaffel</name><rec>1000</rec></Disziplin>
        </Disziplin-array>
      </disziplinen>
      <minMembers>${min}</minMembers>
      <maxMembers>${max}</maxMembers>
      <interneStartgruppe><name>-</name></interneStartgruppe>
    </Altersklasse>`;
}

function rulebookXml(body: string, description = "<beschreibung>Beispiel-Regelwerk</beschreibung>"): string {
	return `<?xml version="1.0" encoding="UTF-8"?>
<Altersklassen version="2">
  <aks>${body}</aks>
  ${description}
  <wertungsgruppen><Wertungsgruppe><name>Rettungswertung</name></Wertungsgruppe></wertungsgruppen>
</Altersklassen>`;
}

function rwm(xml: string, entry = "data.xml"): Uint8Array {
	return zipSync({ [entry]: strToU8(xml) });
}

describe("parseRulebook", () => {
	it("liest Altersklassen mit Mitgliedergrenzen und Beschreibung", () => {
		const xml = rulebookXml(ageGroupXml("AK 12", 4, 5) + ageGroupXml("AK Offen", 3, 6));
		expect(parseRulebook(rwm(xml))).toEqual({
			name: "Beispiel-Regelwerk",
			ageGroups: [
				{ name: "AK 12", minMembers: 4, maxMembers: 5 },
				{ name: "AK Offen", minMembers: 3, maxMembers: 6 },
			],
		});
	});

	it("ignoriert verschachtelte name-Elemente", () => {
		const names = parseRulebook(rwm(rulebookXml(ageGroupXml("AK 10", 4, 5)))).ageGroups.map((g) => g.name);
		expect(names).toEqual(["AK 10"]);
	});

	it("verwendet 'Regelwerk', wenn keine Beschreibung vorhanden ist", () => {
		expect(parseRulebook(rwm(rulebookXml(ageGroupXml("AK 10", 4, 5), ""))).name).toBe("Regelwerk");
		expect(parseRulebook(rwm(rulebookXml(ageGroupXml("AK 10", 4, 5), "<beschreibung> </beschreibung>"))).name).toBe(
			"Regelwerk",
		);
	});

	it("lehnt Dateien ab, die kein ZIP sind", () => {
		expect(() => parseRulebook(strToU8("kein zip"))).toThrow(RulebookError);
		expect(() => parseRulebook(strToU8("kein zip"))).toThrow("Die Datei ist kein JAuswertung-Regelwerk.");
	});

	it("lehnt ZIP ohne data.xml ab", () => {
		expect(() => parseRulebook(rwm(rulebookXml(ageGroupXml("AK 10", 4, 5)), "other.xml"))).toThrow(RulebookError);
	});

	it("lehnt ungültiges XML ab", () => {
		expect(() => parseRulebook(rwm("<Altersklassen><aks>"))).toThrow(RulebookError);
	});

	it("lehnt falsches Wurzelelement ab", () => {
		expect(() => parseRulebook(rwm("<Wettkampf><aks/></Wettkampf>"))).toThrow(RulebookError);
	});

	it("lehnt Regelwerke ohne Altersklassen ab", () => {
		expect(() => parseRulebook(rwm(rulebookXml("")))).toThrow(RulebookError);
	});

	it("lehnt Altersklassen ohne gültige Mitgliedergrenzen ab", () => {
		const broken = ageGroupXml("AK 10", 4, 5).replace("<minMembers>4</minMembers>", "<minMembers>x</minMembers>");
		expect(() => parseRulebook(rwm(rulebookXml(broken)))).toThrow(RulebookError);
	});

	it("lehnt Altersklassen ohne Namen ab", () => {
		expect(() => parseRulebook(rwm(rulebookXml(ageGroupXml(" ", 4, 5))))).toThrow(RulebookError);
	});
});

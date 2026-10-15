import { describe, expect, it } from "vitest";
import {
	DEFAULT_REC_MAPPING,
	distinctNames,
	isWaveDiscipline,
	parseRecMapping,
	rescueRecords,
	setAgeGroupMapping,
	setDisciplineAlias
} from "./mapping";
import type { RulebookRecord } from "./rulebookRecords";

describe("DEFAULT_REC_MAPPING", () => {
	it("ordnet AK 10 den Werten der AK 12 zu und kennt die Rückenlage", () => {
		expect(DEFAULT_REC_MAPPING.ageGroups["AK 10"]).toBe("AK 12");
		expect(DEFAULT_REC_MAPPING.ageGroups["AK offen"]).toBe("AK Offen");
		expect(DEFAULT_REC_MAPPING.disciplineAliases["4*25m RLB"]).toBe("4*25m Rückenlage ohne Armtätigkeit");
	});
});

describe("parseRecMapping", () => {
	it("übernimmt eine gültige Zuordnung", () => {
		const mapping = { ageGroups: { "AK 10": "AK 12" }, disciplineAliases: {} };
		expect(parseRecMapping(mapping)).toEqual(mapping);
	});

	it("verwirft Ungültiges", () => {
		expect(parseRecMapping(null)).toBeNull();
		expect(parseRecMapping({ ageGroups: [], disciplineAliases: {} })).toBeNull();
		expect(parseRecMapping({ ageGroups: { a: 1 }, disciplineAliases: {} })).toBeNull();
		expect(parseRecMapping({ ageGroups: {} })).toBeNull();
	});
});

const record = (ageGroup: string, discipline: string): RulebookRecord => ({
	ageGroup,
	gender: "female",
	disciplineIndex: 0,
	discipline,
	rec: 1
});

describe("Hilfen für die Zuordnung", () => {
	const club = [
		record("AK 10", "4*25m RLB"),
		record("AK 10", "4*25m RLB"),
		record("AkW offen", "4*50m Retten in der Welle mit Gurtretter")
	];

	it("erkennt Wellendisziplinen am Namen", () => {
		expect(isWaveDiscipline("4*50m Retten in der Welle")).toBe(true);
		expect(isWaveDiscipline("4*25m Puppenstaffel")).toBe(false);
	});

	it("liefert Rettungswerte und eindeutige Namen", () => {
		const rescue = rescueRecords(club);
		expect(distinctNames(rescue, "ageGroup")).toEqual(["AK 10"]);
		expect(distinctNames(rescue, "discipline")).toEqual(["4*25m RLB"]);
	});

	it("setzt und entfernt Einträge, ohne das Original zu ändern", () => {
		const mapping = { ageGroups: { "AK 10": "AK 12" }, disciplineAliases: {} };
		expect(setAgeGroupMapping(mapping, "AK 10", null).ageGroups).toEqual({});
		expect(setAgeGroupMapping(mapping, "AK 12", "AK 12").ageGroups).toEqual({ "AK 10": "AK 12", "AK 12": "AK 12" });
		expect(setDisciplineAlias(mapping, "4*25m RLB", "Rückenlage").disciplineAliases).toEqual({
			"4*25m RLB": "Rückenlage"
		});
		expect(setDisciplineAlias(mapping, "4*25m RLB", null).disciplineAliases).toEqual({});
		expect(mapping.ageGroups).toEqual({ "AK 10": "AK 12" });
	});
});

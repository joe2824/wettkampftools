import { describe, expect, it } from "vitest";
import type { BestTimes } from "./bestTimes";
import type { RecMapping } from "./mapping";
import { applyRecOverrides, buildRecProposal, toRecUpdates } from "./proposal";
import { recKey, type RulebookRecord } from "./rulebookRecords";

const rec = (ageGroup: string, gender: "female" | "male", disciplineIndex: number, discipline: string, value: number): RulebookRecord => ({
	ageGroup,
	gender,
	disciplineIndex,
	discipline,
	rec: value
});

const CLUB: RulebookRecord[] = [
	rec("AK 10", "female", 0, "4*25m Rettungsstaffel", 6000),
	rec("AK 10", "female", 1, "4*25m RLB", 8500),
	rec("AK offen", "male", 0, "4*25m Puppenstaffel", 6500),
	rec("AK Senioren", "male", 0, "4*25m Puppenstaffel", 7500),
	rec("AkW offen", "female", 0, "4*50m Retten in der Welle", 20894),
	rec("AkW offen", "male", 0, "4*50m Retten in der Welle", 16221)
];

const OFFICIAL: RulebookRecord[] = [
	rec("AK 12", "female", 0, "4*50m Hindernisstaffel", 14447),
	rec("AK 12", "female", 1, "4*25m Rückenlage ohne Armtätigkeit", 8219),
	rec("AK 12", "female", 3, "4*25m Rettungsstaffel", 5817),
	rec("AK Offen", "male", 1, "4*25m Puppenstaffel", 6404)
];

const MAPPING: RecMapping = {
	ageGroups: { "AK 10": "AK 12" },
	disciplineAliases: { "4*25m RLB": "4*25m Rückenlage ohne Armtätigkeit" }
};

const BEST: BestTimes = {
	year: 2025,
	entries: [{ ageGroup: "AkW Offen", gender: "female", disciplineIndex: 0, time: 20000 }]
};

describe("buildRecProposal", () => {
	const rows = buildRecProposal({ club: CLUB, official: OFFICIAL, bestTimes: BEST, mapping: MAPPING });
	const find = (ageGroup: string, gender: string) => rows.find((r) => r.ageGroup === ageGroup && r.gender === gender)!;

	it("übernimmt offizielle Werte über die zugeordnete AK", () => {
		expect(rows[0]).toEqual({
			ageGroup: "AK 10",
			gender: "female",
			disciplineIndex: 0,
			discipline: "4*25m Rettungsstaffel",
			oldRec: 6000,
			newRec: 5817,
			source: "official",
			note: "AK 12"
		});
	});

	it("findet Disziplinen über Aliase", () => {
		expect(rows[1]).toMatchObject({ newRec: 8219, source: "official" });
	});

	it("nimmt gleichnamige offizielle AK ohne Zuordnung, Groß- und Kleinschreibung egal", () => {
		expect(find("AK offen", "male")).toMatchObject({ newRec: 6404, source: "official" });
	});

	it("markiert Rettungsdisziplinen ohne passende offizielle AK", () => {
		expect(find("AK Senioren", "male")).toMatchObject({ newRec: 7500, source: "unchanged", note: expect.stringContaining("Zuordnung") });
	});

	it("schlägt für die Welle Bestzeit plus Zuschlag vor", () => {
		expect(find("AkW offen", "female")).toMatchObject({ newRec: 20500, source: "bestTime", note: "Bestzeit 2025: 3:20,00" });
	});

	it("markiert Wellendisziplinen ohne Bestzeit", () => {
		expect(find("AkW offen", "male")).toMatchObject({ newRec: 16221, source: "unchanged", note: expect.stringContaining("Bestzeit") });
	});

	it("nutzt einen eigenen Zuschlag", () => {
		const custom = buildRecProposal({ club: CLUB, official: OFFICIAL, bestTimes: BEST, mapping: MAPPING, waveSurchargeS: 2.5 });
		expect(custom.find((r) => r.source === "bestTime")?.newRec).toBe(20250);
	});

	it("markiert fehlende Disziplinen und fehlende Quellen", () => {
		const missingDiscipline = buildRecProposal({ club: CLUB, official: OFFICIAL, bestTimes: null, mapping: { ageGroups: { "AK 10": "AK 12" }, disciplineAliases: {} } });
		expect(missingDiscipline[1]).toMatchObject({ source: "unchanged", note: expect.stringContaining("4*25m RLB") });
		const none = buildRecProposal({ club: CLUB, official: null, bestTimes: null, mapping: MAPPING });
		expect(none.every((r) => r.source === "unchanged" && r.newRec === r.oldRec)).toBe(true);
		expect(none[0].note).toContain("offizielles Regelwerk");
	});
});

describe("toRecUpdates", () => {
	it("liefert nur geänderte Werte", () => {
		const rows = buildRecProposal({ club: CLUB, official: OFFICIAL, bestTimes: BEST, mapping: MAPPING });
		const updates = toRecUpdates(rows);
		expect(updates).toContainEqual({ ageGroup: "AK 10", gender: "female", disciplineIndex: 0, rec: 5817 });
		expect(updates.find((u) => u.ageGroup === "AK Senioren")).toBeUndefined();
	});
});

describe("applyRecOverrides", () => {
	it("setzt eigene Werte und lässt den Rest", () => {
		const rows = buildRecProposal({ club: CLUB, official: OFFICIAL, bestTimes: BEST, mapping: MAPPING });
		const edited = applyRecOverrides(rows, new Map([[recKey(rows[3]), 7400]]));
		expect(edited[3]).toMatchObject({ newRec: 7400, edited: true });
		expect(edited[0]).toMatchObject({ newRec: 5817, edited: false });
		expect(rows[3].newRec).toBe(7500);
	});
});

import { describe, expect, it } from "vitest";
import type { BestTimes } from "./bestTimes";
import type { RecMapping } from "./mapping";
import {
	applyRecOverrides,
	buildRecProposal,
	difference,
	displayRows,
	formatProposalSummary,
	summarizeProposal,
	toRecUpdates
} from "./proposal";
import { recKey, type RulebookRecord } from "./rulebookRecords";

const rec = (
	ageGroup: string,
	gender: "female" | "male",
	disciplineIndex: number,
	discipline: string,
	value: number
): RulebookRecord => ({
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
	const rows = buildRecProposal({
		club: CLUB,
		official: OFFICIAL,
		officialName: "DLRG 2026",
		bestTimes: BEST,
		mapping: MAPPING
	});
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
			note: "DLRG 2026 · AK 12"
		});
	});

	it("findet Disziplinen über Aliase", () => {
		expect(rows[1]).toMatchObject({
			newRec: 8219,
			source: "official",
			note: "DLRG 2026 · AK 12 · als „4*25m Rückenlage ohne Armtätigkeit“"
		});
	});

	it("nimmt gleichnamige offizielle AK ohne Zuordnung, Groß- und Kleinschreibung egal", () => {
		expect(find("AK offen", "male")).toMatchObject({ newRec: 6404, source: "official", note: "DLRG 2026 · AK Offen" });
	});

	it("markiert Rettungsdisziplinen ohne passende offizielle AK", () => {
		expect(find("AK Senioren", "male")).toMatchObject({
			newRec: 7500,
			source: "unchanged",
			note: expect.stringContaining("Zuordnung")
		});
	});

	it("schlägt für die Welle Bestzeit plus Zuschlag vor", () => {
		expect(find("AkW offen", "female")).toMatchObject({
			newRec: 20500,
			source: "bestTime",
			note: "Bestzeit 2025: 3:20,00 + 5,00 s"
		});
	});

	it("markiert Wellendisziplinen ohne Bestzeit", () => {
		expect(find("AkW offen", "male")).toMatchObject({
			newRec: 16221,
			source: "unchanged",
			note: expect.stringContaining("Bestzeit")
		});
	});

	it("nutzt einen eigenen Zuschlag", () => {
		const custom = buildRecProposal({
			club: CLUB,
			official: OFFICIAL,
			officialName: "DLRG 2026",
			bestTimes: BEST,
			mapping: MAPPING,
			waveSurchargeS: 2.5
		});
		expect(custom.find((r) => r.source === "bestTime")).toMatchObject({
			newRec: 20250,
			note: "Bestzeit 2025: 3:20,00 + 2,50 s"
		});
	});

	it("übernimmt ohne Zuschlag die echte Bestzeit", () => {
		const plain = buildRecProposal({
			club: CLUB,
			official: OFFICIAL,
			officialName: "DLRG 2026",
			bestTimes: BEST,
			mapping: MAPPING,
			waveSurchargeS: 0
		});
		expect(plain.find((r) => r.source === "bestTime")).toMatchObject({
			newRec: 20000,
			note: "Bestzeit 2025: 3:20,00 (ohne Zuschlag)"
		});
	});

	it("markiert fehlende Disziplinen und fehlende Quellen", () => {
		const missingDiscipline = buildRecProposal({
			club: CLUB,
			official: OFFICIAL,
			officialName: "DLRG 2026",
			bestTimes: null,
			mapping: { ageGroups: { "AK 10": "AK 12" }, disciplineAliases: {} }
		});
		expect(missingDiscipline[1]).toMatchObject({ source: "unchanged", note: expect.stringContaining("4*25m RLB") });
		const none = buildRecProposal({
			club: CLUB,
			official: null,
			officialName: null,
			bestTimes: null,
			mapping: MAPPING
		});
		expect(none.every((r) => r.source === "unchanged" && r.newRec === r.oldRec)).toBe(true);
		expect(none[0].note).toContain("offizielles Regelwerk");
	});
});

describe("toRecUpdates", () => {
	it("liefert nur geänderte Werte", () => {
		const rows = buildRecProposal({
			club: CLUB,
			official: OFFICIAL,
			officialName: "DLRG 2026",
			bestTimes: BEST,
			mapping: MAPPING
		});
		const updates = toRecUpdates(rows);
		expect(updates).toContainEqual({ ageGroup: "AK 10", gender: "female", disciplineIndex: 0, rec: 5817 });
		expect(updates.find((u) => u.ageGroup === "AK Senioren")).toBeUndefined();
	});
});

describe("applyRecOverrides", () => {
	it("setzt eigene Werte und lässt den Rest", () => {
		const rows = buildRecProposal({
			club: CLUB,
			official: OFFICIAL,
			officialName: "DLRG 2026",
			bestTimes: BEST,
			mapping: MAPPING
		});
		const edited = applyRecOverrides(rows, new Map([[recKey(rows[3]), 7400]]));
		expect(edited[3]).toMatchObject({ newRec: 7400, edited: true });
		expect(edited[0]).toMatchObject({ newRec: 5817, edited: false });
		expect(rows[3].newRec).toBe(7500);
	});
});

describe("offizielle Quelle ohne Namen", () => {
	it("nennt nur die AK", () => {
		const rows = buildRecProposal({
			club: CLUB,
			official: OFFICIAL,
			officialName: null,
			bestTimes: null,
			mapping: MAPPING
		});
		expect(rows[0].note).toBe("Offizielles Regelwerk · AK 12");
	});
});

describe("difference", () => {
	it("rechnet neu minus alt in Hundertsteln", () => {
		expect(difference({ oldRec: 6000, newRec: 5817 })).toBe(-183);
		expect(difference({ oldRec: 6000, newRec: 6000 })).toBe(0);
	});
});

describe("summarizeProposal", () => {
	it("zählt geändert, unverändert, ohne Quelle und eigene Werte getrennt", () => {
		const rows = buildRecProposal({
			club: CLUB,
			official: OFFICIAL,
			officialName: "DLRG 2026",
			bestTimes: BEST,
			mapping: MAPPING
		});
		const same = { ...rows[0], newRec: rows[0].oldRec };
		const edited = applyRecOverrides([...rows, same], new Map([[recKey(rows[3]), 7400]]));
		expect(summarizeProposal(edited)).toEqual({ changed: 4, unchanged: 1, noSource: 1, edited: 1 });
	});

	it("kommt ohne Kennzeichen für eigene Werte aus", () => {
		const rows = buildRecProposal({
			club: CLUB,
			official: null,
			officialName: null,
			bestTimes: null,
			mapping: MAPPING
		});
		expect(summarizeProposal(rows)).toEqual({ changed: 0, unchanged: 0, noSource: 6, edited: 0 });
	});
});

describe("displayRows", () => {
	const rows = buildRecProposal({
		club: [CLUB[4], CLUB[0], CLUB[5], CLUB[2]],
		official: OFFICIAL,
		officialName: "DLRG 2026",
		bestTimes: BEST,
		mapping: MAPPING
	});

	it("zeigt Rettung vor Welle und behält sonst die Reihenfolge", () => {
		expect(displayRows(rows, false).map((r) => r.discipline)).toEqual([
			"4*25m Rettungsstaffel",
			"4*25m Puppenstaffel",
			"4*50m Retten in der Welle",
			"4*50m Retten in der Welle"
		]);
		expect(
			displayRows(rows, false)
				.slice(2)
				.map((r) => r.gender)
		).toEqual(["female", "male"]);
	});

	it("blendet auf Wunsch unveränderte Werte aus", () => {
		expect(displayRows(rows, true).every((r) => r.newRec !== r.oldRec)).toBe(true);
		expect(displayRows(rows, true)).toHaveLength(3);
	});
});

describe("formatProposalSummary", () => {
	it("nennt alle Gruppen", () => {
		expect(formatProposalSummary({ changed: 9, unchanged: 27, noSource: 3, edited: 1 })).toBe(
			"9 geändert · 27 unverändert · 3 ohne Quelle · 1 eigener Wert"
		);
		expect(formatProposalSummary({ changed: 0, unchanged: 1, noSource: 0, edited: 2 })).toBe(
			"0 geändert · 1 unverändert · 2 eigene Werte"
		);
	});
});

import { describe, expect, it } from "vitest";
import type { RecMapping } from "./mapping";
import {
	buildRecProposal,
	difference,
	displayRows,
	EMPTY_DECISIONS,
	formatProposalSummary,
	openCount,
	pendingRecordKeys,
	resolveRecRows,
	summarizeProposal,
	toRecUpdates,
	type RecDecisions,
	type RecProposalInput
} from "./proposal";
import { recKey, type RulebookRecord } from "./rulebookRecords";
import type { WaveRecord } from "./waveRecords";

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
	rec("AkW offen", "male", 0, "4*50m Retten in der Welle", 16221),
	rec("AkW 12", "male", 0, "4*50m Retten in der Welle", 18000)
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

const RECORDS: WaveRecord[] = [
	{
		ageGroup: "AkW Offen",
		gender: "female",
		discipline: "4*50m Retten in der Welle",
		time: 20500,
		slowest: 24000,
		average: 22000,
		teams: 6,
		year: 2019
	},
	{
		ageGroup: "AkW 12",
		gender: "male",
		discipline: "4*50m Retten in der Welle",
		time: 18300,
		slowest: 21000,
		average: 19500,
		teams: 4,
		year: 2023
	}
];

const INPUT: RecProposalInput = {
	club: CLUB,
	official: OFFICIAL,
	officialName: "DLRG 2026",
	records: RECORDS,
	mapping: MAPPING
};

const decisions = (partial: Partial<RecDecisions>): RecDecisions => ({ ...EMPTY_DECISIONS, ...partial });

describe("buildRecProposal", () => {
	const rows = buildRecProposal(INPUT);
	const find = (ageGroup: string, gender: string) => rows.find((r) => r.ageGroup === ageGroup && r.gender === gender)!;

	it("übernimmt offizielle Werte über die zugeordnete AK", () => {
		expect(rows[0]).toEqual({
			ageGroup: "AK 10",
			gender: "female",
			disciplineIndex: 0,
			discipline: "4*25m Rettungsstaffel",
			oldRec: 6000,
			proposedRec: 5817,
			source: "official",
			note: "DLRG 2026 · AK 12"
		});
	});

	it("findet Disziplinen über Aliase", () => {
		expect(rows[1]).toMatchObject({
			proposedRec: 8219,
			source: "official",
			note: "DLRG 2026 · AK 12 · als „4*25m Rückenlage ohne Armtätigkeit“"
		});
	});

	it("nimmt gleichnamige offizielle AK ohne Zuordnung, Groß- und Kleinschreibung egal", () => {
		expect(find("AK offen", "male")).toMatchObject({
			proposedRec: 6404,
			source: "official",
			note: "DLRG 2026 · AK Offen"
		});
	});

	it("markiert Rettungsdisziplinen ohne passende offizielle AK", () => {
		expect(find("AK Senioren", "male")).toMatchObject({
			proposedRec: null,
			source: "none",
			note: expect.stringContaining("Zuordnung")
		});
	});

	it("schlägt für die Welle den Rekord vor, Schreibweise der Altersklasse egal", () => {
		expect(find("AkW offen", "female")).toMatchObject({
			proposedRec: 20500,
			source: "bestTime",
			note: "Rekord 2019: 3:25,00"
		});
	});

	it("markiert Wellendisziplinen ohne Rekord", () => {
		expect(find("AkW offen", "male")).toMatchObject({
			proposedRec: null,
			source: "none",
			note: expect.stringContaining("Rekord")
		});
	});

	it("markiert fehlende Disziplinen und fehlende Quellen", () => {
		const missingDiscipline = buildRecProposal({
			...INPUT,
			records: [],
			mapping: { ageGroups: { "AK 10": "AK 12" }, disciplineAliases: {} }
		});
		expect(missingDiscipline[1]).toMatchObject({ source: "none", note: expect.stringContaining("4*25m RLB") });
		const none = buildRecProposal({ ...INPUT, official: null, officialName: null, records: [] });
		expect(none.every((r) => r.source === "none" && r.proposedRec === null)).toBe(true);
		expect(none[0].note).toContain("offizielles Regelwerk");
	});
});

describe("resolveRecRows", () => {
	const proposal = buildRecProposal(INPUT);
	const rows = resolveRecRows(proposal, EMPTY_DECISIONS);
	const find = (ageGroup: string, gender: string) => rows.find((r) => r.ageGroup === ageGroup && r.gender === gender)!;
	const waveKey = recKey(find("AkW offen", "female"));

	it("übernimmt offizielle Werte sofort, auch langsamere", () => {
		expect(rows[0]).toMatchObject({ newRec: 5817, status: "adopted" });
		const slower = resolveRecRows(
			buildRecProposal({ ...INPUT, club: [rec("AK 10", "female", 0, "4*25m Rettungsstaffel", 5000)] }),
			EMPTY_DECISIONS
		);
		expect(slower[0]).toMatchObject({ newRec: 5817, status: "adopted" });
	});

	it("erkennt unveränderte offizielle Werte", () => {
		const same = resolveRecRows(
			buildRecProposal({ ...INPUT, club: [rec("AK 10", "female", 0, "4*25m Rettungsstaffel", 5817)] }),
			EMPTY_DECISIONS
		);
		expect(same[0]).toMatchObject({ newRec: 5817, status: "unchanged" });
	});

	it("lässt ohne Quelle den alten Wert und verlangt eine Prüfung", () => {
		expect(find("AK Senioren", "male")).toMatchObject({ newRec: 7500, status: "missing" });
	});

	it("wartet bei einem schnelleren Wellen-Rekord auf die Übernahme", () => {
		expect(find("AkW offen", "female")).toMatchObject({ newRec: 20894, status: "record" });
		const accepted = resolveRecRows(proposal, decisions({ accepted: new Set([waveKey]) }));
		expect(accepted.find((r) => recKey(r) === waveKey)).toMatchObject({ newRec: 20500, status: "adopted" });
	});

	it("behält bei einem langsameren Rekord den alten Wert, auch wenn übernommen", () => {
		const row = find("AkW 12", "male");
		expect(row).toMatchObject({ proposedRec: 18300, newRec: 18000, status: "noRecord" });
		const accepted = resolveRecRows(proposal, decisions({ accepted: new Set([recKey(row)]) }));
		expect(accepted.find((r) => r.ageGroup === "AkW 12")).toMatchObject({ newRec: 18000, status: "noRecord" });
	});

	it("erkennt einen Rec-Wert, der schon dem Rekord entspricht", () => {
		const equal = resolveRecRows(
			buildRecProposal({ ...INPUT, club: [rec("AkW offen", "female", 0, "4*50m Retten in der Welle", 20500)] }),
			EMPTY_DECISIONS
		);
		expect(equal[0]).toMatchObject({ newRec: 20500, status: "unchanged" });
	});

	it("setzt eigene Werte vor alles andere", () => {
		const edited = resolveRecRows(proposal, decisions({ overrides: new Map([[recKey(proposal[3]), 7400]]) }));
		expect(edited[3]).toMatchObject({ newRec: 7400, status: "edited" });
		expect(edited[0]).toMatchObject({ newRec: 5817, status: "adopted" });
	});

	it("nennt die noch offenen Rekorde", () => {
		expect(pendingRecordKeys(rows)).toEqual([waveKey]);
		expect(pendingRecordKeys(resolveRecRows(proposal, decisions({ accepted: new Set([waveKey]) })))).toEqual([]);
	});
});

describe("toRecUpdates", () => {
	it("liefert nur geänderte Werte", () => {
		const rows = resolveRecRows(buildRecProposal(INPUT), EMPTY_DECISIONS);
		const updates = toRecUpdates(rows);
		expect(updates).toContainEqual({ ageGroup: "AK 10", gender: "female", disciplineIndex: 0, rec: 5817 });
		expect(updates.find((u) => u.ageGroup === "AK Senioren")).toBeUndefined();
		expect(updates.find((u) => u.ageGroup === "AkW offen")).toBeUndefined();
	});
});

describe("difference", () => {
	it("rechnet neu minus alt in Hundertsteln", () => {
		expect(difference({ oldRec: 6000, newRec: 5817 })).toBe(-183);
		expect(difference({ oldRec: 6000, newRec: 6000 })).toBe(0);
	});
});

describe("summarizeProposal", () => {
	it("zählt jeden Stand getrennt", () => {
		const proposal = buildRecProposal(INPUT);
		const rows = resolveRecRows(proposal, decisions({ overrides: new Map([[recKey(proposal[3]), 7400]]) }));
		const summary = summarizeProposal(rows);
		expect(summary).toEqual({ adopted: 3, unchanged: 0, record: 1, noRecord: 1, missing: 1, edited: 1 });
		expect(openCount(summary)).toBe(2);
	});
});

describe("displayRows", () => {
	const rows = resolveRecRows(
		buildRecProposal({ ...INPUT, club: [CLUB[4], CLUB[0], CLUB[6], CLUB[2], CLUB[3]] }),
		EMPTY_DECISIONS
	);

	it("zeigt Rettung vor Welle und behält sonst die Reihenfolge", () => {
		expect(displayRows(rows, false).map((r) => r.ageGroup)).toEqual([
			"AK 10",
			"AK offen",
			"AK Senioren",
			"AkW offen",
			"AkW 12"
		]);
	});

	it("blendet auf Wunsch Zeilen aus, bei denen der alte Wert bleibt", () => {
		expect(displayRows(rows, true).map((r) => r.status)).toEqual(["adopted", "adopted", "missing", "record"]);
	});
});

describe("formatProposalSummary", () => {
	it("nennt alle Gruppen", () => {
		expect(formatProposalSummary({ adopted: 9, unchanged: 27, record: 2, noRecord: 1, missing: 3, edited: 1 })).toBe(
			"9 übernommen · 27 unverändert · 2 Rekorde zum Übernehmen · 1 Rekord langsamer · 3 ohne Quelle · 1 eigener Wert"
		);
		expect(formatProposalSummary({ adopted: 0, unchanged: 1, record: 1, noRecord: 2, missing: 0, edited: 2 })).toBe(
			"0 übernommen · 1 unverändert · 1 Rekord zum Übernehmen · 2 Rekorde langsamer · 2 eigene Werte"
		);
	});
});

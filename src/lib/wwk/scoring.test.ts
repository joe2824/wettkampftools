import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ResultRow } from "./results";
import { rankOrganisations, scoreTeams, trophyFormula, trophyPointsFor, type ScoredTeam } from "./scoring";

const ORDER = ["AK 12", "AK 13/14", "AK offen", "AkW 13/14", "AkW offen"];

let nextRow = 1;
function row(overrides: Partial<ResultRow>): ResultRow {
	return {
		sourceRow: nextRow++,
		place: 1,
		name: "Musterstadt 1",
		organisation: "Musterstadt",
		ageGroupRaw: "AK 12",
		gender: "weiblich",
		competitionPoints: 1234.5,
		members: ["Anna Meier"],
		...overrides,
	};
}

function points(scored: ScoredTeam[]): number[] {
	return scored.map((team) => team.trophyPoints);
}

describe("trophyPointsFor", () => {
	it("vergibt bei 5 Mannschaften 6/4/3/2/1", () => {
		expect([1, 2, 3, 4, 5].map((place) => trophyPointsFor(place, 5))).toEqual([6, 4, 3, 2, 1]);
	});

	it("rechnet Platzgleichheit 1,2,2,4 bei 4 Mannschaften zu 5,3,3,1", () => {
		expect([1, 2, 2, 4].map((place) => trophyPointsFor(place, 4))).toEqual([5, 3, 3, 1]);
	});

	it("fällt nie unter 0", () => {
		expect(trophyPointsFor(7, 5)).toBe(0);
		expect(trophyPointsFor(6, 5)).toBe(0);
	});
});

describe("trophyFormula", () => {
	it("zeigt die Rechnung mit eingesetzten Zahlen", () => {
		expect(trophyFormula(1, 5)).toBe("5 + 1 = 6");
		expect(trophyFormula(3, 5)).toBe("5 + 1 − 3 = 3");
		expect(trophyFormula(null, 5)).toBe("ohne Platz = 0");
	});

	it("kennzeichnet die Begrenzung auf 0", () => {
		expect(trophyFormula(7, 5)).toBe("5 + 1 − 7 → 0");
	});
});

describe("scoreTeams", () => {
	it("wertet eine Gruppe mit 5 Mannschaften", () => {
		const rows = [1, 2, 3, 4, 5].map((place) => row({ place }));
		const { scored, notScored } = scoreTeams(rows, ORDER, { excludeUnplaced: true });
		expect(notScored).toEqual([]);
		expect(points(scored)).toEqual([6, 4, 3, 2, 1]);
		expect(scored.every((team) => team.n === 5)).toBe(true);
		expect(scored[0]).toMatchObject({
			ageGroup: "AK 12",
			kind: "rescue",
			gender: "weiblich",
			place: 1,
			formula: "5 + 1 = 6",
		});
		expect(scored[0].warning).toBeUndefined();
	});

	it("trennt Gruppen nach Geschlecht und nach Rettung/Welle", () => {
		const rows = [
			row({ place: 1, gender: "weiblich" }),
			row({ place: 2, gender: "weiblich" }),
			row({ place: 1, gender: "männlich" }),
			row({ place: 1, ageGroupRaw: "AkW 13/14", gender: "weiblich" }),
			row({ place: 1, ageGroupRaw: "AK 13/14", gender: "weiblich" }),
		];
		const { scored } = scoreTeams(rows, ORDER, { excludeUnplaced: true });
		expect(scored.map((team) => [team.kind, team.n, team.trophyPoints])).toEqual([
			["rescue", 2, 3],
			["rescue", 2, 1],
			["rescue", 1, 2],
			["wave", 1, 2],
			["rescue", 1, 2],
		]);
	});

	it("ordnet Altersklassen ohne Beachtung der Groß-/Kleinschreibung zu", () => {
		const { scored } = scoreTeams([row({ ageGroupRaw: "ak OFFEN" })], ORDER, { excludeUnplaced: true });
		expect(scored[0].ageGroup).toBe("AK offen");
		expect(scored[0].kind).toBe("rescue");
	});

	it("wertet unbekannte Altersklassen nicht", () => {
		const unknown = row({ ageGroupRaw: "AK 99" });
		const { scored, notScored } = scoreTeams([unknown], ORDER, { excludeUnplaced: true });
		expect(scored).toEqual([]);
		expect(notScored).toEqual([{ row: unknown, reason: "unknownAgeGroup", message: "Altersklasse unbekannt" }]);
	});

	it("zählt bei ausgeschlossenen Teams ohne Platz nur Teams mit Platz", () => {
		const unplaced = row({ place: null });
		const rows = [row({ place: 1 }), row({ place: 2 }), unplaced];
		const { scored, notScored } = scoreTeams(rows, ORDER, { excludeUnplaced: true });
		expect(points(scored)).toEqual([3, 1]);
		expect(scored.every((team) => team.n === 2)).toBe(true);
		expect(notScored).toEqual([{ row: unplaced, reason: "unplaced", message: "ohne Platz" }]);
	});

	it("zählt ohne Ausschluss alle Teams und gibt Teams ohne Platz 0 Punkte", () => {
		const rows = [row({ place: 1 }), row({ place: 2 }), row({ place: null })];
		const { scored, notScored } = scoreTeams(rows, ORDER, { excludeUnplaced: false });
		expect(notScored).toEqual([]);
		expect(points(scored)).toEqual([4, 2, 0]);
		expect(scored.every((team) => team.n === 3)).toBe(true);
		expect(scored[2]).toMatchObject({ place: null, formula: "ohne Platz = 0" });
		expect(scored.some((team) => Number.isNaN(team.trophyPoints))).toBe(false);
	});

	it("übernimmt Platzgleichheit aus JAuswertung", () => {
		const rows = [1, 2, 2, 4].map((place) => row({ place }));
		const { scored } = scoreTeams(rows, ORDER, { excludeUnplaced: true });
		expect(points(scored)).toEqual([5, 3, 3, 1]);
	});

	it("warnt, wenn der Platz größer als die Anzahl ist", () => {
		const rows = [row({ place: 1 }), row({ place: 5 })];
		const { scored } = scoreTeams(rows, ORDER, { excludeUnplaced: true });
		expect(scored[1]).toMatchObject({ trophyPoints: 0, warning: "placeAboveCount" });
		expect(scored[0].warning).toBeUndefined();
	});
});

describe("rankOrganisations", () => {
	function team(organisation: string, trophyPoints: number, overrides: Partial<ScoredTeam> = {}): ScoredTeam {
		return {
			row: row({ organisation }),
			ageGroup: "AK 12",
			kind: "rescue",
			gender: "weiblich",
			place: 1,
			n: 1,
			trophyPoints,
			formula: "",
			...overrides,
		};
	}

	it("summiert je Ortsgruppe und rankt dicht", () => {
		const scored = [
			team("Beispielhausen", 18),
			team("Musterstadt", 12),
			team("Musterstadt", 8),
			team("Adorf", 18),
			team("Zedorf", 15),
		];
		const { standings, tieForFirst } = rankOrganisations(scored, "rescue");
		expect(standings.map((s) => [s.rank, s.organisation, s.trophyPoints])).toEqual([
			[1, "Musterstadt", 20],
			[2, "Adorf", 18],
			[2, "Beispielhausen", 18],
			[3, "Zedorf", 15],
		]);
		expect(tieForFirst).toBe(false);
	});

	it("filtert nach Wertung und erkennt Gleichstand um Platz 1", () => {
		const scored = [team("Musterstadt", 10), team("Beispielhausen", 10), team("Adorf", 30, { kind: "wave" })];
		const rescue = rankOrganisations(scored, "rescue");
		expect(rescue.tieForFirst).toBe(true);
		expect(rescue.standings.map((s) => s.organisation)).toEqual(["Beispielhausen", "Musterstadt"]);
		const wave = rankOrganisations(scored, "wave");
		expect(wave.standings.map((s) => s.organisation)).toEqual(["Adorf"]);
		expect(wave.tieForFirst).toBe(false);
	});

	it("verwendet den getrimmten Gliederungsnamen", () => {
		const { standings } = rankOrganisations([team(" Musterstadt ", 3), team("Musterstadt", 2)], "rescue");
		expect(standings).toHaveLength(1);
		expect(standings[0]).toMatchObject({ organisation: "Musterstadt", trophyPoints: 5 });
	});

	it("sortiert Teams einer Ortsgruppe nach AK-Reihenfolge und Geschlecht", () => {
		const rows = [
			row({ ageGroupRaw: "AK offen", gender: "weiblich" }),
			row({ ageGroupRaw: "AK 12", gender: "weiblich" }),
			row({ ageGroupRaw: "AK 12", gender: "männlich" }),
		];
		const { scored } = scoreTeams(rows, ORDER, { excludeUnplaced: true });
		const { standings } = rankOrganisations(scored, "rescue", ORDER);
		expect(standings[0].teams.map((t) => `${t.ageGroup} ${t.gender}`)).toEqual([
			"AK 12 männlich",
			"AK 12 weiblich",
			"AK offen weiblich",
		]);
	});

	it("liefert eine leere Rangliste ohne Gleichstand", () => {
		expect(rankOrganisations([], "wave")).toEqual({ standings: [], tieForFirst: false });
	});
});

describe("Trennung von Wettkampfpunkten", () => {
	it("verwendet in der Pokalwertung keine Wettkampfpunkte", () => {
		const source = readFileSync(resolve(process.cwd(), "src/lib/wwk/scoring.ts"), "utf-8");
		expect(source).not.toContain("competitionPoints");
	});
});

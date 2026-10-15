import { describe, expect, it } from "vitest";
import type { Sheet } from "$lib/platform/workbook";
import { buildEvaluationSheets } from "./evaluationExport";
import type { ResultRow } from "./results";
import { rankOrganisations, scoreTeams } from "./scoring";

const ORDER = ["AK 12", "AK 13/14", "AkW 13/14"];

function row(sourceRow: number, overrides: Partial<ResultRow>): ResultRow {
	return {
		sourceRow,
		place: 1,
		name: "Musterstadt 1",
		organisation: "Musterstadt",
		ageGroupRaw: "AK 12",
		gender: "weiblich",
		competitionPoints: 1234.5,
		members: ["Anna Meier"],
		...overrides
	};
}

const ROWS: ResultRow[] = [
	row(1, { place: 1, name: "Musterstadt 1", organisation: "Musterstadt" }),
	row(2, {
		place: 2,
		name: "Beispielhausen 1",
		organisation: "Beispielhausen"
	}),
	row(3, {
		place: 1,
		name: "Beispielhausen W",
		organisation: "Beispielhausen",
		ageGroupRaw: "AkW 13/14"
	}),
	row(4, {
		place: 1,
		name: "Unbekannt 1",
		organisation: "Musterstadt",
		ageGroupRaw: "AK 99"
	}),
	row(6, { place: 3, name: "Musterstadt 2", organisation: "Musterstadt" })
];

const SOURCE: Sheet = {
	name: "Daten",
	rows: [
		["Platz", "Name", "Gliederung", "Altersklasse", "Geschlecht", "Punkte"],
		[1, "Musterstadt 1", "Musterstadt", "AK 12", "weiblich", 1234.5],
		[2, "Beispielhausen 1", "Beispielhausen", "AK 12", "weiblich", 1000],
		[1, "Beispielhausen W", "Beispielhausen", "AkW 13/14", "weiblich", 900],
		[1, "Unbekannt 1", "Musterstadt", "AK 99", "weiblich"],
		[],
		[3, "Musterstadt 2", "Musterstadt", "AK 12", "weiblich", 800]
	]
};

function build(): Sheet[] {
	const { scored, notScored } = scoreTeams(ROWS, ORDER, {
		excludeUnplaced: true
	});
	return buildEvaluationSheets({
		rescue: rankOrganisations(scored, "rescue", ORDER).standings,
		wave: rankOrganisations(scored, "wave", ORDER).standings,
		scored,
		notScored,
		source: SOURCE
	});
}

function sheet(name: string): Sheet {
	const found = build().find((s) => s.name === name);
	if (!found) throw new Error(`Blatt ${name} fehlt`);
	return found;
}

describe("buildEvaluationSheets", () => {
	it("erzeugt die Blätter in fester Reihenfolge", () => {
		expect(build().map((s) => s.name)).toEqual([
			"Rettungswettkampf",
			"Wellenwettkampf",
			"Aufschlüsselung",
			"Quelldaten"
		]);
	});

	it("schreibt die Gesamtwertung mit Platz, Gliederung und Pokalpunkten als Zahlen", () => {
		expect(sheet("Rettungswettkampf").rows).toEqual([
			["Platz", "Gliederung", "Pokalpunkte"],
			[1, "Musterstadt", 5],
			[2, "Beispielhausen", 2]
		]);
		expect(sheet("Wellenwettkampf").rows).toEqual([
			["Platz", "Gliederung", "Pokalpunkte"],
			[1, "Beispielhausen", 2]
		]);
	});

	it("schlüsselt je Wertung und Gliederung in Ranglistenfolge auf, danach nicht Gewertetes", () => {
		const rows = sheet("Aufschlüsselung").rows;
		expect(rows[0]).toEqual([
			"Wertung",
			"Gliederung",
			"Mannschaft",
			"Altersklasse",
			"Geschlecht",
			"Platz",
			"Anzahl Mannschaften",
			"Rechnung",
			"Pokalpunkte"
		]);
		expect(rows.slice(1).map((r) => [r[0], r[2]])).toEqual([
			["Rettungswertung", "Musterstadt 1"],
			["Rettungswertung", "Musterstadt 2"],
			["Rettungswertung", "Beispielhausen 1"],
			["Wellenwertung", "Beispielhausen W"],
			[null, "Unbekannt 1"]
		]);
		expect(rows[1]).toEqual([
			"Rettungswertung",
			"Musterstadt",
			"Musterstadt 1",
			"AK 12",
			"weiblich",
			1,
			3,
			"3 + 1 = 4",
			4
		]);
		expect(rows[5]).toEqual([
			null,
			"Musterstadt",
			"Unbekannt 1",
			"AK 99",
			"weiblich",
			1,
			null,
			"nicht gewertet: Altersklasse unbekannt",
			null
		]);
	});

	it("hängt an die Quelldaten eine Spalte Pokalpunkte an, zugeordnet über die Datenzeile", () => {
		const rows = sheet("Quelldaten").rows;
		expect(rows[0]).toEqual(["Platz", "Name", "Gliederung", "Altersklasse", "Geschlecht", "Punkte", "Pokalpunkte"]);
		expect(rows.map((r) => r[6])).toEqual(["Pokalpunkte", 4, 2, 2, null, null, 1]);
		expect(rows[4]).toEqual([1, "Unbekannt 1", "Musterstadt", "AK 99", "weiblich", null, null]);
		expect(rows[5]).toHaveLength(7);
	});

	it("lässt die Spalte Punkte aus JAuswertung und das Quellblatt unverändert", () => {
		const before = structuredClone(SOURCE);
		const rows = sheet("Quelldaten").rows;
		expect(rows.map((r) => r[5])).toEqual(["Punkte", 1234.5, 1000, 900, null, null, 800]);
		expect(SOURCE).toEqual(before);
	});
});

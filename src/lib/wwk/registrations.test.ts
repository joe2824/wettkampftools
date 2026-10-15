import { describe, expect, it } from "vitest";
import { parseRegistrationCsv, type CsvRow } from "../io/csv";
import { buildRegistrationCsv, type RegistrationTeamFixture } from "../testing/fixtures";
import { defaultSettings, type Settings } from "../settings/settings";
import { SENIOR_AGE_GROUP } from "./ageGroups";
import { assignTeamNames, MAX_MEMBERS, parseRegistrations, type Team } from "./registrations";

function settingsWith(overrides: Partial<Settings> = {}): Settings {
	return { ...defaultSettings(), ...overrides };
}

function rowsFor(teams: Partial<RegistrationTeamFixture>[]): CsvRow[] {
	return parseRegistrationCsv(new TextEncoder().encode(buildRegistrationCsv(teams))).rows;
}

function parse(teams: Partial<RegistrationTeamFixture>[], settings = settingsWith()) {
	return parseRegistrations(rowsFor(teams), settings);
}

function names(teams: Team[]): string[] {
	return teams.map((team) => team.name);
}

describe("MAX_MEMBERS", () => {
	it("ist 5", () => {
		expect(MAX_MEMBERS).toBe(5);
	});
});

describe("parseRegistrations", () => {
	it("entfernt Leerzeichen um die Gliederung", () => {
		const row: CsvRow = { gliederung: "Musterstadt ", name: "x", ak: "AK 12", geschlecht: "weiblich" };
		const { teams } = parseRegistrations([row], settingsWith());
		expect(teams[0].organisation).toBe("Musterstadt");
		expect(teams[0].name).toBe("Musterstadt");
	});

	it("ersetzt freie Teamnamen durch die Gliederung", () => {
		const { teams, renames } = parse([{ gliederung: "Musterstadt", name: "Die Haie" }]);
		expect(teams[0].originalName).toBe("Die Haie");
		expect(teams[0].name).toBe("Musterstadt");
		expect(renames).toEqual([{ teamId: teams[0].id, from: "Die Haie", to: "Musterstadt" }]);
	});

	it("nummeriert zwei Teams derselben Gruppe in Dateireihenfolge", () => {
		const { teams } = parse([
			{ gliederung: "Musterstadt", name: "A" },
			{ gliederung: "Beispielhausen", name: "Beispielhausen" },
			{ gliederung: "Musterstadt", name: "B" }
		]);
		expect(names(teams)).toEqual(["Musterstadt 1", "Beispielhausen", "Musterstadt 2"]);
	});

	it("nummeriert nicht bei unterschiedlichem Geschlecht", () => {
		const { teams } = parse([
			{ gliederung: "Musterstadt", geschlecht: "weiblich" },
			{ gliederung: "Musterstadt", geschlecht: "männlich" }
		]);
		expect(names(teams)).toEqual(["Musterstadt", "Musterstadt"]);
	});

	it("nummeriert nach der Senioren-Vereinfachung", () => {
		const { teams } = parse([
			{ gliederung: "Musterstadt", ak: "AK 100" },
			{ gliederung: "Musterstadt", ak: "AK 140" }
		]);
		expect(teams.map((team) => team.ageGroup)).toEqual([SENIOR_AGE_GROUP, SENIOR_AGE_GROUP]);
		expect(names(teams)).toEqual(["Musterstadt 1", "Musterstadt 2"]);
	});

	it("trennt Senioren-AKs ohne Vereinfachung", () => {
		const { teams } = parse(
			[
				{ gliederung: "Musterstadt", ak: "AK 100" },
				{ gliederung: "Musterstadt", ak: "AK 140" }
			],
			settingsWith({ simplifySeniorAgeGroups: false })
		);
		expect(teams.map((team) => team.ageGroup)).toEqual(["AK 100", "AK 140"]);
		expect(names(teams)).toEqual(["Musterstadt", "Musterstadt"]);
	});

	it("zählt unterschiedliche Schreibweisen als eine Gruppe", () => {
		const { teams } = parse([
			{ gliederung: "Musterstadt", ak: "AK offen" },
			{ gliederung: "Musterstadt", ak: "ak  Offen" }
		]);
		expect(teams.map((team) => team.ageGroup)).toEqual(["AK Offen", "AK Offen"]);
		expect(names(teams)).toEqual(["Musterstadt 1", "Musterstadt 2"]);
	});

	it("behält unbekannte AK in vereinheitlichter Schreibweise", () => {
		const { teams } = parse([{ ak: "ak 99" }]);
		expect(teams[0].ageGroup).toBe("AK 99");
		expect(teams[0].ageGroupKnown).toBe(false);
	});

	it("kennzeichnet bekannte AK", () => {
		const { teams } = parse([{ ak: "AK 12" }]);
		expect(teams[0].ageGroupKnown).toBe(true);
	});

	it("liest Mitglieder und verwirft leere", () => {
		const { teams } = parse([
			{
				members: [
					{ lastName: "Meier", firstName: "Anna", birthYear: 2010 },
					{ lastName: "", firstName: "", birthYear: "" },
					{ lastName: "", firstName: "Max", birthYear: 2011 }
				]
			}
		]);
		expect(teams[0].members).toEqual([
			{ lastName: "Meier", firstName: "Anna", yearOfBirth: "2010" },
			{ lastName: "", firstName: "Max", yearOfBirth: "2011" }
		]);
	});

	it("übernimmt Grunddaten, Zeilennummer und stabile ID", () => {
		const { teams } = parse([
			{ gliederung: "Musterstadt" },
			{ gliederung: "Beispielhausen", geschlecht: "männlich", qualifikation: "Q", meldepunkte: 12 }
		]);
		expect(teams[1]).toMatchObject({
			id: "r2",
			sourceRow: 2,
			gender: "männlich",
			qualification: "Q",
			reportedPoints: "12"
		});
	});

	it("listet nur geänderte Namen", () => {
		const { renames } = parse([
			{ gliederung: "Musterstadt", name: "Musterstadt" },
			{ gliederung: "Beispielhausen", name: "Team B" }
		]);
		expect(renames).toEqual([{ teamId: "r2", from: "Team B", to: "Beispielhausen" }]);
	});

	it("verwendet den eigenen Mannschaftsnamen der Gliederung samt Nummerierung", () => {
		const settings = settingsWith({ teamNameOverrides: { Musterstadt: "Musterstadt / Süd" } });
		const { teams, renames } = parse(
			[
				{ gliederung: "Musterstadt", name: "A" },
				{ gliederung: "Beispielhausen", name: "Beispielhausen" },
				{ gliederung: "Musterstadt", name: "B" }
			],
			settings
		);
		expect(names(teams)).toEqual(["Musterstadt / Süd 1", "Beispielhausen", "Musterstadt / Süd 2"]);
		expect(teams.map((team) => team.organisation)).toEqual(["Musterstadt", "Beispielhausen", "Musterstadt"]);
		expect(renames.map((rename) => rename.to)).toEqual(["Musterstadt / Süd 1", "Musterstadt / Süd 2"]);
	});

	it("findet den eigenen Namen ohne Groß-/Kleinschreibung", () => {
		const settings = settingsWith({ teamNameOverrides: { musterstadt: "Musterstadt / Süd" } });
		const { teams, renames } = parse([{ gliederung: "Musterstadt", name: "Musterstadt / Süd" }], settings);
		expect(names(teams)).toEqual(["Musterstadt / Süd"]);
		expect(renames).toEqual([]);
	});

	it("verträgt fehlende Spalten", () => {
		const { teams } = parseRegistrations(
			[{ gliederung: "Musterstadt", ak: "AK 12", geschlecht: "weiblich" }],
			settingsWith()
		);
		expect(teams[0]).toMatchObject({ originalName: "", qualification: "", reportedPoints: "", members: [] });
	});
});

describe("assignTeamNames", () => {
	it("vergleicht die AK ohne Groß-/Kleinschreibung", () => {
		const base = parse([{ gliederung: "Musterstadt" }]).teams[0];
		const teams = assignTeamNames([
			{ ...base, id: "a", ageGroup: "AK Offen" },
			{ ...base, id: "b", ageGroup: "AK offen" }
		]);
		expect(names(teams)).toEqual(["Musterstadt 1", "Musterstadt 2"]);
	});

	it("nimmt ohne passenden eigenen Namen die Gliederung", () => {
		const base = parse([{ gliederung: "Musterstadt" }]).teams[0];
		const teams = assignTeamNames([base], { Beispielhausen: "Beispielhausen / Nord" });
		expect(names(teams)).toEqual(["Musterstadt"]);
	});
});

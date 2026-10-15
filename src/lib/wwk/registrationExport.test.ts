import { afterEach, describe, expect, it } from "vitest";
import { readWorkbook, setWorkbookAdapter, writeWorkbook, type Workbook } from "$lib/platform/workbook";
import { createFakeWorkbookAdapter } from "$lib/testing/fakeWorkbook";
import { defaultSettings, type Settings } from "../settings/settings";
import type { Team } from "./registrations";
import {
	buildRegistrationRows,
	defaultWaveSelection,
	expectedCounts,
	REGISTRATION_HEADERS,
	REGISTRATION_SHEET,
	toRegistrationSheet,
	verifyRegistrationSheet,
	type ExportRow
} from "./registrationExport";

const MEMBER_COLUMNS = 15;

function settingsWith(overrides: Partial<Settings> = {}): Settings {
	return { ...defaultSettings(), ...overrides };
}

function team(overrides: Partial<Team> = {}): Team {
	return {
		id: "r1",
		sourceRow: 1,
		organisation: "Musterstadt",
		originalName: "Musterstadt",
		name: "Musterstadt",
		ageGroup: "AK 12",
		ageGroupKnown: true,
		gender: "weiblich",
		qualification: "",
		reportedPoints: "",
		members: [],
		...overrides
	};
}

function summary(rows: ExportRow[]): string[] {
	return rows.map((row) => `${row.ageGroup}|${row.gender}|${row.organisation}`);
}

describe("defaultWaveSelection", () => {
	it("wählt AK 13/14 bis AK Offen und AK Senioren, Groß-/Kleinschreibung egal", () => {
		const teams = [
			team({ id: "a", ageGroup: "AK 12" }),
			team({ id: "b", ageGroup: "AK 13/14" }),
			team({ id: "c", ageGroup: "ak offen" }),
			team({ id: "d", ageGroup: "AK Senioren" }),
			team({ id: "e", ageGroup: "AK 10" })
		];
		expect(defaultWaveSelection(teams, settingsWith())).toEqual(new Set(["b", "c", "d"]));
	});
});

describe("buildRegistrationRows", () => {
	it("legt nur für ausgewählte Teams eine Wellen-Kopie an", () => {
		const teams = [team({ id: "a", ageGroup: "AK 13/14" }), team({ id: "b", ageGroup: "AK 15/16" })];
		const rows = buildRegistrationRows(teams, new Set(["a"]), settingsWith());
		expect(rows).toHaveLength(3);
		const copy = rows.find((row) => row.isWaveCopy);
		expect(copy).toMatchObject({ id: "a:wave", ageGroup: "AkW 13/14", name: "Musterstadt" });
		expect(
			rows
				.filter((row) => !row.isWaveCopy)
				.map((row) => row.id)
				.sort()
		).toEqual(["a", "b"]);
	});

	it("sortiert nach AK aufsteigend, Geschlecht und Gliederung absteigend, Unbekannte zuletzt", () => {
		const teams = [
			team({ id: "1", ageGroup: "AK Unbekannt", ageGroupKnown: false }),
			team({ id: "2", ageGroup: "AK 12", gender: "männlich", organisation: "Beispielhausen" }),
			team({ id: "3", ageGroup: "AK 12", gender: "weiblich", organisation: "Beispielhausen" }),
			team({ id: "4", ageGroup: "AK 12", gender: "weiblich", organisation: "Musterstadt" }),
			team({ id: "5", ageGroup: "AK 10", gender: "männlich", organisation: "Ährenfeld" }),
			team({ id: "6", ageGroup: "AK 13/14", gender: "weiblich", organisation: "Musterstadt" })
		];
		const rows = buildRegistrationRows(teams, new Set(["6"]), settingsWith());
		expect(summary(rows)).toEqual([
			"AK 10|männlich|Ährenfeld",
			"AK 12|weiblich|Musterstadt",
			"AK 12|weiblich|Beispielhausen",
			"AK 12|männlich|Beispielhausen",
			"AK 13/14|weiblich|Musterstadt",
			"AkW 13/14|weiblich|Musterstadt",
			"AK Unbekannt|weiblich|Musterstadt"
		]);
	});

	it("behält bei Gleichstand die Eingabereihenfolge", () => {
		const teams = [team({ id: "x", name: "Musterstadt 1" }), team({ id: "y", name: "Musterstadt 2" })];
		expect(buildRegistrationRows(teams, new Set(), settingsWith()).map((row) => row.id)).toEqual(["x", "y"]);
	});
});

describe("REGISTRATION_HEADERS", () => {
	it("entspricht der Spaltenreihenfolge der Meldedatei", () => {
		expect(REGISTRATION_HEADERS.slice(0, 6)).toEqual([
			"gliederung",
			"name",
			"ak",
			"geschlecht",
			"qualifikation",
			"meldepunkte"
		]);
		expect(REGISTRATION_HEADERS.slice(6, 9)).toEqual(["Nachname 1", "Vorname 1", "Jahrgang 1"]);
		expect(REGISTRATION_HEADERS).toHaveLength(6 + MEMBER_COLUMNS);
		expect(REGISTRATION_HEADERS.at(-1)).toBe("Jahrgang 5");
	});
});

describe("toRegistrationSheet", () => {
	const row = (overrides: Partial<Team>): ExportRow => ({ ...team(overrides), isWaveCopy: false });

	it("schreibt Kopfzeile und Zeilen ins Blatt Meldungen", () => {
		const sheet = toRegistrationSheet([row({})]);
		expect(sheet.name).toBe(REGISTRATION_SHEET);
		expect(sheet.rows[0]).toEqual([...REGISTRATION_HEADERS]);
		expect(sheet.rows).toHaveLength(2);
	});

	it("setzt Zahlen als Zahl, Text als Text und leere Felder als leere Zelle", () => {
		const sheet = toRegistrationSheet([
			row({
				reportedPoints: "1234,5",
				qualification: "",
				members: [
					{ lastName: "Meier", firstName: "Anna", yearOfBirth: "2012" },
					{ lastName: "Mustermann", firstName: "Max", yearOfBirth: "ca. 2011" },
					{ lastName: "Meier", firstName: "", yearOfBirth: "" }
				]
			}),
			row({ reportedPoints: "k.A." }),
			row({ reportedPoints: "" })
		]);
		const [first, second, third] = sheet.rows.slice(1);
		expect(first.slice(0, 6)).toEqual(["Musterstadt", "Musterstadt", "AK 12", "weiblich", null, 1234.5]);
		expect(first.slice(6, 15)).toEqual(["Meier", "Anna", 2012, "Mustermann", "Max", "ca. 2011", "Meier", null, null]);
		expect(first.slice(15)).toEqual([null, null, null, null, null, null]);
		expect(second[5]).toBe("k.A.");
		expect(third[5]).toBeNull();
	});
});

describe("expectedCounts", () => {
	it("zählt gesamt und je AK/Geschlecht in Zeilenreihenfolge", () => {
		const teams = [
			team({ id: "a", ageGroup: "AK 13/14", gender: "männlich" }),
			team({ id: "b", ageGroup: "AK 13/14", gender: "weiblich" }),
			team({ id: "c", ageGroup: "AK 13/14", gender: "weiblich", organisation: "Beispielhausen" })
		];
		const rows = buildRegistrationRows(teams, new Set(["a"]), settingsWith());
		expect(expectedCounts(rows)).toEqual({
			total: 4,
			byGroup: [
				{ ageGroup: "AK 13/14", gender: "weiblich", count: 2 },
				{ ageGroup: "AK 13/14", gender: "männlich", count: 1 },
				{ ageGroup: "AkW 13/14", gender: "männlich", count: 1 }
			]
		});
	});
});

describe("verifyRegistrationSheet", () => {
	afterEach(() => setWorkbookAdapter(null));

	const teams = [
		team({ id: "a", ageGroup: "AK 13/14", members: [{ lastName: "Meier", firstName: "Anna", yearOfBirth: "2011" }] }),
		team({ id: "b", ageGroup: "AK 12", gender: "männlich", organisation: "Beispielhausen", reportedPoints: "250" })
	];
	const rows = buildRegistrationRows(teams, new Set(["a"]), settingsWith());

	async function roundTrip(): Promise<Workbook> {
		setWorkbookAdapter(createFakeWorkbookAdapter());
		return readWorkbook(await writeWorkbook([toRegistrationSheet(rows)]));
	}

	it("bestätigt eine vollständig zurückgelesene Datei", async () => {
		const result = verifyRegistrationSheet(await roundTrip(), expectedCounts(rows));
		expect(result).toEqual({ ok: true, problems: [] });
	});

	it("erkennt eine fehlende Zeile", async () => {
		const workbook = await roundTrip();
		workbook.sheets[0].rows.pop();
		const result = verifyRegistrationSheet(workbook, expectedCounts(rows));
		expect(result.ok).toBe(false);
		expect(result.problems.length).toBeGreaterThanOrEqual(2);
		expect(result.problems.join(" ")).not.toContain("Meier");
	});

	it("erkennt eine falsche Kopfzeile", async () => {
		const workbook = await roundTrip();
		workbook.sheets[0].rows[0][1] = "Mannschaft";
		const result = verifyRegistrationSheet(workbook, expectedCounts(rows));
		expect(result.ok).toBe(false);
		expect(result.problems).toHaveLength(1);
	});

	it("akzeptiert die Kopfzeile unabhängig von Groß-/Kleinschreibung", async () => {
		const workbook = await roundTrip();
		workbook.sheets[0].rows[0][0] = "GLIEDERUNG";
		expect(verifyRegistrationSheet(workbook, expectedCounts(rows)).ok).toBe(true);
	});

	it("meldet ein fehlendes Blatt", () => {
		const result = verifyRegistrationSheet(
			{ sheets: [{ name: "Tabelle1", rows: [] }], properties: { created: null, modified: null } },
			expectedCounts(rows)
		);
		expect(result.ok).toBe(false);
		expect(result.problems).toHaveLength(1);
	});

	it("meldet Zeilen mit leeren Pflichtfeldern", async () => {
		const workbook = await roundTrip();
		workbook.sheets[0].rows[1][1] = null;
		const result = verifyRegistrationSheet(workbook, expectedCounts(rows));
		expect(result.ok).toBe(false);
		expect(result.problems).toEqual([expect.stringContaining("Zeile 2")]);
	});

	it("meldet unerwartete Gruppen und überspringt leere Zeilen bei der Zeilennummer", async () => {
		const workbook = await roundTrip();
		const sheetRows = workbook.sheets[0].rows;
		const extra = [...sheetRows[1]];
		extra[2] = "AK 10";
		extra[0] = null;
		sheetRows.push([null], extra);
		const result = verifyRegistrationSheet(workbook, expectedCounts(rows));
		expect(result.problems).toEqual([
			"Anzahl Meldungen: 3 erwartet, 4 gefunden.",
			"AK 10 männlich: 1 unerwartet gefunden.",
			`Zeile ${sheetRows.length}: Gliederung, Name, Altersklasse oder Geschlecht fehlt.`
		]);
	});
});

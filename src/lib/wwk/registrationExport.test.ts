import { describe, expect, it } from "vitest";
import { defaultSettings, type Settings } from "../settings/settings";
import type { Team } from "./registrations";
import {
	buildRegistrationRows,
	defaultWaveSelection,
	expectedCounts,
	REGISTRATION_HEADERS,
	encodeRegistrationCsv,
	splitCsvLine,
	verifyRegistrationCsv,
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

const decode = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);
const lines = (bytes: Uint8Array): string[] => decode(bytes).split("\r\n");

describe("encodeRegistrationCsv", () => {
	const row = (overrides: Partial<Team>): ExportRow => ({ ...team(overrides), isWaveCopy: false });

	it("schreibt Kopfzeile und Zeilen mit Semikolon, ohne BOM und mit Windows-Zeilenenden", () => {
		const bytes = encodeRegistrationCsv([row({})]);
		expect(bytes[0]).toBe("g".charCodeAt(0));
		expect(lines(bytes)).toEqual([REGISTRATION_HEADERS.join(";"), expect.any(String), ""]);
		// Ohne Komma in der Kopfzeile wählt JAuswertung das Semikolon, auch unter englischem Windows.
		expect(lines(bytes)[0]).not.toContain(",");
	});

	it("übernimmt Werte als Text und lässt leere Felder leer", () => {
		const bytes = encodeRegistrationCsv([
			row({
				reportedPoints: "1234,5",
				members: [
					{ lastName: "Meier", firstName: "Anna", yearOfBirth: "2012" },
					{ lastName: "Mustermann", firstName: "Max", yearOfBirth: "ca. 2011" }
				]
			})
		]);
		const fields = lines(bytes)[1].split(";");
		expect(fields).toHaveLength(REGISTRATION_HEADERS.length);
		expect(fields.slice(0, 12)).toEqual([
			"Musterstadt",
			"Musterstadt",
			"AK 12",
			"weiblich",
			"",
			"1234,5",
			"Meier",
			"Anna",
			"2012",
			"Mustermann",
			"Max",
			"ca. 2011"
		]);
		expect(fields.slice(12).every((field) => field === "")).toBe(true);
	});

	it("schreibt Umlaute als UTF-8", () => {
		const bytes = encodeRegistrationCsv([row({ organisation: "Mühlheim" })]);
		expect(lines(bytes)[1]).toMatch(/^Mühlheim;/);
		expect(bytes.length).toBeGreaterThan(decode(bytes).length);
	});

	it("ersetzt Semikolon, Anführungszeichen und Zeilenumbrüche, die JAuswertung falsch zerlegen würde", () => {
		const bytes = encodeRegistrationCsv([row({ name: 'Team "Nord"; 2', organisation: "Muster-\r\nstadt" })]);
		const fields = splitCsvLine(lines(bytes)[1]);
		expect(fields.slice(0, 3)).toEqual(["Muster- stadt", "Team 'Nord', 2", "AK 12"]);
	});
});

describe("splitCsvLine", () => {
	it("trennt am Semikolon und schneidet Leerzeichen ab", () => {
		expect(splitCsvLine("a; b ;;c")).toEqual(["a", "b", "", "c"]);
		expect(splitCsvLine("a;")).toEqual(["a"]);
	});

	it("liest Anführungszeichen wie JAuswertung bis zum nächsten Anführungszeichen", () => {
		expect(splitCsvLine('"a;b" x;c')).toEqual(["a;b", "c"]);
		expect(splitCsvLine('"offen')).toEqual(["offen"]);
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

describe("verifyRegistrationCsv", () => {
	const teams = [
		team({ id: "a", ageGroup: "AK 13/14", members: [{ lastName: "Meier", firstName: "Anna", yearOfBirth: "2011" }] }),
		team({ id: "b", ageGroup: "AK 12", gender: "männlich", organisation: "Beispielhausen", reportedPoints: "250" })
	];
	const rows = buildRegistrationRows(teams, new Set(["a"]), settingsWith());
	const expected = expectedCounts(rows);

	const savedLines = (): string[] => lines(encodeRegistrationCsv(rows));
	const encode = (text: string[]): Uint8Array => new TextEncoder().encode(text.join("\r\n"));

	it("bestätigt eine vollständig zurückgelesene Datei", () => {
		expect(verifyRegistrationCsv(encodeRegistrationCsv(rows), expected)).toEqual({ ok: true, problems: [] });
	});

	it("erkennt eine fehlende Zeile", () => {
		const text = savedLines().filter((line) => line !== "");
		text.pop();
		const result = verifyRegistrationCsv(encode(text), expected);
		expect(result.ok).toBe(false);
		expect(result.problems.length).toBeGreaterThanOrEqual(2);
		expect(result.problems.join(" ")).not.toContain("Meier");
	});

	it("erkennt eine falsche Kopfzeile, auch durch ein BOM", () => {
		const text = savedLines();
		text[0] = text[0].replace(";name;", ";Mannschaft;");
		expect(verifyRegistrationCsv(encode(text), expected).problems).toHaveLength(1);
		const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...encodeRegistrationCsv(rows)]);
		expect(verifyRegistrationCsv(withBom, expected).ok).toBe(false);
	});

	it("akzeptiert die Kopfzeile unabhängig von Groß-/Kleinschreibung", () => {
		const text = savedLines();
		text[0] = text[0].replace("gliederung", "GLIEDERUNG");
		expect(verifyRegistrationCsv(encode(text), expected).ok).toBe(true);
	});

	it("meldet eine Datei, die nicht in UTF-8 gespeichert ist", () => {
		const result = verifyRegistrationCsv(new Uint8Array([0x67, 0xfc, 0x0d, 0x0a]), expected);
		expect(result.ok).toBe(false);
		expect(result.problems).toEqual([expect.stringContaining("UTF-8")]);
	});

	it("meldet Zeilen mit leeren Pflichtfeldern", () => {
		const text = savedLines();
		const fields = text[1].split(";");
		fields[1] = "";
		text[1] = fields.join(";");
		const result = verifyRegistrationCsv(encode(text), expected);
		expect(result.ok).toBe(false);
		expect(result.problems).toEqual([expect.stringContaining("Zeile 2")]);
	});

	it("meldet unerwartete Gruppen und überspringt leere Zeilen bei der Zeilennummer", () => {
		const text = savedLines().filter((line) => line !== "");
		const extra = text[1].split(";");
		extra[2] = "AK 10";
		extra[0] = "";
		text.push("", extra.join(";"));
		const result = verifyRegistrationCsv(encode(text), expected);
		expect(result.problems).toEqual([
			"Anzahl Meldungen: 3 erwartet, 4 gefunden.",
			"AK 10 männlich: 1 unerwartet gefunden.",
			`Zeile ${text.length}: Gliederung, Name, Altersklasse oder Geschlecht fehlt.`
		]);
	});
});

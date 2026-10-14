import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const filesMock = vi.hoisted(() => ({
	saveFile: vi.fn(),
	datedFileName: (name: string) => `20261014_${name}`,
}));
vi.mock("$lib/platform/files", () => filesMock);

import { setWorkbookAdapter } from "$lib/platform/workbook";
import { defaultSettings } from "$lib/settings/settings";
import { createFakeWorkbookAdapter } from "$lib/testing/fakeWorkbook";
import { buildRegistrationCsv } from "$lib/testing/fixtures";
import { encodeWindows1252 } from "$lib/testing/latin1";
import {
	checkRegistration,
	exportRegistrations,
	groupByOrganisation,
	loadRegistrations,
	registrationSettingsKey,
	registrationYearWarning,
	setTeamsInWave,
	summarizeRegistration,
	uniqueIssueMessages,
} from "./preparation";

const settings = defaultSettings();
const encode = (text: string) => new TextEncoder().encode(text);

function load(teams: Parameters<typeof buildRegistrationCsv>[0], options = settings) {
	const outcome = loadRegistrations(encode(buildRegistrationCsv(teams)), "meldungen.csv", options);
	if (!outcome.ok) throw new Error(outcome.message);
	return outcome.registration;
}

describe("loadRegistrations", () => {
	it("liest Mannschaften und belegt die Welle vor", () => {
		const registration = load([
			{ gliederung: "Musterstadt", ak: "AK 12" },
			{ gliederung: "Musterstadt", ak: "AK 13/14" },
			{ gliederung: "Beispielhausen", ak: "AK 15/16" },
		]);
		expect(registration.fileName).toBe("meldungen.csv");
		expect(registration.teams).toHaveLength(3);
		expect([...registration.waveSelection].sort()).toEqual(["r2", "r3"]);
		expect(summarizeRegistration(registration)).toEqual({
			teams: 3,
			organisations: 2,
			encodingLabel: "UTF-8",
		});
	});

	it("behält die Originaldatei und die verwendeten Einstellungen", () => {
		const bytes = encode(buildRegistrationCsv([{ gliederung: "Musterstadt" }]));
		const outcome = loadRegistrations(bytes, "meldungen.csv", settings);
		expect(outcome.ok && outcome.registration.sourceBytes).toEqual(bytes);
		expect(outcome.ok && outcome.registration.settingsKey).toBe(registrationSettingsKey(settings));
	});

	it("zeigt ältere Exporte als Windows-Kodierung an", () => {
		const bytes = encodeWindows1252(buildRegistrationCsv([{ gliederung: "Großstadt" }]));
		const outcome = loadRegistrations(bytes, "alt.csv", settings);
		expect(outcome.ok && summarizeRegistration(outcome.registration).encodingLabel).toBe(
			"Windows (ältere Exporte)",
		);
	});

	it("meldet freundlich, wenn es kein Mannschaften-Export ist", () => {
		const outcome = loadRegistrations(encode("vorname;nachname\nAnna;Meier\n"), "x.csv", settings);
		expect(outcome.ok).toBe(false);
		expect(!outcome.ok && outcome.message).toContain("kein Mannschaften-Export");
	});
});

describe("registrationSettingsKey", () => {
	it("ändert sich nur bei Einstellungen, die das Einlesen beeinflussen", () => {
		const base = registrationSettingsKey(settings);
		expect(registrationSettingsKey({ ...settings, excludeUnplacedTeams: false })).toBe(base);
		expect(registrationSettingsKey({ ...settings, simplifySeniorAgeGroups: false })).not.toBe(base);
	});
});

describe("checkRegistration", () => {
	it("prüft Meldungen samt Wellen-Kopien und trennt fehlerhafte Zeilen ab", () => {
		const registration = load([
			{ gliederung: "Musterstadt", ak: "AK 13/14" },
			{ gliederung: "Beispielhausen", ak: "AK 12", geschlecht: "divers" },
		]);
		const check = checkRegistration(registration, settings);
		expect(check.rows).toHaveLength(3);
		expect(check.errors.map((issue) => issue.code)).toEqual(["gender.invalid"]);
		expect(check.excludedRows.map((row) => row.organisation)).toEqual(["Beispielhausen"]);
		expect(check.exportableRows).toHaveLength(2);
	});

	it("fasst gleiche Meldungen von Original und Wellen-Kopie zusammen", () => {
		const registration = load([{ ak: "AK 13/14", geschlecht: "divers" }]);
		const check = checkRegistration(registration, settings);
		expect(check.errors).toHaveLength(2);
		expect(uniqueIssueMessages(check.errors)).toHaveLength(1);
	});
});

describe("Wellenauswahl", () => {
	it("gruppiert nach Gliederung mit Anzahl ausgewählter Teams", () => {
		const registration = load([
			{ gliederung: "Musterstadt", ak: "AK 12" },
			{ gliederung: "Beispielhausen", ak: "AK 15/16" },
			{ gliederung: "Musterstadt", ak: "AK 13/14" },
		]);
		const groups = groupByOrganisation(registration.teams, registration.waveSelection);
		expect(groups.map((group) => [group.organisation, group.teams.length, group.selected])).toEqual([
			["Beispielhausen", 1, 1],
			["Musterstadt", 2, 1],
		]);
	});

	it("setzt und entfernt Teams in der Welle", () => {
		const selection = new Set(["r1"]);
		expect([...setTeamsInWave(selection, ["r2", "r3"], true)].sort()).toEqual(["r1", "r2", "r3"]);
		expect([...setTeamsInWave(selection, ["r1"], false)]).toEqual([]);
		expect([...selection]).toEqual(["r1"]);
	});
});

describe("exportRegistrations", () => {
	beforeEach(() => setWorkbookAdapter(createFakeWorkbookAdapter()));
	afterEach(() => {
		setWorkbookAdapter(null);
		filesMock.saveFile.mockReset();
	});

	it("speichert, liest zurück und bestätigt die Anzahl", async () => {
		filesMock.saveFile.mockResolvedValue("/tmp/20261014_WWK_Meldungen.xlsx");
		const registration = load([
			{ gliederung: "Musterstadt", ak: "AK 13/14" },
			{ gliederung: "Beispielhausen", ak: "AK 12", geschlecht: "männlich" },
		]);
		const { exportableRows } = checkRegistration(registration, settings);
		const outcome = await exportRegistrations(exportableRows);
		expect(outcome.status).toBe("saved");
		if (outcome.status !== "saved") return;
		expect(outcome.path).toBe("/tmp/20261014_WWK_Meldungen.xlsx");
		expect(outcome.expected.total).toBe(3);
		expect(outcome.verification).toEqual({ ok: true, problems: [] });
		const request = filesMock.saveFile.mock.calls[0][0];
		expect(request.defaultName).toBe("20261014_WWK_Meldungen.xlsx");
		expect(request.filters).toEqual([{ name: "Excel-Datei", extensions: ["xlsx"] }]);
	});

	it("exportiert fehlerhafte Zeilen nicht mit", async () => {
		filesMock.saveFile.mockResolvedValue("/tmp/x.xlsx");
		const registration = load([{ ak: "AK 12" }, { gliederung: "Beispielhausen", ak: "AK 12", geschlecht: "?" }]);
		const outcome = await exportRegistrations(checkRegistration(registration, settings).exportableRows);
		expect(outcome.status === "saved" && outcome.expected.total).toBe(1);
		const sheets = JSON.parse(new TextDecoder().decode(filesMock.saveFile.mock.calls[0][0].bytes));
		expect(sheets[0].rows).toHaveLength(2);
	});

	it("macht bei Abbruch nichts weiter", async () => {
		filesMock.saveFile.mockResolvedValue(null);
		const registration = load([{ ak: "AK 12" }]);
		const outcome = await exportRegistrations(checkRegistration(registration, settings).exportableRows);
		expect(outcome).toEqual({ status: "cancelled" });
	});
});

describe("registrationYearWarning", () => {
	const today = new Date(2026, 9, 14);
	const at = (year: number) => new Date(year, 5, 1).getTime();

	it("schweigt bei einer Datei aus diesem Jahr", () => {
		expect(registrationYearWarning({ createdMs: at(2026), lastModified: at(2026) }, today)).toBeNull();
	});

	it("nennt das Jahr einer älteren Datei", () => {
		expect(registrationYearWarning({ createdMs: at(2025), lastModified: at(2026) }, today)).toBe(2025);
	});

	it("prüft ohne Erstellungsdatum nur das Änderungsdatum", () => {
		expect(registrationYearWarning({ createdMs: null, lastModified: at(2026) }, today)).toBeNull();
	});
});

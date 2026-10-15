import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetAppDataStore, setAppDataStore } from "$lib/platform/fs";
import { setWorkbookAdapter, type Cell, type Sheet, type WorkbookAdapter } from "$lib/platform/workbook";
import { session } from "$lib/session.svelte";
import { createFakeStore, type FakeStore } from "$lib/testing/fakeFs";
import { createFakeWorkbookAdapter } from "$lib/testing/fakeWorkbook";
import { confirmResultsYear, loadResultsFile, needsYearConfirmation } from "./results";

const TODAY = new Date(2026, 10, 14);
const MODIFIED_2026 = new Date(2026, 10, 14).getTime();
const TEAM_HEADER: Cell[] = [
	"Platz",
	"Name",
	"Mitglied 1",
	"Mitglied 2",
	"Gliederung",
	"Altersklasse",
	"Geschlecht",
	"Punkte"
];

function teamSheet(): Sheet {
	return {
		name: "Daten",
		rows: [
			TEAM_HEADER,
			[1, "Musterstadt", "Anna Meier", "Max Mustermann", "Musterstadt", "AK 12", "weiblich", 1234.5],
			[2, "Beispielhausen", "Erika Mustermann", "", "Beispielhausen", "AK 12", "weiblich", 1100]
		]
	};
}

const fileOf = (sheets: Sheet[], lastModified = MODIFIED_2026, createdMs: number | null = MODIFIED_2026) => ({
	name: "JAuswertung.xlsx",
	bytes: new TextEncoder().encode(JSON.stringify(sheets)),
	lastModified,
	createdMs
});
const at = (year: number) => new Date(year, 5, 1).getTime();

function useAdapter(adapter: WorkbookAdapter) {
	setWorkbookAdapter(adapter);
}

let store: FakeStore;

beforeEach(() => {
	useAdapter(createFakeWorkbookAdapter());
	session.clear();
	store = createFakeStore();
	setAppDataStore(store);
});

afterEach(() => {
	setWorkbookAdapter(null);
	session.clear();
	resetAppDataStore();
});

describe("loadResultsFile", () => {
	it("legt die Ergebnisse in der Sitzung ab und fasst sie zusammen", async () => {
		const outcome = await loadResultsFile(fileOf([teamSheet()]), TODAY);
		expect(outcome).toEqual({
			ok: true,
			summary: { kind: "team", rowCount: 2, yearWarning: null, creationUnknown: false }
		});
		expect(session.results?.yearConfirmed).toBe(false);
		expect(session.results?.fileName).toBe("JAuswertung.xlsx");
		expect(session.results?.kind).toBe("team");
		expect(session.results?.rows.map((row) => row.name)).toEqual(["Musterstadt", "Beispielhausen"]);
		expect(session.results?.workbook.sheets[0].name).toBe("Daten");
	});

	it("warnt, wenn die Datei aus einem anderen Jahr stammt", async () => {
		const outcome = await loadResultsFile(fileOf([teamSheet()], new Date(2025, 5, 1).getTime()), TODAY);
		expect(outcome.ok && outcome.summary.yearWarning).toBe(2025);
		expect(session.results?.yearWarning).toBe(2025);
	});

	it("warnt bei altem Erstellungsdatum, auch wenn die Datei neu gespeichert wurde", async () => {
		const outcome = await loadResultsFile(fileOf([teamSheet()], at(2026), at(2025)), TODAY);
		expect(outcome.ok && outcome.summary.yearWarning).toBe(2025);
	});

	it("erkennt kopierte Dateien am älteren Änderungsdatum", async () => {
		const outcome = await loadResultsFile(fileOf([teamSheet()], at(2024), at(2026)), TODAY);
		expect(outcome.ok && outcome.summary.yearWarning).toBe(2024);
	});

	it("weist auf ein unbekanntes Erstellungsdatum hin", async () => {
		const outcome = await loadResultsFile(fileOf([teamSheet()], at(2026), null), TODAY);
		expect(outcome.ok && outcome.summary).toMatchObject({ yearWarning: null, creationUnknown: true });
		expect(session.results?.creationUnknown).toBe(true);
	});

	it("berücksichtigt das Erstellungsdatum der Arbeitsmappe", async () => {
		useAdapter(createFakeWorkbookAdapter({ properties: { created: "2024-06-01T10:00:00Z", modified: null } }));
		const outcome = await loadResultsFile(fileOf([teamSheet()]), TODAY);
		expect(outcome.ok && outcome.summary.yearWarning).toBe(2024);
	});

	it("meldet ein fehlendes Blatt „Daten“ und lässt die Sitzung unverändert", async () => {
		const outcome = await loadResultsFile(fileOf([{ name: "Tabelle1", rows: [] }]), TODAY);
		expect(outcome).toEqual({ ok: false, message: expect.stringContaining("Das Blatt „Daten“ fehlt") });
		expect(session.results).toBeNull();
	});

	it("gibt die Meldung der Desktop-Hülle bei unlesbaren Dateien weiter", async () => {
		useAdapter({ ...createFakeWorkbookAdapter(), read: () => Promise.reject("Die Datei ist keine Excel-Tabelle.") });
		const outcome = await loadResultsFile(fileOf([teamSheet()]), TODAY);
		expect(outcome).toEqual({ ok: false, message: "Die Datei ist keine Excel-Tabelle." });
	});

	it("meldet unerwartete Fehler allgemein", async () => {
		useAdapter({ ...createFakeWorkbookAdapter(), read: () => Promise.reject(new TypeError("x")) });
		const outcome = await loadResultsFile(fileOf([teamSheet()]), TODAY);
		expect(outcome).toEqual({ ok: false, message: "Die Ergebnisdatei konnte nicht gelesen werden." });
	});

	it("meldet eine Datei ohne Einträge", async () => {
		const outcome = await loadResultsFile(fileOf([{ name: "Daten", rows: [TEAM_HEADER] }]), TODAY);
		expect(outcome).toEqual({ ok: false, message: "Die Ergebnisdatei enthält keine Einträge." });
	});
});

describe("Bestätigung des Dateijahrs", () => {
	it("verlangt sie nur bei einer Datei aus einem anderen Jahr", async () => {
		await loadResultsFile(fileOf([teamSheet()]), TODAY);
		expect(needsYearConfirmation(session.results)).toBe(false);
		await loadResultsFile(fileOf([teamSheet()], at(2025), at(2025)), TODAY);
		expect(needsYearConfirmation(session.results)).toBe(true);
		expect(needsYearConfirmation(null)).toBe(false);
	});

	it("gibt nach der Bestätigung frei und behält Arbeitsmappe und Zeilen", async () => {
		await loadResultsFile(fileOf([teamSheet()], at(2025), at(2025)), TODAY);
		const before = session.results!;
		confirmResultsYear();
		expect(session.results?.yearConfirmed).toBe(true);
		expect(needsYearConfirmation(session.results)).toBe(false);
		expect(session.results?.workbook).toBe(before.workbook);
		expect(session.results?.rows).toBe(before.rows);
	});

	it("tut ohne geladene Ergebnisse nichts", () => {
		confirmResultsYear();
		expect(session.results).toBeNull();
	});

	it("verlangt sie bei einer neu geladenen Datei erneut", async () => {
		await loadResultsFile(fileOf([teamSheet()], at(2025), at(2025)), TODAY);
		confirmResultsYear();
		await loadResultsFile(fileOf([teamSheet()], at(2024), at(2024)), TODAY);
		expect(needsYearConfirmation(session.results)).toBe(true);
	});
});

describe("Bestzeiten für die Rec-Werte", () => {
	const WAVE_TIME = 20000 / (24 * 60 * 60 * 100);
	const timedSheet = (): Sheet => ({
		name: "Daten",
		rows: [
			[...TEAM_HEADER, "Zeit 1", "Strafe 1"],
			[1, "Musterstadt", "Anna Meier", "Max Mustermann", "Musterstadt", "AkW offen", "weiblich", 1234.5, WAVE_TIME, ""]
		]
	});
	const stored = (year: number) => store.readText(`records/best-times-${year}.json`);

	it("merkt sich die Bestzeiten einer Datei aus dem laufenden Jahr ohne Namen", async () => {
		await loadResultsFile(fileOf([timedSheet()]), TODAY);
		const text = await stored(2026);
		expect(JSON.parse(text!)).toEqual({
			year: 2026,
			entries: [{ ageGroup: "AkW offen", gender: "female", disciplineIndex: 0, time: 20000 }]
		});
		expect(text).not.toContain("Musterstadt");
		expect(text).not.toContain("Anna Meier");
	});

	it("wartet bei einer Datei aus einem anderen Jahr auf die Bestätigung", async () => {
		await loadResultsFile(fileOf([timedSheet()], at(2025), at(2025)), TODAY);
		expect(await store.list("records")).toEqual([]);
		await confirmResultsYear();
		expect(JSON.parse((await stored(2025))!).year).toBe(2025);
	});

	it("legt ohne Zeiten nichts ab", async () => {
		await loadResultsFile(fileOf([teamSheet()]), TODAY);
		expect(await store.list("records")).toEqual([]);
	});
});

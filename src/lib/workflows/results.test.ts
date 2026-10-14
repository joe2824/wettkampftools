import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setWorkbookAdapter, type Cell, type Sheet, type WorkbookAdapter } from "$lib/platform/workbook";
import { session } from "$lib/session.svelte";
import { createFakeWorkbookAdapter } from "$lib/testing/fakeWorkbook";
import { loadResultsFile } from "./results";

const TODAY = new Date(2026, 10, 14);
const MODIFIED_2026 = new Date(2026, 10, 14).getTime();
const TEAM_HEADER: Cell[] = ["Platz", "Name", "Mitglied 1", "Mitglied 2", "Gliederung", "Altersklasse", "Geschlecht", "Punkte"];

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

const fileOf = (sheets: Sheet[], lastModified = MODIFIED_2026) => ({
	name: "JAuswertung.xlsx",
	bytes: new TextEncoder().encode(JSON.stringify(sheets)),
	lastModified
});

function useAdapter(adapter: WorkbookAdapter) {
	setWorkbookAdapter(adapter);
}

beforeEach(() => {
	useAdapter(createFakeWorkbookAdapter());
	session.clear();
});

afterEach(() => {
	setWorkbookAdapter(null);
	session.clear();
});

describe("loadResultsFile", () => {
	it("legt die Ergebnisse in der Sitzung ab und fasst sie zusammen", async () => {
		const outcome = await loadResultsFile(fileOf([teamSheet()]), TODAY);
		expect(outcome).toEqual({ ok: true, summary: { kind: "team", rowCount: 2, yearWarning: null } });
		expect(session.results?.fileName).toBe("JAuswertung.xlsx");
		expect(session.results?.kind).toBe("team");
		expect(session.results?.rows.map((row) => row.name)).toEqual(["Musterstadt", "Beispielhausen"]);
		expect(session.results?.workbook.sheets[0].name).toBe("Daten");
	});

	it("warnt, wenn die Datei aus einem anderen Jahr stammt", async () => {
		const outcome = await loadResultsFile(fileOf([teamSheet()], new Date(2025, 5, 1).getTime()), TODAY);
		expect(outcome.ok && outcome.summary.yearWarning).toBe(2025);
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

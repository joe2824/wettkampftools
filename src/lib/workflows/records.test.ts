// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const httpMock = vi.hoisted(() => ({ platformFetch: vi.fn() }));
vi.mock("$lib/platform/http", () => httpMock);
const filesMock = vi.hoisted(() => ({ saveFile: vi.fn() }));
vi.mock("$lib/platform/files", () => filesMock);

import { strFromU8, unzipSync } from "fflate";
import { resetAppDataStore, setAppDataStore } from "$lib/platform/fs";
import { setWorkbookAdapter, type Sheet } from "$lib/platform/workbook";
import { parseRulebookRecords } from "$lib/records/rulebookRecords";
import { createFakeStore, type FakeStore } from "$lib/testing/fakeFs";
import { createFakeWorkbookAdapter } from "$lib/testing/fakeWorkbook";
import { rulebookFile, type FixtureAgeGroup } from "$lib/testing/rulebookFixture";
import {
	downloadOfficialRulebook,
	importBestTimesFile,
	newRulebookDescription,
	officialRulebookUrl,
	readRulebookFile,
	restoreClubRulebook,
	saveNewRulebook,
	useClubRulebook
} from "./records";

const GROUPS: FixtureAgeGroup[] = [
	{
		name: "AkW offen",
		female: [{ name: "4*50m Retten in der Welle", rec: 20894 }],
		male: [{ name: "4*50m Retten in der Welle", rec: 16221 }]
	}
];
const TODAY = new Date(2026, 9, 14);

let store: FakeStore;

beforeEach(() => {
	store = createFakeStore();
	setAppDataStore(store);
	setWorkbookAdapter(createFakeWorkbookAdapter());
	httpMock.platformFetch.mockReset();
	filesMock.saveFile.mockReset();
});

afterEach(() => {
	resetAppDataStore();
	setWorkbookAdapter(null);
});

describe("Regelwerke lesen", () => {
	it("liest Beschreibung und Rec-Werte", () => {
		const outcome = readRulebookFile("Regelwerk.rwm", rulebookFile(GROUPS, "Wellen-Wk 2025"));
		expect(outcome.ok && outcome.rulebook.description).toBe("Wellen-Wk 2025");
		expect(outcome.ok && outcome.rulebook.records).toHaveLength(2);
	});

	it("meldet unlesbare Dateien", () => {
		expect(readRulebookFile("x.rwm", new Uint8Array([1, 2]))).toEqual({
			ok: false,
			message: "Die Datei ist kein JAuswertung-Regelwerk."
		});
	});

	it("merkt sich das Vereins-Regelwerk für das nächste Mal", async () => {
		expect(await restoreClubRulebook()).toBeNull();
		const outcome = await useClubRulebook({ name: "Regelwerk_2025.rwm", bytes: rulebookFile(GROUPS) });
		expect(outcome.ok).toBe(true);
		const restored = await restoreClubRulebook();
		expect(restored?.name).toBe("Regelwerk_2025.rwm");
		expect(restored?.records).toHaveLength(2);
	});

	it("merkt sich kein unlesbares Vereins-Regelwerk", async () => {
		await useClubRulebook({ name: "x.rwm", bytes: new Uint8Array([1]) });
		expect(await restoreClubRulebook()).toBeNull();
	});
});

describe("downloadOfficialRulebook", () => {
	it("lädt das Regelwerk des Jahres aus dem JAuswertung-Projekt", async () => {
		const bytes = rulebookFile(GROUPS, "Regelwerk 2026");
		httpMock.platformFetch.mockResolvedValue(new Response(new Blob([bytes.slice()])));
		const outcome = await downloadOfficialRulebook(2026);
		expect(httpMock.platformFetch).toHaveBeenCalledWith(officialRulebookUrl(2026));
		expect(officialRulebookUrl(2026)).toBe(
			"https://raw.githubusercontent.com/dennisfabri/JAuswertung/main/jauswertung-files/src/main/resources/aks/DLRG%202026.rwm"
		);
		expect(outcome.ok && outcome.rulebook).toMatchObject({ name: "DLRG 2026.rwm", description: "Regelwerk 2026" });
	});

	it("meldet ein noch nicht veröffentlichtes Jahr", async () => {
		httpMock.platformFetch.mockResolvedValue(new Response("", { status: 404 }));
		expect(await downloadOfficialRulebook(2030)).toEqual({ ok: false, message: expect.stringContaining("2030") });
	});

	it("meldet fehlendes Netz", async () => {
		httpMock.platformFetch.mockRejectedValue(new TypeError("offline"));
		expect(await downloadOfficialRulebook(2026)).toEqual({ ok: false, message: expect.stringContaining("Internet") });
	});
});

describe("importBestTimesFile", () => {
	const sheet: Sheet = {
		name: "Daten",
		rows: [
			["Altersklasse", "Geschlecht", "Zeit 1", "Strafe 1"],
			["AkW offen", "männlich", "2:40,00", ""]
		]
	};
	const file = (sheets: Sheet[], lastModified: number) => ({
		name: "Ergebnis.xlsx",
		bytes: new TextEncoder().encode(JSON.stringify(sheets)),
		lastModified,
		createdMs: null
	});

	it("legt die Bestzeiten unter dem Jahr der Datei ab", async () => {
		const outcome = await importBestTimesFile(file([sheet], new Date(2025, 10, 16).getTime()), TODAY);
		expect(outcome).toEqual({ ok: true, year: 2025, entries: 1 });
		expect(await store.exists("records/best-times-2025.json")).toBe(true);
	});

	it("meldet Dateien ohne Zeiten", async () => {
		const empty = { ...sheet, rows: [sheet.rows[0]] };
		const outcome = await importBestTimesFile(file([empty], TODAY.getTime()), TODAY);
		expect(outcome).toEqual({ ok: false, message: expect.stringContaining("keine") });
	});

	it("meldet unlesbare Dateien", async () => {
		const outcome = await importBestTimesFile({ ...file([sheet], 0), bytes: new Uint8Array([1]) }, TODAY);
		expect(outcome.ok).toBe(false);
	});
});

describe("saveNewRulebook", () => {
	it("speichert das geänderte Regelwerk unter neuem Namen und neuer Beschreibung", async () => {
		filesMock.saveFile.mockResolvedValue("C:/Regelwerk_2026.rwm");
		const club = readRulebookFile("Regelwerk_2025.rwm", rulebookFile(GROUPS));
		if (!club.ok) throw new Error("Fixture");
		const rows = [{ ageGroup: "AkW offen", gender: "male" as const, disciplineIndex: 0, oldRec: 16221, newRec: 16500 }];
		expect(await saveNewRulebook(club.rulebook, rows, 2026)).toBe("C:/Regelwerk_2026.rwm");
		const request = filesMock.saveFile.mock.calls[0][0];
		expect(request.defaultName).toBe("Regelwerk_2026.rwm");
		expect(parseRulebookRecords(request.bytes)[1].rec).toBe(16500);
		expect(strFromU8(unzipSync(request.bytes)["data.xml"])).toContain(
			"<beschreibung>Wellen-Wk 2026 (mit Rec-Werten für 2025)</beschreibung>"
		);
	});

	it("beschreibt das neue Regelwerk mit Jahr und Vorjahr", () => {
		expect(newRulebookDescription(2027)).toBe("Wellen-Wk 2027 (mit Rec-Werten für 2026)");
	});
});

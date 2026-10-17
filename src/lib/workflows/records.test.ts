// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const httpMock = vi.hoisted(() => ({ platformFetch: vi.fn() }));
vi.mock("$lib/platform/http", () => httpMock);
const filesMock = vi.hoisted(() => ({ saveFile: vi.fn(), writePenaltyCatalogNextTo: vi.fn() }));
vi.mock("$lib/platform/files", () => filesMock);

import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { resetAppDataStore, setAppDataStore } from "$lib/platform/fs";
import { setWorkbookAdapter, type Sheet } from "$lib/platform/workbook";
import { parseRulebookRecords } from "$lib/records/rulebookRecords";
import { createFakeStore, type FakeStore } from "$lib/testing/fakeFs";
import { createFakeWorkbookAdapter } from "$lib/testing/fakeWorkbook";
import { rulebookFile, rulebookXml, type FixtureAgeGroup } from "$lib/testing/rulebookFixture";
import {
	downloadOfficialRulebook,
	importBestTimesFile,
	newPenaltyCatalogFileName,
	newRulebookDescription,
	officialRulebookName,
	officialRulebookUrl,
	penaltyDisqualifyingWarning,
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
	filesMock.writePenaltyCatalogNextTo.mockReset();
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
		expect(await downloadOfficialRulebook(2030)).toEqual({
			ok: false,
			message:
				"Das Regelwerk „DLRG 2030.rwm“ ist im JAuswertung-Projekt noch nicht veröffentlicht. Bitte später erneut versuchen oder die Datei aus einem JAuswertung-Programmordner wählen."
		});
	});

	it("meldet fehlendes Netz", async () => {
		httpMock.platformFetch.mockRejectedValue(new TypeError("offline"));
		expect(await downloadOfficialRulebook(2026)).toEqual({ ok: false, message: expect.stringContaining("Internet") });
	});
});

describe("officialRulebookName", () => {
	it("nimmt den Dateinamen ohne Endung", () => {
		expect(officialRulebookName({ name: "DLRG 2026.rwm", description: "Regelwerk 2026" })).toBe("DLRG 2026");
		expect(officialRulebookName({ name: "DLRG 2026.RWM", description: "" })).toBe("DLRG 2026");
	});

	it("weicht auf die Beschreibung aus", () => {
		expect(officialRulebookName({ name: ".rwm", description: " Regelwerk 2026 " })).toBe("Regelwerk 2026");
	});

	it("liefert null ohne Regelwerk oder Namen", () => {
		expect(officialRulebookName(null)).toBeNull();
		expect(officialRulebookName({ name: "", description: "" })).toBeNull();
	});
});

describe("importBestTimesFile", () => {
	const sheet: Sheet = {
		name: "Daten",
		rows: [
			["Altersklasse", "Geschlecht", "Disziplinen", "Zeit 1", "Strafe 1"],
			["AkW offen", "männlich", "4*50m Retten in der Welle", "2:40,00", ""]
		]
	};
	const file = (sheets: Sheet[], modifiedMs: number) => ({
		name: "Ergebnis.xlsx",
		bytes: new TextEncoder().encode(JSON.stringify(sheets)),
		modifiedMs,
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
		expect(await saveNewRulebook(club.rulebook, rows, 2026, null)).toEqual({
			rulebookPath: "C:/Regelwerk_2026.rwm",
			penaltyPath: null,
			penaltyError: null
		});
		expect(filesMock.writePenaltyCatalogNextTo).not.toHaveBeenCalled();
		const request = filesMock.saveFile.mock.calls[0][0];
		expect(request.defaultName).toBe("Regelwerk_2026.rwm");
		expect(parseRulebookRecords(request.bytes)[1].rec).toBe(16500);
		expect(strFromU8(unzipSync(request.bytes)["data.xml"])).toContain("<beschreibung>Wellen-Wk 2026</beschreibung>");
	});

	it("schreibt den Strafenkatalog neben das Regelwerk", async () => {
		filesMock.saveFile.mockResolvedValue("C:/Regelwerk_2026.rwm");
		filesMock.writePenaltyCatalogNextTo.mockResolvedValue("C:/Regelwerk_2026m.def");
		const club = readRulebookFile("Regelwerk_2025.rwm", rulebookFile(GROUPS));
		if (!club.ok) throw new Error("Fixture");
		const penalties = new Uint8Array([7]);
		expect(await saveNewRulebook(club.rulebook, [], 2026, penalties)).toEqual({
			rulebookPath: "C:/Regelwerk_2026.rwm",
			penaltyPath: "C:/Regelwerk_2026m.def",
			penaltyError: null
		});
		expect(filesMock.writePenaltyCatalogNextTo).toHaveBeenCalledWith("C:/Regelwerk_2026.rwm", penalties);
	});

	it("meldet einen gescheiterten Strafenkatalog, ohne das Regelwerk zu verlieren", async () => {
		filesMock.saveFile.mockResolvedValue("C:/Regelwerk_2026.rwm");
		filesMock.writePenaltyCatalogNextTo.mockRejectedValue("Die Datei darf nicht geschrieben werden.");
		const club = readRulebookFile("Regelwerk_2025.rwm", rulebookFile(GROUPS));
		if (!club.ok) throw new Error("Fixture");
		const saved = await saveNewRulebook(club.rulebook, [], 2026, new Uint8Array([7]));
		expect(saved).toEqual({
			rulebookPath: "C:/Regelwerk_2026.rwm",
			penaltyPath: null,
			penaltyError: "Die Datei darf nicht geschrieben werden."
		});
	});

	it("schreibt nach Abbruch nichts", async () => {
		filesMock.saveFile.mockResolvedValue(null);
		const club = readRulebookFile("Regelwerk_2025.rwm", rulebookFile(GROUPS));
		if (!club.ok) throw new Error("Fixture");
		expect(await saveNewRulebook(club.rulebook, [], 2026, new Uint8Array([7]))).toBeNull();
		expect(filesMock.writePenaltyCatalogNextTo).not.toHaveBeenCalled();
	});

	it("warnt, wenn im Regelwerk jede Strafe disqualifiziert", () => {
		const xml = rulebookXml(GROUPS).replace(
			"<minMembers>",
			"<strafeIstDisqualifikation>true</strafeIstDisqualifikation><minMembers>"
		);
		const club = readRulebookFile("Regelwerk.rwm", zipSync({ "data.xml": strToU8(xml) }));
		if (!club.ok) throw new Error("Fixture");
		expect(penaltyDisqualifyingWarning(club.rulebook)).toContain("AkW offen");
		const plain = readRulebookFile("Regelwerk.rwm", rulebookFile(GROUPS));
		expect(plain.ok && penaltyDisqualifyingWarning(plain.rulebook)).toBeNull();
	});

	it("benennt den Strafenkatalog wie JAuswertung ihn neben dem Regelwerk sucht", () => {
		expect(newPenaltyCatalogFileName(2026)).toBe("Regelwerk_2026m.def");
	});

	it("beschreibt das neue Regelwerk mit Jahr und Vorjahr", () => {
		expect(newRulebookDescription(2027)).toBe("Wellen-Wk 2027");
	});
});

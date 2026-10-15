// @vitest-environment happy-dom
import { strToU8, unzipSync, zipSync } from "fflate";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const filesMock = vi.hoisted(() => ({
	saveFile: vi.fn(),
	datedFileName: (name: string) => `20261015_${name}`
}));
vi.mock("$lib/platform/files", () => filesMock);

import { LayoutStore } from "$lib/certificates/layoutStore.svelte";
import { SelectionState } from "$lib/certificates/selectionState.svelte";
import { COMPETITION_STATE_PATH } from "$lib/competition/persistence";
import { COMPETITION_RESULTS_PATH } from "$lib/competition/resultsFile";
import { compactTimestamp, resetAppDataStore, setAppDataStore } from "$lib/platform/fs";
import { buildProjectFile, readProjectFile } from "$lib/project/projectFile";
import { SessionState } from "$lib/session.svelte";
import { defaultSettings } from "$lib/settings/settings";
import { SETTINGS_FILE, SettingsStore } from "$lib/settings/settingsStore.svelte";
import { storedResults } from "$lib/testing/competitionFixtures";
import { createFakeStore, type FakeStore } from "$lib/testing/fakeFs";
import { buildRegistrationCsv } from "$lib/testing/fixtures";
import { jpegBytes, pngBytes } from "$lib/testing/images";
import { CompetitionStore } from "./competitionStore.svelte";
import { openProject, projectFileName, saveProject, type ProjectDeps } from "./project";
import { loadRegistrations } from "./preparation";

const EVENT = defaultSettings().event;
const NOW = new Date("2026-10-15T08:00:00.000Z");
const BACKUP = `backups/vor-projekt-${compactTimestamp(NOW)}.wwkprojekt`;
const CHOICES = strToU8(JSON.stringify({ beispielhausen: "3" }));
const decode = (bytes: Uint8Array | undefined) => JSON.parse(new TextDecoder().decode(bytes));
const csv = strToU8(
	buildRegistrationCsv([
		{ gliederung: "Musterstadt", ak: "AK 12" },
		{ gliederung: "Beispielhausen", ak: "AK 13/14" }
	])
);

/** Ergebnisse, die sich als JAuswertung-Mappe lesen lassen. */
const RESULTS = {
	...storedResults(),
	workbook: {
		sheets: [
			{
				name: "Daten",
				rows: [
					["Platz", "Name", "Mitglied 1", "Gliederung", "Altersklasse", "Geschlecht", "Punkte"],
					[1, "Musterstadt", "Anna Meier", "Musterstadt", "AK 12", "weiblich", 1234.5]
				]
			}
		],
		properties: { created: null, modified: null }
	}
};

let fs: FakeStore;
let deps: ProjectDeps;
let session: SessionState;
let selection: SelectionState;

function createDeps(): ProjectDeps {
	session = new SessionState();
	selection = new SelectionState();
	const settings = new SettingsStore({ readLegacy: async () => null });
	const layouts = new LayoutStore();
	const competition = new CompetitionStore({ session, selection, settings, now: () => NOW });
	return { settings, layouts, competition, now: () => NOW };
}

async function fillCurrentState() {
	await deps.settings.load();
	deps.settings.settings.event.number = "39";
	deps.settings.settings.event.title = "Wellenwettkampf";
	deps.settings.settings.teamNameOverrides = { musterstadt: "Musterstadt / Süd" };
	await deps.layouts.setImage("signature1", pngBytes());
	await deps.layouts.setImage("background", jpegBytes());
	const outcome = loadRegistrations(csv, "meldungen.csv", deps.settings.settings);
	if (!outcome.ok) throw new Error(outcome.message);
	session.setRegistration({ ...outcome.registration, waveSelection: new Set(["r1"]) });
}

/** Zuletzt an den Speichern-Dialog übergebene Bytes. */
const savedBytes = (): Uint8Array => filesMock.saveFile.mock.calls.at(-1)?.[0].bytes;

beforeEach(() => {
	fs = createFakeStore();
	setAppDataStore(fs);
	filesMock.saveFile.mockReset();
	filesMock.saveFile.mockResolvedValue("/tmp/projekt.wwkprojekt");
	vi.spyOn(console, "info").mockImplementation(() => {});
	vi.spyOn(console, "error").mockImplementation(() => {});
	deps = createDeps();
});

afterEach(() => {
	resetAppDataStore();
	vi.restoreAllMocks();
});

describe("projectFileName", () => {
	it("nimmt die Veranstaltung und ersetzt unzulässige Zeichen", () => {
		expect(projectFileName({ ...EVENT, number: "39", title: "Wellen/Wettkampf: Süd" })).toBe(
			"20261015_39. Wellen-Wettkampf- Süd.wwkprojekt"
		);
	});

	it("nennt Projekte ohne Veranstaltung „Wettkampf“", () => {
		expect(projectFileName({ ...EVENT, number: " ", title: "" })).toBe("20261015_Wettkampf.wwkprojekt");
	});
});

describe("saveProject", () => {
	it("speichert den aktuellen Stand samt Unterschriften, aber ohne Hintergrund", async () => {
		await fillCurrentState();
		const path = await saveProject({ includeSignatures: true }, deps);
		expect(path).toBe("/tmp/projekt.wwkprojekt");
		expect(filesMock.saveFile).toHaveBeenCalledWith({
			defaultName: "20261015_39. Wellenwettkampf.wwkprojekt",
			filters: [{ name: "Wettkampf-Projekt", extensions: ["wwkprojekt"] }],
			bytes: expect.any(Uint8Array)
		});
		const entries = Object.keys(unzipSync(savedBytes()));
		expect(entries).toContain("images/signature1.png");
		expect(entries.some((name) => name.includes("background"))).toBe(false);
		const result = readProjectFile(savedBytes());
		if (!result.ok) throw new Error(result.message);
		expect(result.project.settings.teamNameOverrides).toEqual({ musterstadt: "Musterstadt / Süd" });
		expect(result.project.competition?.registration?.waveSelection).toEqual(["r1"]);
		expect(result.project.manifest.createdAt).toBe(NOW.toISOString());
	});

	it("nimmt die weiteren Daten aus dem Datenordner mit", async () => {
		await fillCurrentState();
		fs.files.set("distances/choices.json", CHOICES);
		await saveProject({ includeSignatures: false }, deps);
		const result = readProjectFile(savedBytes());
		if (!result.ok) throw new Error(result.message);
		expect(result.project.data).toEqual({ "distances/choices.json": CHOICES });
	});

	it("sichert ausstehende Änderungen vorher", async () => {
		await fillCurrentState();
		await saveProject({ includeSignatures: false }, deps);
		expect(fs.files.has(COMPETITION_STATE_PATH)).toBe(true);
		expect(Object.keys(unzipSync(savedBytes())).some((name) => name.startsWith("images/"))).toBe(false);
	});

	it("liefert null nach Abbruch", async () => {
		filesMock.saveFile.mockResolvedValue(null);
		await deps.settings.load();
		expect(await saveProject({ includeSignatures: true }, deps)).toBeNull();
	});
});

describe("openProject", () => {
	async function projectBytes(includeSignatures: boolean): Promise<Uint8Array> {
		const previous = { deps, session, selection };
		const source = createDeps();
		deps = source;
		await fillCurrentState();
		source.settings.settings.certificates.copiesPerTeam = 3;
		deps.layouts.layouts.team.objects = [];
		const bytes = buildProjectFile(
			{
				settings: JSON.parse(JSON.stringify(source.settings.settings)),
				layouts: source.layouts.layouts,
				signatures: { signature1: pngBytes(), signature2: null },
				competition: source.competition.stored().state,
				results: RESULTS,
				data: { "distances/choices.json": CHOICES }
			},
			{ includeSignatures, now: NOW, appVersion: "2.0.0" }
		);
		({ deps, session, selection } = previous);
		return bytes;
	}

	it("übernimmt Einstellungen, Layout, Unterschriften und Wettkampfstand", async () => {
		await deps.settings.load();
		await deps.layouts.setImage("signature2", jpegBytes());
		const outcome = await openProject(await projectBytes(true), deps);
		expect(outcome).toEqual({ ok: true, headline: "39. Wellenwettkampf", warnings: [] });
		expect(deps.settings.settings.certificates.copiesPerTeam).toBe(3);
		expect(deps.settings.dirty).toBe(false);
		expect(JSON.parse(new TextDecoder().decode(fs.files.get(SETTINGS_FILE))).event.number).toBe("39");
		expect(deps.layouts.layouts.team.objects).toEqual([]);
		expect(fs.files.has("layout.json")).toBe(true);
		expect(deps.layouts.images.signature1).toEqual(pngBytes());
		expect(deps.layouts.images.signature2).toBeNull();
		expect(session.registration?.teams[0].name).toBe("Musterstadt / Süd");
		expect([...(session.registration?.waveSelection ?? [])]).toEqual(["r1"]);
		expect(session.results?.fileName).toBe("JAuswertung.xlsx");
		expect(session.results?.createdMs).toBe(storedResults().createdMs);
		expect(fs.files.has(COMPETITION_RESULTS_PATH)).toBe(true);
	});

	it("behält den Beta-Schalter dieses Rechners", async () => {
		await deps.settings.load();
		await deps.settings.saveFields({ betaUpdates: true });
		await openProject(await projectBytes(false), deps);
		expect(deps.settings.settings.betaUpdates).toBe(true);
	});

	it("behält eigene Unterschriften, wenn das Projekt keine enthält", async () => {
		await deps.settings.load();
		await deps.layouts.setImage("signature2", jpegBytes());
		await openProject(await projectBytes(false), deps);
		expect(deps.layouts.images.signature2).toEqual(jpegBytes());
		expect(deps.layouts.images.signature1).toBeNull();
	});

	it("ändert nichts an einer ungültigen Datei", async () => {
		await deps.settings.load();
		const outcome = await openProject(zipSync({ "a.txt": strToU8("x") }), deps);
		expect(outcome).toEqual({ ok: false, message: "Die Datei ist keine Projektdatei der Wettkampftools." });
		expect(fs.files.has(SETTINGS_FILE)).toBe(false);
	});

	it("übernimmt die weiteren Daten und beginnt den Layout-Verlauf neu", async () => {
		await deps.settings.load();
		const generation = deps.layouts.generation;
		await openProject(await projectBytes(false), deps);
		expect(fs.files.get("distances/choices.json")).toEqual(CHOICES);
		expect(deps.layouts.generation).toBe(generation + 1);
	});

	it("sichert vorher den bisherigen Stand als Projektdatei im Datenordner", async () => {
		await deps.settings.load();
		deps.settings.settings.event.number = "38";
		await deps.settings.save();
		await openProject(await projectBytes(false), deps);
		const backup = readProjectFile(fs.files.get(BACKUP) as Uint8Array);
		if (!backup.ok) throw new Error(backup.message);
		expect(backup.project.settings.event.number).toBe("38");
	});

	it("behält nur die letzten drei Sicherungen", async () => {
		await deps.settings.load();
		const older = ["20261001-080000", "20261002-080000", "20261003-080000"];
		for (const stamp of older) fs.files.set(`backups/vor-projekt-${stamp}.wwkprojekt`, strToU8("alt"));
		fs.files.set("backups/notiz.json", strToU8("{}"));
		await openProject(await projectBytes(false), deps);
		const backups = [...fs.files.keys()].filter((path) => path.startsWith("backups/")).sort();
		expect(backups).toEqual([
			"backups/notiz.json",
			"backups/vor-projekt-20261002-080000.wwkprojekt",
			"backups/vor-projekt-20261003-080000.wwkprojekt",
			BACKUP
		]);
	});

	it("öffnet nichts, wenn der bisherige Stand nicht gesichert werden kann", async () => {
		await deps.settings.load();
		const bytes = await projectBytes(false);
		vi.spyOn(fs, "writeBytes").mockRejectedValue(new Error("Platte voll"));
		const outcome = await openProject(bytes, deps);
		expect(outcome).toEqual({
			ok: false,
			message: "Der bisherige Stand konnte nicht gesichert werden. Das Projekt wurde deshalb nicht geöffnet."
		});
		expect(deps.settings.settings.event.number).toBe(EVENT.number);
	});

	it("stellt nach einem Fehler den vorherigen Stand wieder her und nennt die Sicherung", async () => {
		await deps.settings.load();
		deps.settings.settings.event.number = "38";
		await deps.settings.save();
		vi.spyOn(deps.layouts, "save").mockRejectedValueOnce(new Error("Platte voll"));
		const outcome = await openProject(await projectBytes(true), deps);
		expect(outcome).toEqual({
			ok: false,
			message: `Das Projekt konnte nicht vollständig übernommen werden. Der vorherige Stand wurde im App-Datenordner gesichert als „${BACKUP}“ und wiederhergestellt.`
		});
		expect(deps.settings.settings.event.number).toBe("38");
		expect(decode(fs.files.get(SETTINGS_FILE)).event.number).toBe("38");
	});

	it("nennt die Sicherung, wenn auch das Wiederherstellen scheitert", async () => {
		await deps.settings.load();
		vi.spyOn(deps.layouts, "save").mockRejectedValue(new Error("Platte voll"));
		const outcome = await openProject(await projectBytes(true), deps);
		expect(outcome).toEqual({
			ok: false,
			message: `Das Projekt konnte nicht vollständig übernommen werden. Der vorherige Stand wurde im App-Datenordner gesichert als „${BACKUP}“; diese Datei lässt sich über „Projekt öffnen“ wieder laden.`
		});
	});
});

// @vitest-environment happy-dom
import { strToU8 } from "fflate";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventInfo } from "$lib/settings/settings";
import { penaltyCatalogFile } from "$lib/testing/penaltyFixture";
import { rulebookFile, type FixtureAgeGroup } from "$lib/testing/rulebookFixture";
import { readPenaltyCatalog } from "$lib/records/penaltyCatalog";
import { applyClubPenaltyRules } from "$lib/records/penaltyRules";
import { parseRulebookRecords } from "$lib/records/rulebookRecords";
import {
	competitionDate,
	competitionName,
	competitionProperties,
	freshCompetitionFileName,
	saveFreshCompetition,
	type FreshCompetitionJob
} from "./freshCompetition";

const saveFile = vi.hoisted(() => vi.fn());
const buildFreshCompetition = vi.hoisted(() => vi.fn());
vi.mock("$lib/platform/files", () => ({ saveFile }));
// Der Umbau der Datei hat eigene Tests; hier zählt der Ablauf drumherum.
vi.mock("$lib/records/freshCompetition", () => ({ buildFreshCompetition }));

const GROUPS: FixtureAgeGroup[] = [
	{
		name: "AK 12",
		female: [{ name: "4*25m Rettungsstaffel", rec: 5817 }],
		male: [{ name: "4*25m Rettungsstaffel", rec: 5674 }]
	}
];

const EVENT: EventInfo = {
	number: "39",
	title: "Wellenwettkampf",
	host: "DLRG Musterstadt",
	date: "2026-11-14",
	venue: "Musterbad",
	signers: [
		{ name: "Anna Meier", role: "Vorsitzende/r" },
		{ name: "Max Mustermann", role: "Wettkampforganisation" }
	]
};

const BUILT = strToU8("neue datei");

function job(): FreshCompetitionJob {
	const bytes = rulebookFile(GROUPS, "Wellen-Wk 2025");
	const records = parseRulebookRecords(bytes);
	return {
		previous: { name: "Wellenwettkampf 2025.wk", bytes: strToU8("alt") },
		club: { name: "Regelwerk_2025.rwm", bytes, description: "Wellen-Wk 2025", records },
		rows: [{ ...records[0], oldRec: records[0].rec, newRec: 5700 }],
		penalties: {
			...applyClubPenaltyRules(readPenaltyCatalog(penaltyCatalogFile())),
			name: "defaultm.def",
			issues: [],
			bytes
		},
		event: EVENT,
		year: 2026
	};
}

beforeEach(() => {
	saveFile.mockReset();
	buildFreshCompetition.mockReset();
	buildFreshCompetition.mockReturnValue({ ok: true, bytes: BUILT, ageGroups: 1, hasLogo: true });
});

describe("Angaben der Veranstaltung", () => {
	it("bildet Name, Datum und Ausrichter für JAuswertung", () => {
		expect(competitionName(EVENT)).toBe("39. Wellenwettkampf");
		expect(competitionName({ number: " ", title: "Wellenwettkampf" })).toBe("Wellenwettkampf");
		expect(competitionDate("2026-11-14")).toBe("14.11.2026");
		expect(competitionDate("")).toBe("");
		expect(competitionProperties(EVENT, 2026)).toEqual({
			name: "39. Wellenwettkampf",
			date: "14.11.2026",
			year: 2026,
			host: "DLRG Musterstadt"
		});
		expect(freshCompetitionFileName(2026)).toBe("Wellenwettkampf 2026.wk");
	});
});

describe("saveFreshCompetition", () => {
	it("übergibt Vorjahresdatei, neues Regelwerk, Katalog und Angaben und speichert das Ergebnis", async () => {
		saveFile.mockResolvedValue("C:\\Wettkampf\\Wellenwettkampf 2026.wk");
		const now = new Date(Date.UTC(2026, 9, 17));
		const outcome = await saveFreshCompetition(job(), now);
		expect(outcome).toEqual({ ok: true, path: "C:\\Wettkampf\\Wellenwettkampf 2026.wk", ageGroups: 1, hasLogo: true });
		const [input] = buildFreshCompetition.mock.calls[0];
		expect(input.previous).toEqual(strToU8("alt"));
		expect(input.properties).toEqual({
			name: "39. Wellenwettkampf",
			date: "14.11.2026",
			year: 2026,
			host: "DLRG Musterstadt"
		});
		expect(input.now).toBe(now);
		expect(input.catalog.chapters.length).toBeGreaterThan(0);
		// Das Regelwerk trägt den neuen Rec-Wert.
		expect(parseRulebookRecords(input.rulebook)[0].rec).toBe(5700);
		expect(saveFile).toHaveBeenCalledWith({
			defaultName: "Wellenwettkampf 2026.wk",
			filters: [{ name: "JAuswertung-Wettkampf", extensions: ["wk"] }],
			bytes: BUILT
		});
	});

	it("meldet den Abbruch des Dialogs mit path null", async () => {
		saveFile.mockResolvedValue(null);
		expect(await saveFreshCompetition(job())).toMatchObject({ ok: true, path: null });
	});

	it("gibt Fehler des Umbaus weiter, ohne zu speichern", async () => {
		buildFreshCompetition.mockReturnValue({ ok: false, message: "Die Datei ist keine JAuswertung-Wettkampfdatei." });
		expect(await saveFreshCompetition(job())).toEqual({
			ok: false,
			message: "Die Datei ist keine JAuswertung-Wettkampfdatei."
		});
		expect(saveFile).not.toHaveBeenCalled();
	});

	it("meldet Schreibfehler der Desktop-Hülle", async () => {
		// Synchron werfen statt eines abgelehnten Promise: happy-dom meldet das sonst als unbehandelten Fehler.
		saveFile.mockImplementation(() => {
			throw "Die Datei ist in einem anderen Programm geöffnet.";
		});
		expect(await saveFreshCompetition(job())).toEqual({
			ok: false,
			message: "Die Datei ist in einem anderen Programm geöffnet."
		});
	});
});

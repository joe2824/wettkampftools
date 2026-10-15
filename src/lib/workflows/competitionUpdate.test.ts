// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

const filesMock = vi.hoisted(() => ({ saveFile: vi.fn() }));
vi.mock("$lib/platform/files", () => filesMock);

import { strFromU8, unzipSync } from "fflate";
import { competitionFile, competitionXml, penaltyCatalogFile } from "$lib/testing/penaltyFixture";
import { rulebookFile, type FixtureAgeGroup } from "$lib/testing/rulebookFixture";
import { saveUpdatedCompetition, updatedCompetitionFileName } from "./competitionUpdate";
import { preparePenalties } from "./penalties";
import { readRulebookFile } from "./records";

const GROUPS: FixtureAgeGroup[] = [
	{
		name: "AkW offen",
		female: [{ name: "4*50m Retten in der Welle", rec: 20894 }],
		male: [{ name: "4*50m Retten in der Welle", rec: 16221 }]
	}
];

function input() {
	const club = readRulebookFile("Regelwerk_2025.rwm", rulebookFile(GROUPS));
	const penalties = preparePenalties("defaultm.def", penaltyCatalogFile());
	if (!club.ok || !penalties.ok) throw new Error("Fixture");
	const rows = [{ ageGroup: "AkW offen", gender: "male" as const, disciplineIndex: 0, oldRec: 16221, newRec: 16500 }];
	return { club: club.rulebook, penalties: penalties.penalties, rows, year: 2026 };
}

const cleanFile = () => ({ name: "WWK.wk", bytes: competitionFile(competitionXml({ groups: GROUPS })) });

// Mit Block: ein zurückgegebener Mock würde als Aufräumfunktion aufgerufen.
beforeEach(() => {
	filesMock.saveFile.mockReset();
});

describe("updatedCompetitionFileName", () => {
	it("hängt das Jahr an den Originalnamen", () => {
		expect(updatedCompetitionFileName("Wellenwettkampf_2025.wk", 2026)).toBe("Wellenwettkampf_2025 – für 2026.wk");
		expect(updatedCompetitionFileName("ohne Endung", 2026)).toBe("ohne Endung – für 2026.wk");
	});
});

describe("saveUpdatedCompetition", () => {
	it("speichert die aktualisierte Datei als neue Datei", async () => {
		filesMock.saveFile.mockResolvedValue("C:/WWK – für 2026.wk");
		const outcome = await saveUpdatedCompetition(cleanFile(), input());
		expect(outcome).toEqual({ ok: true, path: "C:/WWK – für 2026.wk", teams: 2, ageGroups: 1 });
		const request = filesMock.saveFile.mock.calls[0][0];
		expect(request.defaultName).toBe("WWK – für 2026.wk");
		expect(request.filters).toEqual([{ name: "JAuswertung-Wettkampf", extensions: ["wk"] }]);
		const xml = strFromU8(unzipSync(request.bytes)["data.xml"]);
		expect(xml).toContain("<rec>16500</rec>");
		expect(xml).toContain("<shortname>RW1#4</shortname>");
		expect(xml).toContain("<beschreibung>Wellen-Wk 2026 (mit Rec-Werten für 2025)</beschreibung>");
	});

	it("speichert nichts bei Ablehnung", async () => {
		const file = { name: "WWK.wk", bytes: competitionFile(competitionXml({ groups: GROUPS, assignedPenalty: true })) };
		const outcome = await saveUpdatedCompetition(file, input());
		expect(outcome).toEqual({ ok: false, message: expect.stringContaining("bereits Strafen vergeben") });
		expect(filesMock.saveFile).not.toHaveBeenCalled();
	});

	it("meldet Abbruch ohne Pfad", async () => {
		filesMock.saveFile.mockResolvedValue(null);
		expect(await saveUpdatedCompetition(cleanFile(), input())).toMatchObject({ ok: true, path: null });
	});

	it("meldet Speicherfehler", async () => {
		filesMock.saveFile.mockRejectedValue("Die Datei ist in einem anderen Programm geöffnet.");
		expect(await saveUpdatedCompetition(cleanFile(), input())).toEqual({
			ok: false,
			message: "Die Datei ist in einem anderen Programm geöffnet."
		});
		filesMock.saveFile.mockRejectedValue(new TypeError("x"));
		expect(await saveUpdatedCompetition(cleanFile(), input())).toEqual({
			ok: false,
			message: "Die Wettkampfdatei konnte nicht gespeichert werden."
		});
	});
});

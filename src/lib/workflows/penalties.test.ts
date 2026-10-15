// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

const httpMock = vi.hoisted(() => ({ platformFetch: vi.fn() }));
vi.mock("$lib/platform/http", () => httpMock);

import { readPenaltyCatalog } from "$lib/records/penaltyCatalog";
import { verifyPenaltyCatalog } from "$lib/records/penaltyRules";
import { penaltyCatalogFile } from "$lib/testing/penaltyFixture";
import { changeValues, downloadOfficialPenalties, OFFICIAL_PENALTY_URL, preparePenalties } from "./penalties";

beforeEach(() => {
	httpMock.platformFetch.mockReset();
});

describe("preparePenalties", () => {
	it("wendet die Vereinsregeln an und liefert die fertige, geprüfte Datei", () => {
		const outcome = preparePenalties("defaultm.def", penaltyCatalogFile());
		if (!outcome.ok) throw new Error(outcome.message);
		const { penalties } = outcome;
		expect(penalties.name).toBe("defaultm.def");
		expect(penalties.changes.map((c) => c.code)).toEqual(["V1", "RW1", "RW1#1", "RW1#2", "RW1#3", "RW1#4"]);
		expect(penalties.issues).toEqual([]);
		expect(verifyPenaltyCatalog(penalties.bytes)).toEqual([]);
		expect(readPenaltyCatalog(penalties.bytes)).toEqual(penalties.catalog);
	});

	it("meldet unlesbare Dateien verständlich", () => {
		expect(preparePenalties("x.def", new Uint8Array([1, 2]))).toEqual({
			ok: false,
			message: "Die Datei ist kein JAuswertung-Strafenkatalog."
		});
	});
});

describe("downloadOfficialPenalties", () => {
	it("lädt den offiziellen Mannschafts-Katalog aus JAuswertung", async () => {
		httpMock.platformFetch.mockResolvedValue(new Response(new Blob([penaltyCatalogFile().slice()])));
		const outcome = await downloadOfficialPenalties();
		expect(httpMock.platformFetch).toHaveBeenCalledWith(OFFICIAL_PENALTY_URL);
		expect(OFFICIAL_PENALTY_URL).toBe(
			"https://raw.githubusercontent.com/dennisfabri/JAuswertung/main/jauswertung-files/src/main/resources/penalties/defaultm.def"
		);
		expect(outcome.ok && outcome.penalties.name).toBe("defaultm.def");
	});

	it("meldet fehlende Verbindung und Serverfehler", async () => {
		httpMock.platformFetch.mockRejectedValue(new Error("offline"));
		const offline = await downloadOfficialPenalties();
		expect(offline.ok).toBe(false);
		httpMock.platformFetch.mockResolvedValue(new Response("x", { status: 500 }));
		expect((await downloadOfficialPenalties()).ok).toBe(false);
	});
});

describe("changeValues", () => {
	it("beschreibt alten und neuen Wert", () => {
		expect(
			changeValues({
				code: "V1",
				name: "Fehlstart",
				before: { kind: "DISQUALIFIKATION", points: 0 },
				after: { kind: "STRAFPUNKTE", points: 100 }
			})
		).toEqual({ before: "Disqualifikation", after: "100 Strafpunkte" });
		expect(changeValues({ code: "RW1", name: "x", before: null, after: { kind: "STRAFPUNKTE", points: 200 } })).toEqual(
			{
				before: "neu",
				after: "200 Strafpunkte"
			}
		);
	});
});

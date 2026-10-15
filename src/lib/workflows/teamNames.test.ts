import { describe, expect, it } from "vitest";
import { defaultSettings } from "$lib/settings/settings";
import { buildRegistrationCsv } from "$lib/testing/fixtures";
import { loadRegistrations } from "./preparation";
import { refreshTeamNames } from "./teamNames";

function loaded() {
	const csv = new TextEncoder().encode(
		buildRegistrationCsv([
			{ gliederung: "Musterstadt", name: "Musterstadt / Süd", ak: "AK 12" },
			{ gliederung: "Musterstadt", name: "Musterstadt / Süd", ak: "AK 12" },
			{ gliederung: "Beispielhausen", name: "Beispielhausen", ak: "AK 12" }
		])
	);
	const outcome = loadRegistrations(csv, "meldungen.csv", defaultSettings());
	if (!outcome.ok) throw new Error(outcome.message);
	return { ...outcome.registration, waveSelection: new Set(["r2"]) };
}

describe("refreshTeamNames", () => {
	it("vergibt neue Namen und behält Wellenauswahl und IDs", () => {
		const registration = loaded();
		const next = refreshTeamNames(registration, { Musterstadt: "Musterstadt / Süd" });
		expect(next?.teams.map((team) => team.name)).toEqual([
			"Musterstadt / Süd 1",
			"Musterstadt / Süd 2",
			"Beispielhausen"
		]);
		expect(next?.teams.map((team) => team.id)).toEqual(registration.teams.map((team) => team.id));
		expect(next?.renames.map((rename) => rename.to)).toEqual(["Musterstadt / Süd 1", "Musterstadt / Süd 2"]);
		expect([...(next?.waveSelection ?? [])]).toEqual(["r2"]);
		expect(next?.sourceBytes).toBe(registration.sourceBytes);
	});

	it("liefert null, wenn sich kein Name ändert", () => {
		expect(refreshTeamNames(loaded(), {})).toBeNull();
	});
});

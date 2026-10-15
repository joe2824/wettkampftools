import { describe, expect, it } from "vitest";
import type { Team } from "./registrations";
import { teamBaseName, teamNameRows, withTeamNameOverride } from "./teamNames";

function team(organisation: string, originalName: string): Team {
	return {
		id: `${organisation}-${originalName}`,
		sourceRow: 1,
		organisation,
		originalName,
		name: organisation,
		ageGroup: "AK 12",
		ageGroupKnown: true,
		gender: "weiblich",
		qualification: "",
		reportedPoints: "",
		members: []
	};
}

describe("teamBaseName", () => {
	it("liefert den eigenen Namen ohne Groß-/Kleinschreibung", () => {
		expect(teamBaseName("Musterstadt", { MUSTERSTADT: "Musterstadt / Süd" })).toBe("Musterstadt / Süd");
	});

	it("liefert sonst die Gliederung", () => {
		expect(teamBaseName("Musterstadt", {})).toBe("Musterstadt");
	});
});

describe("withTeamNameOverride", () => {
	it("setzt den gekürzten Namen und ersetzt andere Schreibweisen des Schlüssels", () => {
		const next = withTeamNameOverride({ musterstadt: "Alt", Beispielhausen: "B" }, "Musterstadt", " Neu ");
		expect(next).toEqual({ Beispielhausen: "B", Musterstadt: "Neu" });
	});

	it("entfernt den Eintrag bei leerem Namen oder dem Namen der Gliederung", () => {
		expect(withTeamNameOverride({ Musterstadt: "Alt" }, "Musterstadt", "  ")).toEqual({});
		expect(withTeamNameOverride({ Musterstadt: "Alt" }, "Musterstadt", "Musterstadt")).toEqual({});
	});

	it("verändert die Eingabe nicht", () => {
		const overrides = { Musterstadt: "Alt" };
		withTeamNameOverride(overrides, "Musterstadt", "Neu");
		expect(overrides).toEqual({ Musterstadt: "Alt" });
	});
});

describe("teamNameRows", () => {
	it("fasst Meldenamen je Gliederung zusammen und sortiert", () => {
		const rows = teamNameRows(
			[
				team("Musterstadt", "Musterstadt / Süd"),
				team("Beispielhausen", "Beispielhausen"),
				team("Musterstadt", "Musterstadt / Süd")
			],
			{}
		);
		expect(rows).toEqual([
			{
				organisation: "Beispielhausen",
				reportedNames: ["Beispielhausen"],
				override: "",
				differs: false,
				suggestion: null
			},
			{
				organisation: "Musterstadt",
				reportedNames: ["Musterstadt / Süd"],
				override: "",
				differs: true,
				suggestion: "Musterstadt / Süd"
			}
		]);
	});

	it("schlägt bei mehreren verschiedenen Meldenamen nichts vor", () => {
		const [row] = teamNameRows([team("Musterstadt", "Haie"), team("Musterstadt", "Delfine")], {});
		expect(row).toMatchObject({ reportedNames: ["Haie", "Delfine"], differs: true, suggestion: null });
	});

	it("ignoriert leere Meldenamen und zeigt den eigenen Namen", () => {
		const [row] = teamNameRows([team("Musterstadt", "")], { musterstadt: "Musterstadt / Süd" });
		expect(row).toMatchObject({ reportedNames: [], override: "Musterstadt / Süd", differs: false, suggestion: null });
	});
});

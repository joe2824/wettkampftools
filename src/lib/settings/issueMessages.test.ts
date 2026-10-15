import { describe, expect, it } from "vitest";
import { issueMessage, issueMessages } from "./issueMessages";
import { parseSettings } from "./settings";

describe("issueMessage", () => {
	it("übersetzt bekannte Codes ins Deutsche", () => {
		expect(issueMessage("ageGroups.invalid")).toBe("Altersklassen waren ungültig und wurden zurückgesetzt.");
		expect(issueMessage("root.invalid")).toBe(
			"Die Datei ist keine gültige Einstellungsdatei. Es wurde nichts geändert."
		);
		expect(issueMessage("unknownKeys.dropped")).toBe("Unbekannte Einträge wurden ignoriert.");
	});

	it("baut Meldungen aus Feld und Art des Hinweises", () => {
		expect(issueMessage("certificates.copiesPerTeam.clamped")).toBe(
			"Urkunden je Mannschaft: Der Wert lag außerhalb des erlaubten Bereichs und wurde angepasst."
		);
		expect(issueMessage("event.signers.1.name.invalid")).toBe(
			"Name Unterzeichner 2: Der Wert war ungültig und wurde auf Standard zurückgesetzt."
		);
		expect(issueMessage("seniorTeamAgeGroups.invalidEntries")).toBe(
			"Senioren-Altersklassen (Mannschaft): Ungültige Einträge wurden entfernt."
		);
	});

	it("liefert für unbekannte Codes einen allgemeinen Hinweis", () => {
		expect(issueMessage("something.odd")).toBe("Ein Wert war ungültig und wurde auf Standard zurückgesetzt.");
		expect(issueMessage("ageGroups.weird")).toBe("Ein Wert war ungültig und wurde auf Standard zurückgesetzt.");
	});

	it("kennt jeden Code, den die Prüfung liefert", () => {
		const { issues } = parseSettings({
			ageGroups: 1,
			seniorTeamAgeGroups: [],
			seniorIndividualAgeGroups: ["AK 25", 3],
			waveStartAgeGroup: "AK 99",
			simplifySeniorAgeGroups: "ja",
			rulebook: { name: 1 },
			event: { number: 1, date: "14.11.2026", signers: [{ name: 1, role: 2 }, {}] },
			certificates: { copiesPerTeam: 99, copiesPerIndividual: 1.4, printOffsetMm: { x: "a", y: 50 } },
			teamNameOverrides: { Musterstadt: "" },
			extra: true
		});
		expect(issues.length).toBeGreaterThan(10);
		for (const issue of issues) {
			expect(issueMessage(issue), issue).not.toBe("Ein Wert war ungültig und wurde auf Standard zurückgesetzt.");
		}
	});
});

describe("issueMessages", () => {
	it("entfernt doppelte Meldungen und behält die Reihenfolge", () => {
		expect(issueMessages(["unknownKeys.dropped", "ageGroups.invalid", "unknownKeys.dropped"])).toEqual([
			"Unbekannte Einträge wurden ignoriert.",
			"Altersklassen waren ungültig und wurden zurückgesetzt."
		]);
	});
});

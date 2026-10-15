import { describe, expect, it } from "vitest";
import type { LegacySettings } from "$lib/platform/legacySettings";
import { mergeLegacySettings } from "./legacyMerge";
import { defaultSettings } from "./settings";

describe("mergeLegacySettings", () => {
	it("übernimmt gültige Felder und meldet sie", () => {
		const legacy: LegacySettings = {
			ageGroups: ["AK 12", "AK Offen"],
			waveStartAgeGroup: "AK Offen",
			excludeUnplacedTeams: false,
			warnings: []
		};
		const { settings, applied, fellBack } = mergeLegacySettings(defaultSettings(), legacy);
		expect(settings.ageGroups).toEqual(["AK 12", "AK Offen"]);
		expect(settings.waveStartAgeGroup).toBe("AK Offen");
		expect(settings.excludeUnplacedTeams).toBe(false);
		expect(settings.legacyMigrated).toBe(true);
		expect(applied).toEqual(["ageGroups", "excludeUnplacedTeams", "waveStartAgeGroup"]);
		expect(fellBack).toEqual([]);
	});

	it("setzt ungültige Felder auf Standard und meldet sie", () => {
		const base = defaultSettings();
		base.simplifySeniorAgeGroups = false;
		const legacy = {
			seniorTeamAgeGroups: [" "],
			simplifySeniorAgeGroups: "true",
			waveStartAgeGroup: "AK 99",
			warnings: ["registry.unreadable"]
		} as unknown as LegacySettings;
		const { settings, applied, fellBack } = mergeLegacySettings(base, legacy);
		expect(settings.seniorTeamAgeGroups).toEqual(defaultSettings().seniorTeamAgeGroups);
		expect(settings.simplifySeniorAgeGroups).toBe(true);
		expect(settings.waveStartAgeGroup).toBe("AK 13/14");
		expect(applied).toEqual([]);
		expect(fellBack).toEqual(["seniorTeamAgeGroups", "simplifySeniorAgeGroups", "waveStartAgeGroup"]);
	});

	it("lässt fehlende Felder unverändert und verändert die Basis nicht", () => {
		const base = defaultSettings();
		base.certificates.copiesPerTeam = 2;
		const { settings, applied, fellBack } = mergeLegacySettings(base, { warnings: [] });
		expect(settings.certificates.copiesPerTeam).toBe(2);
		expect(applied).toEqual([]);
		expect(fellBack).toEqual([]);
		expect(base.legacyMigrated).toBe(false);
	});

	it("passt die Wellen-Starterlaubnis an neue Altersklassen an", () => {
		const { settings, fellBack } = mergeLegacySettings(defaultSettings(), {
			ageGroups: ["AK 15/16", "AK Offen"],
			warnings: []
		});
		expect(settings.waveStartAgeGroup).toBe("AK 15/16");
		expect(fellBack).toEqual(["waveStartAgeGroup"]);
	});
});

import { describe, expect, it } from "vitest";
import {
	defaultSettings,
	MAX_TEAM_NAME_LENGTH,
	parseSettings,
	serializeSettingsForExport,
	SETTINGS_SCHEMA_VERSION
} from "./settings";

const SCHEMA_KEYS = [
	"schemaVersion",
	"ageGroups",
	"seniorTeamAgeGroups",
	"seniorIndividualAgeGroups",
	"waveStartAgeGroup",
	"simplifySeniorAgeGroups",
	"excludeUnplacedTeams",
	"rulebook",
	"event",
	"certificates",
	"teamNameOverrides",
	"legacyMigrated"
];

describe("defaultSettings", () => {
	it("entspricht den Standardwerten des Originals", () => {
		const settings = defaultSettings();
		expect(settings.schemaVersion).toBe(1);
		expect(settings.ageGroups).toEqual(["AK 10", "AK 12", "AK 13/14", "AK 15/16", "AK 17/18", "AK Offen"]);
		expect(settings.seniorTeamAgeGroups).toEqual([
			"AK 100",
			"AK 120",
			"AK 140",
			"AK 170",
			"AK 200",
			"AK 240",
			"AK 280+"
		]);
		expect(settings.seniorIndividualAgeGroups).toEqual([
			"AK 25",
			"AK 30",
			"AK 35",
			"AK 40",
			"AK 45",
			"AK 50",
			"AK 55",
			"AK 60+"
		]);
		expect(settings.waveStartAgeGroup).toBe("AK 13/14");
		expect(settings.simplifySeniorAgeGroups).toBe(true);
		expect(settings.excludeUnplacedTeams).toBe(true);
		expect(settings.rulebook).toBeNull();
		expect(settings.legacyMigrated).toBe(false);
	});

	it("enthält Veranstaltungs- und Urkundenstandards ohne echte Namen", () => {
		const settings = defaultSettings();
		expect(settings.event).toEqual({
			number: "",
			title: "Wellenwettkampf",
			host: "DLRG-Ortsgruppe Dorheim",
			date: "",
			venue: "Usa-Wellenbad Bad Nauheim",
			signers: [
				{ name: "", role: "Vorsitzende/r" },
				{ name: "", role: "Wettkampforganisation" }
			]
		});
		expect(settings.certificates).toEqual({
			withMemberNames: false,
			copiesPerTeam: 5,
			copiesPerIndividual: 1,
			printOffsetMm: { x: 0, y: 0 }
		});
	});

	it("liefert bei jedem Aufruf eine frische Kopie", () => {
		const first = defaultSettings();
		first.ageGroups.push("AK 99");
		first.event.signers[0].name = "Anna Meier";
		const second = defaultSettings();
		expect(second.ageGroups).not.toContain("AK 99");
		expect(second.event.signers[0].name).toBe("");
	});
});

describe("parseSettings", () => {
	it.each([null, undefined, 42, "text", [], true])("macht aus Unsinn (%s) gültige Standards", (input) => {
		const { settings, issues } = parseSettings(input);
		expect(settings).toEqual(defaultSettings());
		expect(issues).toEqual(["root.invalid"]);
	});

	it("übernimmt vollständige gültige Einstellungen unverändert", () => {
		const valid = defaultSettings();
		valid.ageGroups = ["AK 12", "AK Offen"];
		valid.waveStartAgeGroup = "AK Offen";
		valid.event.date = "2026-06-20";
		valid.rulebook = { name: "DLRG 2026", ageGroups: [{ name: "AK 12", minMembers: 4, maxMembers: 5 }] };
		valid.teamNameOverrides = { Musterstadt: "Musterstadt / Süd" };
		valid.legacyMigrated = true;
		expect(parseSettings(valid)).toEqual({ settings: valid, issues: [] });
	});

	it("ergänzt fehlende Felder still mit Standards", () => {
		const { settings, issues } = parseSettings({ excludeUnplacedTeams: false, event: { title: "Pokal" } });
		expect(issues).toEqual([]);
		expect(settings.excludeUnplacedTeams).toBe(false);
		expect(settings.event.title).toBe("Pokal");
		expect(settings.event.host).toBe("DLRG-Ortsgruppe Dorheim");
		expect(settings.ageGroups).toEqual(defaultSettings().ageGroups);
	});

	it("verwirft unbekannte Schlüssel", () => {
		const { settings, issues } = parseSettings({ foo: 1, signatureImage: "data:image/png;base64,AAAA" });
		expect(Object.keys(settings).sort()).toEqual([...SCHEMA_KEYS].sort());
		expect(issues).toEqual(["unknownKeys.dropped"]);
	});

	it("ersetzt falsche Typen durch Standards und meldet sie", () => {
		const { settings, issues } = parseSettings({
			schemaVersion: 7,
			ageGroups: "AK 10",
			seniorTeamAgeGroups: [],
			simplifySeniorAgeGroups: "ja",
			rulebook: { name: "X" },
			event: "Wellenwettkampf",
			certificates: { copiesPerTeam: "5", withMemberNames: 1 }
		});
		expect(settings).toEqual(defaultSettings());
		expect(issues).toEqual([
			"schemaVersion.unsupported",
			"ageGroups.invalid",
			"seniorTeamAgeGroups.empty",
			"simplifySeniorAgeGroups.invalid",
			"rulebook.invalid",
			"event.invalid",
			"certificates.withMemberNames.invalid",
			"certificates.copiesPerTeam.invalid"
		]);
	});

	it("kürzt und entfernt Doppelte in Listen", () => {
		const { settings } = parseSettings({ seniorIndividualAgeGroups: [" AK 25", "AK 25 ", "", "AK 30"] });
		expect(settings.seniorIndividualAgeGroups).toEqual(["AK 25", "AK 30"]);
	});

	describe("Wellen-Starterlaubnis", () => {
		it("fällt auf den Standard zurück, wenn er in der Liste steht", () => {
			const { settings, issues } = parseSettings({ waveStartAgeGroup: "AK 99" });
			expect(settings.waveStartAgeGroup).toBe("AK 13/14");
			expect(issues).toEqual(["waveStartAgeGroup.invalid"]);
		});

		it("fällt auf den ersten Eintrag zurück, wenn der Standard fehlt", () => {
			const { settings, issues } = parseSettings({ ageGroups: ["AK 15/16", "AK Offen"] });
			expect(settings.waveStartAgeGroup).toBe("AK 15/16");
			expect(issues).toEqual(["waveStartAgeGroup.invalid"]);
		});

		it("akzeptiert einen Eintrag der Liste", () => {
			const { settings, issues } = parseSettings({ waveStartAgeGroup: "AK 17/18" });
			expect(settings.waveStartAgeGroup).toBe("AK 17/18");
			expect(issues).toEqual([]);
		});
	});

	it("begrenzt Urkundenanzahl und Druckversatz", () => {
		const { settings, issues } = parseSettings({
			certificates: { copiesPerTeam: 50, copiesPerIndividual: 0, printOffsetMm: { x: -30, y: 2.5 } }
		});
		expect(settings.certificates.copiesPerTeam).toBe(10);
		expect(settings.certificates.copiesPerIndividual).toBe(1);
		expect(settings.certificates.printOffsetMm).toEqual({ x: -20, y: 2.5 });
		expect(issues).toEqual([
			"certificates.copiesPerTeam.clamped",
			"certificates.copiesPerIndividual.clamped",
			"certificates.printOffsetMm.x.clamped"
		]);
	});

	it("ersetzt einen ungültigen Druckversatz und Kommazahlen", () => {
		const { settings, issues } = parseSettings({
			certificates: { copiesPerTeam: 2.4, printOffsetMm: "links" },
			rulebook: null
		});
		expect(settings.certificates.copiesPerTeam).toBe(2);
		expect(settings.certificates.printOffsetMm).toEqual({ x: 0, y: 0 });
		expect(settings.rulebook).toBeNull();
		expect(issues).toEqual(["certificates.copiesPerTeam.rounded", "certificates.printOffsetMm.invalid"]);
	});

	it("prüft Datum und Unterzeichner der Veranstaltung", () => {
		const { settings, issues } = parseSettings({
			event: { date: "20.06.2026", signers: [{ name: "Max Mustermann", role: 3 }] }
		});
		expect(settings.event.date).toBe("");
		expect(settings.event.signers).toEqual(defaultSettings().event.signers);
		expect(issues).toEqual(["event.date.invalid", "event.signers.invalid"]);
	});

	it("übernimmt einzelne Unterzeichnerfelder", () => {
		const { settings, issues } = parseSettings({
			event: { signers: [{ name: "Max Mustermann", role: 3 }, { name: "Anna Meier" }] }
		});
		expect(settings.event.signers).toEqual([
			{ name: "Max Mustermann", role: "Vorsitzende/r" },
			{ name: "Anna Meier", role: "Wettkampforganisation" }
		]);
		expect(issues).toEqual(["event.signers.0.role.invalid"]);
	});

	it("verwirft ein Regelwerk mit unplausiblen Grenzen", () => {
		const { settings, issues } = parseSettings({
			rulebook: { name: "R", ageGroups: [{ name: "AK 12", minMembers: 5, maxMembers: 4 }] }
		});
		expect(settings.rulebook).toBeNull();
		expect(issues).toEqual(["rulebook.invalid"]);
	});

	it("hat standardmäßig keine eigenen Mannschaftsnamen", () => {
		expect(defaultSettings().teamNameOverrides).toEqual({});
	});

	it("verwirft ungültige Mannschaftsnamen einzeln", () => {
		const { settings, issues } = parseSettings({
			teamNameOverrides: {
				Musterstadt: " Musterstadt / Süd ",
				Beispielhausen: "",
				Irgendwo: 5,
				Lang: "x".repeat(MAX_TEAM_NAME_LENGTH + 1)
			}
		});
		expect(settings.teamNameOverrides).toEqual({ Musterstadt: "Musterstadt / Süd" });
		expect(issues).toEqual(["teamNameOverrides.invalidEntries"]);
	});

	it("wirft nie", () => {
		const cyclic: Record<string, unknown> = {};
		cyclic.event = cyclic;
		expect(() => parseSettings(cyclic)).not.toThrow();
	});
});

describe("serializeSettingsForExport", () => {
	it("enthält genau die Schema-Schlüssel ohne Übernahme-Merker", () => {
		const exported = serializeSettingsForExport(defaultSettings());
		const expected = SCHEMA_KEYS.filter((key) => key !== "legacyMigrated");
		expect(Object.keys(exported).sort()).toEqual(expected.sort());
	});

	it("lässt sich wieder einlesen", () => {
		const original = defaultSettings();
		original.certificates.copiesPerTeam = 3;
		original.teamNameOverrides = { Musterstadt: "Musterstadt / Süd" };
		const roundTrip = parseSettings(JSON.parse(JSON.stringify(serializeSettingsForExport(original))));
		expect(roundTrip).toEqual({ settings: original, issues: [] });
	});

	it("hat die aktuelle Schema-Version", () => {
		expect(serializeSettingsForExport(defaultSettings()).schemaVersion).toBe(SETTINGS_SCHEMA_VERSION);
	});
});

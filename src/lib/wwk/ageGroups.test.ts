import { describe, expect, it } from "vitest";
import { defaultSettings, type Settings } from "../settings/settings";
import {
	buildAgeGroupOrder,
	classifyAgeGroup,
	compareAgeGroups,
	displayAgeGroup,
	equalsAgeGroup,
	matchAgeGroup,
	normalizeAgeGroupSpelling,
	RESCUE_PREFIX,
	SENIOR_AGE_GROUP,
	simplifySeniorAgeGroup,
	toWaveAgeGroup,
	WAVE_PREFIX,
	waveAgeGroups,
	waveEligibleAgeGroups
} from "./ageGroups";

function settingsWith(overrides: Partial<Settings>): Settings {
	return { ...defaultSettings(), ...overrides };
}

describe("Konstanten", () => {
	it("haben die erwarteten Werte", () => {
		expect(SENIOR_AGE_GROUP).toBe("AK Senioren");
		expect(RESCUE_PREFIX).toBe("AK");
		expect(WAVE_PREFIX).toBe("AkW");
	});
});

describe("normalizeAgeGroupSpelling", () => {
	it.each([
		["ak 12", "AK 12"],
		["  AK   13/14 ", "AK 13/14"],
		["Ak Offen", "AK Offen"],
		["AKW offen", "AkW offen"],
		["akw 13/14", "AkW 13/14"],
		["AkW 15/16", "AkW 15/16"],
		["Senioren", "Senioren"],
		["", ""]
	])("%s → %s", (raw, expected) => {
		expect(normalizeAgeGroupSpelling(raw)).toBe(expected);
	});

	it("ändert nur das führende Kürzel", () => {
		expect(normalizeAgeGroupSpelling("akwx 1")).toBe("akwx 1");
	});
});

describe("matchAgeGroup", () => {
	const order = ["AK 12", "AK Offen", "AkW Offen"];

	it("liefert die konfigurierte Schreibweise", () => {
		expect(matchAgeGroup("AK offen", order)).toEqual({ kind: "known", name: "AK Offen" });
		expect(matchAgeGroup("AkW offen", order)).toEqual({ kind: "known", name: "AkW Offen" });
		expect(matchAgeGroup(" ak  12 ", order)).toEqual({ kind: "known", name: "AK 12" });
	});

	it("kennzeichnet unbekannte Altersklassen", () => {
		expect(matchAgeGroup("AK 99", order)).toEqual({ kind: "unknown", raw: "AK 99" });
	});
});

describe("equalsAgeGroup", () => {
	it("vergleicht ohne Groß-/Kleinschreibung", () => {
		expect(equalsAgeGroup("ak offen", "AK Offen")).toBe(true);
		expect(equalsAgeGroup("AKW 12", "AkW 12")).toBe(true);
		expect(equalsAgeGroup("AK 12", "AkW 12")).toBe(false);
	});
});

describe("simplifySeniorAgeGroup", () => {
	it("fasst Senioren-Mannschaften zusammen, wenn aktiviert", () => {
		const settings = defaultSettings();
		expect(simplifySeniorAgeGroup("AK 100", settings)).toBe(SENIOR_AGE_GROUP);
		expect(simplifySeniorAgeGroup("ak 280+", settings)).toBe(SENIOR_AGE_GROUP);
		expect(simplifySeniorAgeGroup("AK 12", settings)).toBe("AK 12");
	});

	it("lässt Namen unverändert, wenn deaktiviert", () => {
		const settings = settingsWith({ simplifySeniorAgeGroups: false });
		expect(simplifySeniorAgeGroup("AK 100", settings)).toBe("AK 100");
	});
});

describe("waveEligibleAgeGroups", () => {
	it("nimmt ab Start-AK alle Altersklassen plus Senioren (Standard)", () => {
		expect(waveEligibleAgeGroups(defaultSettings())).toEqual([
			"AK 13/14",
			"AK 15/16",
			"AK 17/18",
			"AK Offen",
			SENIOR_AGE_GROUP
		]);
	});

	it("nimmt ohne Vereinfachung alle Senioren-AK inkl. AK 100 und AK 120", () => {
		const result = waveEligibleAgeGroups(settingsWith({ simplifySeniorAgeGroups: false }));
		expect(result).toEqual([
			"AK 13/14",
			"AK 15/16",
			"AK 17/18",
			"AK Offen",
			"AK 100",
			"AK 120",
			"AK 140",
			"AK 170",
			"AK 200",
			"AK 240",
			"AK 280+"
		]);
	});

	it("arbeitet positionsbasiert statt per Textvergleich", () => {
		const settings = settingsWith({ ageGroups: ["AK 9", "AK 10", "AK 2"], waveStartAgeGroup: "AK 10" });
		expect(waveEligibleAgeGroups(settings)).toEqual(["AK 10", "AK 2", SENIOR_AGE_GROUP]);
	});

	it("findet die Start-AK ohne Groß-/Kleinschreibung", () => {
		const settings = settingsWith({ waveStartAgeGroup: "ak offen" });
		expect(waveEligibleAgeGroups(settings)).toEqual(["AK Offen", SENIOR_AGE_GROUP]);
	});

	it("liefert ohne gefundene Start-AK nur die Senioren", () => {
		const settings = settingsWith({ waveStartAgeGroup: "AK 99" });
		expect(waveEligibleAgeGroups(settings)).toEqual([SENIOR_AGE_GROUP]);
	});
});

describe("toWaveAgeGroup / waveAgeGroups", () => {
	it("ersetzt nur das führende Kürzel", () => {
		expect(toWaveAgeGroup("AK 13/14")).toBe("AkW 13/14");
		expect(toWaveAgeGroup("ak Offen")).toBe("AkW Offen");
		expect(toWaveAgeGroup("AK Senioren AK")).toBe("AkW Senioren AK");
	});

	it("bildet die Wellen-Altersklassen", () => {
		expect(waveAgeGroups(defaultSettings())).toEqual([
			"AkW 13/14",
			"AkW 15/16",
			"AkW 17/18",
			"AkW Offen",
			"AkW Senioren"
		]);
	});
});

describe("buildAgeGroupOrder", () => {
	it("setzt die Reihenfolge wie bisher zusammen", () => {
		const settings = defaultSettings();
		expect(buildAgeGroupOrder(settings)).toEqual([
			...settings.ageGroups,
			...settings.seniorIndividualAgeGroups,
			...settings.seniorTeamAgeGroups,
			SENIOR_AGE_GROUP,
			"AkW 13/14",
			"AkW 15/16",
			"AkW 17/18",
			"AkW Offen",
			"AkW Senioren"
		]);
	});

	it("entfernt Duplikate ohne Groß-/Kleinschreibung und behält den ersten Eintrag", () => {
		const settings = settingsWith({
			ageGroups: ["AK 12", "ak 12", "AK Senioren"],
			seniorIndividualAgeGroups: ["AK 12"],
			seniorTeamAgeGroups: [],
			waveStartAgeGroup: "AK 99"
		});
		expect(buildAgeGroupOrder(settings)).toEqual(["AK 12", "AK Senioren", "AkW Senioren"]);
	});
});

describe("classifyAgeGroup", () => {
	const order = buildAgeGroupOrder(defaultSettings());

	it("unterscheidet Rettung und Welle", () => {
		expect(classifyAgeGroup("AK 12", order)).toBe("rescue");
		expect(classifyAgeGroup("ak senioren", order)).toBe("rescue");
		expect(classifyAgeGroup("AkW 13/14", order)).toBe("wave");
		expect(classifyAgeGroup("akw offen", order)).toBe("wave");
	});

	it("liefert null für unbekannte Altersklassen", () => {
		expect(classifyAgeGroup("AkW 12", order)).toBeNull();
		expect(classifyAgeGroup("Senioren", order)).toBeNull();
	});

	it("liefert null für bekannte Einträge ohne Kürzel", () => {
		expect(classifyAgeGroup("Offen", ["Offen"])).toBeNull();
	});
});

describe("displayAgeGroup", () => {
	it("zeigt Wellen-AK als AK an", () => {
		expect(displayAgeGroup("AkW 13/14")).toBe("AK 13/14");
		expect(displayAgeGroup("AK 12")).toBe("AK 12");
		expect(displayAgeGroup("Senioren")).toBe("Senioren");
	});
});

describe("compareAgeGroups", () => {
	it("sortiert nach Reihenfolge, Unbekannte nach Namen am Ende", () => {
		const order = ["AK 12", "AK 10", "AkW 12"];
		const sorted = ["Zeta", "AkW 12", "ak 10", "Alpha", "AK 12"].sort(compareAgeGroups(order));
		expect(sorted).toEqual(["AK 12", "ak 10", "AkW 12", "Alpha", "Zeta"]);
	});
});

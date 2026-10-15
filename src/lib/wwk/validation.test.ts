import { describe, expect, it } from "vitest";
import type { RulebookSummary } from "../settings/settings";
import { errorTeamIds, validateTeams, type Issue, type ValidatableTeam } from "./validation";

function member(yearOfBirth = "2012", lastName = "Meier", firstName = "Anna") {
	return { lastName, firstName, yearOfBirth };
}

function team(overrides: Partial<ValidatableTeam> = {}): ValidatableTeam {
	return {
		id: "t1",
		organisation: "Musterstadt",
		name: "Musterstadt 1",
		ageGroup: "AK 12",
		ageGroupKnown: true,
		gender: "weiblich",
		members: [member(), member(), member(), member()],
		...overrides
	};
}

const rulebook: RulebookSummary = {
	name: "Beispiel-Regelwerk",
	ageGroups: [
		{ name: "AK 12", minMembers: 4, maxMembers: 5 },
		{ name: "AK Offen", minMembers: 3, maxMembers: 6 },
		{ name: "AkW 12", minMembers: 4, maxMembers: 5 }
	]
};

function codes(issues: Issue[]): string[] {
	return issues.map((issue) => issue.code);
}

function check(overrides: Partial<ValidatableTeam>, withRulebook: RulebookSummary | null = null): Issue[] {
	return validateTeams([team(overrides)], { rulebook: withRulebook });
}

describe("validateTeams", () => {
	it("liefert keine Meldungen für eine gültige Mannschaft", () => {
		expect(check({})).toEqual([]);
		expect(check({}, rulebook)).toEqual([]);
	});

	it("akzeptiert Geschlecht unabhängig von Schreibweise und Leerzeichen", () => {
		expect(check({ gender: " Männlich " })).toEqual([]);
		expect(check({ gender: "WEIBLICH" })).toEqual([]);
	});

	it("meldet ungültiges Geschlecht als Fehler", () => {
		const issues = check({ gender: "gemischt" });
		expect(issues).toEqual([expect.objectContaining({ severity: "error", code: "gender.invalid", teamId: "t1" })]);
	});

	it("akzeptiert leere, zwei- und vierstellige Jahrgänge", () => {
		expect(check({ members: [member(""), member("12"), member("2011"), member(" 1900 ")] })).toEqual([]);
	});

	it.each(["abc", "201", "20123", "12a", "1899"])("meldet Jahrgang '%s' als Fehler", (year) => {
		const issues = check({ members: [member(), member(), member(), member(year)] });
		expect(issues).toEqual([expect.objectContaining({ severity: "error", code: "member.yearOfBirth.invalid" })]);
	});

	it("meldet mehr als fünf Mitglieder als Fehler", () => {
		const issues = check({ members: Array.from({ length: 6 }, () => member()) });
		expect(issues).toEqual([expect.objectContaining({ severity: "error", code: "members.tooMany" })]);
	});

	it("meldet weniger als vier Mitglieder als Warnung", () => {
		const issues = check({ members: [member(), member(), member()] });
		expect(issues).toEqual([expect.objectContaining({ severity: "warning", code: "members.tooFew" })]);
	});

	it("meldet fehlende Gliederung und fehlenden Namen als Fehler", () => {
		expect(codes(check({ organisation: " " }))).toEqual(["organisation.missing"]);
		expect(codes(check({ name: "" }))).toEqual(["name.missing"]);
		expect(check({ name: "" })[0].severity).toBe("error");
	});

	it("warnt bei AK, die nicht in den Einstellungen steht", () => {
		const issues = check({ ageGroupKnown: false });
		expect(issues).toEqual([expect.objectContaining({ severity: "warning", code: "ageGroup.unknown" })]);
	});

	it("prüft die AK gegen das Regelwerk nur, wenn eines geladen ist", () => {
		expect(check({ ageGroup: "AK 99" })).toEqual([]);
		const issues = check({ ageGroup: "AK 99" }, rulebook);
		expect(issues).toEqual([expect.objectContaining({ severity: "error", code: "ageGroup.notInRulebook" })]);
	});

	it("vergleicht AKs mit dem Regelwerk ohne Groß-/Kleinschreibung", () => {
		expect(check({ ageGroup: "ak offen" }, rulebook)).toEqual([]);
		expect(check({ ageGroup: "AKW 12" }, rulebook)).toEqual([]);
	});

	it("prüft auch Wellen-AKs gegen das Regelwerk", () => {
		expect(codes(check({ ageGroup: "AkW 14" }, rulebook))).toEqual(["ageGroup.notInRulebook"]);
	});

	it("verwendet die Mitgliedergrenzen des Regelwerks", () => {
		const three = [member(), member(), member()];
		expect(check({ ageGroup: "AK Offen", members: three }, rulebook)).toEqual([]);
		const six = Array.from({ length: 6 }, () => member());
		expect(check({ ageGroup: "AK Offen", members: six }, rulebook)).toEqual([]);
		const seven = Array.from({ length: 7 }, () => member());
		expect(codes(check({ ageGroup: "AK Offen", members: seven }, rulebook))).toEqual(["members.tooMany"]);
		const two = [member(), member()];
		expect(codes(check({ ageGroup: "AK Offen", members: two }, rulebook))).toEqual(["members.tooFew"]);
	});

	it("fällt auf Standardgrenzen zurück, wenn die AK im Regelwerk fehlt", () => {
		const six = Array.from({ length: 6 }, () => member());
		expect(codes(check({ ageGroup: "AK 99", members: six }, rulebook))).toEqual([
			"members.tooMany",
			"ageGroup.notInRulebook"
		]);
	});

	it("nennt Mannschaft und Gliederung, aber keine Personennamen", () => {
		const issues = check({ gender: "x", members: [member("abc", "Mustermann", "Max")] });
		for (const issue of issues) {
			expect(issue.message).toContain("Musterstadt 1");
			expect(issue.message).not.toMatch(/Mustermann|Max\b/);
		}
	});

	it("zählt komplett leere Mitgliedsplätze nicht mit", () => {
		const issues = check({ members: [member(), member(), member(), member("", "", "")] });
		expect(codes(issues)).toEqual(["members.tooFew"]);
	});

	it("benennt Mannschaften ohne Namen über die Gliederung", () => {
		expect(check({ name: "" })[0].message).toContain("Mannschaft aus Musterstadt");
		expect(check({ organisation: "" })[0].message).toContain('„Musterstadt 1"');
		expect(check({ name: "", organisation: "" })[0].message).toContain("Mannschaft ohne Namen");
	});

	it("ordnet Meldungen der jeweiligen Mannschaft zu", () => {
		const issues = validateTeams([team({ id: "a" }), team({ id: "b", gender: "x" })], { rulebook: null });
		expect(issues.map((issue) => issue.teamId)).toEqual(["b"]);
	});
});

describe("errorTeamIds", () => {
	it("enthält nur Mannschaften mit Fehlern, nicht mit Warnungen", () => {
		const issues = validateTeams(
			[team({ id: "ok" }), team({ id: "warn", ageGroupKnown: false }), team({ id: "err", name: "" })],
			{ rulebook: null }
		);
		expect(errorTeamIds(issues)).toEqual(new Set(["err"]));
	});
});

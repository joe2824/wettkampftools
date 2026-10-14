import type { RulebookAgeGroup, RulebookSummary } from "../settings/settings";
import { equalsAgeGroup } from "./ageGroups";

export const DEFAULT_MIN_MEMBERS = 4;
export const DEFAULT_MAX_MEMBERS = 5;
export const EARLIEST_YEAR_OF_BIRTH = 1900;

const VALID_GENDERS: readonly string[] = ["weiblich", "männlich"];
const YEAR_OF_BIRTH_PATTERN = /^(\d{2}|\d{4})$/;
const FULL_YEAR_LENGTH = 4;

export interface ValidatableMember {
	lastName: string;
	firstName: string;
	yearOfBirth: string;
}

export interface ValidatableTeam {
	id: string;
	organisation: string;
	name: string;
	ageGroup: string;
	ageGroupKnown: boolean;
	gender: string;
	members: ValidatableMember[];
}

export type IssueSeverity = "error" | "warning";

export interface Issue {
	severity: IssueSeverity;
	code: string;
	teamId: string;
	message: string;
}

export interface ValidationOptions {
	rulebook: RulebookSummary | null;
}

type Finding = Omit<Issue, "teamId">;

/** Bezeichnung der Mannschaft ohne Personennamen. */
function teamLabel(team: ValidatableTeam): string {
	const name = team.name.trim();
	const organisation = team.organisation.trim();
	if (name && organisation) return `„${name}" (${organisation})`;
	if (name) return `„${name}"`;
	return organisation ? `Mannschaft aus ${organisation}` : "Mannschaft ohne Namen";
}

function isValidYearOfBirth(raw: string): boolean {
	const year = raw.trim();
	if (year === "") return true;
	if (!YEAR_OF_BIRTH_PATTERN.test(year)) return false;
	return year.length !== FULL_YEAR_LENGTH || Number(year) >= EARLIEST_YEAR_OF_BIRTH;
}

function isFilled(member: ValidatableMember): boolean {
	return [member.lastName, member.firstName, member.yearOfBirth].some((value) => value.trim() !== "");
}

function findRulebookEntry(ageGroup: string, rulebook: RulebookSummary | null): RulebookAgeGroup | undefined {
	return rulebook?.ageGroups.find((entry) => equalsAgeGroup(entry.name, ageGroup));
}

function checkGender(team: ValidatableTeam, label: string): Finding[] {
	if (VALID_GENDERS.includes(team.gender.trim().toLowerCase())) return [];
	const message = `${label}: Geschlecht muss „weiblich" oder „männlich" sein.`;
	return [{ severity: "error", code: "gender.invalid", message }];
}

function checkYearsOfBirth(team: ValidatableTeam, label: string): Finding[] {
	return team.members.flatMap((member, index) =>
		isValidYearOfBirth(member.yearOfBirth)
			? []
			: [
					{
						severity: "error" as const,
						code: "member.yearOfBirth.invalid",
						message: `${label}: Jahrgang von Mitglied ${index + 1} ist ungültig.`,
					},
				],
	);
}

function checkMemberCount(team: ValidatableTeam, label: string, entry: RulebookAgeGroup | undefined): Finding[] {
	const count = team.members.filter(isFilled).length;
	const min = entry?.minMembers ?? DEFAULT_MIN_MEMBERS;
	const max = entry?.maxMembers ?? DEFAULT_MAX_MEMBERS;
	if (count > max) {
		const message = `${label}: ${count} Mitglieder gemeldet, erlaubt sind höchstens ${max}.`;
		return [{ severity: "error", code: "members.tooMany", message }];
	}
	if (count < min) {
		const message = `${label}: nur ${count} Mitglieder gemeldet, vorgesehen sind mindestens ${min}.`;
		return [{ severity: "warning", code: "members.tooFew", message }];
	}
	return [];
}

function checkRequiredFields(team: ValidatableTeam, label: string): Finding[] {
	const findings: Finding[] = [];
	if (team.organisation.trim() === "") {
		findings.push({ severity: "error", code: "organisation.missing", message: `${label}: Gliederung fehlt.` });
	}
	if (team.name.trim() === "") {
		findings.push({ severity: "error", code: "name.missing", message: `${label}: Mannschaftsname fehlt.` });
	}
	return findings;
}

function checkAgeGroup(team: ValidatableTeam, label: string, options: ValidationOptions, known: boolean): Finding[] {
	const findings: Finding[] = [];
	const ageGroup = team.ageGroup.trim();
	if (!team.ageGroupKnown) {
		const message = `${label}: Altersklasse „${ageGroup}" steht nicht in den Einstellungen.`;
		findings.push({ severity: "warning", code: "ageGroup.unknown", message });
	}
	if (options.rulebook && !known) {
		const message = `${label}: Altersklasse „${ageGroup}" ist im Regelwerk nicht enthalten.`;
		findings.push({ severity: "error", code: "ageGroup.notInRulebook", message });
	}
	return findings;
}

function validateTeam(team: ValidatableTeam, options: ValidationOptions): Issue[] {
	const label = teamLabel(team);
	const entry = findRulebookEntry(team.ageGroup, options.rulebook);
	const findings = [
		...checkGender(team, label),
		...checkYearsOfBirth(team, label),
		...checkMemberCount(team, label, entry),
		...checkRequiredFields(team, label),
		...checkAgeGroup(team, label, options, entry !== undefined),
	];
	return findings.map((finding) => ({ ...finding, teamId: team.id }));
}

/** Prüft Meldungen auf die Gründe, aus denen JAuswertung Zeilen verwirft. */
export function validateTeams(teams: readonly ValidatableTeam[], options: ValidationOptions): Issue[] {
	return teams.flatMap((team) => validateTeam(team, options));
}

export function errorTeamIds(issues: readonly Issue[]): Set<string> {
	return new Set(issues.filter((issue) => issue.severity === "error").map((issue) => issue.teamId));
}

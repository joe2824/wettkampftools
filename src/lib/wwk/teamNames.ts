// Eigene Mannschaftsnamen je Gliederung statt des reinen Gliederungsnamens.

export type TeamNameOverrides = Readonly<Record<string, string>>;

/** Was von einer Mannschaft gebraucht wird. */
export interface NamedTeam {
	organisation: string;
	originalName: string;
}

export interface TeamNameRow {
	organisation: string;
	/** Verschiedene Namen aus der Meldedatei, ohne leere. */
	reportedNames: string[];
	/** Eigener Name oder leer. */
	override: string;
	/** Meldename weicht von der Gliederung ab (ohne eigenen Namen). */
	differs: boolean;
	/** Einziger abweichender Meldename, der übernommen werden kann. */
	suggestion: string | null;
}

const LOCALE = "de";
const keyOf = (organisation: string): string => organisation.trim().toLocaleLowerCase(LOCALE);

function findOverride(organisation: string, overrides: TeamNameOverrides): string | undefined {
	const key = keyOf(organisation);
	return Object.entries(overrides).find(([candidate]) => keyOf(candidate) === key)?.[1];
}

/** Grundname der Mannschaften einer Gliederung (vor der Nummerierung). */
export function teamBaseName(organisation: string, overrides: TeamNameOverrides): string {
	return findOverride(organisation, overrides) ?? organisation;
}

/** Neuer Satz eigener Namen; leer oder gleich der Gliederung entfernt den Eintrag. */
export function withTeamNameOverride(
	overrides: TeamNameOverrides,
	organisation: string,
	name: string,
): Record<string, string> {
	const key = keyOf(organisation);
	const next = Object.fromEntries(Object.entries(overrides).filter(([candidate]) => keyOf(candidate) !== key));
	const trimmed = name.trim();
	if (trimmed !== "" && trimmed !== organisation) next[organisation] = trimmed;
	return next;
}

function toRow(organisation: string, names: Set<string>, overrides: TeamNameOverrides): TeamNameRow {
	const reportedNames = [...names];
	const override = findOverride(organisation, overrides) ?? "";
	const differing = reportedNames.filter((name) => name !== organisation);
	const differs = override === "" && differing.length > 0;
	const suggestion = reportedNames.length === 1 && differing.length === 1 && override !== differing[0] ? differing[0] : null;
	return { organisation, reportedNames, override, differs, suggestion };
}

/** Eine Zeile je Gliederung, alphabetisch. */
export function teamNameRows(teams: readonly NamedTeam[], overrides: TeamNameOverrides): TeamNameRow[] {
	const groups = new Map<string, Set<string>>();
	for (const team of teams) {
		const names = groups.get(team.organisation) ?? new Set<string>();
		if (team.originalName !== "") names.add(team.originalName);
		groups.set(team.organisation, names);
	}
	return [...groups]
		.map(([organisation, names]) => toRow(organisation, names, overrides))
		.sort((a, b) => a.organisation.localeCompare(b.organisation, LOCALE));
}

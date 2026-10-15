// Gliederungsnamen den DLRG-Standorten zuordnen; gleichnamige Gliederungen werden zur Wahl gestellt.
import { BAD_NAUHEIM, cleanName, distanceKm, type Organisation } from "./dlrgPoi";
import { pickByHint } from "./hints";

export interface Candidate {
	id: string;
	label: string;
	km: number;
}

export interface RowChoice {
	candidates: Candidate[];
	selectedId: string;
	/** Über den Mannschaftsnamen vorgeschlagen, noch nicht bestätigt. */
	automatic: boolean;
}

export interface DistanceRow {
	name: string;
	km: number;
	/** Nur bei gleichnamigen Gliederungen. */
	choice?: RowChoice;
}

export interface AmbiguousName {
	name: string;
	candidates: Candidate[];
}

export interface DistanceResult {
	matched: DistanceRow[];
	ambiguous: AmbiguousName[];
	unmatched: string[];
}

/** Gewählte Gliederung (Kennung) je Name; Schlüssel siehe choiceKey. */
export type ChoiceMap = Readonly<Record<string, string>>;

export interface MatchOptions {
	choices?: ChoiceMap;
	/** Mannschaftsnamen je Gliederungsname, für die automatische Wahl. */
	hints?: Readonly<Record<string, readonly string[]>>;
}

const LOCALE = "de";
const KM_DECIMALS_FACTOR = 100;
const WHITESPACE = /\s+/g;

function roundKm(km: number): number {
	return Math.round(km * KM_DECIMALS_FACTOR) / KM_DECIMALS_FACTOR;
}

function matchKey(name: string): string {
	return cleanName(name).replace(WHITESPACE, " ").toLowerCase();
}

export function choiceKey(name: string): string {
	return name.trim().toLocaleLowerCase(LOCALE);
}

export function candidateLabel(org: Organisation): string {
	const place = [org.plz, org.ort].filter((part) => part).join(" ");
	const kind = org.bez ? ` (${org.bez})` : "";
	const details = `${place}${kind}`.trim();
	const name = cleanName(org.name).replace(WHITESPACE, " ");
	return details === "" ? name : `${name} – ${details}`;
}

// Ohne Kennung (älterer Zwischenspeicher) zählt der Name: dann gibt es nichts zu wählen.
const organisationId = (org: Organisation): string => org.id ?? matchKey(org.name);

/** Je Name die verschiedenen Gliederungen, jeweils der erste Standort. */
function candidatesByName(orgs: readonly Organisation[]): Map<string, Candidate[]> {
	const byName = new Map<string, Map<string, Candidate>>();
	for (const org of orgs) {
		const key = matchKey(org.name);
		const group = byName.get(key) ?? new Map<string, Candidate>();
		const id = organisationId(org);
		if (!group.has(id)) group.set(id, { id, label: candidateLabel(org), km: roundKm(distanceKm(BAD_NAUHEIM, org)) });
		byName.set(key, group);
	}
	return new Map([...byName].map(([key, group]) => [key, [...group.values()].sort((a, b) => a.km - b.km)]));
}

/** Gemerkte Wahl vor Hinweis aus dem Mannschaftsnamen; null, wenn offen. */
function selectCandidate(name: string, candidates: Candidate[], options: MatchOptions): RowChoice | null {
	const chosen = options.choices?.[choiceKey(name)];
	if (chosen !== undefined && candidates.some((candidate) => candidate.id === chosen)) {
		return { candidates, selectedId: chosen, automatic: false };
	}
	const hintOptions = candidates.map((candidate) => ({ id: candidate.id, text: candidate.label }));
	const hinted = pickByHint(name, hintOptions, options.hints?.[name] ?? []);
	return hinted === null ? null : { candidates, selectedId: hinted, automatic: true };
}

function addName(result: DistanceResult, name: string, candidates: Candidate[] | undefined, options: MatchOptions) {
	if (!candidates) {
		result.unmatched.push(name);
		return;
	}
	if (candidates.length === 1) {
		result.matched.push({ name, km: candidates[0].km });
		return;
	}
	const choice = selectCandidate(name, candidates, options);
	const selected = candidates.find((candidate) => candidate.id === choice?.selectedId);
	if (choice && selected) result.matched.push({ name, km: selected.km, choice });
	else result.ambiguous.push({ name, candidates });
}

export function distancesToBadNauheim(
	names: readonly string[],
	orgs: readonly Organisation[],
	options: MatchOptions = {}
): DistanceResult {
	const byName = candidatesByName(orgs);
	const result: DistanceResult = { matched: [], ambiguous: [], unmatched: [] };
	for (const name of names) addName(result, name, byName.get(matchKey(name)), options);
	result.matched.sort((a, b) => b.km - a.km);
	return result;
}

export function withChoice(choices: ChoiceMap, name: string, id: string): Record<string, string> {
	return { ...choices, [choiceKey(name)]: id };
}

/** Gespeicherte Zuordnungen; ungültige Einträge entfallen. */
export function parseChoiceMap(raw: unknown): Record<string, string> | null {
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
	const entries = Object.entries(raw).filter(
		(entry): entry is [string, string] => choiceKey(entry[0]) !== "" && typeof entry[1] === "string" && entry[1] !== ""
	);
	return Object.fromEntries(entries.map(([name, id]) => [choiceKey(name), id]));
}

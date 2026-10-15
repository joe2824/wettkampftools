// Entfernungen: Gliederungen sammeln, Standortdaten laden (mit Zwischenspeicher), Tabelle aufbereiten.
import { fetchOrganisations, parseGldCache, type GldCache } from "$lib/distance/dlrgPoi";
import {
	choiceKey,
	distancesToBadNauheim,
	parseChoiceMap,
	withChoice,
	type Candidate,
	type ChoiceMap,
	type DistanceResult
} from "$lib/distance/matching";
import { formatKm } from "$lib/format/distance";
import { MissingColumnsError, parseRegistrationCsv } from "$lib/io/csv";
import { logError, logInfo } from "$lib/log";
import { readJson, writeJson } from "$lib/platform/fs";
import { platformFetch } from "$lib/platform/http";
import { teamBaseName, type TeamNameOverrides } from "$lib/wwk/teamNames";
import { NOT_A_TEAM_EXPORT } from "./errors";

export const GLD_CACHE_FILE = "gld-cache.json";
/** Gewählte Gliederung bei gleichnamigen Einträgen; keine Personendaten. */
export const CHOICES_FILE = "distances/choices.json";
const ORGANISATION_COLUMN = "gliederung";
const WHITESPACE = /\s+/g;
const TEAM_NAME_COLUMN = "name";

/**
 * cache: gespeicherter Stand, fresh: gerade abgerufen,
 * offline: Abruf fehlgeschlagen, gespeicherter Stand, unavailable: gar keine Daten.
 */
export type OrganisationStatus = "cache" | "fresh" | "offline" | "unavailable";

export interface OrganisationData {
	data: GldCache | null;
	status: OrganisationStatus;
}

export interface LoadOrganisationsOptions {
	refresh?: boolean;
	fetchJson?: (url: string) => Promise<unknown>;
	now?: Date;
}

/** Gliederungen und ihre Mannschaftsnamen (Hinweise bei gleichnamigen Gliederungen). */
export interface DistanceSource {
	names: string[];
	teamNames: Record<string, string[]>;
}

export type NamesOutcome = ({ ok: true } & DistanceSource) | { ok: false; message: string };

export interface TeamNameSource {
	organisation: string;
	name: string;
	originalName?: string;
}

export interface ComputeOptions {
	choices?: ChoiceMap;
	overrides?: TeamNameOverrides;
}

export async function fetchPoiJson(url: string): Promise<unknown> {
	const response = await platformFetch(url);
	if (!response.ok) throw new Error(`HTTP ${response.status}`);
	return response.json();
}

async function fetchFresh(fetchJson: (url: string) => Promise<unknown>, now: Date): Promise<GldCache | null> {
	try {
		const organisations = await fetchOrganisations(fetchJson);
		if (organisations.length === 0) return null;
		const fresh: GldCache = { fetchedAt: now.toISOString(), organisations };
		await writeJson(GLD_CACHE_FILE, fresh);
		logInfo("distances.fetched", { organisations: organisations.length });
		return fresh;
	} catch {
		logError("distances.fetchFailed");
		return null;
	}
}

// Ältere Zwischenspeicher ohne Kennungen können gleichnamige Gliederungen nicht unterscheiden.
const hasIds = (cache: GldCache): boolean => cache.organisations.every((org) => org.id !== undefined);

/** Nimmt den gespeicherten Stand; abgerufen wird auf Wunsch oder wenn nichts gespeichert ist. */
export async function loadOrganisations(options: LoadOrganisationsOptions = {}): Promise<OrganisationData> {
	const { refresh = false, fetchJson = fetchPoiJson, now = new Date() } = options;
	const cached = await readJson(GLD_CACHE_FILE, parseGldCache);
	if (cached && !refresh && hasIds(cached)) return { data: cached, status: "cache" };
	const fresh = await fetchFresh(fetchJson, now);
	if (fresh) return { data: fresh, status: "fresh" };
	return cached ? { data: cached, status: "offline" } : { data: null, status: "unavailable" };
}

/** Jede Gliederung einmal, in der Reihenfolge des ersten Auftretens. */
export function organisationsFromTeams(teams: readonly { organisation: string }[]): string[] {
	return [...new Set(teams.map((team) => team.organisation.trim()).filter((name) => name !== ""))];
}

/** Verschiedene, nicht leere Mannschaftsnamen je Gliederung. */
export function teamNamesByOrganisation(teams: readonly TeamNameSource[]): Record<string, string[]> {
	const byOrganisation = new Map<string, Set<string>>();
	for (const team of teams) {
		const key = team.organisation.trim();
		const names = byOrganisation.get(key) ?? new Set<string>();
		for (const name of [team.name, team.originalName ?? ""]) if (name.trim() !== "") names.add(name.trim());
		byOrganisation.set(key, names);
	}
	return Object.fromEntries([...byOrganisation].map(([key, names]) => [key, [...names]]));
}

export function sourceFromTeams(teams: readonly TeamNameSource[]): DistanceSource {
	return { names: organisationsFromTeams(teams), teamNames: teamNamesByOrganisation(teams) };
}

export function organisationsFromCsv(bytes: Uint8Array): NamesOutcome {
	try {
		const { rows } = parseRegistrationCsv(bytes);
		const teams = rows.map((row) => ({
			organisation: row[ORGANISATION_COLUMN] ?? "",
			name: row[TEAM_NAME_COLUMN] ?? ""
		}));
		return { ok: true, ...sourceFromTeams(teams) };
	} catch (error) {
		if (error instanceof MissingColumnsError) return { ok: false, message: NOT_A_TEAM_EXPORT };
		throw error;
	}
}

/** Hinweise: Mannschaftsnamen der Quelle und der eigene Mannschaftsname aus den Einstellungen. */
export function computeDistances(source: DistanceSource, data: GldCache, options: ComputeOptions = {}): DistanceResult {
	const { choices = {}, overrides = {} } = options;
	const hints = Object.fromEntries(
		source.names.map((name) => [name, [...(source.teamNames[name] ?? []), teamBaseName(name, overrides)]])
	);
	return distancesToBadNauheim(source.names, data.organisations, { choices, hints });
}

export async function loadChoices(): Promise<ChoiceMap> {
	return (await readJson(CHOICES_FILE, parseChoiceMap)) ?? {};
}

/** Speichert sofort und liefert den neuen Stand. */
export async function saveChoice(choices: ChoiceMap, name: string, id: string): Promise<ChoiceMap> {
	const next = withChoice(choices, name, id);
	await writeJson(CHOICES_FILE, next);
	logInfo("distances.choiceSaved", { choices: Object.keys(next).length });
	return next;
}

/** Automatisch zugeordnete zählen als mehrdeutig, bis sie bestätigt sind. */
export function distanceSummary(result: DistanceResult): string {
	const automatic = result.matched.filter((row) => row.choice?.automatic).length;
	const found = result.matched.length - automatic;
	const ambiguous = result.ambiguous.length + automatic;
	return `${found} gefunden · ${ambiguous} mehrdeutig · ${result.unmatched.length} nicht gefunden`;
}

export { formatKm };

export function formatDataDate(iso: string): string {
	return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Auswahltext einer Gliederung mit Entfernung. */
export function candidateText(candidate: Candidate): string {
	return `${candidate.label} · ${formatKm(candidate.km)} km`;
}

/** Tabulator-getrennt, damit das Einfügen in Excel Spalten ergibt. */
export function distanceTableText(result: DistanceResult): string {
	const header = "Platz\tGliederung\tEntfernung (km)";
	const rows = result.matched.map((row, index) => `${index + 1}\t${row.name}\t${formatKm(row.km)}`);
	return [header, ...rows].join("\n");
}

/** Kennung der Tabellenzeile, damit die Karte zu ihr springen kann. */
export function distanceRowId(name: string): string {
	return `distance-row-${choiceKey(name).replace(WHITESPACE, "-")}`;
}

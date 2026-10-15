// Entfernungen: Gliederungen sammeln, Standortdaten laden (mit Zwischenspeicher), Tabelle aufbereiten.
import {
	distancesToBadNauheim,
	fetchOrganisations,
	parseGldCache,
	type DistanceResult,
	type GldCache
} from "$lib/distance/dlrgPoi";
import { MissingColumnsError, parseRegistrationCsv } from "$lib/io/csv";
import { logError, logInfo } from "$lib/log";
import { readJson, writeJson } from "$lib/platform/fs";
import { platformFetch } from "$lib/platform/http";
import { NOT_A_TEAM_EXPORT } from "./errors";

export const GLD_CACHE_FILE = "gld-cache.json";
const ORGANISATION_COLUMN = "gliederung";
const KM_DECIMALS = 2;

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

export type NamesOutcome = { ok: true; names: string[] } | { ok: false; message: string };

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

/** Nimmt den gespeicherten Stand; abgerufen wird auf Wunsch oder wenn nichts gespeichert ist. */
export async function loadOrganisations(options: LoadOrganisationsOptions = {}): Promise<OrganisationData> {
	const { refresh = false, fetchJson = fetchPoiJson, now = new Date() } = options;
	const cached = await readJson(GLD_CACHE_FILE, parseGldCache);
	if (cached && !refresh) return { data: cached, status: "cache" };
	const fresh = await fetchFresh(fetchJson, now);
	if (fresh) return { data: fresh, status: "fresh" };
	return cached ? { data: cached, status: "offline" } : { data: null, status: "unavailable" };
}

/** Jede Gliederung einmal, in der Reihenfolge des ersten Auftretens. */
export function organisationsFromTeams(teams: readonly { organisation: string }[]): string[] {
	return [...new Set(teams.map((team) => team.organisation.trim()).filter((name) => name !== ""))];
}

export function organisationsFromCsv(bytes: Uint8Array): NamesOutcome {
	try {
		const { rows } = parseRegistrationCsv(bytes);
		return {
			ok: true,
			names: organisationsFromTeams(rows.map((row) => ({ organisation: row[ORGANISATION_COLUMN] ?? "" })))
		};
	} catch (error) {
		if (error instanceof MissingColumnsError) return { ok: false, message: NOT_A_TEAM_EXPORT };
		throw error;
	}
}

export function computeDistances(names: string[], data: GldCache): DistanceResult {
	return distancesToBadNauheim(names, data.organisations);
}

export function formatKm(km: number): string {
	return km.toLocaleString("de-DE", { minimumFractionDigits: KM_DECIMALS, maximumFractionDigits: KM_DECIMALS });
}

export function formatDataDate(iso: string): string {
	return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Tabulator-getrennt, damit das Einfügen in Excel Spalten ergibt. */
export function distanceTableText(result: DistanceResult): string {
	const header = "Platz\tGliederung\tEntfernung (km)";
	const rows = result.matched.map((row, index) => `${index + 1}\t${row.name}\t${formatKm(row.km)}`);
	return [header, ...rows].join("\n");
}

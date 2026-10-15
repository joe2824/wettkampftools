// Deutschlandkarte auf der Urkunde: teilnehmende Gliederungen aus dem gespeicherten Stand der Standortdaten.
import type { CertificateMapData } from "$lib/certificates/mapRender";
import { parseGldCache, type Organisation } from "$lib/distance/dlrgPoi";
import type { ChoiceMap } from "$lib/distance/matching";
import { participantPoints } from "$lib/distance/participants";
import { readJson } from "$lib/platform/fs";
import { GLD_CACHE_FILE, loadChoices, organisationsFromTeams } from "./distances";

export interface LocationData {
	organisations: Organisation[];
	choices: ChoiceMap;
}

/** Nur der gespeicherte Stand; abgerufen wird ausschließlich unter „Entfernungen“. */
export async function loadLocationData(): Promise<LocationData | null> {
	const cache = await readJson(GLD_CACHE_FILE, parseGldCache);
	if (!cache) return null;
	return { organisations: cache.organisations, choices: await loadChoices() };
}

/** Gliederungen der Ergebnisdatei, sonst der Meldungen. */
export function participantNames(
	results: { rows: readonly { organisation: string }[] } | null,
	registration: { teams: readonly { organisation: string }[] } | null
): string[] {
	if (results) return organisationsFromTeams(results.rows);
	return registration ? organisationsFromTeams(registration.teams) : [];
}

export function certificateMapData(
	names: readonly string[],
	data: LocationData | null
): CertificateMapData | undefined {
	return data ? { markers: participantPoints(names, data.organisations, data.choices) } : undefined;
}

import type { Settings } from "../settings/settings";

export const SENIOR_AGE_GROUP = "AK Senioren";
export const RESCUE_PREFIX = "AK";
export const WAVE_PREFIX = "AkW";

export type AgeGroupMatch = { kind: "known"; name: string } | { kind: "unknown"; raw: string };
export type AgeGroupKind = "rescue" | "wave";

const LEADING_TOKEN = /^(\S+)(.*)$/;

function key(name: string): string {
	return normalizeAgeGroupSpelling(name).toLowerCase();
}

function splitLeadingToken(name: string): { token: string; rest: string } {
	const match = LEADING_TOKEN.exec(name);
	return match ? { token: match[1], rest: match[2] } : { token: "", rest: name };
}

/** Leerzeichen bereinigen und führendes Kürzel auf "AK"/"AkW" vereinheitlichen. */
export function normalizeAgeGroupSpelling(raw: string): string {
	const cleaned = raw.trim().replace(/\s+/g, " ");
	const { token, rest } = splitLeadingToken(cleaned);
	const lower = token.toLowerCase();
	if (lower === RESCUE_PREFIX.toLowerCase()) return RESCUE_PREFIX + rest;
	if (lower === WAVE_PREFIX.toLowerCase()) return WAVE_PREFIX + rest;
	return cleaned;
}

export function equalsAgeGroup(a: string, b: string): boolean {
	return key(a) === key(b);
}

function findIndex(name: string, list: readonly string[]): number {
	const wanted = key(name);
	return list.findIndex((entry) => key(entry) === wanted);
}

/** Liefert die konfigurierte Schreibweise oder kennzeichnet die AK als unbekannt. */
export function matchAgeGroup(raw: string, order: readonly string[]): AgeGroupMatch {
	const index = findIndex(raw, order);
	return index >= 0 ? { kind: "known", name: order[index] } : { kind: "unknown", raw };
}

export function simplifySeniorAgeGroup(name: string, settings: Settings): string {
	if (settings.simplifySeniorAgeGroups && findIndex(name, settings.seniorTeamAgeGroups) >= 0) {
		return SENIOR_AGE_GROUP;
	}
	return name;
}

/** Ab der Start-AK (nach Position) plus Senioren, je nach Vereinfachung. */
export function waveEligibleAgeGroups(settings: Settings): string[] {
	const start = findIndex(settings.waveStartAgeGroup, settings.ageGroups);
	const rescuePart = start >= 0 ? settings.ageGroups.slice(start) : [];
	const seniorPart = settings.simplifySeniorAgeGroups ? [SENIOR_AGE_GROUP] : settings.seniorTeamAgeGroups;
	return [...rescuePart, ...seniorPart];
}

export function toWaveAgeGroup(name: string): string {
	const { token, rest } = splitLeadingToken(name.trim());
	return token.toLowerCase() === RESCUE_PREFIX.toLowerCase() ? WAVE_PREFIX + rest : name;
}

export function waveAgeGroups(settings: Settings): string[] {
	return waveEligibleAgeGroups(settings).map(toWaveAgeGroup);
}

function dedupe(names: readonly string[]): string[] {
	const seen = new Set<string>();
	return names.filter((name) => {
		const k = key(name);
		if (seen.has(k)) return false;
		seen.add(k);
		return true;
	});
}

/** Gesamtreihenfolge aller Altersklassen (Rettung, Senioren, Welle). */
export function buildAgeGroupOrder(settings: Settings): string[] {
	return dedupe([
		...settings.ageGroups,
		...settings.seniorIndividualAgeGroups,
		...settings.seniorTeamAgeGroups,
		SENIOR_AGE_GROUP,
		...waveAgeGroups(settings),
	]);
}

export function classifyAgeGroup(name: string, order: readonly string[]): AgeGroupKind | null {
	if (findIndex(name, order) < 0) return null;
	const { token } = splitLeadingToken(normalizeAgeGroupSpelling(name));
	if (token === WAVE_PREFIX) return "wave";
	if (token === RESCUE_PREFIX) return "rescue";
	return null;
}

/** Wellen-AK werden wie die Rettungs-AK angezeigt. */
export function displayAgeGroup(name: string): string {
	const { token, rest } = splitLeadingToken(name);
	return token === WAVE_PREFIX ? RESCUE_PREFIX + rest : name;
}

/** Sortiert nach Position in der Reihenfolge; Unbekannte am Ende nach Namen. */
export function compareAgeGroups(order: readonly string[]): (a: string, b: string) => number {
	const rank = (name: string): number => {
		const index = findIndex(name, order);
		return index >= 0 ? index : order.length;
	};
	return (a, b) => rank(a) - rank(b) || a.localeCompare(b, "de");
}

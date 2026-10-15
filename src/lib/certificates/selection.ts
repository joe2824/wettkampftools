// Auswahl der Urkunden: Filter (als ausgeblendete Werte), Gruppen und Häkchen.
import type { CertificateEntry } from "./model";
import { MAX_COPIES, MIN_COPIES } from "$lib/settings/settings";
import { displayAgeGroup, type AgeGroupKind } from "$lib/wwk/ageGroups";

const KIND_ORDER: readonly AgeGroupKind[] = ["rescue", "wave"];
export const KIND_FILTER_LABELS: Record<AgeGroupKind, string> = { rescue: "Rettung", wave: "Welle" };

/** Ausgeblendete Werte; so sind neu geladene Werte sofort sichtbar. */
export interface HiddenValues {
	ageGroups: readonly string[];
	genders: readonly string[];
	kinds: readonly AgeGroupKind[];
}

export interface FilterOptions {
	ageGroups: string[];
	genders: string[];
	kinds: AgeGroupKind[];
}

export interface EntryGroup {
	key: string;
	label: string;
	kind: AgeGroupKind;
	entries: CertificateEntry[];
}

export type GroupState = "all" | "some" | "none";

export const NO_HIDDEN: HiddenValues = { ageGroups: [], genders: [], kinds: [] };

const unique = <T>(values: T[]): T[] => [...new Set(values)];

/** Werte in Urkunden-Reihenfolge, wie sie in den Einträgen vorkommen. */
export function filterOptions(entries: readonly CertificateEntry[]): FilterOptions {
	const kinds = new Set(entries.map((entry) => entry.kind));
	return {
		ageGroups: unique(entries.map((entry) => displayAgeGroup(entry.ageGroup))),
		genders: unique(entries.map((entry) => entry.gender)),
		kinds: KIND_ORDER.filter((kind) => kinds.has(kind))
	};
}

export function visibleEntries(entries: readonly CertificateEntry[], hidden: HiddenValues): CertificateEntry[] {
	return entries.filter(
		(entry) =>
			!hidden.ageGroups.includes(displayAgeGroup(entry.ageGroup)) &&
			!hidden.genders.includes(entry.gender) &&
			!hidden.kinds.includes(entry.kind)
	);
}

/** Aufeinanderfolgende Einträge gleicher AK und gleichen Geschlechts bilden einen Block. */
export function groupEntries(entries: readonly CertificateEntry[]): EntryGroup[] {
	const groups: EntryGroup[] = [];
	for (const entry of entries) {
		const key = `${entry.ageGroup}|${entry.gender}`;
		const last = groups.at(-1);
		if (last?.key === key) last.entries.push(entry);
		else groups.push({ key, label: `${displayAgeGroup(entry.ageGroup)} ${entry.gender}`, kind: entry.kind, entries: [entry] });
	}
	return groups;
}

export function selectedEntries(entries: readonly CertificateEntry[], excluded: ReadonlySet<string>): CertificateEntry[] {
	return entries.filter((entry) => !excluded.has(entry.id));
}

export function groupState(entries: readonly CertificateEntry[], excluded: ReadonlySet<string>): GroupState {
	const count = selectedEntries(entries, excluded).length;
	if (count === entries.length) return "all";
	return count === 0 ? "none" : "some";
}

/** Neue Menge der abgewählten IDs; `exclude` wählt ab, sonst wieder an. */
export function withIds(excluded: ReadonlySet<string>, ids: readonly string[], exclude: boolean): Set<string> {
	const next = new Set(excluded);
	for (const id of ids) {
		if (exclude) next.add(id);
		else next.delete(id);
	}
	return next;
}

/** Anzahl je Eintrag aus einem Eingabefeld; ungültig wird zur kleinsten Anzahl. */
export function clampCopies(value: number): number {
	if (!Number.isFinite(value)) return MIN_COPIES;
	return Math.min(MAX_COPIES, Math.max(MIN_COPIES, Math.round(value)));
}

/** Für Umschaltgruppen: angezeigte Werte aus den ausgeblendeten. */
export function shownValues<T extends string>(all: readonly T[], hidden: readonly T[]): T[] {
	return all.filter((value) => !hidden.includes(value));
}

/** Für Umschaltgruppen: ausgeblendete Werte aus den angezeigten. */
export function hiddenValuesFor<T extends string>(all: readonly T[], shown: readonly string[]): T[] {
	return all.filter((value) => !shown.includes(value));
}

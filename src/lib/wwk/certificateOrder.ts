// Urkunden-Reihenfolge, gemeinsam für Urkunden-PDF und Seriendruck-Tabelle.
import { compareAgeGroups, matchAgeGroup } from "./ageGroups";
import type { ResultRow } from "./results";

const LOCALE = "de";

export interface PlacedEntry {
	row: ResultRow;
	place: number;
	/** Konfigurierte Schreibweise der Altersklasse. */
	ageGroup: string;
}

function toPlacedEntry(row: ResultRow, order: readonly string[]): PlacedEntry | null {
	const match = matchAgeGroup(row.ageGroupRaw, order);
	if (row.place === null || match.kind === "unknown") return null;
	return { row, place: row.place, ageGroup: match.name };
}

/** AK nach Reihenfolge, weiblich zuerst, letzter Platz zuerst, dann Name. */
function compareEntries(order: readonly string[]): (a: PlacedEntry, b: PlacedEntry) => number {
	const byAgeGroup = compareAgeGroups(order);
	return (a, b) =>
		byAgeGroup(a.ageGroup, b.ageGroup) ||
		b.row.gender.localeCompare(a.row.gender, LOCALE) ||
		b.place - a.place ||
		a.row.name.localeCompare(b.row.name, LOCALE);
}

/** Platzierte Zeilen mit bekannter AK, in Urkunden-Reihenfolge. */
export function placedEntries(rows: readonly ResultRow[], order: readonly string[]): PlacedEntry[] {
	return rows
		.map((row) => toPlacedEntry(row, order))
		.filter((entry): entry is PlacedEntry => entry !== null)
		.sort(compareEntries(order));
}

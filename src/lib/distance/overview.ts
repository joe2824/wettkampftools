// Übersicht zur Anreise: Anzahl, weiteste Anreise, Durchschnitt und vertretene Bundesländer.
import { stateAt } from "$lib/maps/germany";
import type { DistanceRow } from "./matching";

export interface DistanceOverview {
	count: number;
	farthest: { name: string; km: number } | null;
	averageKm: number | null;
	/** Alphabetisch; Gliederungen außerhalb Deutschlands zählen nicht mit. */
	states: string[];
}

const LOCALE = "de";

export function distanceOverview(rows: readonly DistanceRow[]): DistanceOverview {
	if (rows.length === 0) return { count: 0, farthest: null, averageKm: null, states: [] };
	const farthest = rows.reduce((best, row) => (row.km > best.km ? row : best));
	const states = new Set(rows.flatMap((row) => stateAt(row.position)?.name ?? []));
	return {
		count: rows.length,
		farthest: { name: farthest.name, km: farthest.km },
		averageKm: rows.reduce((sum, row) => sum + row.km, 0) / rows.length,
		states: [...states].sort((a, b) => a.localeCompare(b, LOCALE))
	};
}

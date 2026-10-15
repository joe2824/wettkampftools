// Deutschlandkarte: Bundesländer als Längen-/Breitengrad-Ringe und Suche des Bundeslands zu einem Punkt.
// Kartendaten: Natural Earth (gemeinfrei), siehe germanyData.ts.
import type { Coordinates } from "$lib/distance/dlrgPoi";
import { STATE_OUTLINES } from "./germanyData";

export interface GermanState {
	code: string;
	name: string;
	/** Außenringe und Löcher; das Innere ergibt sich nach der Gerade-Ungerade-Regel. */
	rings: Coordinates[][];
}

const DEGREE_FACTOR = 1000;

export function decodeRing(encoded: string): Coordinates[] {
	const values = encoded.split(" ").map(Number);
	const points: Coordinates[] = [];
	let lon = 0;
	let lat = 0;
	for (let index = 0; index + 1 < values.length; index += 2) {
		lon += values[index];
		lat += values[index + 1];
		points.push({ lon: lon / DEGREE_FACTOR, lat: lat / DEGREE_FACTOR });
	}
	return points;
}

export const GERMAN_STATES: readonly GermanState[] = STATE_OUTLINES.map((outline) => ({
	code: outline.code,
	name: outline.name,
	rings: outline.rings.map(decodeRing)
}));

/** Strahl nach Osten: wie oft schneidet er den Ring? */
function crossesRing(ring: readonly Coordinates[], point: Coordinates): boolean {
	let inside = false;
	for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
		const a = ring[index];
		const b = ring[previous];
		if (a.lat > point.lat === b.lat > point.lat) continue;
		const crossingLon = a.lon + ((point.lat - a.lat) / (b.lat - a.lat)) * (b.lon - a.lon);
		if (point.lon < crossingLon) inside = !inside;
	}
	return inside;
}

export function containsPoint(state: GermanState, point: Coordinates): boolean {
	return state.rings.reduce((inside, ring) => (crossesRing(ring, point) ? !inside : inside), false);
}

/** Bundesland, in dem der Punkt liegt; null außerhalb Deutschlands. */
export function stateAt(point: Coordinates): GermanState | null {
	return GERMAN_STATES.find((state) => containsPoint(state, point)) ?? null;
}

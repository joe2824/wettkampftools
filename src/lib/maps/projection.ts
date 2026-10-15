// Abstandstreue Zylinderprojektion mit fester Bezugsbreite: genau genug für eine Übersichtskarte.
import type { Coordinates } from "$lib/distance/dlrgPoi";
import { GERMAN_STATES } from "./germany";

export interface MapPoint {
	x: number;
	y: number;
}

export interface MapBox {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface MapFit {
	/** Punkt in Einheiten des Rahmens (y nach unten). */
	toBox(point: Coordinates): MapPoint;
	/** Rahmeneinheiten je Karteneinheit */
	scale: number;
	/** Tatsächlich belegte Fläche innerhalb des Rahmens */
	frame: MapBox;
}

/** Mitte Deutschlands */
const REFERENCE_LAT_DEG = 51.2;
const DEG_TO_RAD = Math.PI / 180;
const LON_FACTOR = Math.cos(REFERENCE_LAT_DEG * DEG_TO_RAD);

export function project(point: Coordinates): MapPoint {
	return { x: point.lon * LON_FACTOR, y: -point.lat };
}

function boundsOf(points: readonly MapPoint[]): MapBox {
	const xs = points.map((point) => point.x);
	const ys = points.map((point) => point.y);
	const x = Math.min(...xs);
	const y = Math.min(...ys);
	return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

export const MAP_BOUNDS: MapBox = boundsOf(GERMAN_STATES.flatMap((state) => state.rings.flat().map(project)));

/** Karte so groß wie möglich und mittig in den Rahmen setzen. */
export function fitMap(box: MapBox): MapFit {
	const scale = Math.min(box.width / MAP_BOUNDS.width, box.height / MAP_BOUNDS.height);
	const width = MAP_BOUNDS.width * scale;
	const height = MAP_BOUNDS.height * scale;
	const frame = { x: box.x + (box.width - width) / 2, y: box.y + (box.height - height) / 2, width, height };
	return {
		scale,
		frame,
		toBox(point) {
			const projected = project(point);
			return {
				x: frame.x + (projected.x - MAP_BOUNDS.x) * scale,
				y: frame.y + (projected.y - MAP_BOUNDS.y) * scale
			};
		}
	};
}

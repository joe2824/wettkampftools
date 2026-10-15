// Deutschlandkarte als Vektor-Zeichenbefehle in Graustufen: druckt auf jedem Drucker gleich.
import type { MapBox } from "$lib/maps/projection";
import { mapScene, type MapMarker } from "$lib/maps/shapes";
import type { MapObject } from "./layout";
import type { CircleOp, DrawOp, PathOp } from "./render";

export interface CertificateMapData {
	markers: readonly MapMarker[];
}

const STATE_FILL_GRAY = 0.9;
const STATE_STROKE_GRAY = 0.6;
const STATE_STROKE_MM = 0.15;
const DOT_GRAY = 0.35;
const OWN_GRAY = 0;
const OUTLINE_GRAY = 1;
const DOT_OUTLINE_MM = 0.1;
/** Punktradius im Verhältnis zur Kartenbreite */
const DOT_RADIUS_RATIO = 0.016;
const MIN_DOT_RADIUS_MM = 0.4;
const OWN_RADIUS_FACTOR = 1.8;
const HOME_RADIUS_FACTOR = 3;
/** Kleinster Punktabstand der Umrisse; feiner sieht man es gedruckt nicht. */
const MIN_STEP_MM = 0.4;

const sameName = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();

function dot(x: number, y: number, rMm: number, fillGray: number): CircleOp {
	return { kind: "circle", cxMm: x, cyMm: y, rMm, fillGray, strokeGray: OUTLINE_GRAY, strokeMm: DOT_OUTLINE_MM };
}

/** Karte im Rahmen (mm); der Punkt der hervorgehobenen Gliederung wird größer und dunkel gezeichnet. */
export function mapDrawOps(box: MapBox, markers: readonly MapMarker[], highlighted: string | null): DrawOp[] {
	const dotRadius = Math.max(MIN_DOT_RADIUS_MM, Math.min(box.width, box.height) * DOT_RADIUS_RATIO);
	// Punkte dürfen nicht über den Rahmen ragen.
	const margin = dotRadius * HOME_RADIUS_FACTOR;
	const inner = {
		x: box.x + margin,
		y: box.y + margin,
		width: box.width - 2 * margin,
		height: box.height - 2 * margin
	};
	const scene = mapScene(inner, markers, { minStep: MIN_STEP_MM, homeRadius: dotRadius * HOME_RADIUS_FACTOR });
	const states: PathOp[] = scene.states.map((state) => ({
		kind: "path",
		rings: state.rings,
		fillGray: STATE_FILL_GRAY,
		strokeGray: STATE_STROKE_GRAY,
		strokeMm: STATE_STROKE_MM
	}));
	const isOwn = (name: string) => highlighted !== null && sameName(name, highlighted);
	const others = scene.markers.filter((marker) => !isOwn(marker.name));
	const own = scene.markers.filter((marker) => isOwn(marker.name));
	const home: PathOp = { kind: "path", rings: [scene.home.points], fillGray: OWN_GRAY, strokeGray: null, strokeMm: 0 };
	return [
		...states,
		...others.map((marker) => dot(marker.x, marker.y, dotRadius, DOT_GRAY)),
		...own.map((marker) => dot(marker.x, marker.y, dotRadius * OWN_RADIUS_FACTOR, OWN_GRAY)),
		home
	];
}

export function mapOps(object: MapObject, data: CertificateMapData | undefined, ownOrganisation: string): DrawOp[] {
	const box = { x: object.xMm, y: object.yMm, width: object.widthMm, height: object.heightMm };
	const highlighted = object.highlightOwn && ownOrganisation.trim() !== "" ? ownOrganisation : null;
	return mapDrawOps(box, data?.markers ?? [], highlighted);
}

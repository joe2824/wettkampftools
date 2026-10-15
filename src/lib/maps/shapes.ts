// Kartenbild in einem Rahmen: Bundesländer, Punkte der Gliederungen, Stern für Bad Nauheim.
import { BAD_NAUHEIM, type Coordinates } from "$lib/distance/dlrgPoi";
import { GERMAN_STATES } from "./germany";
import { fitMap, type MapBox, type MapFit, type MapPoint } from "./projection";

export interface MapMarker {
	name: string;
	position: Coordinates;
}

export interface SceneState {
	code: string;
	name: string;
	rings: MapPoint[][];
}

export interface SceneMarker extends MapPoint {
	name: string;
}

export interface MapScene {
	fit: MapFit;
	states: SceneState[];
	markers: SceneMarker[];
	home: { center: MapPoint; points: MapPoint[] };
}

export interface SceneOptions {
	/** Kleinster Punktabstand der Umrisse in Rahmeneinheiten */
	minStep: number;
	/** Außenradius des Sterns in Rahmeneinheiten */
	homeRadius: number;
}

const MIN_RING_POINTS = 3;
const STAR_TIPS = 5;
const STAR_INNER_RATIO = 0.45;
const PATH_DECIMALS = 100;

/** Punkte, die näher als minStep am zuletzt behaltenen liegen, entfallen. */
export function thinRing(ring: readonly MapPoint[], minStep: number): MapPoint[] {
	const kept: MapPoint[] = [];
	for (const point of ring) {
		const last = kept[kept.length - 1];
		if (!last || Math.hypot(point.x - last.x, point.y - last.y) >= minStep) kept.push(point);
	}
	return kept.length >= MIN_RING_POINTS ? kept : [...ring];
}

const round = (value: number): number => Math.round(value * PATH_DECIMALS) / PATH_DECIMALS;

/** SVG-Pfad aus geschlossenen Ringen. */
export function ringsPath(rings: readonly (readonly MapPoint[])[]): string {
	return rings
		.map((ring) => ring.map((point, index) => `${index === 0 ? "M" : "L"}${round(point.x)} ${round(point.y)}`).join(""))
		.map((ring) => `${ring}Z`)
		.join("");
}

/** Fünfzackiger Stern, Spitze nach oben. */
export function starPoints(center: MapPoint, radius: number): MapPoint[] {
	return Array.from({ length: STAR_TIPS * 2 }, (_, index) => {
		const distance = index % 2 === 0 ? radius : radius * STAR_INNER_RATIO;
		const angle = (index * Math.PI) / STAR_TIPS - Math.PI / 2;
		return { x: center.x + distance * Math.cos(angle), y: center.y + distance * Math.sin(angle) };
	});
}

export function mapScene(box: MapBox, markers: readonly MapMarker[], options: SceneOptions): MapScene {
	const fit = fitMap(box);
	const states = GERMAN_STATES.map((state) => ({
		code: state.code,
		name: state.name,
		rings: state.rings.map((ring) => thinRing(ring.map(fit.toBox), options.minStep))
	}));
	const center = fit.toBox(BAD_NAUHEIM);
	return {
		fit,
		states,
		markers: markers.map((marker) => ({ name: marker.name, ...fit.toBox(marker.position) })),
		home: { center, points: starPoints(center, options.homeRadius) }
	};
}

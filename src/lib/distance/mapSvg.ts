// Entfernungskarte als eigenständiges SVG mit festen Farben (Vorlage für das PNG-Bild).
import { mapScene, ringsPath } from "$lib/maps/shapes";
import type { DistanceRow } from "./matching";

export const MAP_IMAGE_SIZE = { width: 1200, height: 1600 };

const PADDING = 60;
const MAP_TOP = 170;
const MAP_BOTTOM_GAP = 40;
const MIN_STEP = 1;
const HOME_RADIUS = 26;
const DOT_RADIUS = 10;
const TITLE_BASELINE = 90;
const SUBTITLE_BASELINE = 140;
const COLORS = {
	background: "#ffffff",
	stateFill: "#e6ebf0",
	stateStroke: "#a3afbb",
	dot: "#d7191f",
	home: "#12355b",
	title: "#111827",
	subtitle: "#4b5563"
};
const FONT = "Arial, Helvetica, sans-serif";

const round = (value: number): number => Math.round(value * 10) / 10;

function subtitle(count: number): string {
	const organisations = count === 1 ? "1 Gliederung" : `${count} Gliederungen`;
	return `${organisations} · Stern: Bad Nauheim`;
}

/** Ohne Namen: das Bild zeigt nur Punkte. */
export function distanceMapSvg(rows: readonly DistanceRow[]): string {
	const { width, height } = MAP_IMAGE_SIZE;
	const box = { x: PADDING, y: MAP_TOP, width: width - 2 * PADDING, height: height - MAP_TOP - MAP_BOTTOM_GAP };
	const markers = rows.map((row) => ({ name: row.name, position: row.position }));
	const scene = mapScene(box, markers, { minStep: MIN_STEP, homeRadius: HOME_RADIUS });
	const states = scene.states.map(
		(state) =>
			`<path d="${ringsPath(state.rings)}" fill="${COLORS.stateFill}" fill-rule="evenodd" stroke="${COLORS.stateStroke}" stroke-width="2" stroke-linejoin="round"/>`
	);
	const dots = scene.markers.map(
		(marker) =>
			`<circle cx="${round(marker.x)}" cy="${round(marker.y)}" r="${DOT_RADIUS}" fill="${COLORS.dot}" stroke="${COLORS.background}" stroke-width="2"/>`
	);
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
		`<rect width="${width}" height="${height}" fill="${COLORS.background}"/>`,
		`<text x="${PADDING}" y="${TITLE_BASELINE}" font-family="${FONT}" font-size="48" font-weight="700" fill="${COLORS.title}">Anreise nach Bad Nauheim</text>`,
		`<text x="${PADDING}" y="${SUBTITLE_BASELINE}" font-family="${FONT}" font-size="30" fill="${COLORS.subtitle}">${subtitle(rows.length)}</text>`,
		...states,
		...dots,
		`<path d="${ringsPath([scene.home.points])}" fill="${COLORS.home}" stroke="${COLORS.background}" stroke-width="3"/>`,
		"</svg>"
	].join("");
}

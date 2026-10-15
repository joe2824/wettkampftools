// Größe ändern über Anfasser: Kanten ziehen, mit Umschalt im Seitenverhältnis.
import {
	clamp,
	hitBox,
	roundMm,
	snapMm,
	snapsOn,
	textAscentMm,
	unionBox,
	updateObject,
	type BoxMm,
	type DeltaMm,
	type PointMm,
	type SnapAxes
} from "./editorOps";
import {
	MAX_FONT_PT,
	MIN_EXTENT_MM,
	MIN_FONT_PT,
	PAGE_HEIGHT_MM,
	PAGE_WIDTH_MM,
	ptToMm,
	type LayoutObject,
	type TextObject
} from "./layout";

export type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
/** −1: Anfang (links/oben) bewegt sich, 1: Ende, 0: Achse bleibt */
export type Side = -1 | 0 | 1;

export interface ResizeOptions {
	/** Seitenverhältnis halten (Umschalt); bei Texten an den Ecken: Schriftgröße skalieren */
	keepAspect: boolean;
	snap: SnapAxes;
}

export const HANDLE_SIDES: Record<ResizeHandle, { x: Side; y: Side }> = {
	nw: { x: -1, y: -1 },
	n: { x: 0, y: -1 },
	ne: { x: 1, y: -1 },
	e: { x: 1, y: 0 },
	se: { x: 1, y: 1 },
	s: { x: 0, y: 1 },
	sw: { x: -1, y: 1 },
	w: { x: -1, y: 0 }
};

const BOX_HANDLES = Object.keys(HANDLE_SIDES) as ResizeHandle[];
const TEXT_HANDLES: ResizeHandle[] = ["w", "e", "nw", "ne", "sw", "se"];
/** Schriftgrößen in halben Punkt, ohne Raster in Zehntelpunkt */
const FONT_STEPS_PER_PT = 2;
const FINE_FONT_STEPS_PER_PT = 10;

interface Interval {
	start: number;
	size: number;
}

export const resizeHandles = (object: LayoutObject): ResizeHandle[] =>
	object.kind === "text" ? TEXT_HANDLES : BOX_HANDLES;

export function handlePoint(box: BoxMm, handle: ResizeHandle): PointMm {
	const sides = HANDLE_SIDES[handle];
	return { x: box.xMm + (box.widthMm * (sides.x + 1)) / 2, y: box.yMm + (box.heightMm * (sides.y + 1)) / 2 };
}

/** Bewegt eine Kante; die gegenüberliegende bleibt fest. */
function stretch(interval: Interval, side: Side, delta: number, limit: number, snap: boolean): Interval {
	const place = (value: number) => (snap ? snapMm(value) : value);
	const end = interval.start + interval.size;
	if (side === 1) {
		const nextEnd = clamp(place(end + delta), interval.start + MIN_EXTENT_MM, limit);
		return { start: interval.start, size: nextEnd - interval.start };
	}
	if (side === -1) {
		const nextStart = clamp(place(interval.start + delta), 0, end - MIN_EXTENT_MM);
		return { start: nextStart, size: end - nextStart };
	}
	return interval;
}

/** Platz für die Größe, wenn die feste Kante (bzw. die Mitte) bleibt */
function room(interval: Interval, side: Side, limit: number): number {
	if (side === 1) return limit - interval.start;
	if (side === -1) return interval.start + interval.size;
	const center = interval.start + interval.size / 2;
	return 2 * Math.min(center, limit - center);
}

function anchored(interval: Interval, side: Side, size: number): Interval {
	if (side === 1) return { start: interval.start, size };
	if (side === -1) return { start: interval.start + interval.size - size, size };
	return { start: interval.start + (interval.size - size) / 2, size };
}

const toIntervals = (box: BoxMm): [Interval, Interval] => [
	{ start: box.xMm, size: box.widthMm },
	{ start: box.yMm, size: box.heightMm }
];

const toBox = (x: Interval, y: Interval): BoxMm => ({
	xMm: roundMm(x.start),
	yMm: roundMm(y.start),
	widthMm: roundMm(x.size),
	heightMm: roundMm(y.size)
});

/** Gleichmäßig skalieren; maßgeblich ist die stärker gezogene Achse. */
function scaleBox(box: BoxMm, sides: { x: Side; y: Side }, delta: DeltaMm): BoxMm {
	const [x, y] = toIntervals(box);
	const scaleX = (x.size + sides.x * delta.x) / x.size;
	const scaleY = (y.size + sides.y * delta.y) / y.size;
	const preferX = sides.y === 0 || (sides.x !== 0 && Math.abs(scaleX - 1) >= Math.abs(scaleY - 1));
	const maxScale = Math.min(room(x, sides.x, PAGE_WIDTH_MM) / x.size, room(y, sides.y, PAGE_HEIGHT_MM) / y.size);
	const minScale = Math.max(MIN_EXTENT_MM / x.size, MIN_EXTENT_MM / y.size);
	const scale = clamp(preferX ? scaleX : scaleY, minScale, maxScale);
	return toBox(anchored(x, sides.x, x.size * scale), anchored(y, sides.y, y.size * scale));
}

function resizeBox(box: BoxMm, handle: ResizeHandle, delta: DeltaMm, options: ResizeOptions): BoxMm {
	const sides = HANDLE_SIDES[handle];
	if (options.keepAspect) return scaleBox(box, sides, delta);
	const [x, y] = toIntervals(box);
	return toBox(
		stretch(x, sides.x, delta.x, PAGE_WIDTH_MM, snapsOn(options.snap, "x")),
		stretch(y, sides.y, delta.y, PAGE_HEIGHT_MM, snapsOn(options.snap, "y"))
	);
}

const roundPt = (pt: number, stepsPerPt: number): number => Math.round(pt * stepsPerPt) / stepsPerPt;

/** Schrift skalieren; obere Ecke: Grundlinie bleibt, untere Ecke: Oberkante bleibt. */
function scaleText(object: TextObject, sideY: Side, deltaY: number, snap: boolean): TextObject {
	const box = hitBox(object);
	const scale = (box.heightMm + sideY * deltaY) / box.heightMm;
	const sizePt = clamp(
		roundPt(object.sizePt * scale, snap ? FONT_STEPS_PER_PT : FINE_FONT_STEPS_PER_PT),
		MIN_FONT_PT,
		MAX_FONT_PT
	);
	const minSizePt = clamp(
		roundPt((object.minSizePt * sizePt) / object.sizePt, FINE_FONT_STEPS_PER_PT),
		MIN_FONT_PT,
		sizePt
	);
	const baseline = sideY === 1 ? box.yMm + textAscentMm(sizePt) : object.yMm;
	return { ...object, sizePt, minSizePt, yMm: roundMm(clamp(baseline, ptToMm(sizePt), PAGE_HEIGHT_MM)) };
}

function resizeText(object: TextObject, handle: ResizeHandle, delta: DeltaMm, options: ResizeOptions): TextObject {
	const sides = HANDLE_SIDES[handle];
	if (options.keepAspect && sides.y !== 0) return scaleText(object, sides.y, delta.y, snapsOn(options.snap, "y"));
	const interval = { start: object.xMm, size: object.widthMm };
	const x = stretch(interval, sides.x, delta.x, PAGE_WIDTH_MM, snapsOn(options.snap, "x"));
	return { ...object, xMm: roundMm(x.start), widthMm: roundMm(x.size) };
}

/** Ein Objekt über einen Anfasser skalieren. Texte: Breite, mit Umschalt an den Ecken die Schriftgröße. */
export function resizeObject<T extends LayoutObject>(
	object: T,
	handle: ResizeHandle,
	delta: DeltaMm,
	options: ResizeOptions
): T {
	if (object.kind === "text") return resizeText(object, handle, delta, options) as T;
	return { ...object, ...resizeBox(hitBox(object), handle, delta, options) };
}

/** Mehrere Objekte: Lage und Größe anteilig zur gemeinsamen Box; Schrift nur mit Umschalt. */
export function resizeGroup<T extends LayoutObject>(
	objects: readonly T[],
	handle: ResizeHandle,
	delta: DeltaMm,
	options: ResizeOptions
): T[] {
	const box = unionBox(objects.map(hitBox));
	if (box === null) return [];
	const next = resizeBox(box, handle, delta, options);
	const scaleX = next.widthMm / box.widthMm;
	const scaleY = next.heightMm / box.heightMm;
	const mapX = (x: number) => roundMm(next.xMm + (x - box.xMm) * scaleX);
	const mapY = (y: number) => roundMm(next.yMm + (y - box.yMm) * scaleY);
	return objects.map((object) => {
		const position = { xMm: mapX(object.xMm), yMm: mapY(object.yMm), widthMm: roundMm(object.widthMm * scaleX) };
		if (object.kind !== "text")
			return updateObject(object, { ...position, heightMm: roundMm(object.heightMm * scaleY) });
		if (!options.keepAspect) return updateObject(object, position);
		const sizePt = roundPt(object.sizePt * scaleY, FINE_FONT_STEPS_PER_PT);
		const minSizePt = roundPt(object.minSizePt * scaleY, FINE_FONT_STEPS_PER_PT);
		return updateObject(object, { ...position, sizePt, minSizePt });
	});
}

/** Einzelnes Objekt nach seinen Regeln, mehrere als Gruppe */
export function resizeSelection<T extends LayoutObject>(
	objects: readonly T[],
	handle: ResizeHandle,
	delta: DeltaMm,
	options: ResizeOptions
): T[] {
	const [only] = objects;
	if (objects.length === 1 && only !== undefined) return [resizeObject(only, handle, delta, options)];
	return resizeGroup(objects, handle, delta, options);
}

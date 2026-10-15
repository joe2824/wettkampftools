// Hilfslinien und gleiche Abstände beim Ziehen und Skalieren im Layout-Editor (nur Anzeige, nie gedruckt).
import { hitBox, moveObjects, unionBox, type Axis, type BoxMm, type DeltaMm } from "./editorOps";
import { PAGE_HEIGHT_MM, PAGE_WIDTH_MM, type LayoutObject } from "./layout";
import { HANDLE_SIDES, resizeSelection, type ResizeHandle, type Side } from "./objectResize";

/** Fangbereich in Millimetern auf der Seite */
export const SNAP_THRESHOLD_MM = 1.5;
/** Seitenränder der Standardvorlage und ein Sicherheitsabstand zum Blattrand */
const CONTENT_MARGIN_MM = 25;
const SAFE_MARGIN_MM = 10;
/** Werte gelten als gleich, wenn sie so nah beieinander liegen. */
const MATCH_MM = 0.05;

/** axis "x": senkrechte Linie an positionMm, "y": waagerechte Linie */
export interface Guide {
	axis: Axis;
	positionMm: number;
}

/** Abstandsmarke entlang der Achse von fromMm bis toMm, quer dazu an crossMm */
export interface SpacingMark {
	axis: Axis;
	fromMm: number;
	toMm: number;
	crossMm: number;
}

export interface SnapOptions {
	/** 0,5-mm-Raster, wo keine Hilfslinie greift */
	grid: boolean;
	/** Hilfslinien und Abstände (aus bei Alt oder ausgeschaltetem Schalter) */
	guides: boolean;
	thresholdMm?: number;
}

export interface SnapResult<T extends LayoutObject = LayoutObject> {
	objects: T[];
	guides: Guide[];
	spacings: SpacingMark[];
}

interface Span {
	start: number;
	end: number;
}

/** Rechteck aufgeteilt in Lage entlang der Achse und quer dazu */
interface Item {
	main: Span;
	cross: Span;
}

interface AnchorTargets {
	anchor: number;
	targets: number[];
}

type Offsets = Record<Axis, number | null>;

const CROSS: Record<Axis, Axis> = { x: "y", y: "x" };
const PAGE_LINES: Record<Axis, number[]> = {
	x: [
		PAGE_WIDTH_MM / 2,
		CONTENT_MARGIN_MM,
		PAGE_WIDTH_MM - CONTENT_MARGIN_MM,
		SAFE_MARGIN_MM,
		PAGE_WIDTH_MM - SAFE_MARGIN_MM
	],
	y: [PAGE_HEIGHT_MM / 2, SAFE_MARGIN_MM, PAGE_HEIGHT_MM - SAFE_MARGIN_MM]
};

const span = (box: BoxMm, axis: Axis): Span =>
	axis === "x" ? { start: box.xMm, end: box.xMm + box.widthMm } : { start: box.yMm, end: box.yMm + box.heightMm };
const item = (box: BoxMm, axis: Axis): Item => ({ main: span(box, axis), cross: span(box, CROSS[axis]) });
const middle = (value: Span): number => (value.start + value.end) / 2;
const lines = (value: Span): number[] => [value.start, middle(value), value.end];
const overlaps = (a: Span, b: Span): boolean => a.start < b.end && b.start < a.end;
const same = (a: number, b: number): boolean => Math.abs(a - b) < MATCH_MM;
const length = (mark: SpacingMark): number => mark.toMm - mark.fromMm;

const boxOf = (objects: readonly LayoutObject[]): BoxMm | null => unionBox(objects.map(hitBox));

/** Nächster Nachbar davor bzw. dahinter in derselben Zeile/Spalte */
function neighbor(of: Item, items: readonly Item[], direction: -1 | 1): Item | null {
	const inLine = items.filter((other) => other !== of && overlaps(other.cross, of.cross));
	const side = inLine.filter((other) => Math.sign(middle(other.main) - middle(of.main)) === direction);
	const distance = (other: Item) => (direction === 1 ? other.main.start : -other.main.end);
	return side.reduce<Item | null>((best, other) => (best && distance(best) <= distance(other) ? best : other), null);
}

function gapMark(before: Item, after: Item, axis: Axis): SpacingMark | null {
	if (after.main.start - before.main.end < MATCH_MM) return null;
	const crossMm = (Math.max(before.cross.start, after.cross.start) + Math.min(before.cross.end, after.cross.end)) / 2;
	return { axis, fromMm: before.main.end, toMm: after.main.start, crossMm };
}

/** Abstände zwischen benachbarten anderen Objekten */
function pairGaps(items: readonly Item[], axis: Axis): SpacingMark[] {
	return items.flatMap((current) => {
		const next = neighbor(current, items, 1);
		const mark = next && gapMark(current, next, axis);
		return mark ? [mark] : [];
	});
}

function nearestOffset(pairs: readonly AnchorTargets[], threshold: number): number | null {
	let best: number | null = null;
	for (const { anchor, targets } of pairs) {
		for (const target of targets) {
			const offset = target - anchor;
			if (Math.abs(offset) <= threshold && (best === null || Math.abs(offset) < Math.abs(best))) best = offset;
		}
	}
	return best;
}

interface AxisContext {
	axis: Axis;
	moving: Item;
	others: Item[];
	lines: number[];
	before: Item | null;
	after: Item | null;
	gaps: number[];
}

function axisContext(box: BoxMm, others: readonly BoxMm[], axis: Axis): AxisContext {
	const moving = item(box, axis);
	const items = others.map((other) => item(other, axis));
	return {
		axis,
		moving,
		others: items,
		lines: [...PAGE_LINES[axis], ...items.flatMap((other) => lines(other.main))],
		before: neighbor(moving, items, -1),
		after: neighbor(moving, items, 1),
		gaps: pairGaps(items, axis).map(length)
	};
}

/** Lagen für den Anfang, bei denen der Abstand nach vorn einem der Abstände entspricht */
const startTargets = (before: Item | null, gaps: number[]): number[] =>
	before ? gaps.map((gap) => before.main.end + gap) : [];
/** Lagen für das Ende, bei denen der Abstand nach hinten einem der Abstände entspricht */
const endTargets = (after: Item | null, gaps: number[]): number[] =>
	after ? gaps.map((gap) => after.main.start - gap) : [];

function moveTargets(context: AxisContext): AnchorTargets[] {
	const { moving, before, after, lines: guideLines, gaps } = context;
	const size = moving.main.end - moving.main.start;
	const centered = before && after ? [(before.main.end + after.main.start - size) / 2] : [];
	return [
		{ anchor: moving.main.start, targets: [...guideLines, ...startTargets(before, gaps), ...centered] },
		{ anchor: middle(moving.main), targets: guideLines },
		{ anchor: moving.main.end, targets: [...guideLines, ...endTargets(after, gaps)] }
	];
}

/** Bewegte Kante: Hilfslinien, Abstände anderer Paare und der Abstand auf der Gegenseite */
function edgeTargets(context: AxisContext, side: Side): AnchorTargets[] {
	const { moving, before, after, gaps } = context;
	if (side === 1) {
		const opposite = before ? [moving.main.start - before.main.end] : [];
		return [{ anchor: moving.main.end, targets: [...context.lines, ...endTargets(after, [...gaps, ...opposite])] }];
	}
	const opposite = after ? [after.main.start - moving.main.end] : [];
	return [{ anchor: moving.main.start, targets: [...context.lines, ...startTargets(before, [...gaps, ...opposite])] }];
}

const baselines = (objects: readonly LayoutObject[]): number[] =>
	objects.flatMap((object) => (object.kind === "text" ? [object.yMm] : []));

/** Einzelner Text: Grundlinie rastet auf andere Grundlinien */
function baselineTargets(objects: readonly LayoutObject[], others: readonly LayoutObject[]): AnchorTargets[] {
	const [only] = objects;
	if (objects.length !== 1 || only?.kind !== "text") return [];
	return [{ anchor: only.yMm, targets: baselines(others) }];
}

function guidesOf(objects: readonly LayoutObject[], others: readonly LayoutObject[]): Guide[] {
	const box = boxOf(objects);
	if (box === null) return [];
	const otherBoxes = others.map(hitBox);
	const found = (["x", "y"] as const).flatMap((axis) => {
		const context = axisContext(box, otherBoxes, axis);
		const hits = context.lines.filter((line) => lines(context.moving.main).some((anchor) => same(anchor, line)));
		return hits.map((positionMm) => ({ axis, positionMm }));
	});
	const baselineHits = baselineTargets(objects, others).flatMap(({ anchor, targets }) =>
		targets.filter((target) => same(anchor, target)).map((positionMm) => ({ axis: "y" as const, positionMm }))
	);
	const all = [...found, ...baselineHits];
	return all.filter(
		(guide, index) =>
			all.findIndex((other) => other.axis === guide.axis && same(other.positionMm, guide.positionMm)) === index
	);
}

function spacingsOnAxis(box: BoxMm, otherBoxes: readonly BoxMm[], axis: Axis): SpacingMark[] {
	const context = axisContext(box, otherBoxes, axis);
	const own = [
		context.before && gapMark(context.before, context.moving, axis),
		context.after && gapMark(context.moving, context.after, axis)
	].filter((mark): mark is SpacingMark => mark !== null);
	const pairs = pairGaps(context.others, axis);
	const marks: SpacingMark[] = [];
	if (own.length === 2 && same(length(own[0]), length(own[1]))) marks.push(...own);
	for (const mark of own) {
		const matches = pairs.filter((pair) => same(length(pair), length(mark)));
		if (matches.length > 0) marks.push(mark, ...matches);
	}
	return marks.filter((mark, index) => marks.findIndex((other) => sameMark(other, mark)) === index);
}

const sameMark = (a: SpacingMark, b: SpacingMark): boolean =>
	a.axis === b.axis && same(a.fromMm, b.fromMm) && same(a.toMm, b.toMm) && same(a.crossMm, b.crossMm);

function feedback<T extends LayoutObject>(objects: T[], others: readonly LayoutObject[]): SnapResult<T> {
	const box = boxOf(objects);
	const otherBoxes = others.map(hitBox);
	const spacings = box ? [...spacingsOnAxis(box, otherBoxes, "x"), ...spacingsOnAxis(box, otherBoxes, "y")] : [];
	return { objects, guides: guidesOf(objects, others), spacings };
}

const shifted = (delta: DeltaMm, offsets: Offsets): DeltaMm => ({
	x: delta.x + (offsets.x ?? 0),
	y: delta.y + (offsets.y ?? 0)
});
const gridWhereFree = (grid: boolean, offsets: Offsets) => ({
	x: grid && offsets.x === null,
	y: grid && offsets.y === null
});

/** Verschieben mit Hilfslinien und gleichen Abständen; others sind die übrigen sichtbaren Objekte. */
export function snapMove<T extends LayoutObject>(
	objects: readonly T[],
	delta: DeltaMm,
	others: readonly LayoutObject[],
	options: SnapOptions
): SnapResult<T> {
	if (!options.guides) return { objects: moveObjects(objects, delta, options.grid), guides: [], spacings: [] };
	const threshold = options.thresholdMm ?? SNAP_THRESHOLD_MM;
	const free = moveObjects(objects, delta, false);
	const box = boxOf(free);
	if (box === null) return { objects: [], guides: [], spacings: [] };
	const otherBoxes = others.map(hitBox);
	const targetsOn = (axis: Axis) => moveTargets(axisContext(box, otherBoxes, axis));
	const offsets: Offsets = {
		x: nearestOffset(targetsOn("x"), threshold),
		y: nearestOffset([...targetsOn("y"), ...baselineTargets(free, others)], threshold)
	};
	return feedback(moveObjects(objects, shifted(delta, offsets), gridWhereFree(options.grid, offsets)), others);
}

/** Bewegte Kanten; beim Skalieren im Seitenverhältnis bzw. der Schrift rastet nichts. */
function movingSides(objects: readonly LayoutObject[], handle: ResizeHandle, keepAspect: boolean): Record<Axis, Side> {
	if (keepAspect) return { x: 0, y: 0 };
	const sides = HANDLE_SIDES[handle];
	const singleText = objects.length === 1 && objects[0]?.kind === "text";
	return { x: sides.x, y: singleText ? 0 : sides.y };
}

/** Skalieren über einen Anfasser; die bewegte Kante rastet auf Hilfslinien und gleiche Abstände. */
export function snapResize<T extends LayoutObject>(
	objects: readonly T[],
	handle: ResizeHandle,
	delta: DeltaMm,
	others: readonly LayoutObject[],
	options: SnapOptions & { keepAspect: boolean }
): SnapResult<T> {
	const resize = (by: DeltaMm, snap: boolean | Record<Axis, boolean>) =>
		resizeSelection(objects, handle, by, { keepAspect: options.keepAspect, snap });
	if (!options.guides) return { objects: resize(delta, options.grid), guides: [], spacings: [] };
	const threshold = options.thresholdMm ?? SNAP_THRESHOLD_MM;
	const box = boxOf(resize(delta, false));
	if (box === null) return { objects: [], guides: [], spacings: [] };
	const sides = movingSides(objects, handle, options.keepAspect);
	const otherBoxes = others.map(hitBox);
	const offsetOn = (axis: Axis): number | null =>
		sides[axis] === 0 ? null : nearestOffset(edgeTargets(axisContext(box, otherBoxes, axis), sides[axis]), threshold);
	const offsets: Offsets = { x: offsetOn("x"), y: offsetOn("y") };
	return feedback(resize(shifted(delta, offsets), gridWhereFree(options.grid, offsets)), others);
}

/** Anzeige eines Abstands, z. B. „7,6 mm“ */
export function formatSpacing(mm: number): string {
	return `${mm.toLocaleString("de-DE", { maximumFractionDigits: 1 })} mm`;
}

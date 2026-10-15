// Reine Bearbeitungsschritte des Layout-Editors: verschieben, Eigenschaften ändern, Platzhalter einfügen.
import {
	FONT_WEIGHTS,
	MAX_FONT_PT,
	MAX_TEMPLATE_LENGTH,
	MIN_EXTENT_MM,
	MIN_FONT_PT,
	PAGE_HEIGHT_MM,
	PAGE_WIDTH_MM,
	TEXT_ALIGNS,
	VISIBILITIES,
	ptToMm,
	type ImageObject,
	type Layout,
	type LayoutObject,
	type MapObject,
	type TextObject
} from "./layout";

const SNAP_MM = 0.5;
const NUDGE_MM = 0.5;
const NUDGE_LARGE_MM = 5;
const MM_DECIMALS = 100;

export interface PointMm {
	x: number;
	y: number;
}

export type DeltaMm = PointMm;

export interface BoxMm {
	xMm: number;
	yMm: number;
	widthMm: number;
	heightMm: number;
}

export type ObjectPatch = Partial<Omit<TextObject, "id" | "kind" | "label">> &
	Partial<Pick<MapObject, "heightMm" | "highlightOwn">>;

const NUDGE_DIRECTIONS: Record<string, DeltaMm> = {
	ArrowLeft: { x: -1, y: 0 },
	ArrowRight: { x: 1, y: 0 },
	ArrowUp: { x: 0, y: -1 },
	ArrowDown: { x: 0, y: 1 }
};

export const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);
export const roundMm = (mm: number): number => Math.round(mm * MM_DECIMALS) / MM_DECIMALS;

// "+ 0" macht aus -0 eine 0.
export function snapMm(value: number): number {
	return Math.round(value / SNAP_MM) * SNAP_MM + 0;
}

/** Obere Grenze für die Grundlinie: der Text soll nicht über den Seitenrand ragen. */
const textTopMm = (object: TextObject): number => ptToMm(object.sizePt);

export type Axis = "x" | "y";
/** Raster für beide Achsen oder je Achse getrennt */
export type SnapAxes = boolean | Record<Axis, boolean>;

export const snapsOn = (snap: SnapAxes, axis: Axis): boolean => (typeof snap === "boolean" ? snap : snap[axis]);

const POSITION_KEYS = { x: "xMm", y: "yMm" } as const;

/** Erlaubte Lage eines Objekts, damit es ganz auf der Seite bleibt. */
function placeRange(object: LayoutObject, axis: Axis): { min: number; max: number } {
	if (axis === "x") return { min: 0, max: PAGE_WIDTH_MM - object.widthMm };
	if (object.kind === "text") return { min: textTopMm(object), max: PAGE_HEIGHT_MM };
	return { min: 0, max: PAGE_HEIGHT_MM - object.heightMm };
}

/** Verschiebt mehrere Objekte gemeinsam; das erste gibt das Raster vor, alle bleiben ganz auf der Seite. */
export function moveObjects<T extends LayoutObject>(objects: readonly T[], delta: DeltaMm, snap: SnapAxes): T[] {
	const first = objects[0];
	if (first === undefined) return [];
	const shift = (axis: Axis): number => {
		const key = POSITION_KEYS[axis];
		const target = first[key] + delta[axis];
		const wanted = (snapsOn(snap, axis) ? snapMm(target) : target) - first[key];
		const min = Math.max(...objects.map((object) => placeRange(object, axis).min - object[key]));
		const max = Math.min(...objects.map((object) => placeRange(object, axis).max - object[key]));
		return clamp(wanted, min, max);
	};
	const shiftX = shift("x");
	const shiftY = shift("y");
	return objects.map((object) => ({
		...object,
		xMm: roundMm(object.xMm + shiftX),
		yMm: roundMm(object.yMm + shiftY)
	}));
}

/** Verschiebt ab der Ausgangslage; das Objekt bleibt ganz auf der Seite. */
export function moveObject<T extends LayoutObject>(object: T, delta: DeltaMm, snap: SnapAxes): T {
	const [moved] = moveObjects([object], delta, snap);
	return moved ?? object;
}

/** Pfeiltaste → Verschiebung; null bei anderen Tasten. */
export function nudgeDelta(key: string, large: boolean): DeltaMm | null {
	const direction = NUDGE_DIRECTIONS[key];
	if (direction === undefined) return null;
	const step = large ? NUDGE_LARGE_MM : NUDGE_MM;
	return { x: direction.x * step + 0, y: direction.y * step + 0 };
}

const finiteOr = (value: number | undefined, previous: number): number =>
	value !== undefined && Number.isFinite(value) ? value : previous;

function oneOf<T extends string>(value: T | undefined, allowed: readonly T[], previous: T): T {
	return value !== undefined && allowed.includes(value) ? value : previous;
}

function updateText(object: TextObject, patch: ObjectPatch): TextObject {
	const xMm = clamp(finiteOr(patch.xMm, object.xMm), 0, PAGE_WIDTH_MM - MIN_EXTENT_MM);
	const sizePt = clamp(finiteOr(patch.sizePt, object.sizePt), MIN_FONT_PT, MAX_FONT_PT);
	return {
		...object,
		xMm,
		yMm: clamp(finiteOr(patch.yMm, object.yMm), 0, PAGE_HEIGHT_MM),
		widthMm: clamp(finiteOr(patch.widthMm, object.widthMm), MIN_EXTENT_MM, PAGE_WIDTH_MM - xMm),
		align: oneOf(patch.align, TEXT_ALIGNS, object.align),
		font: oneOf(patch.font, FONT_WEIGHTS, object.font),
		boldFont: oneOf(patch.boldFont, FONT_WEIGHTS, object.boldFont),
		sizePt,
		minSizePt: clamp(finiteOr(patch.minSizePt, object.minSizePt), MIN_FONT_PT, sizePt),
		template: (patch.template ?? object.template).slice(0, MAX_TEMPLATE_LENGTH),
		visibleWhen: oneOf(patch.visibleWhen, VISIBILITIES, object.visibleWhen)
	};
}

function updateBox<T extends ImageObject | MapObject>(object: T, patch: ObjectPatch): T {
	const xMm = clamp(finiteOr(patch.xMm, object.xMm), 0, PAGE_WIDTH_MM - MIN_EXTENT_MM);
	const yMm = clamp(finiteOr(patch.yMm, object.yMm), 0, PAGE_HEIGHT_MM - MIN_EXTENT_MM);
	return {
		...object,
		xMm,
		yMm,
		widthMm: clamp(finiteOr(patch.widthMm, object.widthMm), MIN_EXTENT_MM, PAGE_WIDTH_MM - xMm),
		heightMm: clamp(finiteOr(patch.heightMm, object.heightMm), MIN_EXTENT_MM, PAGE_HEIGHT_MM - yMm)
	};
}

function updateMap(object: MapObject, patch: ObjectPatch): MapObject {
	return { ...updateBox(object, patch), highlightOwn: patch.highlightOwn ?? object.highlightOwn };
}

/** Übernimmt geprüfte Werte; Ungültiges behält den alten Wert, Zahlen werden auf die Seite begrenzt. */
export function updateObject<T extends LayoutObject>(object: T, patch: ObjectPatch): T {
	switch (object.kind) {
		case "text":
			return updateText(object, patch) as T;
		case "image":
			return updateBox(object, patch) as T;
		case "map":
			return updateMap(object, patch) as T;
	}
}

export function replaceObject(layout: Layout, object: LayoutObject): Layout {
	return replaceObjects(layout, [object]);
}

export function replaceObjects(layout: Layout, objects: readonly LayoutObject[]): Layout {
	const byId = new Map(objects.map((object) => [object.id, object]));
	return { ...layout, objects: layout.objects.map((current) => byId.get(current.id) ?? current) };
}

/** Setzt den Platzhalter an die Schreibmarke bzw. statt der Markierung; ohne Marke ans Ende. */
export function insertAtCursor(
	text: string,
	token: string,
	start: number | null,
	end: number | null
): { text: string; cursor: number } {
	const from = start ?? text.length;
	const to = end ?? from;
	const next = text.slice(0, from) + token + text.slice(to);
	if (next.length > MAX_TEMPLATE_LENGTH) return { text, cursor: from };
	return { text: next, cursor: from + token.length };
}

// Ober- und Unterlänge von Nunito (hhea 1011 / −353 bei 1000 Einheiten), damit der Rahmen keine Buchstaben schneidet.
const FONT_ASCENT_EM = 1.011;
const FONT_DESCENT_EM = 0.353;
const BOX_PADDING_MM = 0.5;

/** Abstand der Grundlinie von der Oberkante des Textrahmens */
export const textAscentMm = (sizePt: number): number => FONT_ASCENT_EM * ptToMm(sizePt) + BOX_PADDING_MM;

/** Klickfläche: Textrahmen über die volle Schrifthöhe, Bilder und Karte als Rechteck. */
export function hitBox(object: LayoutObject): BoxMm {
	if (object.kind !== "text") {
		const { xMm, yMm, widthMm, heightMm } = object;
		return { xMm, yMm, widthMm, heightMm };
	}
	const sizeMm = ptToMm(object.sizePt);
	const topMm = object.yMm - textAscentMm(object.sizePt);
	const bottomMm = object.yMm + FONT_DESCENT_EM * sizeMm + BOX_PADDING_MM;
	return { xMm: object.xMm, yMm: topMm, widthMm: object.widthMm, heightMm: bottomMm - topMm };
}

export function isShown(object: LayoutObject, withMemberNames: boolean): boolean {
	if (object.kind === "map") return object.visible !== false;
	return object.kind === "image" || object.visibleWhen === "always" || withMemberNames;
}

/** Gemeinsames Rechteck; null ohne Rechtecke. */
export function unionBox(boxes: readonly BoxMm[]): BoxMm | null {
	if (boxes.length === 0) return null;
	const left = Math.min(...boxes.map((box) => box.xMm));
	const top = Math.min(...boxes.map((box) => box.yMm));
	const right = Math.max(...boxes.map((box) => box.xMm + box.widthMm));
	const bottom = Math.max(...boxes.map((box) => box.yMm + box.heightMm));
	return { xMm: left, yMm: top, widthMm: right - left, heightMm: bottom - top };
}

const contains = (box: BoxMm, point: PointMm): boolean =>
	point.x >= box.xMm && point.x <= box.xMm + box.widthMm && point.y >= box.yMm && point.y <= box.yMm + box.heightMm;

/** Trefferfläche eines Objekts; null = nicht greifbar */
export type BoxOf = (object: LayoutObject) => BoxMm | null;

/** Oberstes sichtbares Objekt unter dem Punkt (später gezeichnete liegen oben). */
export function objectAt(
	objects: readonly LayoutObject[],
	point: PointMm,
	withMemberNames: boolean,
	boxOf: BoxOf = hitBox
): LayoutObject | null {
	return (
		objects.findLast((object) => {
			const box = isShown(object, withMemberNames) ? boxOf(object) : null;
			return box !== null && contains(box, point);
		}) ?? null
	);
}

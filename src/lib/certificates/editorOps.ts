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
	Partial<Pick<ImageObject, "heightMm">>;

const NUDGE_DIRECTIONS: Record<string, DeltaMm> = {
	ArrowLeft: { x: -1, y: 0 },
	ArrowRight: { x: 1, y: 0 },
	ArrowUp: { x: 0, y: -1 },
	ArrowDown: { x: 0, y: 1 }
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);
const roundMm = (mm: number): number => Math.round(mm * MM_DECIMALS) / MM_DECIMALS;

// "+ 0" macht aus -0 eine 0.
export function snapMm(value: number): number {
	return Math.round(value / SNAP_MM) * SNAP_MM + 0;
}

/** Obere Grenze für die Grundlinie: der Text soll nicht über den Seitenrand ragen. */
const textTopMm = (object: TextObject): number => ptToMm(object.sizePt);

/** Verschiebt ab der Ausgangslage; das Objekt bleibt ganz auf der Seite. */
export function moveObject<T extends LayoutObject>(object: T, delta: DeltaMm, snap: boolean): T {
	const place = (value: number) => (snap ? snapMm(value) : value);
	const minY = object.kind === "text" ? textTopMm(object) : 0;
	const maxY = object.kind === "text" ? PAGE_HEIGHT_MM : PAGE_HEIGHT_MM - object.heightMm;
	return {
		...object,
		xMm: roundMm(clamp(place(object.xMm + delta.x), 0, PAGE_WIDTH_MM - object.widthMm)),
		yMm: roundMm(clamp(place(object.yMm + delta.y), minY, maxY))
	};
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

function updateImage(object: ImageObject, patch: ObjectPatch): ImageObject {
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

/** Übernimmt geprüfte Werte; Ungültiges behält den alten Wert, Zahlen werden auf die Seite begrenzt. */
export function updateObject<T extends LayoutObject>(object: T, patch: ObjectPatch): T {
	return (object.kind === "text" ? updateText(object, patch) : updateImage(object, patch)) as T;
}

export function replaceObject(layout: Layout, object: LayoutObject): Layout {
	return { ...layout, objects: layout.objects.map((current) => (current.id === object.id ? object : current)) };
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

/** Klickfläche: Textrahmen über die volle Schrifthöhe, Bilder als Rechteck. */
export function hitBox(object: LayoutObject): BoxMm {
	if (object.kind === "image") {
		const { xMm, yMm, widthMm, heightMm } = object;
		return { xMm, yMm, widthMm, heightMm };
	}
	const sizeMm = ptToMm(object.sizePt);
	const topMm = object.yMm - FONT_ASCENT_EM * sizeMm - BOX_PADDING_MM;
	const bottomMm = object.yMm + FONT_DESCENT_EM * sizeMm + BOX_PADDING_MM;
	return { xMm: object.xMm, yMm: topMm, widthMm: object.widthMm, heightMm: bottomMm - topMm };
}

export function isShown(object: LayoutObject, withMemberNames: boolean): boolean {
	return object.kind === "image" || object.visibleWhen === "always" || withMemberNames;
}

const contains = (box: BoxMm, point: PointMm): boolean =>
	point.x >= box.xMm && point.x <= box.xMm + box.widthMm && point.y >= box.yMm && point.y <= box.yMm + box.heightMm;

/** Oberstes sichtbares Objekt unter dem Punkt (später gezeichnete liegen oben). */
export function objectAt(objects: readonly LayoutObject[], point: PointMm, withMemberNames: boolean): LayoutObject | null {
	return objects.findLast((object) => isShown(object, withMemberNames) && contains(hitBox(object), point)) ?? null;
}

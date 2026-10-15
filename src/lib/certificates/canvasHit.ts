// Treffer und Start-Entscheidung auf der Zeichenfläche: Texte zählen nur dort, wo Text gezeichnet ist.
import { hitBox, objectAt, type BoxMm, type PointMm } from "./editorOps";
import type { LayoutObject } from "./layout";
import { clickSelection, inLayoutOrder, marqueeSelection, type ClickMode } from "./objectSelection";
import type { TextSpan } from "./render";

/** Zusätzlicher Rand links und rechts am gezeichneten Text */
export const TEXT_HIT_MARGIN_MM = 1;
/** Kleinere Rahmen gelten als Klick */
export const CLICK_TOLERANCE_MM = 1;

/** Gezeichnete Textbreiten je Objekt; null, solange die Schriften fehlen (dann zählt der Rahmen). */
export type TextSpans = ReadonlyMap<string, TextSpan> | null;

export type PointerStart = { kind: "drag"; ids: string[] } | { kind: "marquee"; base: string[] };

export interface MarqueeStart {
	/** Auswahl, zu der der Rahmen hinzukommt */
	base: string[];
	/** Objekt unter dem Startpunkt, für Umschalt-Klick ohne Ziehen */
	hitId: string | null;
	mode: ClickMode;
}

/** Gezeichneter Text plus Rand; für leere Texte und alle anderen Objekte der Rahmen. */
export function visibleBox(object: LayoutObject, spans: TextSpans): BoxMm {
	const frame = hitBox(object);
	const span = object.kind === "text" ? spans?.get(object.id) : undefined;
	if (span === undefined) return frame;
	return { ...frame, xMm: span.xMm - TEXT_HIT_MARGIN_MM, widthMm: span.widthMm + 2 * TEXT_HIT_MARGIN_MM };
}

const isEmptyText = (object: LayoutObject, spans: TextSpans): boolean =>
	object.kind === "text" && spans !== null && !spans.has(object.id);

/** Klickfläche; leere Texte sind nur gewählt (über den Rahmen) greifbar. */
export function pickBox(object: LayoutObject, spans: TextSpans, selected: boolean): BoxMm | null {
	if (isEmptyText(object, spans) && !selected) return null;
	return visibleBox(object, spans);
}

export function pickObjectAt(
	objects: readonly LayoutObject[],
	point: PointMm,
	withMemberNames: boolean,
	spans: TextSpans,
	selectedIds: readonly string[]
): LayoutObject | null {
	return objectAt(objects, point, withMemberNames, (object) => pickBox(object, spans, selectedIds.includes(object.id)));
}

/** Auf einem Objekt ohne Umschalt/Strg wird gezogen, sonst ein Rahmen aufgezogen. */
export function pointerStart(
	objects: readonly LayoutObject[],
	current: readonly string[],
	hitId: string | null,
	mode: ClickMode
): PointerStart {
	if (hitId === null || mode.additive) return { kind: "marquee", base: mode.additive ? [...current] : [] };
	return { kind: "drag", ids: clickSelection(objects, current, hitId, mode) };
}

/** Objekte, die der Rahmen vollständig umschließt (Texte mit ihrer gezeichneten Breite) */
export function marqueePreview(
	objects: readonly LayoutObject[],
	rect: BoxMm,
	withMemberNames: boolean,
	spans: TextSpans
): string[] {
	return marqueeSelection(objects, rect, withMemberNames, (object) => visibleBox(object, spans));
}

const isClick = (rect: BoxMm): boolean => rect.widthMm < CLICK_TOLERANCE_MM && rect.heightMm < CLICK_TOLERANCE_MM;

/** Auswahl nach dem Loslassen; ein Klick ohne Ziehen wirkt wie ein normaler Klick. */
export function marqueeEnd(
	objects: readonly LayoutObject[],
	start: MarqueeStart,
	rect: BoxMm,
	withMemberNames: boolean,
	spans: TextSpans
): string[] {
	if (isClick(rect)) return clickSelection(objects, start.base, start.hitId, start.mode);
	const inside = marqueePreview(objects, rect, withMemberNames, spans);
	return inLayoutOrder(objects, new Set([...start.base, ...inside]));
}

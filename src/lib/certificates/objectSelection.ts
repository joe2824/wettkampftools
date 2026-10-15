// Auswahl im Layout-Editor: Klick, Umschalt+Klick, Rahmen aufziehen, alles wählen; Gruppen werden ganz gewählt.
import { hitBox, isShown, unionBox, type BoxMm, type PointMm } from "./editorOps";
import type { Layout, LayoutObject } from "./layout";

export interface ClickMode {
	/** Umschalt: hinzufügen bzw. herausnehmen */
	additive: boolean;
	/** Alt oder Doppelklick: nur das Objekt, nicht seine Gruppe */
	single: boolean;
}

/** Nimmt alle Mitglieder der Gruppen dazu; Reihenfolge wie im Layout. */
export function expandGroups(objects: readonly LayoutObject[], ids: readonly string[]): string[] {
	const chosen = new Set(ids);
	const groups = new Set(
		objects.flatMap((object) => (chosen.has(object.id) && object.groupId ? [object.groupId] : []))
	);
	return objects
		.filter((object) => chosen.has(object.id) || (object.groupId !== undefined && groups.has(object.groupId)))
		.map((object) => object.id);
}

/** Ids in der Reihenfolge des Layouts */
export const inLayoutOrder = (objects: readonly LayoutObject[], ids: ReadonlySet<string>): string[] =>
	objects.filter((object) => ids.has(object.id)).map((object) => object.id);

/** Nimmt die Einheit heraus, wenn sie ganz gewählt ist, sonst hinzu. */
export function toggleSelection(
	objects: readonly LayoutObject[],
	current: readonly string[],
	unit: readonly string[]
): string[] {
	const removing = unit.every((id) => current.includes(id));
	const next = removing ? current.filter((id) => !unit.includes(id)) : [...current, ...unit];
	return inLayoutOrder(objects, new Set(next));
}

export function clickSelection(
	objects: readonly LayoutObject[],
	current: readonly string[],
	hitId: string | null,
	mode: ClickMode
): string[] {
	if (hitId === null) return mode.additive ? [...current] : [];
	const unit = mode.single ? [hitId] : expandGroups(objects, [hitId]);
	if (mode.additive) return toggleSelection(objects, current, unit);
	// Klick auf schon Gewähltes behält die Auswahl, damit alles gemeinsam gezogen werden kann.
	if (!mode.single && current.includes(hitId)) return [...current];
	return unit;
}

export function boxFromPoints(a: PointMm, b: PointMm): BoxMm {
	return {
		xMm: Math.min(a.x, b.x),
		yMm: Math.min(a.y, b.y),
		widthMm: Math.abs(a.x - b.x),
		heightMm: Math.abs(a.y - b.y)
	};
}

const inside = (inner: BoxMm, outer: BoxMm): boolean =>
	inner.xMm >= outer.xMm &&
	inner.yMm >= outer.yMm &&
	inner.xMm + inner.widthMm <= outer.xMm + outer.widthMm &&
	inner.yMm + inner.heightMm <= outer.yMm + outer.heightMm;

/** Sichtbare Objekte, die vollständig im Rahmen liegen, samt ihrer Gruppen */
export function marqueeSelection(
	objects: readonly LayoutObject[],
	rect: BoxMm,
	withMemberNames: boolean,
	boxOf: (object: LayoutObject) => BoxMm = hitBox
): string[] {
	const hits = objects.filter((object) => isShown(object, withMemberNames) && inside(boxOf(object), rect));
	return expandGroups(
		objects,
		hits.map((object) => object.id)
	);
}

export function selectAll(objects: readonly LayoutObject[], withMemberNames: boolean): string[] {
	return objects.filter((object) => isShown(object, withMemberNames)).map((object) => object.id);
}

export function selectedObjects(layout: Layout, ids: readonly string[]): LayoutObject[] {
	const chosen = new Set(ids);
	return layout.objects.filter((object) => chosen.has(object.id));
}

export const selectionBox = (objects: readonly LayoutObject[]): BoxMm | null => unionBox(objects.map(hitBox));

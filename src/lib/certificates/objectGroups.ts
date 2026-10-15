// Gruppen im Layout: Mitglieder tragen dieselbe groupId.
import type { Layout, LayoutObject } from "./layout";

const GROUP_PREFIX = "group-";
const MIN_GROUP_SIZE = 2;

function withoutGroup<T extends LayoutObject>(object: T): T {
	const copy = { ...object };
	delete copy.groupId;
	return copy;
}

/** Freie Gruppenkennung „group-1“, „group-2“ … */
export function newGroupId(objects: readonly LayoutObject[]): string {
	const used = new Set(objects.map((object) => object.groupId));
	let number = 1;
	while (used.has(`${GROUP_PREFIX}${number}`)) number += 1;
	return `${GROUP_PREFIX}${number}`;
}

/** Entfernt Gruppen, die nur noch ein Mitglied haben. */
export function normalizeGroups(layout: Layout): Layout {
	const counts = new Map<string, number>();
	for (const object of layout.objects) {
		if (object.groupId) counts.set(object.groupId, (counts.get(object.groupId) ?? 0) + 1);
	}
	const lonely = (object: LayoutObject) =>
		object.groupId !== undefined && (counts.get(object.groupId) ?? 0) < MIN_GROUP_SIZE;
	if (!layout.objects.some(lonely)) return layout;
	return { ...layout, objects: layout.objects.map((object) => (lonely(object) ? withoutGroup(object) : object)) };
}

export function groupObjects(layout: Layout, ids: readonly string[]): Layout {
	if (ids.length < MIN_GROUP_SIZE) return layout;
	const groupId = newGroupId(layout.objects);
	const objects = layout.objects.map((object) => (ids.includes(object.id) ? { ...object, groupId } : object));
	return normalizeGroups({ ...layout, objects });
}

/** Löst alle Gruppen auf, zu denen eines der Objekte gehört. */
export function ungroupObjects(layout: Layout, ids: readonly string[]): Layout {
	const groups = new Set(
		layout.objects.flatMap((object) => (ids.includes(object.id) && object.groupId ? [object.groupId] : []))
	);
	const objects = layout.objects.map((object) =>
		object.groupId !== undefined && groups.has(object.groupId) ? withoutGroup(object) : object
	);
	return { ...layout, objects };
}

/** Einheiten der Auswahl: jede Gruppe zählt als eine, sonst jedes Objekt einzeln. */
export function selectionUnits<T extends LayoutObject>(objects: readonly T[]): T[][] {
	const units = new Map<string, T[]>();
	for (const object of objects) {
		const key = object.groupId ?? `object:${object.id}`;
		units.set(key, [...(units.get(key) ?? []), object]);
	}
	return [...units.values()];
}

export const canGroup = (objects: readonly LayoutObject[]): boolean => selectionUnits(objects).length >= MIN_GROUP_SIZE;
export const canUngroup = (objects: readonly LayoutObject[]): boolean => objects.some((object) => object.groupId);

export type ListRow =
	{ type: "group"; groupId: string; ids: string[] } | { type: "object"; object: LayoutObject; nested: boolean };

/** Zeilen der Elementliste: Gruppen als Kopfzeile an der Stelle des ersten Mitglieds, Mitglieder darunter. */
export function listRows(objects: readonly LayoutObject[]): ListRow[] {
	const units = selectionUnits(objects);
	return units.flatMap((unit): ListRow[] => {
		const groupId = unit[0].groupId;
		if (groupId === undefined || unit.length < MIN_GROUP_SIZE) {
			return unit.map((object) => ({ type: "object", object, nested: false }));
		}
		const members = unit.map((object): ListRow => ({ type: "object", object, nested: true }));
		return [{ type: "group", groupId, ids: unit.map((object) => object.id) }, ...members];
	});
}

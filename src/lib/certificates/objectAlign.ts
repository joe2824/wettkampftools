// Ausrichten und gleichmäßig Verteilen; Gruppen bewegen sich als Ganzes.
import { hitBox, moveObjects, unionBox, type Axis, type BoxMm } from "./editorOps";
import { PAGE_HEIGHT_MM, PAGE_WIDTH_MM, type LayoutObject } from "./layout";
import { selectionUnits } from "./objectGroups";

export type AlignEdge = "left" | "centerX" | "right" | "top" | "centerY" | "bottom";
/** Bezug bei mehreren Einheiten; eine einzelne richtet sich immer an der Seite aus. */
export type AlignReference = "page" | "selection";

const PAGE_BOX: BoxMm = { xMm: 0, yMm: 0, widthMm: PAGE_WIDTH_MM, heightMm: PAGE_HEIGHT_MM };
const MIN_DISTRIBUTE_UNITS = 3;

const EDGE_AXIS: Record<AlignEdge, Axis> = {
	left: "x",
	centerX: "x",
	right: "x",
	top: "y",
	centerY: "y",
	bottom: "y"
};
/** Anteil der Breite bzw. Höhe: 0 Anfang, 0,5 Mitte, 1 Ende */
const EDGE_FRACTION: Record<AlignEdge, number> = { left: 0, centerX: 0.5, right: 1, top: 0, centerY: 0.5, bottom: 1 };

const start = (box: BoxMm, axis: Axis): number => (axis === "x" ? box.xMm : box.yMm);
const size = (box: BoxMm, axis: Axis): number => (axis === "x" ? box.widthMm : box.heightMm);
const edge = (box: BoxMm, alignEdge: AlignEdge): number => {
	const axis = EDGE_AXIS[alignEdge];
	return start(box, axis) + size(box, axis) * EDGE_FRACTION[alignEdge];
};
const unitBox = (unit: readonly LayoutObject[]): BoxMm => unionBox(unit.map(hitBox)) ?? PAGE_BOX;
const along = (axis: Axis, distance: number) => (axis === "x" ? { x: distance, y: 0 } : { x: 0, y: distance });

export const alignsToPage = (objects: readonly LayoutObject[], reference: AlignReference): boolean =>
	reference === "page" || selectionUnits(objects).length < 2;

/** Gibt die bewegten Objekte in der Reihenfolge der Eingabe zurück. */
function moveUnits<T extends LayoutObject>(objects: readonly T[], shift: (unit: T[]) => { x: number; y: number }): T[] {
	const moved = new Map(
		selectionUnits(objects).flatMap((unit) =>
			moveObjects(unit, shift(unit), false).map((object) => [object.id, object])
		)
	);
	return objects.map((object) => moved.get(object.id) ?? object);
}

export function alignObjects<T extends LayoutObject>(
	objects: readonly T[],
	alignEdge: AlignEdge,
	reference: AlignReference
): T[] {
	const target = alignsToPage(objects, reference) ? PAGE_BOX : unitBox(objects);
	const axis = EDGE_AXIS[alignEdge];
	return moveUnits(objects, (unit) => along(axis, edge(target, alignEdge) - edge(unitBox(unit), alignEdge)));
}

export const canDistribute = (objects: readonly LayoutObject[]): boolean =>
	selectionUnits(objects).length >= MIN_DISTRIBUTE_UNITS;

/** Gleiche Abstände zwischen den Einheiten; die äußeren bleiben stehen. */
export function distributeObjects<T extends LayoutObject>(objects: readonly T[], axis: Axis): T[] {
	if (!canDistribute(objects)) return [...objects];
	const units = selectionUnits(objects)
		.map((unit) => ({ unit, box: unitBox(unit) }))
		.sort((a, b) => start(a.box, axis) + size(a.box, axis) / 2 - (start(b.box, axis) + size(b.box, axis) / 2));
	const first = units[0].box;
	const last = units[units.length - 1].box;
	const total = start(last, axis) + size(last, axis) - start(first, axis);
	const gap = (total - units.reduce((sum, { box }) => sum + size(box, axis), 0)) / (units.length - 1);
	// Einheiten über ihr erstes Objekt wiederfinden
	const shifts = new Map<string, number>();
	let position = start(first, axis);
	for (const { unit, box } of units) {
		shifts.set(unit[0].id, position - start(box, axis));
		position += size(box, axis) + gap;
	}
	return moveUnits(objects, (unit) => along(axis, shifts.get(unit[0].id) ?? 0));
}

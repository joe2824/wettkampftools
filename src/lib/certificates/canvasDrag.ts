// Ziehen auf der Zeichenfläche: Verschieben oder Skalieren über einen Anfasser, mit Hilfslinien.
import type { PointMm } from "./editorOps";
import type { LayoutObject } from "./layout";
import type { ResizeHandle } from "./objectResize";
import { snapMove, snapResize, type SnapResult } from "./snapping";

export interface ObjectDrag {
	mode: "move" | ResizeHandle;
	start: PointMm;
	/** Gewählte Objekte zu Beginn */
	objects: LayoutObject[];
	/** Übrige sichtbare Objekte als Bezug für Hilfslinien */
	others: LayoutObject[];
}

export interface DragModifiers {
	/** Alt: ohne Raster und ohne Hilfslinien */
	alt: boolean;
	/** Umschalt: Seitenverhältnis halten bzw. Schrift skalieren */
	shift: boolean;
}

export function dragObjects(
	drag: ObjectDrag,
	point: PointMm,
	modifiers: DragModifiers,
	guidesEnabled: boolean
): SnapResult {
	const delta = { x: point.x - drag.start.x, y: point.y - drag.start.y };
	const options = { grid: !modifiers.alt, guides: guidesEnabled && !modifiers.alt };
	if (drag.mode === "move") return snapMove(drag.objects, delta, drag.others, options);
	return snapResize(drag.objects, drag.mode, delta, drag.others, { ...options, keepAspect: modifiers.shift });
}

// Elemente hinzufügen, entfernen und duplizieren.
import { moveObjects } from "./editorOps";
import {
	PAGE_HEIGHT_MM,
	SIGNATURE_SLOTS,
	type ImageObject,
	type Layout,
	type LayoutObject,
	type SignatureSlot,
	type TextObject
} from "./layout";
import { defaultLayouts } from "./layoutDefaults";
import { newGroupId, normalizeGroups } from "./objectGroups";

export const NEW_TEXT_TEMPLATE = "Neuer Text";
const TEXT_PREFIX = "text";
const NEW_TEXT_LEFT_MM = 25;
const NEW_TEXT_WIDTH_MM = 160;
const NEW_TEXT_SIZE_PT = 18;
const NEW_TEXT_MIN_SIZE_PT = 10;
const DUPLICATE_OFFSET_MM = 5;
const MAX_LABEL_LENGTH = 100;

export interface LayoutChange {
	layout: Layout;
	/** Neu angelegte Elemente, die danach gewählt werden */
	ids: string[];
}

/** Kleinste freie Nummer für Kennungen wie „text-1“, „text-2“ … */
function freeNumber(objects: readonly LayoutObject[], prefix: string): number {
	const used = new Set(objects.map((object) => object.id));
	let number = 1;
	while (used.has(`${prefix}-${number}`)) number += 1;
	return number;
}

/** Neues, zentriertes Textfeld auf halber Seitenhöhe */
export function addText(layout: Layout, template = NEW_TEXT_TEMPLATE): LayoutChange {
	const number = freeNumber(layout.objects, TEXT_PREFIX);
	const object: TextObject = {
		id: `${TEXT_PREFIX}-${number}`,
		kind: "text",
		label: `Text ${number}`,
		xMm: NEW_TEXT_LEFT_MM,
		yMm: PAGE_HEIGHT_MM / 2,
		widthMm: NEW_TEXT_WIDTH_MM,
		align: "center",
		font: "regular",
		boldFont: "bold",
		sizePt: NEW_TEXT_SIZE_PT,
		minSizePt: NEW_TEXT_MIN_SIZE_PT,
		template,
		visibleWhen: "always"
	};
	return { layout: { ...layout, objects: [...layout.objects, object] }, ids: [object.id] };
}

export function missingSignatureSlots(layout: Layout): SignatureSlot[] {
	const present = new Set(layout.objects.flatMap((object) => (object.kind === "image" ? [object.slot] : [])));
	return SIGNATURE_SLOTS.filter((slot) => !present.has(slot));
}

/** Fehlende Unterschrift an der Stelle aus dem Standardlayout; null, wenn schon vorhanden. */
export function addSignature(layout: Layout, slot: SignatureSlot): LayoutChange | null {
	if (!missingSignatureSlots(layout).includes(slot)) return null;
	const template = defaultLayouts()[layout.variant].objects.find(
		(object): object is ImageObject => object.kind === "image" && object.slot === slot
	);
	if (template === undefined) return null;
	const taken = layout.objects.some((object) => object.id === template.id);
	const object = { ...template, id: taken ? `${slot}-${freeNumber(layout.objects, slot)}` : template.id };
	return { layout: { ...layout, objects: [...layout.objects, object] }, ids: [object.id] };
}

export function removeObjects(layout: Layout, ids: readonly string[]): Layout {
	return normalizeGroups({ ...layout, objects: layout.objects.filter((object) => !ids.includes(object.id)) });
}

/** Kopiert die gewählten Texte 5 mm versetzt; Unterschriften und Karte gibt es nur einmal. */
export function duplicateObjects(layout: Layout, ids: readonly string[]): LayoutChange {
	const sources = layout.objects.filter(
		(object): object is TextObject => object.kind === "text" && ids.includes(object.id)
	);
	const groupIds = new Map<string, string>();
	const objects: LayoutObject[] = [...layout.objects];
	const copies = sources.map((source) => {
		const copy: TextObject = {
			...source,
			id: `${TEXT_PREFIX}-${freeNumber(objects, TEXT_PREFIX)}`,
			label: `${source.label} (Kopie)`.slice(0, MAX_LABEL_LENGTH)
		};
		if (source.groupId !== undefined) {
			if (!groupIds.has(source.groupId)) groupIds.set(source.groupId, newGroupId(objects));
			copy.groupId = groupIds.get(source.groupId);
		}
		objects.push(copy);
		return copy;
	});
	const moved = moveObjects(copies, { x: DUPLICATE_OFFSET_MM, y: DUPLICATE_OFFSET_MM }, false);
	return {
		layout: normalizeGroups({ ...layout, objects: [...layout.objects, ...moved] }),
		ids: moved.map((object) => object.id)
	};
}

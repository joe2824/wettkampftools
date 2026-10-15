// Beispielobjekte für Tests des Layout-Editors.
import type { ImageObject, Layout, LayoutObject, MapObject, TextObject } from "$lib/certificates/layout";

export function text(overrides: Partial<TextObject> = {}): TextObject {
	return {
		id: "name",
		kind: "text",
		label: "Name",
		xMm: 25,
		yMm: 100,
		widthMm: 160,
		align: "center",
		font: "regular",
		boldFont: "black",
		sizePt: 18,
		minSizePt: 12,
		template: "{name}",
		visibleWhen: "always",
		...overrides
	};
}

export function image(overrides: Partial<ImageObject> = {}): ImageObject {
	return {
		id: "signature1",
		kind: "image",
		label: "Unterschrift 1",
		slot: "signature1",
		xMm: 30,
		yMm: 250,
		widthMm: 30,
		heightMm: 20,
		...overrides
	};
}

export function map(overrides: Partial<MapObject> = {}): MapObject {
	return {
		id: "map",
		kind: "map",
		label: "Deutschlandkarte",
		xMm: 150,
		yMm: 40,
		widthMm: 45,
		heightMm: 55,
		highlightOwn: false,
		...overrides
	};
}

export function layoutOf(objects: LayoutObject[]): Layout {
	return { schemaVersion: 1, variant: "team", objects };
}

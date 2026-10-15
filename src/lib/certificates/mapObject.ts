// Deutschlandkarte auf der Urkunde ein- und ausschalten; ausgeschaltet behält sie Position und Größe.
import type { Layout, MapObject } from "./layout";

export const DEFAULT_MAP_OBJECT: MapObject = {
	id: "map",
	kind: "map",
	label: "Deutschlandkarte",
	xMm: 150,
	yMm: 40,
	widthMm: 45,
	heightMm: 55,
	highlightOwn: false
};

export function mapObjectOf(layout: Layout): MapObject | null {
	return layout.objects.find((object): object is MapObject => object.kind === "map") ?? null;
}

export function isMapEnabled(layout: Layout): boolean {
	const map = mapObjectOf(layout);
	return map !== null && map.visible !== false;
}

export function setMapEnabled(layout: Layout, enabled: boolean): Layout {
	const map = mapObjectOf(layout);
	if (map === null) return enabled ? { ...layout, objects: [...layout.objects, { ...DEFAULT_MAP_OBJECT }] } : layout;
	const objects = layout.objects.map((object) => (object === map ? { ...map, visible: enabled } : object));
	return { ...layout, objects };
}

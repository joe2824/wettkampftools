import { describe, expect, it } from "vitest";
import { defaultLayouts } from "./layoutDefaults";
import { DEFAULT_MAP_OBJECT, isMapEnabled, mapObjectOf, setMapEnabled } from "./mapObject";

describe("setMapEnabled", () => {
	const layout = defaultLayouts().team;

	it("fügt die Karte beim ersten Einschalten hinzu", () => {
		const next = setMapEnabled(layout, true);
		expect(next.objects).toHaveLength(layout.objects.length + 1);
		expect(mapObjectOf(next)).toEqual(DEFAULT_MAP_OBJECT);
		expect(DEFAULT_MAP_OBJECT.highlightOwn).toBe(false);
	});

	it("blendet sie aus, ohne Position und Größe zu verlieren", () => {
		const moved = { ...DEFAULT_MAP_OBJECT, xMm: 12 };
		const withMap = { ...layout, objects: [...layout.objects, moved] };
		const off = setMapEnabled(withMap, false);
		expect(mapObjectOf(off)).toEqual({ ...moved, visible: false });
		expect(mapObjectOf(setMapEnabled(off, true))).toEqual({ ...moved, visible: true });
	});

	it("ändert ohne Karte beim Ausschalten nichts", () => {
		expect(setMapEnabled(layout, false)).toBe(layout);
		expect(mapObjectOf(layout)).toBeNull();
	});
});

describe("isMapEnabled", () => {
	it("ist nur mit sichtbarer Karte eingeschaltet", () => {
		const layout = defaultLayouts().team;
		expect(isMapEnabled(layout)).toBe(false);
		expect(isMapEnabled(setMapEnabled(layout, true))).toBe(true);
		expect(isMapEnabled(setMapEnabled(setMapEnabled(layout, true), false))).toBe(false);
	});
});

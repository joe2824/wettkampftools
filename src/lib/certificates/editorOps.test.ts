import { describe, expect, it } from "vitest";
import { PAGE_HEIGHT_MM, PAGE_WIDTH_MM, ptToMm, type ImageObject, type TextObject } from "./layout";
import { defaultLayouts } from "./layoutDefaults";
import {
	hitBox,
	insertAtCursor,
	isShown,
	moveObject,
	nudgeDelta,
	objectAt,
	replaceObject,
	snapMm,
	updateObject
} from "./editorOps";

function text(overrides: Partial<TextObject> = {}): TextObject {
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

function image(overrides: Partial<ImageObject> = {}): ImageObject {
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

describe("snapMm", () => {
	it("rundet auf halbe Millimeter", () => {
		expect(snapMm(10.24)).toBe(10);
		expect(snapMm(10.26)).toBe(10.5);
		expect(snapMm(-0.74)).toBe(-0.5);
	});
});

describe("moveObject", () => {
	it("verschiebt mit Raster auf halbe Millimeter", () => {
		const moved = moveObject(text({ xMm: 25.1, yMm: 100 }), { x: 3.3, y: -2.2 }, true);
		expect(moved).toMatchObject({ xMm: 28.5, yMm: 98 });
	});

	it("verschiebt ohne Raster genau, auf hundertstel Millimeter gerundet", () => {
		const moved = moveObject(text({ xMm: 25.1 }), { x: 3.333, y: 0.1 + 0.2 }, false);
		expect(moved).toMatchObject({ xMm: 28.43, yMm: 100.3 });
	});

	it("hält Texte vollständig auf der Seite", () => {
		const object = text({ xMm: 25, widthMm: 160, sizePt: 18 });
		expect(moveObject(object, { x: 100, y: 500 }, true)).toMatchObject({ xMm: PAGE_WIDTH_MM - 160, yMm: PAGE_HEIGHT_MM });
		const top = moveObject(object, { x: -100, y: -500 }, true);
		expect(top.xMm).toBe(0);
		expect(top.yMm).toBeCloseTo(ptToMm(18), 2);
	});

	it("hält Bilder vollständig auf der Seite", () => {
		const moved = moveObject(image(), { x: 500, y: 500 }, false);
		expect(moved).toMatchObject({ xMm: PAGE_WIDTH_MM - 30, yMm: PAGE_HEIGHT_MM - 20 });
		expect(moveObject(image(), { x: -500, y: -500 }, false)).toMatchObject({ xMm: 0, yMm: 0 });
	});

	it("ändert sonst nichts am Objekt", () => {
		const object = text();
		const moved = moveObject(object, { x: 1, y: 1 }, true);
		expect(moved).not.toBe(object);
		expect({ ...moved, xMm: 25, yMm: 100 }).toEqual(object);
	});
});

describe("nudgeDelta", () => {
	it("bewegt mit Pfeiltasten um 0,5 mm, mit Umschalt um 5 mm", () => {
		expect(nudgeDelta("ArrowLeft", false)).toEqual({ x: -0.5, y: 0 });
		expect(nudgeDelta("ArrowRight", true)).toEqual({ x: 5, y: 0 });
		expect(nudgeDelta("ArrowUp", false)).toEqual({ x: 0, y: -0.5 });
		expect(nudgeDelta("ArrowDown", true)).toEqual({ x: 0, y: 5 });
	});

	it("ignoriert andere Tasten", () => {
		expect(nudgeDelta("Enter", false)).toBeNull();
	});
});

describe("updateObject", () => {
	it("übernimmt gültige Werte", () => {
		const updated = updateObject(text(), { align: "left", font: "bold", template: "**{platz}. Platz**", sizePt: 20 });
		expect(updated).toMatchObject({ align: "left", font: "bold", template: "**{platz}. Platz**", sizePt: 20 });
	});

	it("behält bei ungültigen Zahlen den alten Wert", () => {
		expect(updateObject(text(), { xMm: Number.NaN, sizePt: Number.POSITIVE_INFINITY })).toMatchObject({
			xMm: 25,
			sizePt: 18
		});
	});

	it("begrenzt Schriftgrößen; Mindestgröße höchstens die Größe", () => {
		expect(updateObject(text(), { sizePt: 500 }).sizePt).toBe(144);
		expect(updateObject(text(), { sizePt: 1 })).toMatchObject({ sizePt: 4, minSizePt: 4 });
		expect(updateObject(text(), { minSizePt: 30 }).minSizePt).toBe(18);
		expect(updateObject(text(), { sizePt: 10 }).minSizePt).toBe(10);
	});

	it("begrenzt Position und Breite auf die Seite", () => {
		expect(updateObject(text(), { xMm: -5, widthMm: 999 })).toMatchObject({ xMm: 0, widthMm: PAGE_WIDTH_MM });
		expect(updateObject(text(), { xMm: 300 })).toMatchObject({ xMm: PAGE_WIDTH_MM - 1, widthMm: 1 });
		expect(updateObject(text(), { widthMm: 0 }).widthMm).toBe(1);
		expect(updateObject(text(), { yMm: 400 }).yMm).toBe(PAGE_HEIGHT_MM);
		expect(updateObject(image(), { yMm: 400, heightMm: 50 })).toMatchObject({ yMm: PAGE_HEIGHT_MM - 1, heightMm: 1 });
	});

	it("kürzt zu lange Vorlagen und verwirft unbekannte Auswahlwerte", () => {
		const updated = updateObject(text(), { template: "x".repeat(600), align: "justify" as never, font: "thin" as never });
		expect(updated.template).toHaveLength(500);
		expect(updated).toMatchObject({ align: "center", font: "regular" });
	});

	it("lässt Kennung, Art, Bezeichnung und Platz unverändert", () => {
		const updated = updateObject(image(), { id: "x", kind: "text", label: "y", slot: "signature2" } as never);
		expect(updated).toEqual(image());
	});
});

describe("replaceObject", () => {
	it("ersetzt das Objekt mit gleicher Kennung, die Reihenfolge bleibt", () => {
		const layout = defaultLayouts().team;
		const moved = { ...layout.objects[2], xMm: 1 };
		const next = replaceObject(layout, moved);
		expect(next.objects[2]).toBe(moved);
		expect(next.objects).toHaveLength(layout.objects.length);
		expect(layout.objects[2].xMm).not.toBe(1);
	});
});

describe("insertAtCursor", () => {
	it("fügt den Platzhalter an der Schreibmarke ein", () => {
		expect(insertAtCursor("am  im Ort", "{datum}", 3, 3)).toEqual({ text: "am {datum} im Ort", cursor: 10 });
	});

	it("ersetzt eine Markierung", () => {
		expect(insertAtCursor("Platz XX", "{platz}", 6, 8)).toEqual({ text: "Platz {platz}", cursor: 13 });
	});

	it("hängt ohne Schreibmarke ans Ende an", () => {
		expect(insertAtCursor("am ", "{datum}", null, null)).toEqual({ text: "am {datum}", cursor: 10 });
	});

	it("hält die Höchstlänge ein", () => {
		const full = "x".repeat(495);
		expect(insertAtCursor(full, "{datum}", 0, 0)).toEqual({ text: full, cursor: 0 });
	});
});

describe("hitBox", () => {
	it("Text: Rahmenbreite, von Grundlinie minus Schriftgröße bis Grundlinie", () => {
		const box = hitBox(text({ xMm: 25, yMm: 100, widthMm: 160, sizePt: 18 }));
		expect(box).toMatchObject({ xMm: 25, widthMm: 160 });
		expect(box.yMm).toBeCloseTo(100 - ptToMm(18), 5);
		expect(box.heightMm).toBeCloseTo(ptToMm(18), 5);
	});

	it("Bild: sein Rechteck", () => {
		expect(hitBox(image())).toEqual({ xMm: 30, yMm: 250, widthMm: 30, heightMm: 20 });
	});
});

describe("isShown", () => {
	it("blendet Mitgliedertexte ohne Mitgliedernamen aus, Bilder nie", () => {
		const member = text({ visibleWhen: "withMemberNames" });
		expect(isShown(member, false)).toBe(false);
		expect(isShown(member, true)).toBe(true);
		expect(isShown(text(), false)).toBe(true);
		expect(isShown(image(), false)).toBe(true);
	});
});

describe("objectAt", () => {
	const objects = [text({ id: "a", xMm: 20, yMm: 100, widthMm: 100 }), image({ id: "b", xMm: 50, yMm: 90, widthMm: 20, heightMm: 20 })];

	it("findet das oberste Objekt unter dem Punkt", () => {
		expect(objectAt(objects, { x: 55, y: 95 }, true)?.id).toBe("b");
		expect(objectAt(objects, { x: 25, y: 98 }, true)?.id).toBe("a");
		expect(objectAt(objects, { x: 5, y: 5 }, true)).toBeNull();
	});

	it("übergeht ausgeblendete Texte", () => {
		const member = [text({ visibleWhen: "withMemberNames" })];
		expect(objectAt(member, { x: 30, y: 99 }, false)).toBeNull();
		expect(objectAt(member, { x: 30, y: 99 }, true)).not.toBeNull();
	});
});

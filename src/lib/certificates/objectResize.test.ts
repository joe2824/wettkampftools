import { describe, expect, it } from "vitest";
import { image, map, text } from "$lib/testing/layoutObjects";
import { hitBox } from "./editorOps";
import { MIN_EXTENT_MM, MIN_FONT_PT, PAGE_HEIGHT_MM, PAGE_WIDTH_MM } from "./layout";
import { handlePoint, resizeGroup, resizeHandles, resizeObject, resizeSelection } from "./objectResize";

const FREE = { keepAspect: false, snap: false };

describe("resizeHandles", () => {
	it("Texte nur seitlich und an den Ecken, Bilder und Karte rundum", () => {
		expect(resizeHandles(text())).toEqual(["w", "e", "nw", "ne", "sw", "se"]);
		expect(resizeHandles(image())).toHaveLength(8);
		expect(resizeHandles(map())).toHaveLength(8);
	});
});

describe("handlePoint", () => {
	it("liegt auf Ecken und Kantenmitten", () => {
		const box = { xMm: 10, yMm: 20, widthMm: 40, heightMm: 10 };
		expect(handlePoint(box, "nw")).toEqual({ x: 10, y: 20 });
		expect(handlePoint(box, "e")).toEqual({ x: 50, y: 25 });
		expect(handlePoint(box, "s")).toEqual({ x: 30, y: 30 });
	});
});

describe("resizeObject: Bilder und Karte", () => {
	it("zieht die rechte untere Ecke, die linke obere bleibt", () => {
		const resized = resizeObject(image(), "se", { x: 10, y: 5 }, FREE);
		expect(resized).toMatchObject({ xMm: 30, yMm: 250, widthMm: 40, heightMm: 25 });
	});

	it("zieht die linke Kante, die rechte bleibt fest", () => {
		const resized = resizeObject(image(), "w", { x: -10, y: 99 }, FREE);
		expect(resized).toMatchObject({ xMm: 20, yMm: 250, widthMm: 40, heightMm: 20 });
	});

	it("zieht die obere Kante", () => {
		expect(resizeObject(map(), "n", { x: 0, y: 5 }, FREE)).toMatchObject({ yMm: 45, heightMm: 50 });
	});

	it("rastet die bewegte Kante auf halbe Millimeter", () => {
		const resized = resizeObject(image(), "e", { x: 10.3, y: 0 }, { keepAspect: false, snap: true });
		expect(resized.widthMm).toBe(40.5);
	});

	it("begrenzt auf Seite und Mindestgröße", () => {
		expect(resizeObject(image(), "se", { x: 999, y: 999 }, FREE)).toMatchObject({
			widthMm: PAGE_WIDTH_MM - 30,
			heightMm: PAGE_HEIGHT_MM - 250
		});
		expect(resizeObject(image(), "w", { x: 999, y: 0 }, FREE)).toMatchObject({ xMm: 59, widthMm: MIN_EXTENT_MM });
	});

	it("hält mit Umschalt das Seitenverhältnis an der Ecke", () => {
		const resized = resizeObject(image(), "se", { x: 15, y: 1 }, { keepAspect: true, snap: true });
		expect(resized).toMatchObject({ xMm: 30, yMm: 250, widthMm: 45, heightMm: 30 });
	});

	it("hält mit Umschalt an der Kante das Verhältnis um die Mitte", () => {
		const resized = resizeObject(image(), "e", { x: 30, y: 0 }, { keepAspect: true, snap: false });
		expect(resized).toMatchObject({ xMm: 30, widthMm: 60, heightMm: 40, yMm: 240 });
	});

	it("bremst das Seitenverhältnis am Seitenrand", () => {
		const resized = resizeObject(image(), "se", { x: 999, y: 0 }, { keepAspect: true, snap: false });
		expect(resized.heightMm).toBeCloseTo(PAGE_HEIGHT_MM - 250, 2);
		expect(resized.widthMm / resized.heightMm).toBeCloseTo(1.5, 2);
	});
});

describe("resizeObject: Texte", () => {
	it("ändert an der rechten Kante nur die Breite", () => {
		const resized = resizeObject(text(), "e", { x: -20, y: 7 }, FREE);
		expect(resized).toMatchObject({ xMm: 25, widthMm: 140, yMm: 100, sizePt: 18 });
	});

	it("hält an der linken Kante die rechte fest", () => {
		expect(resizeObject(text(), "w", { x: 10, y: 0 }, FREE)).toMatchObject({ xMm: 35, widthMm: 150 });
	});

	it("ändert ohne Umschalt auch an der Ecke nur die Breite", () => {
		expect(resizeObject(text(), "se", { x: -10, y: 30 }, FREE)).toMatchObject({ widthMm: 150, sizePt: 18 });
	});

	it("skaliert mit Umschalt an der Ecke die Schrift samt Mindestgröße", () => {
		const object = text({ sizePt: 18, minSizePt: 12 });
		const height = hitBox(object).heightMm;
		const resized = resizeObject(object, "ne", { x: 0, y: -height }, { keepAspect: true, snap: false });
		expect(resized.sizePt).toBe(36);
		expect(resized.minSizePt).toBe(24);
		expect(resized.yMm).toBe(100);
		expect(resized.widthMm).toBe(160);
	});

	it("hält beim Ziehen der unteren Ecke die Oberkante", () => {
		const object = text();
		const height = hitBox(object).heightMm;
		const resized = resizeObject(object, "se", { x: 0, y: height }, { keepAspect: true, snap: true });
		expect(resized.sizePt).toBe(36);
		expect(hitBox(resized).yMm).toBeCloseTo(hitBox(object).yMm, 1);
	});

	it("begrenzt die Schriftgröße", () => {
		const resized = resizeObject(text(), "ne", { x: 0, y: 999 }, { keepAspect: true, snap: false });
		expect(resized).toMatchObject({ sizePt: MIN_FONT_PT, minSizePt: MIN_FONT_PT });
	});
});

describe("resizeGroup", () => {
	it("verteilt Positionen und Größen anteilig", () => {
		const objects = [image({ xMm: 0, yMm: 0, widthMm: 10, heightMm: 10 }), map({ xMm: 20, yMm: 0, widthMm: 20 })];
		const [first, second] = resizeGroup(objects, "e", { x: 40, y: 0 }, FREE);
		expect(first).toMatchObject({ xMm: 0, widthMm: 20 });
		expect(second).toMatchObject({ xMm: 40, widthMm: 40, heightMm: 55 });
	});

	it("skaliert Texte nur mit Umschalt mit", () => {
		const objects = [image({ xMm: 25, yMm: 120, widthMm: 160, heightMm: 20 }), text()];
		const plain = resizeGroup(objects, "s", { x: 0, y: 10 }, FREE)[1];
		expect(plain.kind === "text" && plain.sizePt).toBe(18);
		const scaled = resizeGroup(objects, "se", { x: 0, y: 50 }, { keepAspect: true, snap: false })[1];
		expect(scaled.kind === "text" && scaled.sizePt).toBeGreaterThan(18);
	});
});

describe("resizeSelection", () => {
	it("nutzt bei einem Objekt die Einzelregeln", () => {
		expect(resizeSelection([text()], "e", { x: -20, y: 0 }, FREE)[0]).toMatchObject({ widthMm: 140 });
	});
});

import { describe, expect, it } from "vitest";
import { image, text } from "$lib/testing/layoutObjects";
import { dragObjects, type ObjectDrag } from "./canvasDrag";

const plain = { alt: false, shift: false };

function drag(overrides: Partial<ObjectDrag> = {}): ObjectDrag {
	return { mode: "move", start: { x: 0, y: 0 }, objects: [image({ xMm: 88, yMm: 200 })], others: [], ...overrides };
}

describe("dragObjects", () => {
	it("verschiebt um den Weg seit dem Start und rastet auf Hilfslinien", () => {
		const frame = dragObjects(drag(), { x: 1, y: 0 }, plain, true);
		expect(frame.objects[0].xMm).toBe(90);
		expect(frame.guides).not.toEqual([]);
	});

	it("rastet ohne Hilfslinien-Schalter nur aufs Raster", () => {
		const frame = dragObjects(drag(), { x: 1.3, y: 0 }, plain, false);
		expect(frame.objects[0].xMm).toBe(89.5);
		expect(frame.guides).toEqual([]);
	});

	it("schaltet mit Alt Raster und Hilfslinien ab", () => {
		const frame = dragObjects(drag(), { x: 1.3, y: 0 }, { alt: true, shift: false }, true);
		expect(frame.objects[0].xMm).toBe(89.3);
		expect(frame.guides).toEqual([]);
	});

	it("skaliert über einen Anfasser, mit Umschalt im Seitenverhältnis", () => {
		const object = image({ xMm: 30, yMm: 250, widthMm: 30, heightMm: 20 });
		const frame = dragObjects(
			drag({ mode: "se", objects: [object] }),
			{ x: 15, y: 1 },
			{ alt: true, shift: true },
			true
		);
		expect(frame.objects[0]).toMatchObject({ widthMm: 45, heightMm: 30 });
	});

	it("skaliert Textschrift mit Umschalt an der Ecke", () => {
		const frame = dragObjects(
			drag({ mode: "ne", objects: [text()] }),
			{ x: 0, y: -5 },
			{ alt: false, shift: true },
			true
		);
		const resized = frame.objects[0];
		expect(resized.kind === "text" && resized.sizePt).toBeGreaterThan(18);
	});
});

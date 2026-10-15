import { describe, expect, it } from "vitest";
import { image, map, text } from "$lib/testing/layoutObjects";
import { hitBox } from "./editorOps";
import { PAGE_HEIGHT_MM, PAGE_WIDTH_MM } from "./layout";
import { alignObjects, alignsToPage, canDistribute, distributeObjects } from "./objectAlign";

describe("alignObjects", () => {
	it("richtet ein einzelnes Objekt an der Seite aus", () => {
		expect(alignObjects([image()], "right", "selection")[0].xMm).toBe(PAGE_WIDTH_MM - 30);
		expect(alignObjects([image()], "centerX", "selection")[0].xMm).toBe(90);
		expect(alignObjects([image()], "bottom", "page")[0].yMm).toBe(PAGE_HEIGHT_MM - 20);
		const top = alignObjects([text()], "top", "page")[0];
		expect(hitBox(top).yMm).toBeCloseTo(0, 1);
	});

	it("richtet mehrere Objekte an der gemeinsamen Box aus", () => {
		const aligned = alignObjects([image({ xMm: 30 }), map({ xMm: 100, widthMm: 50 })], "left", "selection");
		expect(aligned.map((object) => object.xMm)).toEqual([30, 30]);
		const right = alignObjects([image({ xMm: 30 }), map({ xMm: 100, widthMm: 50 })], "right", "selection");
		expect(right.map((object) => object.xMm + object.widthMm)).toEqual([150, 150]);
	});

	it("richtet mehrere Objekte auf Wunsch an der Seite aus", () => {
		const aligned = alignObjects([image({ xMm: 30 }), map({ xMm: 100 })], "left", "page");
		expect(aligned.map((object) => object.xMm)).toEqual([0, 0]);
	});

	it("bewegt eine Gruppe als Ganzes", () => {
		const group = [image({ xMm: 20, groupId: "g" }), map({ xMm: 100, widthMm: 50, groupId: "g" })];
		const aligned = alignObjects(group, "centerX", "selection");
		expect(aligned.map((object) => object.xMm)).toEqual([40, 120]);
	});
});

describe("alignsToPage", () => {
	it("gilt bei einer Einheit immer, sonst nach Wahl", () => {
		expect(alignsToPage([image()], "selection")).toBe(true);
		expect(alignsToPage([image(), map()], "selection")).toBe(false);
		expect(alignsToPage([image(), map()], "page")).toBe(true);
	});
});

describe("distributeObjects", () => {
	const blocks = [
		image({ id: "a", xMm: 10, widthMm: 20 }),
		image({ id: "c", xMm: 150, widthMm: 20 }),
		image({ id: "b", xMm: 40, widthMm: 40 })
	];

	it("verteilt ab drei Einheiten mit gleichen Abständen", () => {
		const distributed = distributeObjects(blocks, "x");
		expect(distributed.map((object) => [object.id, object.xMm])).toEqual([
			["a", 10],
			["c", 150],
			["b", 70]
		]);
	});

	it("lässt weniger als drei Einheiten unverändert", () => {
		expect(canDistribute(blocks.slice(0, 2))).toBe(false);
		expect(distributeObjects(blocks.slice(0, 2), "x")).toEqual(blocks.slice(0, 2));
	});
});

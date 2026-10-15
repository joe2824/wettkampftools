import { describe, expect, it } from "vitest";
import { image, layoutOf, map, text } from "$lib/testing/layoutObjects";
import {
	boxFromPoints,
	clickSelection,
	expandGroups,
	marqueeSelection,
	selectAll,
	selectedObjects,
	selectionBox,
	toggleSelection
} from "./objectSelection";

const objects = [
	text({ id: "title", yMm: 50 }),
	image({ id: "sig1", groupId: "g" }),
	image({ id: "sig2", slot: "signature2", xMm: 120, groupId: "g" }),
	map({ id: "map" }),
	text({ id: "member", yMm: 150, visibleWhen: "withMemberNames" })
];

describe("expandGroups", () => {
	it("nimmt alle Mitglieder einer Gruppe dazu, in Layout-Reihenfolge", () => {
		expect(expandGroups(objects, ["sig2", "title"])).toEqual(["title", "sig1", "sig2"]);
	});
});

describe("clickSelection", () => {
	const plain = { additive: false, single: false };

	it("wählt das angeklickte Objekt bzw. seine ganze Gruppe", () => {
		expect(clickSelection(objects, [], "title", plain)).toEqual(["title"]);
		expect(clickSelection(objects, [], "sig1", plain)).toEqual(["sig1", "sig2"]);
	});

	it("wählt mit Alt bzw. Doppelklick ein einzelnes Gruppenmitglied", () => {
		expect(clickSelection(objects, ["sig1", "sig2"], "sig1", { additive: false, single: true })).toEqual(["sig1"]);
	});

	it("behält eine Mehrfachauswahl beim Klick auf ein gewähltes Objekt (zum Ziehen)", () => {
		expect(clickSelection(objects, ["title", "map"], "map", plain)).toEqual(["title", "map"]);
	});

	it("fügt mit Umschalt hinzu und nimmt wieder heraus", () => {
		const added = clickSelection(objects, ["title"], "sig1", { additive: true, single: false });
		expect(added).toEqual(["title", "sig1", "sig2"]);
		expect(clickSelection(objects, added, "sig2", { additive: true, single: false })).toEqual(["title"]);
	});

	it("leert die Auswahl bei Klick ins Leere, außer mit Umschalt", () => {
		expect(clickSelection(objects, ["title"], null, plain)).toEqual([]);
		expect(clickSelection(objects, ["title"], null, { additive: true, single: false })).toEqual(["title"]);
	});
});

describe("marqueeSelection", () => {
	it("wählt sichtbare Objekte, die vollständig im Rahmen liegen, samt Gruppe", () => {
		const rect = boxFromPoints({ x: 200, y: 30 }, { x: 0, y: 260 });
		expect(marqueeSelection(objects, rect, false)).toEqual(["title", "map"]);
		const lower = boxFromPoints({ x: 0, y: 240 }, { x: 70, y: 280 });
		expect(marqueeSelection(objects, lower, false)).toEqual(["sig1", "sig2"]);
	});
});

describe("selectAll", () => {
	it("wählt alle sichtbaren Objekte", () => {
		expect(selectAll(objects, false)).toEqual(["title", "sig1", "sig2", "map"]);
		expect(selectAll(objects, true)).toHaveLength(5);
	});
});

describe("boxFromPoints", () => {
	it("ergibt ein Rechteck unabhängig von der Zugrichtung", () => {
		expect(boxFromPoints({ x: 10, y: 20 }, { x: 5, y: 30 })).toEqual({ xMm: 5, yMm: 20, widthMm: 5, heightMm: 10 });
	});
});

describe("selectedObjects und selectionBox", () => {
	it("liefert gewählte Objekte in Layout-Reihenfolge und ihre gemeinsame Box", () => {
		const chosen = selectedObjects(layoutOf(objects), ["sig2", "sig1", "unknown"]);
		expect(chosen.map((object) => object.id)).toEqual(["sig1", "sig2"]);
		expect(selectionBox(chosen)).toEqual({ xMm: 30, yMm: 250, widthMm: 120, heightMm: 20 });
		expect(selectionBox([])).toBeNull();
	});
});

describe("toggleSelection", () => {
	it("nimmt eine Einheit hinzu bzw. heraus", () => {
		expect(toggleSelection(objects, ["map"], ["title"])).toEqual(["title", "map"]);
		expect(toggleSelection(objects, ["title", "map"], ["title"])).toEqual(["map"]);
	});
});

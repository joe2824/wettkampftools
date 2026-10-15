import { describe, expect, it } from "vitest";
import { image, layoutOf, map, text } from "$lib/testing/layoutObjects";
import { PAGE_HEIGHT_MM } from "./layout";
import { defaultLayouts } from "./layoutDefaults";
import { parseLayoutSet, serializeLayoutSet } from "./layoutParse";
import {
	addSignature,
	addText,
	duplicateObjects,
	missingSignatureSlots,
	NEW_TEXT_TEMPLATE,
	removeObjects
} from "./layoutObjects";

describe("addText", () => {
	it("legt ein zentriertes Textfeld mit fortlaufender Bezeichnung an", () => {
		const first = addText(layoutOf([text()]));
		expect(first.ids).toEqual(["text-1"]);
		expect(first.layout.objects.at(-1)).toMatchObject({
			id: "text-1",
			label: "Text 1",
			template: NEW_TEXT_TEMPLATE,
			xMm: 25,
			widthMm: 160,
			yMm: PAGE_HEIGHT_MM / 2,
			align: "center",
			font: "regular",
			sizePt: 18,
			visibleWhen: "always"
		});
		const second = addText(first.layout, "{datum}");
		expect(second.layout.objects.at(-1)).toMatchObject({ id: "text-2", label: "Text 2", template: "{datum}" });
	});

	it("bleibt beim Speichern und Laden erhalten", () => {
		const layouts = defaultLayouts();
		const added = addText(addText(layouts.team).layout);
		const reloaded = parseLayoutSet(serializeLayoutSet({ ...layouts, team: added.layout }));
		expect(reloaded.issues).toEqual([]);
		expect(reloaded.layouts.team.objects).toHaveLength(layouts.team.objects.length + 2);
	});
});

describe("addSignature", () => {
	it("fügt eine fehlende Unterschrift an der Standardstelle ein", () => {
		const layout = layoutOf([text()]);
		expect(missingSignatureSlots(layout)).toEqual(["signature1", "signature2"]);
		const added = addSignature(layout, "signature2");
		expect(added?.ids).toEqual(["signature2"]);
		expect(missingSignatureSlots(added!.layout)).toEqual(["signature1"]);
	});

	it("fügt eine vorhandene Unterschrift nicht doppelt ein", () => {
		expect(addSignature(layoutOf([image()]), "signature1")).toBeNull();
	});
});

describe("removeObjects", () => {
	it("entfernt die gewählten Objekte und räumt Gruppen auf", () => {
		const layout = layoutOf([text({ id: "a", groupId: "g" }), text({ id: "b", groupId: "g" }), map()]);
		const removed = removeObjects(layout, ["a", "map"]);
		expect(removed.objects.map((object) => object.id)).toEqual(["b"]);
		expect(removed.objects[0].groupId).toBeUndefined();
	});
});

describe("duplicateObjects", () => {
	it("kopiert Texte 5 mm versetzt mit neuer Kennung", () => {
		const layout = layoutOf([text({ id: "a", label: "Titel", xMm: 20, widthMm: 100 })]);
		const copy = duplicateObjects(layout, ["a"]);
		expect(copy.ids).toEqual(["text-1"]);
		expect(copy.layout.objects[1]).toMatchObject({ id: "text-1", label: "Titel (Kopie)", xMm: 25, yMm: 105 });
	});

	it("kopiert Gruppen als neue Gruppe; Unterschriften und Karte gibt es nur einmal", () => {
		const layout = layoutOf([text({ id: "a", groupId: "g" }), text({ id: "b", groupId: "g" }), image(), map()]);
		const copy = duplicateObjects(layout, ["a", "b", "signature1", "map"]);
		expect(copy.ids).toHaveLength(2);
		const copies = copy.layout.objects.slice(4);
		expect(new Set(copies.map((object) => object.groupId)).size).toBe(1);
		expect(copies[0].groupId).not.toBe("g");
	});

	it("bremst Kopien am Seitenrand", () => {
		const layout = layoutOf([text({ id: "a", xMm: 50, widthMm: 160 })]);
		expect(duplicateObjects(layout, ["a"]).layout.objects[1].xMm).toBe(50);
	});
});

describe("addSignature mit belegter Kennung", () => {
	it("weicht auf eine freie Kennung aus", () => {
		const added = addSignature(layoutOf([text({ id: "signature1" })]), "signature1");
		expect(added?.ids).toEqual(["signature1-1"]);
	});
});

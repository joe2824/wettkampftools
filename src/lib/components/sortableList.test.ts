import { describe, expect, it } from "vitest";
import { addItem, moveItem, removeItem } from "./sortableList";

describe("moveItem", () => {
	it("verschiebt einen Eintrag nach hinten und vorne", () => {
		expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
		expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
	});

	it("ändert die Eingabeliste nicht", () => {
		const list = ["a", "b"];
		moveItem(list, 0, 1);
		expect(list).toEqual(["a", "b"]);
	});

	it("lässt die Liste bei ungültigen Positionen unverändert", () => {
		expect(moveItem(["a", "b"], -1, 0)).toEqual(["a", "b"]);
		expect(moveItem(["a", "b"], 0, 2)).toEqual(["a", "b"]);
	});
});

describe("addItem", () => {
	it("hängt den bereinigten Wert an", () => {
		expect(addItem(["AK 12"], "  AK Offen ")).toEqual({ list: ["AK 12", "AK Offen"] });
	});

	it("lehnt leere Werte ab", () => {
		expect(addItem(["AK 12"], "   ")).toEqual({ list: ["AK 12"], error: "Bitte einen Eintrag eingeben." });
	});

	it("lehnt Doppelte unabhängig von Groß-/Kleinschreibung ab", () => {
		expect(addItem(["AK Offen"], "ak offen")).toEqual({
			list: ["AK Offen"],
			error: "„ak offen“ ist schon in der Liste."
		});
	});
});

describe("removeItem", () => {
	it("entfernt den Eintrag an der Position", () => {
		expect(removeItem(["a", "b", "c"], 1)).toEqual(["a", "c"]);
	});

	it("lässt die Liste bei ungültiger Position unverändert", () => {
		expect(removeItem(["a"], 3)).toEqual(["a"]);
	});
});

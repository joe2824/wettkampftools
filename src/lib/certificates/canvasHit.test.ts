import { describe, expect, it } from "vitest";
import { image, text } from "$lib/testing/layoutObjects";
import { hitBox } from "./editorOps";
import {
	TEXT_HIT_MARGIN_MM,
	marqueeEnd,
	marqueePreview,
	pickBox,
	pickObjectAt,
	pointerStart,
	type TextSpans
} from "./canvasHit";

// Text „name“: Rahmen 25–185 mm, gezeichnet nur 90–120 mm; „empty“ ohne Inhalt.
const name = text({ id: "name", yMm: 100 });
const empty = text({ id: "empty", yMm: 150 });
const sig = image({ id: "sig", groupId: "g" });
const sig2 = image({ id: "sig2", xMm: 120, groupId: "g" });
const objects = [name, empty, sig, sig2];
const spans: TextSpans = new Map([["name", { xMm: 90, widthMm: 30 }]]);
const plain = { additive: false, single: false };

describe("pickBox", () => {
	it("trifft Texte nur am gezeichneten Text plus Rand, mit voller Höhe", () => {
		const frame = hitBox(name);
		expect(pickBox(name, spans, false)).toEqual({
			xMm: 90 - TEXT_HIT_MARGIN_MM,
			yMm: frame.yMm,
			widthMm: 30 + 2 * TEXT_HIT_MARGIN_MM,
			heightMm: frame.heightMm
		});
	});

	it("macht leere Texte nur gewählt über den Rahmen greifbar", () => {
		expect(pickBox(empty, spans, false)).toBeNull();
		expect(pickBox(empty, spans, true)).toEqual(hitBox(empty));
	});

	it("nimmt ohne geladene Schriften und für Bilder den Rahmen", () => {
		expect(pickBox(name, null, false)).toEqual(hitBox(name));
		expect(pickBox(sig, spans, false)).toEqual(hitBox(sig));
	});
});

describe("pickObjectAt", () => {
	it("trifft den Text, aber nicht die freie Fläche daneben im Rahmen", () => {
		expect(pickObjectAt(objects, { x: 100, y: 98 }, true, spans, [])?.id).toBe("name");
		expect(pickObjectAt(objects, { x: 40, y: 98 }, true, spans, [])).toBeNull();
		expect(pickObjectAt(objects, { x: 40, y: 98 }, true, spans, ["name"])).toBeNull();
	});

	it("trifft leere Texte nur, wenn sie gewählt sind", () => {
		expect(pickObjectAt(objects, { x: 40, y: 148 }, true, spans, [])).toBeNull();
		expect(pickObjectAt(objects, { x: 40, y: 148 }, true, spans, ["empty"])?.id).toBe("empty");
	});
});

describe("pointerStart", () => {
	it("zieht auf einem Objekt und wählt es samt Gruppe", () => {
		expect(pointerStart(objects, [], "sig", plain)).toEqual({ kind: "drag", ids: ["sig", "sig2"] });
	});

	it("zieht eine bestehende Mehrfachauswahl gemeinsam", () => {
		expect(pointerStart(objects, ["name", "sig", "sig2"], "name", plain)).toEqual({
			kind: "drag",
			ids: ["name", "sig", "sig2"]
		});
	});

	it("zieht auf freier Fläche einen neuen Rahmen auf", () => {
		expect(pointerStart(objects, ["name"], null, plain)).toEqual({ kind: "marquee", base: [] });
	});

	it("zieht mit Umschalt oder Strg/⌘ immer einen Rahmen auf und behält die Auswahl", () => {
		const additive = { additive: true, single: false };
		expect(pointerStart(objects, ["name"], "sig", additive)).toEqual({ kind: "marquee", base: ["name"] });
		expect(pointerStart(objects, ["name"], null, additive)).toEqual({ kind: "marquee", base: ["name"] });
	});
});

describe("marqueeEnd", () => {
	const click = { xMm: 40, yMm: 98, widthMm: 0.2, heightMm: 0.1 };

	it("hebt bei einem Klick auf freie Fläche die Auswahl auf", () => {
		expect(marqueeEnd(objects, { base: [], hitId: null, mode: plain }, click, true, spans)).toEqual([]);
	});

	it("schaltet bei Umschalt-Klick ohne Ziehen das Objekt um", () => {
		const mode = { additive: true, single: false };
		expect(marqueeEnd(objects, { base: ["name"], hitId: "sig", mode }, click, true, spans)).toEqual([
			"name",
			"sig",
			"sig2"
		]);
		expect(marqueeEnd(objects, { base: ["name"], hitId: "name", mode }, click, true, spans)).toEqual([]);
	});

	it("wählt Textzeilen, deren gezeichneter Text ganz im Rahmen liegt", () => {
		const rect = { xMm: 85, yMm: 90, widthMm: 40, heightMm: 15 };
		expect(marqueeEnd(objects, { base: [], hitId: null, mode: plain }, rect, true, spans)).toEqual(["name"]);
	});

	it("addiert zur bisherigen Auswahl", () => {
		const rect = { xMm: 85, yMm: 90, widthMm: 40, heightMm: 15 };
		const start = { base: ["sig", "sig2"], hitId: null, mode: { additive: true, single: false } };
		expect(marqueeEnd(objects, start, rect, true, spans)).toEqual(["name", "sig", "sig2"]);
	});
});

describe("marqueePreview", () => {
	it("nennt die Objekte, die der Rahmen gerade erfassen würde", () => {
		const rect = { xMm: 85, yMm: 90, widthMm: 40, heightMm: 15 };
		expect(marqueePreview(objects, rect, true, spans)).toEqual(["name"]);
		expect(marqueePreview(objects, { xMm: 0, yMm: 0, widthMm: 1, heightMm: 1 }, true, spans)).toEqual([]);
	});
});

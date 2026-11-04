// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { DEFAULT_FONT_SCALE, fontScaleShortcut, parseFontScale, stepFontScale } from "./fontScale";

const key = (init: KeyboardEventInit) => new KeyboardEvent("keydown", init);

describe("stepFontScale", () => {
	it("geht stufenweise und bleibt an den Grenzen stehen", () => {
		expect(stepFontScale(100, "larger")).toBe(110);
		expect(stepFontScale(100, "smaller")).toBe(90);
		expect(stepFontScale(150, "larger")).toBe(150);
		expect(stepFontScale(80, "smaller")).toBe(80);
		expect(stepFontScale(125, "reset")).toBe(DEFAULT_FONT_SCALE);
	});

	it("rastet krumme Werte auf die nächste Stufe ein", () => {
		expect(stepFontScale(112, "larger")).toBe(125);
	});
});

describe("parseFontScale", () => {
	it("nimmt nur bekannte Stufen", () => {
		expect(parseFontScale("125")).toBe(125);
		expect(parseFontScale("117")).toBe(DEFAULT_FONT_SCALE);
		expect(parseFontScale(null)).toBe(DEFAULT_FONT_SCALE);
	});
});

describe("fontScaleShortcut", () => {
	it("erkennt Strg mit Plus, Minus und Null unter Windows", () => {
		expect(fontScaleShortcut(key({ key: "+", ctrlKey: true }), false)).toBe("larger");
		expect(fontScaleShortcut(key({ key: "+", ctrlKey: true, shiftKey: true }), false)).toBe("larger");
		expect(fontScaleShortcut(key({ key: "-", ctrlKey: true }), false)).toBe("smaller");
		expect(fontScaleShortcut(key({ key: "0", ctrlKey: true }), false)).toBe("reset");
	});

	it("nutzt ⌘ auf dem Mac und ignoriert Tasten ohne Befehlstaste", () => {
		expect(fontScaleShortcut(key({ key: "=", metaKey: true }), true)).toBe("larger");
		expect(fontScaleShortcut(key({ key: "+", ctrlKey: true }), true)).toBeNull();
		expect(fontScaleShortcut(key({ key: "+" }), false)).toBeNull();
		expect(fontScaleShortcut(key({ key: "+", ctrlKey: true, altKey: true }), false)).toBeNull();
	});
});

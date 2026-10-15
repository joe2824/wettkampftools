// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { fileShortcut, hasOpenDialog, isApplePlatform, shortcutLabel } from "./fileShortcuts";

const key = (init: Partial<KeyboardEventInit>) => new KeyboardEvent("keydown", init);

describe("isApplePlatform", () => {
	it("erkennt Mac", () => {
		expect(isApplePlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe(true);
	});

	it("Windows ist kein Mac", () => {
		expect(isApplePlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(false);
	});
});

describe("shortcutLabel", () => {
	it("zeigt ⌘ auf dem Mac", () => {
		expect(shortcutLabel("save", true)).toBe("⌘S");
	});

	it("zeigt Strg unter Windows", () => {
		expect(shortcutLabel("open", false)).toBe("Strg+O");
		expect(shortcutLabel("new", false)).toBe("Strg+N");
	});
});

describe("fileShortcut", () => {
	it("Strg+S speichert unter Windows", () => {
		expect(fileShortcut(key({ key: "s", ctrlKey: true }), false)).toBe("save");
	});

	it("⌘O öffnet auf dem Mac, auch mit Feststelltaste", () => {
		expect(fileShortcut(key({ key: "O", metaKey: true }), true)).toBe("open");
	});

	it("⌘N beginnt einen neuen Wettkampf", () => {
		expect(fileShortcut(key({ key: "n", metaKey: true }), true)).toBe("new");
	});

	it("Strg auf dem Mac zählt nicht", () => {
		expect(fileShortcut(key({ key: "s", ctrlKey: true }), true)).toBeNull();
	});

	it("Umschalt oder Alt dazu zählt nicht", () => {
		expect(fileShortcut(key({ key: "s", ctrlKey: true, shiftKey: true }), false)).toBeNull();
		expect(fileShortcut(key({ key: "s", ctrlKey: true, altKey: true }), false)).toBeNull();
	});

	it("andere Tasten zählen nicht", () => {
		expect(fileShortcut(key({ key: "z", ctrlKey: true }), false)).toBeNull();
		expect(fileShortcut(key({ key: "s" }), false)).toBeNull();
	});

	it("gedrückt gehaltene Tasten lösen nicht wiederholt aus", () => {
		expect(fileShortcut(key({ key: "s", ctrlKey: true, repeat: true }), false)).toBeNull();
	});
});

describe("hasOpenDialog", () => {
	it("ohne Dialog nein", () => {
		document.body.innerHTML = "<main><input /></main>";
		expect(hasOpenDialog(document)).toBe(false);
	});

	it("mit Dialog oder Rückfrage ja", () => {
		document.body.innerHTML = '<div role="dialog"></div>';
		expect(hasOpenDialog(document)).toBe(true);
		document.body.innerHTML = '<div role="alertdialog"></div>';
		expect(hasOpenDialog(document)).toBe(true);
	});
});

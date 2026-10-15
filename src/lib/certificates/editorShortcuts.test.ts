import { describe, expect, it } from "vitest";
import { editorShortcut, type KeyPress } from "./editorShortcuts";

const press = (key: string, modifiers: Partial<KeyPress> = {}): KeyPress => ({
	key,
	shiftKey: false,
	altKey: false,
	ctrlKey: false,
	metaKey: false,
	...modifiers
});

describe("editorShortcut", () => {
	it("erkennt Löschen, Abwählen und Pfeiltasten", () => {
		expect(editorShortcut(press("Delete"), false)).toEqual({ kind: "delete" });
		expect(editorShortcut(press("Backspace"), true)).toEqual({ kind: "delete" });
		expect(editorShortcut(press("Escape"), false)).toEqual({ kind: "deselect" });
		expect(editorShortcut(press("ArrowLeft", { shiftKey: true }), false)).toEqual({
			kind: "nudge",
			delta: { x: -5, y: 0 }
		});
	});

	it("nutzt Strg unter Windows und ⌘ auf dem Mac", () => {
		expect(editorShortcut(press("d", { ctrlKey: true }), false)).toEqual({ kind: "duplicate" });
		expect(editorShortcut(press("d", { metaKey: true }), true)).toEqual({ kind: "duplicate" });
		expect(editorShortcut(press("d", { metaKey: true }), false)).toBeNull();
		expect(editorShortcut(press("a", { ctrlKey: true }), false)).toEqual({ kind: "selectAll" });
		expect(editorShortcut(press("g", { ctrlKey: true }), false)).toEqual({ kind: "group" });
		expect(editorShortcut(press("G", { ctrlKey: true, shiftKey: true }), false)).toEqual({ kind: "ungroup" });
	});

	it("ignoriert andere Tasten", () => {
		expect(editorShortcut(press("x"), false)).toBeNull();
		expect(editorShortcut(press("z", { ctrlKey: true }), false)).toBeNull();
	});
});

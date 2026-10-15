// Tasten auf der Zeichenfläche des Layout-Editors; Strg unter Windows, ⌘ auf dem Mac.
import { nudgeDelta, type DeltaMm } from "./editorOps";

export type EditorShortcut =
	{ kind: "deselect" | "delete" | "duplicate" | "selectAll" | "group" | "ungroup" } | { kind: "nudge"; delta: DeltaMm };

export interface KeyPress {
	key: string;
	shiftKey: boolean;
	altKey: boolean;
	ctrlKey: boolean;
	metaKey: boolean;
}

const COMMANDS: Record<string, EditorShortcut["kind"]> = { d: "duplicate", a: "selectAll", g: "group" };

function commandShortcut(press: KeyPress): EditorShortcut | null {
	const key = press.key.toLowerCase();
	if (key === "g" && press.shiftKey) return { kind: "ungroup" };
	const kind = press.shiftKey ? undefined : COMMANDS[key];
	return kind === undefined ? null : ({ kind } as EditorShortcut);
}

export function editorShortcut(press: KeyPress, apple: boolean): EditorShortcut | null {
	const command = apple ? press.metaKey && !press.ctrlKey : press.ctrlKey && !press.metaKey;
	if (command && !press.altKey) return commandShortcut(press);
	if (press.ctrlKey || press.metaKey) return null;
	if (press.key === "Escape") return { kind: "deselect" };
	if (press.key === "Delete" || press.key === "Backspace") return { kind: "delete" };
	const delta = nudgeDelta(press.key, press.shiftKey);
	return delta ? { kind: "nudge", delta } : null;
}

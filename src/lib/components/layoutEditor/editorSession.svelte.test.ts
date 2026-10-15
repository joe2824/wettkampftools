// @vitest-environment happy-dom
import { flushSync } from "svelte";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { gestureKey } from "$lib/certificates/editHistory";
import { moveObjects } from "$lib/certificates/editorOps";
import { defaultLayouts } from "$lib/certificates/layoutDefaults";
import { LayoutStore } from "$lib/certificates/layoutStore.svelte";
import { LayoutEditorSession } from "./editorSession.svelte";

let store: LayoutStore;
let session: LayoutEditorSession;
let cleanup: () => void;

beforeEach(() => {
	store = new LayoutStore();
	cleanup = $effect.root(() => {
		session = new LayoutEditorSession(store);
	});
	flushSync();
});

afterEach(() => cleanup());

const ids = () => store.layouts.team.objects.map((object) => object.id);

describe("LayoutEditorSession", () => {
	it("holt entfernte Elemente mit Rückgängig zurück", () => {
		const before = ids();
		session.select([before[0], before[1]]);
		session.remove();
		flushSync();
		expect(ids()).toEqual(before.slice(2));
		expect(session.selectedIds).toEqual([]);
		session.undo();
		flushSync();
		expect(ids()).toEqual(before);
	});

	it("wählt neue Elemente aus; Rückgängig entfernt sie wieder", () => {
		const before = ids();
		session.addText();
		flushSync();
		expect(session.selectedIds).toEqual(["text-1"]);
		session.undo();
		flushSync();
		expect(ids()).toEqual(before);
		expect(session.selectedIds).toEqual([]);
	});

	it("macht aus einer ganzen Ziehbewegung einen Schritt", () => {
		const original = store.layouts.team.objects[0];
		session.select([original.id]);
		for (let step = 1; step <= 20; step += 1) {
			session.commitObjects(moveObjects([original], { x: step, y: 0 }, false), gestureKey(1));
			flushSync();
		}
		expect(session.history.past).toHaveLength(1);
		session.undo();
		flushSync();
		expect(store.layouts.team.objects[0]).toEqual(original);
	});

	it("macht jede Aktion zu einem eigenen Schritt", () => {
		session.select(ids().slice(0, 2));
		session.group();
		flushSync();
		session.align("left", "page");
		flushSync();
		expect(session.history.past).toHaveLength(2);
		expect(session.canUndo).toBe(true);
		session.undo();
		flushSync();
		session.undo();
		flushSync();
		expect(store.layouts.team).toEqual(defaultLayouts().team);
		expect(session.canRedo).toBe(true);
	});

	it("beginnt einen neuen Verlauf, wenn das Layout von außen ersetzt wird", () => {
		session.select(ids().slice(0, 1));
		session.remove();
		flushSync();
		expect(session.canUndo).toBe(true);
		const replacement = defaultLayouts();
		replacement.team.objects = [];
		store.replaceLayouts(replacement);
		flushSync();
		expect(session.canUndo).toBe(false);
		expect(session.canRedo).toBe(false);
		expect(session.selectedIds).toEqual([]);
		session.undo();
		flushSync();
		expect(store.layouts.team.objects).toEqual([]);
	});

	it("merkt Änderungen nach dem Ersetzen wieder für Rückgängig", () => {
		store.replaceLayouts(defaultLayouts());
		flushSync();
		const before = ids();
		session.select([before[0]]);
		session.remove();
		flushSync();
		session.undo();
		flushSync();
		expect(ids()).toEqual(before);
	});
});

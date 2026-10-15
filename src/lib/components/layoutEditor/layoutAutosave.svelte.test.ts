// @vitest-environment happy-dom
import { flushSync } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultLayouts } from "$lib/certificates/layoutDefaults";
import { LAYOUT_FILE, LayoutStore } from "$lib/certificates/layoutStore.svelte";
import { logError } from "$lib/log";
import { flushPendingSaves, pendingSaveCount } from "$lib/pendingSaves";
import { resetAppDataStore, setAppDataStore } from "$lib/platform/fs";
import { createFakeStore, type FakeStore } from "$lib/testing/fakeFs";
import { LayoutEditorSession } from "./editorSession.svelte";
import { LAYOUT_AUTOSAVE_DELAY_MS, LayoutAutosave } from "./layoutAutosave.svelte";

vi.mock("$lib/log", async (original) => ({ ...(await original<typeof import("$lib/log")>()), logError: vi.fn() }));

let fs: FakeStore;
let store: LayoutStore;
let session: LayoutEditorSession;
let autosave: LayoutAutosave;
let destroy: () => void;

const savedTeamIds = (): string[] => {
	const raw = JSON.parse(new TextDecoder().decode(fs.files.get(LAYOUT_FILE)));
	return raw.team.objects.map((object: { id: string }) => object.id);
};
const teamIds = () => store.layouts.team.objects.map((object) => object.id);

beforeEach(() => {
	vi.useFakeTimers();
	fs = createFakeStore();
	setAppDataStore(fs);
	store = new LayoutStore();
	destroy = $effect.root(() => {
		session = new LayoutEditorSession(store);
		autosave = new LayoutAutosave(store);
	});
	flushSync();
});

afterEach(() => {
	destroy();
	resetAppDataStore();
	vi.useRealTimers();
});

function removeFirst(): void {
	session.select([teamIds()[0]]);
	session.remove();
	flushSync();
}

describe("LayoutAutosave", () => {
	it("speichert ohne Änderung nichts", async () => {
		await vi.advanceTimersByTimeAsync(LAYOUT_AUTOSAVE_DELAY_MS);
		expect(fs.files.has(LAYOUT_FILE)).toBe(false);
		expect(autosave.status).toBe("idle");
	});

	it("schreibt schnelle Änderungen einmal nach der Pause", async () => {
		const write = vi.spyOn(fs, "writeText");
		removeFirst();
		removeFirst();
		expect(autosave.status).toBe("pending");
		await vi.advanceTimersByTimeAsync(LAYOUT_AUTOSAVE_DELAY_MS);
		await autosave.idle();
		expect(write).toHaveBeenCalledTimes(1);
		expect(savedTeamIds()).toEqual(teamIds());
		expect(autosave.status).toBe("saved");
	});

	it("speichert Ausstehendes beim Verlassen der Seite", async () => {
		removeFirst();
		destroy();
		destroy = () => undefined;
		await autosave.idle();
		expect(savedTeamIds()).toEqual(teamIds());
	});

	it("speichert auch das Ergebnis von Rückgängig", async () => {
		const before = teamIds();
		removeFirst();
		await autosave.flush();
		session.undo();
		flushSync();
		await vi.advanceTimersByTimeAsync(LAYOUT_AUTOSAVE_DELAY_MS);
		await autosave.idle();
		expect(savedTeamIds()).toEqual(before);
	});

	it("speichert Zurücksetzen und Import", async () => {
		removeFirst();
		store.resetVariant("team");
		flushSync();
		await autosave.flush();
		expect(savedTeamIds()).toEqual(defaultLayouts().team.objects.map((object) => object.id));
		removeFirst();
		const exported = store.exportLayoutJson();
		store.resetVariant("team");
		flushSync();
		await autosave.flush();
		store.importLayoutJson(exported);
		flushSync();
		await autosave.flush();
		expect(savedTeamIds()).toEqual(teamIds());
		expect(savedTeamIds()).not.toEqual(defaultLayouts().team.objects.map((object) => object.id));
	});

	it("meldet einen Fehler", async () => {
		vi.spyOn(fs, "writeText").mockRejectedValue(new Error("voll"));
		removeFirst();
		await autosave.flush();
		expect(autosave.status).toBe("failed");
		expect(logError).toHaveBeenCalledWith("layout.saveFailed");
	});

	it("schreibt beim Schließen des Fensters sofort und meldet sich danach ab", async () => {
		removeFirst();
		expect(pendingSaveCount()).toBe(1);
		await flushPendingSaves();
		expect(savedTeamIds()).toEqual(teamIds());
		expect(pendingSaveCount()).toBe(0);
	});
});

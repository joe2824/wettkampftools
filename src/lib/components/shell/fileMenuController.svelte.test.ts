import { describe, expect, it, vi } from "vitest";
import type { ReadFileResult } from "$lib/components/fileCheck";
import { FileMenuController, type FileMenuDeps } from "./fileMenuController.svelte";

const PROJECT_BYTES = new Uint8Array([1, 2, 3]);

function projectFile(): ReadFileResult {
	return {
		ok: true,
		file: { name: "Wettkampf.wwkprojekt", bytes: PROJECT_BYTES, kind: "project", createdMs: null, modifiedMs: 0 }
	};
}

function setup(overrides: Partial<FileMenuDeps> = {}) {
	const deps: FileMenuDeps = {
		native: () => true,
		pickNative: vi.fn(async () => projectFile()),
		pickInBrowser: vi.fn(),
		requestOpen: vi.fn(),
		openBusy: () => false,
		canStartNew: () => true,
		onerror: vi.fn(),
		...overrides
	};
	return { deps, menu: new FileMenuController(deps) };
}

describe("FileMenuController", () => {
	it("Speichern öffnet den Speichern-Dialog", async () => {
		const { menu } = setup();
		await menu.run("save");
		expect(menu.saveOpen).toBe(true);
	});

	it("Neuer Wettkampf fragt erst nach", async () => {
		const { menu } = setup();
		await menu.run("new");
		expect(menu.newOpen).toBe(true);
	});

	it("ohne geladene Dateien gibt es keinen neuen Wettkampf", async () => {
		const { menu } = setup({ canStartNew: () => false });
		await menu.run("new");
		expect(menu.newOpen).toBe(false);
	});

	it("Öffnen wählt in der Desktop-Hülle eine Projektdatei und fragt nach", async () => {
		const { deps, menu } = setup();
		await menu.run("open");
		expect(deps.pickNative).toHaveBeenCalledOnce();
		expect(deps.requestOpen).toHaveBeenCalledWith(PROJECT_BYTES);
	});

	it("Abbruch im Öffnen-Dialog ändert nichts", async () => {
		const { deps, menu } = setup({ pickNative: vi.fn(async () => null) });
		await menu.run("open");
		expect(deps.requestOpen).not.toHaveBeenCalled();
		expect(deps.onerror).not.toHaveBeenCalled();
	});

	it("eine unpassende Datei meldet den Fehler", async () => {
		const { deps, menu } = setup({
			pickNative: vi.fn(async () => ({ ok: false, message: "Falsche Datei." }) as const)
		});
		await menu.run("open");
		expect(deps.onerror).toHaveBeenCalledWith("Falsche Datei.");
		expect(deps.requestOpen).not.toHaveBeenCalled();
	});

	it("im Browser übernimmt die Dateiauswahl", async () => {
		const { deps, menu } = setup({ native: () => false });
		await menu.run("open");
		expect(deps.pickInBrowser).toHaveBeenCalledOnce();
		expect(deps.pickNative).not.toHaveBeenCalled();
	});

	it("während ein Projekt geöffnet wird, startet kein zweites", async () => {
		const { deps, menu } = setup({ openBusy: () => true });
		await menu.run("open");
		expect(deps.pickNative).not.toHaveBeenCalled();
	});

	it("eine im Browser gewählte Datei wird ebenso übernommen", () => {
		const { deps, menu } = setup();
		menu.take(projectFile());
		expect(deps.requestOpen).toHaveBeenCalledWith(PROJECT_BYTES);
	});
});

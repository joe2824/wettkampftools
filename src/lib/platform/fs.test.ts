import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fsMock = vi.hoisted(() => ({
	exists: vi.fn(),
	mkdir: vi.fn(),
	readTextFile: vi.fn(),
	readFile: vi.fn(),
	writeTextFile: vi.fn(),
	writeFile: vi.fn(),
	remove: vi.fn(),
	readDir: vi.fn()
}));

vi.mock("@tauri-apps/plugin-fs", () => ({ BaseDirectory: { AppData: 14 }, ...fsMock }));

import { appDataStore, readJson, resetAppDataStore, setAppDataStore, tauriStore, writeJson } from "./fs";
import { createFakeStore } from "$lib/testing/fakeFs";

describe("Fake-Ablage", () => {
	beforeEach(() => setAppDataStore(createFakeStore()));
	afterEach(() => resetAppDataStore());

	it("schreibt und liest Text", async () => {
		const store = appDataStore();
		await store.writeText("data/a.txt", "Grüße");
		expect(await store.readText("data/a.txt")).toBe("Grüße");
		expect(await store.exists("data/a.txt")).toBe(true);
	});

	it("schreibt und liest Bytes", async () => {
		const store = appDataStore();
		await store.writeBytes("bilder/scan.png", new Uint8Array([1, 2, 3]));
		expect(await store.readBytes("bilder/scan.png")).toEqual(new Uint8Array([1, 2, 3]));
	});

	it("liefert null für fehlende Dateien", async () => {
		const store = appDataStore();
		expect(await store.readText("fehlt.txt")).toBeNull();
		expect(await store.readBytes("fehlt.bin")).toBeNull();
		expect(await store.exists("fehlt.txt")).toBe(false);
	});

	it("hängt Text an", async () => {
		const store = appDataStore();
		await store.appendText("logs/a.log", "eins\n");
		await store.appendText("logs/a.log", "zwei\n");
		expect(await store.readText("logs/a.log")).toBe("eins\nzwei\n");
	});

	it("löscht und verträgt fehlende Dateien", async () => {
		const store = appDataStore();
		await store.writeText("a.txt", "x");
		await store.remove("a.txt");
		await store.remove("a.txt");
		expect(await store.exists("a.txt")).toBe(false);
	});

	it("listet nur die eigene Ebene", async () => {
		const store = appDataStore();
		await store.writeText("logs/a.log", "");
		await store.writeText("logs/b.log", "");
		await store.writeText("logs/alt/c.log", "");
		await store.writeText("andere.txt", "");
		expect((await store.list("logs")).sort()).toEqual(["a.log", "b.log"]);
		expect(await store.list("leer")).toEqual([]);
	});
});

describe("JSON-Helfer", () => {
	beforeEach(() => setAppDataStore(createFakeStore()));
	afterEach(() => resetAppDataStore());

	const asCount = (raw: unknown): { count: number } | null =>
		typeof raw === "object" && raw !== null && typeof (raw as { count?: unknown }).count === "number"
			? { count: (raw as { count: number }).count }
			: null;

	it("schreibt und liest validiert zurück", async () => {
		await writeJson("settings.json", { count: 3 });
		expect(await readJson("settings.json", asCount)).toEqual({ count: 3 });
	});

	it("gibt null bei fehlender Datei", async () => {
		expect(await readJson("settings.json", asCount)).toBeNull();
	});

	it("gibt null bei kaputtem JSON", async () => {
		await appDataStore().writeText("settings.json", "{kaputt");
		expect(await readJson("settings.json", asCount)).toBeNull();
	});

	it("gibt null, wenn die Prüfung ablehnt", async () => {
		await writeJson("settings.json", { count: "drei" });
		expect(await readJson("settings.json", asCount)).toBeNull();
	});

	it("gibt null, wenn die Prüfung wirft", async () => {
		await writeJson("settings.json", { count: 1 });
		const throwing = (): never => {
			throw new Error("ungültig");
		};
		expect(await readJson("settings.json", throwing)).toBeNull();
	});
});

describe("Tauri-Ablage", () => {
	const opts = { baseDir: 14 };

	beforeEach(() => {
		Object.values(fsMock).forEach((fn) => fn.mockReset());
	});

	it("legt vor dem Schreiben den Ordner an", async () => {
		await tauriStore.writeText("logs/a.log", "x");
		expect(fsMock.mkdir).toHaveBeenCalledWith("logs", { ...opts, recursive: true });
		expect(fsMock.writeTextFile).toHaveBeenCalledWith("logs/a.log", "x", opts);
	});

	it("legt für Dateien direkt im Datenordner diesen selbst an", async () => {
		await tauriStore.writeBytes("a.bin", new Uint8Array([1]));
		expect(fsMock.mkdir).toHaveBeenCalledWith("", { ...opts, recursive: true });
		expect(fsMock.writeFile).toHaveBeenCalledWith("a.bin", new Uint8Array([1]), opts);
	});

	it("hängt an", async () => {
		await tauriStore.appendText("logs/a.log", "x");
		expect(fsMock.writeTextFile).toHaveBeenCalledWith("logs/a.log", "x", { ...opts, append: true });
	});

	it("liest nur, was es gibt", async () => {
		fsMock.exists.mockResolvedValue(false);
		expect(await tauriStore.readText("a.txt")).toBeNull();
		expect(await tauriStore.readBytes("a.bin")).toBeNull();
		expect(fsMock.readTextFile).not.toHaveBeenCalled();

		fsMock.exists.mockResolvedValue(true);
		fsMock.readTextFile.mockResolvedValue("inhalt");
		fsMock.readFile.mockResolvedValue(new Uint8Array([7]));
		expect(await tauriStore.readText("a.txt")).toBe("inhalt");
		expect(await tauriStore.readBytes("a.bin")).toEqual(new Uint8Array([7]));
	});

	it("löscht nur Vorhandenes", async () => {
		fsMock.exists.mockResolvedValue(false);
		await tauriStore.remove("a.txt");
		expect(fsMock.remove).not.toHaveBeenCalled();
		fsMock.exists.mockResolvedValue(true);
		await tauriStore.remove("a.txt");
		expect(fsMock.remove).toHaveBeenCalledWith("a.txt", opts);
	});

	it("listet nur Dateien", async () => {
		fsMock.exists.mockResolvedValue(true);
		fsMock.readDir.mockResolvedValue([
			{ name: "a.log", isFile: true, isDirectory: false, isSymlink: false },
			{ name: "alt", isFile: false, isDirectory: true, isSymlink: false }
		]);
		expect(await tauriStore.list("logs")).toEqual(["a.log"]);
		fsMock.exists.mockResolvedValue(false);
		expect(await tauriStore.list("logs")).toEqual([]);
	});
});

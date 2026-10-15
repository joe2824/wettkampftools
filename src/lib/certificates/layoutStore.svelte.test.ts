import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFakeStore, type FakeStore } from "$lib/testing/fakeFs";
import { resetAppDataStore, setAppDataStore } from "$lib/platform/fs";
import { defaultLayouts } from "./layoutDefaults";
import { detectImageType, LAYOUT_FILE, LayoutStore } from "./layoutStore.svelte";

let fs: FakeStore;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 4, 5, 6]);
const gif = encoder.encode("GIF89a....");

beforeEach(() => {
	fs = createFakeStore();
	setAppDataStore(fs);
});

afterEach(() => resetAppDataStore());

describe("detectImageType", () => {
	it("erkennt PNG und JPEG an den ersten Bytes", () => {
		expect(detectImageType(png)).toBe("png");
		expect(detectImageType(jpg)).toBe("jpg");
		expect(detectImageType(gif)).toBeNull();
		expect(detectImageType(new Uint8Array())).toBeNull();
	});
});

describe("LayoutStore Layouts", () => {
	it("nutzt Standard bei fehlender oder kaputter Datei", async () => {
		const store = new LayoutStore();
		await store.load();
		expect(store.layouts).toEqual(defaultLayouts());
		fs.files.set(LAYOUT_FILE, encoder.encode("{kaputt"));
		await store.load();
		expect(store.layouts).toEqual(defaultLayouts());
		fs.files.set(LAYOUT_FILE, encoder.encode("42"));
		await store.load();
		expect(store.layouts).toEqual(defaultLayouts());
	});

	it("legt eine unlesbare Datei beiseite", async () => {
		fs.files.set(LAYOUT_FILE, encoder.encode("42"));
		const store = new LayoutStore();
		await store.load();
		expect(store.setAside).toEqual([expect.stringMatching(/^layout\.json\.unreadable-\d{8}-\d{6}$/)]);
		expect(decoder.decode(fs.files.get(store.setAside[0]))).toBe("42");
		expect(fs.files.has(LAYOUT_FILE)).toBe(false);
		await store.load();
		expect(store.setAside).toEqual([]);
	});

	it("speichert und lädt wieder", async () => {
		const store = new LayoutStore();
		store.layouts.team.objects[0].xMm = 33;
		await store.save();
		const reloaded = new LayoutStore();
		await reloaded.load();
		expect(reloaded.layouts.team.objects[0].xMm).toBe(33);
	});

	it("setzt eine Variante zurück", () => {
		const store = new LayoutStore();
		store.layouts.team.objects[0].xMm = 33;
		store.layouts.individual.objects[0].xMm = 44;
		store.resetVariant("team");
		expect(store.layouts.team).toEqual(defaultLayouts().team);
		expect(store.layouts.individual.objects[0].xMm).toBe(44);
	});

	it("exportiert und importiert ohne Bilder", async () => {
		const store = new LayoutStore();
		await store.setImage("signature1", png);
		store.layouts.individual.objects[0].xMm = 12;
		const bytes = store.exportLayoutJson();
		const text = decoder.decode(bytes);
		expect(text).not.toContain("signature1.png");
		expect(Object.keys(JSON.parse(text))).toEqual(["team", "individual"]);

		const other = new LayoutStore();
		expect(other.importLayoutJson(bytes)).toEqual([]);
		expect(other.layouts.individual.objects[0].xMm).toBe(12);
	});

	it("lässt das Layout bei unlesbarem Import unverändert", () => {
		const store = new LayoutStore();
		store.layouts.team.objects[0].xMm = 33;
		expect(store.importLayoutJson(encoder.encode("kein json"))).toHaveLength(1);
		expect(store.importLayoutJson(encoder.encode("[]"))).toHaveLength(1);
		expect(store.layouts.team.objects[0].xMm).toBe(33);
	});
});

describe("LayoutStore Bilder", () => {
	it("lehnt andere Formate mit deutscher Meldung ab", async () => {
		const store = new LayoutStore();
		await expect(store.setImage("background", gif)).rejects.toThrow(/PNG oder JPEG/);
		expect(fs.files.size).toBe(0);
	});

	it("ersetzt die Datei mit anderer Endung", async () => {
		const store = new LayoutStore();
		await store.setImage("signature2", png);
		expect(fs.files.has("images/signature2.png")).toBe(true);
		await store.setImage("signature2", jpg);
		expect(fs.files.has("images/signature2.png")).toBe(false);
		expect(fs.files.get("images/signature2.jpg")).toEqual(jpg);
		expect(store.images.signature2).toEqual(jpg);
	});

	it("lädt und entfernt Bilder", async () => {
		fs.files.set("images/background.jpg", jpg);
		fs.files.set("images/signature1.png", png);
		const store = new LayoutStore();
		const images = await store.loadImages();
		expect(images).toEqual({ signature1: png, signature2: null, background: jpg });
		expect(store.images.background).toEqual(jpg);

		await store.removeImage("background");
		expect(fs.files.has("images/background.jpg")).toBe(false);
		expect(store.images.background).toBeNull();
	});
});

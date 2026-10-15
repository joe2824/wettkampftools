// @vitest-environment happy-dom
import { flushSync, mount, unmount } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NativeDropZone } from "./nativeDrop";

const zones = vi.hoisted(() => [] as NativeDropZone[]);
const nativeFileMock = vi.hoisted(() => ({ chooseNativeFile: vi.fn(), loadNativeFile: vi.fn() }));
vi.mock("$lib/platform/env", () => ({ isTauri: () => true }));
vi.mock("./nativeFile", () => nativeFileMock);
vi.mock("./nativeDrop", () => ({
	registerNativeDropZone: (zone: NativeDropZone) => {
		zones.push(zone);
		return () => zones.splice(zones.indexOf(zone), 1);
	}
}));

import Dropzone from "./Dropzone.svelte";

const FILE = { name: "Ergebnisse.xls", bytes: new Uint8Array([1]), modifiedMs: 2, createdMs: 1, kind: "excel" };

let component: ReturnType<typeof mount> | null = null;

function render(onfile = vi.fn()) {
	const target = document.createElement("div");
	document.body.append(target);
	component = mount(Dropzone, { target, props: { kinds: ["excel"], title: "Ergebnisse ablegen", onfile } });
	flushSync();
	return { target, onfile };
}

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = "";
	nativeFileMock.chooseNativeFile.mockReset();
	nativeFileMock.loadNativeFile.mockReset();
});

describe("Dropzone in der Desktop-Hülle", () => {
	it("meldet die Fläche an und ab", () => {
		render();
		expect(zones).toHaveLength(1);
		unmount(component!);
		component = null;
		expect(zones).toHaveLength(0);
	});

	it("liest die Datei über den Öffnen-Dialog mit Datum", async () => {
		nativeFileMock.chooseNativeFile.mockResolvedValue("/tmp/Ergebnisse.xls");
		nativeFileMock.loadNativeFile.mockResolvedValue({ ok: true, file: FILE });
		const { target, onfile } = render();
		target.querySelector("button")!.click();
		await vi.waitFor(() => expect(onfile).toHaveBeenCalledWith(FILE));
		expect(nativeFileMock.chooseNativeFile).toHaveBeenCalledWith(["excel"]);
		expect(nativeFileMock.loadNativeFile).toHaveBeenCalledWith("/tmp/Ergebnisse.xls", ["excel"], expect.any(Number));
	});

	it("übernimmt beim Ablegen die erste Datei und hebt die Fläche hervor", async () => {
		nativeFileMock.loadNativeFile.mockResolvedValue({ ok: true, file: FILE });
		const { target, onfile } = render();
		zones[0].onHover(true);
		flushSync();
		expect(target.querySelector('[role="group"]')!.className).toContain("border-primary");
		zones[0].onPaths(["/tmp/Eins.xls", "/tmp/Zwei.xls"]);
		await vi.waitFor(() => expect(onfile).toHaveBeenCalledOnce());
		expect(nativeFileMock.loadNativeFile).toHaveBeenCalledWith("/tmp/Eins.xls", ["excel"], expect.any(Number));
		await vi.waitFor(() => {
			flushSync();
			expect(target.querySelector('[role="status"]')?.textContent).toContain("nur die erste Datei");
		});
	});

	it("zeigt Fehler beim Lesen an", async () => {
		nativeFileMock.loadNativeFile.mockResolvedValue({ ok: false, message: "Die Datei ist größer als 20 MB." });
		const { target, onfile } = render();
		zones[0].onPaths(["/tmp/gross.xls"]);
		await vi.waitFor(() => {
			flushSync();
			expect(target.querySelector('[role="alert"]')?.textContent).toContain("größer als 20 MB");
		});
		expect(onfile).not.toHaveBeenCalled();
	});
});

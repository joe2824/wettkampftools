import { beforeEach, describe, expect, it, vi } from "vitest";

const coreMock = vi.hoisted(() => ({ invoke: vi.fn() }));
const dialogMock = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => coreMock);
const webviewMock = vi.hoisted(() => ({ onDragDropEvent: vi.fn() }));
vi.mock("@tauri-apps/plugin-dialog", () => dialogMock);
vi.mock("@tauri-apps/api/webview", () => ({ getCurrentWebview: () => webviewMock }));

import { listenFileDrop, pickInputFile, readInputFile } from "./inputFiles";

beforeEach(() => {
	coreMock.invoke.mockReset();
	dialogMock.open.mockReset();
});

describe("pickInputFile", () => {
	const filters = [{ name: "Excel-Datei", extensions: ["xlsx", "xls"] }];

	it("gibt den gewählten Pfad zurück", async () => {
		dialogMock.open.mockResolvedValue("C:\\Wettkampf\\Ergebnisse.xls");
		await expect(pickInputFile(filters)).resolves.toBe("C:\\Wettkampf\\Ergebnisse.xls");
		expect(dialogMock.open).toHaveBeenCalledWith({ multiple: false, directory: false, filters });
	});

	it("liefert null bei Abbruch", async () => {
		dialogMock.open.mockResolvedValue(null);
		await expect(pickInputFile(filters)).resolves.toBeNull();
	});
});

describe("readInputFile", () => {
	it("liest Bytes und Zeiten der Datei", async () => {
		coreMock.invoke.mockImplementation((command: string) => {
			if (command === "read_input_file") return Promise.resolve(new Uint8Array([1, 2, 3]).buffer);
			return Promise.resolve({ name: "Ergebnisse.xls", size: 3, createdMs: 10, modifiedMs: 20 });
		});
		const file = await readInputFile("/tmp/Ergebnisse.xls");
		expect(file).toEqual({ name: "Ergebnisse.xls", bytes: new Uint8Array([1, 2, 3]), createdMs: 10, modifiedMs: 20 });
		expect(coreMock.invoke).toHaveBeenCalledWith("input_file_info", { path: "/tmp/Ergebnisse.xls" });
		expect(coreMock.invoke).toHaveBeenCalledWith("read_input_file", { path: "/tmp/Ergebnisse.xls" });
	});

	it("reicht die Meldung der Desktop-Hülle weiter", async () => {
		coreMock.invoke.mockRejectedValue("Die Datei ist größer als 20 MB.");
		await expect(readInputFile("/tmp/gross.csv")).rejects.toBe("Die Datei ist größer als 20 MB.");
	});
});

describe("listenFileDrop", () => {
	it("reicht die Ereignisse des Fensters weiter", async () => {
		const unlisten = vi.fn();
		webviewMock.onDragDropEvent.mockImplementation((callback: (event: unknown) => void) => {
			callback({ payload: { type: "leave" } });
			return Promise.resolve(unlisten);
		});
		const handler = vi.fn();
		await expect(listenFileDrop(handler)).resolves.toBe(unlisten);
		expect(handler).toHaveBeenCalledWith({ type: "leave" });
	});
});

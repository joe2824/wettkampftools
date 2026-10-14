import { afterEach, describe, expect, it, vi } from "vitest";

const coreMock = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => coreMock);

import { openOutputFile, revealOutputFile } from "./output";

afterEach(() => {
	coreMock.invoke.mockReset();
});

describe("openOutputFile", () => {
	it("ruft den Öffnen-Befehl mit dem Pfad auf", async () => {
		coreMock.invoke.mockResolvedValue(undefined);
		await openOutputFile("/tmp/Auswertung.xlsx");
		expect(coreMock.invoke).toHaveBeenCalledWith("open_output_file", {
			path: "/tmp/Auswertung.xlsx"
		});
	});

	it("reicht die Fehlermeldung weiter", async () => {
		coreMock.invoke.mockRejectedValue("Die Datei darf nicht geöffnet werden.");
		await expect(openOutputFile("/tmp/a.exe")).rejects.toBe(
			"Die Datei darf nicht geöffnet werden."
		);
	});
});

describe("revealOutputFile", () => {
	it("ruft den Im-Ordner-Zeigen-Befehl mit dem Pfad auf", async () => {
		coreMock.invoke.mockResolvedValue(undefined);
		await revealOutputFile("/tmp/Urkunden.pdf");
		expect(coreMock.invoke).toHaveBeenCalledWith("reveal_output_file", {
			path: "/tmp/Urkunden.pdf"
		});
	});
});

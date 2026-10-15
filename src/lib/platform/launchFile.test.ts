import { beforeEach, describe, expect, it, vi } from "vitest";

const coreMock = vi.hoisted(() => ({ invoke: vi.fn() }));
const eventMock = vi.hoisted(() => ({ listen: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => coreMock);
vi.mock("@tauri-apps/api/event", () => eventMock);

import { onProjectFileOpened, takePendingProjectFile } from "./launchFile";

beforeEach(() => {
	coreMock.invoke.mockReset();
	eventMock.listen.mockReset();
});

describe("takePendingProjectFile", () => {
	it("holt den vorgemerkten Pfad ab", async () => {
		coreMock.invoke.mockResolvedValue("C:\\Wettkampf\\Übung 2026.wwkprojekt");
		await expect(takePendingProjectFile()).resolves.toBe("C:\\Wettkampf\\Übung 2026.wwkprojekt");
		expect(coreMock.invoke).toHaveBeenCalledWith("take_pending_project_file");
	});

	it("liefert null ohne vorgemerkte Datei", async () => {
		coreMock.invoke.mockResolvedValue(null);
		await expect(takePendingProjectFile()).resolves.toBeNull();
	});
});

describe("onProjectFileOpened", () => {
	it("meldet den Pfad aus dem Ereignis und gibt das Abmelden zurück", async () => {
		const unlisten = vi.fn();
		eventMock.listen.mockResolvedValue(unlisten);
		const handler = vi.fn();
		await expect(onProjectFileOpened(handler)).resolves.toBe(unlisten);
		expect(eventMock.listen).toHaveBeenCalledWith("project-file-opened", expect.any(Function));
		const callback = eventMock.listen.mock.calls[0][1] as (event: { payload: string }) => void;
		callback({ payload: "/tmp/a.wwkprojekt" });
		expect(handler).toHaveBeenCalledWith("/tmp/a.wwkprojekt");
	});
});

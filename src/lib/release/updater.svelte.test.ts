import { beforeEach, describe, expect, it, vi } from "vitest";

const plugin = vi.hoisted(() => ({ check: vi.fn(), relaunch: vi.fn() }));
vi.mock("@tauri-apps/plugin-updater", () => ({ check: plugin.check }));
vi.mock("@tauri-apps/plugin-process", () => ({ relaunch: plugin.relaunch }));

const env = vi.hoisted(() => ({ isTauri: vi.fn(() => true) }));
vi.mock("$lib/platform/env", () => env);

const log = vi.hoisted(() => ({ logInfo: vi.fn(), logError: vi.fn(), flushLog: vi.fn(async () => {}) }));
vi.mock("$lib/log", () => log);

import { CHECK_ERROR, INSTALL_ERROR, UNKNOWN_PROGRESS, UpdaterState } from "./updater.svelte";

type ProgressEvent = { event: string; data?: Record<string, number | undefined> };

function fakeUpdate(events: ProgressEvent[] = [], fail = false) {
	return {
		version: "2.1.0",
		body: "Neue Funktionen",
		downloadAndInstall: vi.fn(async (onEvent: (event: ProgressEvent) => void) => {
			for (const event of events) onEvent(event);
			if (fail) throw new Error("signature");
		}),
	};
}

let updater: UpdaterState;

beforeEach(() => {
	vi.clearAllMocks();
	env.isTauri.mockReturnValue(true);
	updater = new UpdaterState();
});

describe("check", () => {
	it("merkt ein gefundenes Update und öffnet den Dialog", async () => {
		plugin.check.mockResolvedValue(fakeUpdate());
		expect(await updater.check()).toBe("available");
		expect(updater.phase).toBe("available");
		expect(updater.version).toBe("2.1.0");
		expect(updater.notes).toBe("Neue Funktionen");
		expect(updater.dialogOpen).toBe(true);
		expect(log.logInfo).toHaveBeenCalledWith("update.found");
	});

	it("meldet den neuesten Stand", async () => {
		plugin.check.mockResolvedValue(null);
		expect(await updater.check()).toBe("upToDate");
		expect(updater.dialogOpen).toBe(false);
		expect(updater.version).toBeNull();
	});

	it("zeigt bei der Suche von Hand einen Fehler", async () => {
		plugin.check.mockRejectedValue(new Error("offline"));
		expect(await updater.check()).toBe("error");
		expect(updater.error).toBe(CHECK_ERROR);
		expect(log.logError).toHaveBeenCalledWith("update.checkFailed");
	});

	it("vergisst nach einer gescheiterten Suche das zuvor gefundene Update", async () => {
		plugin.check.mockResolvedValueOnce(fakeUpdate()).mockRejectedValueOnce(new Error("offline"));
		await updater.check();
		await updater.check();
		expect(updater.version).toBeNull();
		await updater.install();
		expect(updater.phase).toBe("error");
		expect(updater.error).toBe(CHECK_ERROR);
	});

	it("bleibt bei der stillen Suche ohne Fehleranzeige", async () => {
		plugin.check.mockRejectedValue(new Error("offline"));
		expect(await updater.check({ silent: true })).toBe("idle");
		expect(updater.error).toBeNull();
	});
});

describe("checkOnStart", () => {
	it("sucht nur in der Desktop-Anwendung", async () => {
		env.isTauri.mockReturnValue(false);
		await updater.checkOnStart();
		expect(plugin.check).not.toHaveBeenCalled();

		env.isTauri.mockReturnValue(true);
		plugin.check.mockResolvedValue(null);
		await updater.checkOnStart();
		expect(plugin.check).toHaveBeenCalledOnce();
	});
});

describe("install", () => {
	it("zeigt den Fortschritt und startet danach neu", async () => {
		const progress: number[] = [];
		const update = fakeUpdate();
		update.downloadAndInstall.mockImplementation(async (onEvent) => {
			for (const event of [
				{ event: "Started", data: { contentLength: 200 } },
				{ event: "Progress", data: { chunkLength: 50 } },
				{ event: "Progress", data: { chunkLength: 50 } },
			]) {
				onEvent(event);
				progress.push(updater.progress);
			}
			onEvent({ event: "Finished" });
		});
		plugin.check.mockResolvedValue(update);
		await updater.check();
		await updater.install();
		expect(progress).toEqual([0, 25, 50]);
		expect(updater.progress).toBe(100);
		expect(updater.phase).toBe("downloading");
		expect(log.flushLog).toHaveBeenCalled();
		expect(plugin.relaunch).toHaveBeenCalledOnce();
	});

	it("kennt ohne Größenangabe keinen Prozentwert", async () => {
		plugin.check.mockResolvedValue(fakeUpdate([{ event: "Started", data: {} }, { event: "Progress", data: { chunkLength: 10 } }], true));
		await updater.check();
		const install = updater.install();
		expect(updater.progress).toBe(UNKNOWN_PROGRESS);
		await install;
	});

	it("meldet einen Fehler und startet nicht neu", async () => {
		plugin.check.mockResolvedValue(fakeUpdate([], true));
		await updater.check();
		await updater.install();
		expect(updater.phase).toBe("error");
		expect(updater.error).toBe(INSTALL_ERROR);
		expect(plugin.relaunch).not.toHaveBeenCalled();
		expect(log.logError).toHaveBeenCalledWith("update.installFailed");
	});

	it("tut ohne gefundenes Update nichts", async () => {
		await updater.install();
		expect(updater.phase).toBe("idle");
	});
});

describe("postpone", () => {
	it("schließt den Dialog, das Update bleibt gemerkt", async () => {
		plugin.check.mockResolvedValue(fakeUpdate());
		await updater.check();
		updater.postpone();
		expect(updater.dialogOpen).toBe(false);
		expect(updater.phase).toBe("available");
	});
});

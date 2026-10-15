import { beforeEach, describe, expect, it, vi } from "vitest";

const process = vi.hoisted(() => ({ relaunch: vi.fn(async () => {}) }));
vi.mock("@tauri-apps/plugin-process", () => process);

const log = vi.hoisted(() => ({ logInfo: vi.fn(), logError: vi.fn(), flushLog: vi.fn(async () => {}) }));
vi.mock("$lib/log", () => log);

import { CHANNEL_SAVE_ERROR, changeBetaUpdates, RESTART_ERROR, restartApp } from "./updateChannel";

beforeEach(() => vi.clearAllMocks());

describe("changeBetaUpdates", () => {
	it("speichert den Schalter sofort und protokolliert nur den Kanal", async () => {
		const store = { settings: { betaUpdates: false }, saveFields: vi.fn(async () => {}) };
		expect(await changeBetaUpdates(store, true)).toBeNull();
		expect(store.saveFields).toHaveBeenCalledWith({ betaUpdates: true });
		expect(log.logInfo).toHaveBeenCalledWith("update.channelChanged", { beta: true });
	});

	it("meldet einen Fehler beim Speichern verständlich und stellt den Schalter zurück", async () => {
		const store = {
			settings: { betaUpdates: true },
			saveFields: vi.fn(async (patch: { betaUpdates?: boolean }) => {
				Object.assign(store.settings, patch);
				throw new Error("disk");
			})
		};
		expect(await changeBetaUpdates(store, false)).toBe(CHANNEL_SAVE_ERROR);
		expect(store.settings.betaUpdates).toBe(true);
		expect(log.logError).toHaveBeenCalledWith("update.channelSaveFailed");
	});
});

describe("restartApp", () => {
	it("schreibt das Protokoll und startet neu", async () => {
		expect(await restartApp()).toBeNull();
		expect(log.flushLog).toHaveBeenCalledBefore(process.relaunch);
		expect(process.relaunch).toHaveBeenCalled();
	});

	it("meldet einen gescheiterten Neustart verständlich", async () => {
		process.relaunch.mockRejectedValueOnce(new Error("nope"));
		expect(await restartApp()).toBe(RESTART_ERROR);
		expect(log.logError).toHaveBeenCalledWith("app.restartFailed");
	});
});

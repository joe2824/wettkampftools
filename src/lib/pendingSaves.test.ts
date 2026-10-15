import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushLog, logError } from "$lib/log";
import {
	FLUSH_TIMEOUT_MS,
	flushPendingSaves,
	pendingSaveCount,
	registerPendingSave,
	unregisterPendingSave
} from "./pendingSaves";

vi.mock("$lib/log", async (original) => ({
	...(await original<typeof import("$lib/log")>()),
	logError: vi.fn(),
	flushLog: vi.fn(async () => undefined)
}));

const unregisterAll: (() => void)[] = [];
function register(flush: () => Promise<void>): void {
	registerPendingSave(flush);
	unregisterAll.push(() => unregisterPendingSave(flush));
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	for (const unregister of unregisterAll.splice(0)) unregister();
	vi.useRealTimers();
	vi.clearAllMocks();
});

describe("pendingSaves", () => {
	it("speichert beim Schließen alles Ausstehende", async () => {
		const first = vi.fn(async () => undefined);
		const second = vi.fn(async () => undefined);
		register(first);
		register(second);
		await expect(flushPendingSaves()).resolves.toBe(true);
		expect(first).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledTimes(1);
	});

	it("zählt dieselbe Speicherung nur einmal und vergisst sie nach dem Abmelden", async () => {
		const flush = vi.fn(async () => undefined);
		registerPendingSave(flush);
		registerPendingSave(flush);
		expect(pendingSaveCount()).toBe(1);
		unregisterPendingSave(flush);
		expect(pendingSaveCount()).toBe(0);
		await flushPendingSaves();
		expect(flush).not.toHaveBeenCalled();
	});

	it("wartet höchstens die Obergrenze, damit das Schließen nie hängt", async () => {
		register(() => new Promise<void>(() => {}));
		let finished: boolean | null = null;
		void flushPendingSaves().then((done) => (finished = done));
		await vi.advanceTimersByTimeAsync(FLUSH_TIMEOUT_MS - 1);
		expect(finished).toBeNull();
		await vi.advanceTimersByTimeAsync(1);
		expect(finished).toBe(false);
		expect(logError).toHaveBeenCalledWith("pendingSaves.timeout");
	});

	it("lässt einen Fehler die übrigen Speicherungen nicht aufhalten", async () => {
		const ok = vi.fn(async () => undefined);
		register(() => Promise.reject(new Error("voll")));
		register(ok);
		await expect(flushPendingSaves()).resolves.toBe(true);
		expect(ok).toHaveBeenCalledTimes(1);
	});

	it("ist ohne Ausstehendes sofort fertig", async () => {
		await expect(flushPendingSaves()).resolves.toBe(true);
	});

	it("wartet nach den Speicherungen auch auf das Protokoll", async () => {
		let releaseLog = (): void => {};
		vi.mocked(flushLog).mockImplementationOnce(() => new Promise<void>((resolve) => (releaseLog = resolve)));
		const save = vi.fn(async () => undefined);
		register(save);
		let finished: boolean | null = null;
		void flushPendingSaves().then((done) => (finished = done));
		await vi.advanceTimersByTimeAsync(0);
		expect(save).toHaveBeenCalledTimes(1);
		expect(finished).toBeNull();
		releaseLog();
		await vi.advanceTimersByTimeAsync(0);
		expect(finished).toBe(true);
	});

	it("schreibt das Protokoll auch ohne ausstehende Speicherungen", async () => {
		await flushPendingSaves();
		expect(flushLog).toHaveBeenCalled();
	});
});

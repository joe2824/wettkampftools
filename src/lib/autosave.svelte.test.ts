import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logError } from "$lib/log";
import { DebouncedSave } from "./autosave.svelte";

vi.mock("$lib/log", async (original) => ({ ...(await original<typeof import("$lib/log")>()), logError: vi.fn() }));

const DELAY_MS = 500;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("DebouncedSave", () => {
	it("schreibt bei schnellen Änderungen nur einmal nach der Pause", async () => {
		const write = vi.fn(async () => undefined);
		const autosave = new DebouncedSave(write, DELAY_MS, "test.failed");
		autosave.schedule();
		await vi.advanceTimersByTimeAsync(DELAY_MS - 1);
		autosave.schedule();
		await vi.advanceTimersByTimeAsync(DELAY_MS - 1);
		expect(write).not.toHaveBeenCalled();
		expect(autosave.status).toBe("pending");
		await vi.advanceTimersByTimeAsync(1);
		await autosave.idle();
		expect(write).toHaveBeenCalledTimes(1);
		expect(autosave.status).toBe("saved");
	});

	it("speichert Ausstehendes sofort beim Flush", async () => {
		const write = vi.fn(async () => undefined);
		const autosave = new DebouncedSave(write, DELAY_MS, "test.failed");
		autosave.schedule();
		await autosave.flush();
		expect(write).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(DELAY_MS);
		expect(write).toHaveBeenCalledTimes(1);
	});

	it("schreibt beim Flush ohne Änderung nichts", async () => {
		const write = vi.fn(async () => undefined);
		const autosave = new DebouncedSave(write, DELAY_MS, "test.failed");
		await autosave.flush();
		expect(write).not.toHaveBeenCalled();
		expect(autosave.status).toBe("idle");
	});

	it("meldet einen Fehler mit dem angegebenen Code", async () => {
		const autosave = new DebouncedSave(() => Promise.reject(new Error("voll")), DELAY_MS, "test.failed");
		autosave.schedule();
		await autosave.flush();
		expect(autosave.status).toBe("failed");
		expect(logError).toHaveBeenCalledWith("test.failed");
	});
});

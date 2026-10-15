import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logError } from "$lib/log";
import { DebouncedSave } from "./autosave.svelte";
import { flushPendingSaves, pendingSaveCount } from "./pendingSaves";

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

	it("meldet sich bis zum Schreiben als ausstehend an, damit das Schließen es speichert", async () => {
		const write = vi.fn(async () => undefined);
		const autosave = new DebouncedSave(write, DELAY_MS, "test.failed");
		expect(pendingSaveCount()).toBe(0);
		autosave.schedule();
		autosave.schedule();
		expect(pendingSaveCount()).toBe(1);
		await flushPendingSaves();
		expect(write).toHaveBeenCalledTimes(1);
		expect(pendingSaveCount()).toBe(0);
	});

	it("meldet sich nach dem verzögerten Schreiben ab", async () => {
		const autosave = new DebouncedSave(async () => undefined, DELAY_MS, "test.failed");
		autosave.schedule();
		await vi.advanceTimersByTimeAsync(DELAY_MS);
		await autosave.idle();
		expect(pendingSaveCount()).toBe(0);
	});

	it("bleibt angemeldet, wenn während des Schreibens eine neue Änderung kommt", async () => {
		let release = () => {};
		const write = vi.fn(() => new Promise<void>((resolve) => (release = resolve)));
		const autosave = new DebouncedSave(write, DELAY_MS, "test.failed");
		autosave.schedule();
		await vi.advanceTimersByTimeAsync(DELAY_MS);
		autosave.schedule();
		release();
		await vi.advanceTimersByTimeAsync(0);
		expect(pendingSaveCount()).toBe(1);
		await vi.advanceTimersByTimeAsync(DELAY_MS);
		release();
		await autosave.idle();
		expect(pendingSaveCount()).toBe(0);
	});
});

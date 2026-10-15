import { describe, expect, it, vi } from "vitest";
import { LeaveGuard, type LeaveActions } from "./leaveGuard.svelte";

const TARGET = new URL("http://localhost/certificates");

function actions(overrides: Partial<LeaveActions> = {}): LeaveActions {
	return {
		save: vi.fn(async () => undefined),
		discard: vi.fn(),
		goto: vi.fn(async () => undefined),
		...overrides
	};
}

describe("LeaveGuard", () => {
	it("hält nur bei ungespeicherten Änderungen an", () => {
		const guard = new LeaveGuard();
		expect(guard.intercept(TARGET, false)).toBe(false);
		expect(guard.open).toBe(false);
		expect(guard.intercept(null, true)).toBe(false);
		expect(guard.intercept(TARGET, true)).toBe(true);
		expect(guard.open).toBe(true);
	});

	it("speichert und navigiert dann weiter", async () => {
		const guard = new LeaveGuard();
		const deps = actions();
		guard.intercept(TARGET, true);
		await guard.choose("save", deps);
		expect(deps.save).toHaveBeenCalledOnce();
		expect(deps.goto).toHaveBeenCalledWith(TARGET);
		expect(deps.discard).not.toHaveBeenCalled();
		expect(guard.open).toBe(false);
	});

	it("bleibt bei einem Speicherfehler auf der Seite", async () => {
		const guard = new LeaveGuard();
		const deps = actions({ save: vi.fn(() => Promise.reject(new Error("voll"))) });
		guard.intercept(TARGET, true);
		await expect(guard.choose("save", deps)).rejects.toThrow("voll");
		expect(deps.goto).not.toHaveBeenCalled();
		expect(guard.open).toBe(false);
	});

	it("verwirft und navigiert weiter", async () => {
		const guard = new LeaveGuard();
		const deps = actions();
		guard.intercept(TARGET, true);
		await guard.choose("discard", deps);
		expect(deps.discard).toHaveBeenCalledOnce();
		expect(deps.save).not.toHaveBeenCalled();
		expect(deps.goto).toHaveBeenCalledWith(TARGET);
	});

	it("bricht ab und bleibt auf der Seite", async () => {
		const guard = new LeaveGuard();
		const deps = actions();
		guard.intercept(TARGET, true);
		await guard.choose("cancel", deps);
		expect(deps.save).not.toHaveBeenCalled();
		expect(deps.discard).not.toHaveBeenCalled();
		expect(deps.goto).not.toHaveBeenCalled();
		expect(guard.open).toBe(false);
	});

	it("tut ohne angehaltene Navigation nichts", async () => {
		const guard = new LeaveGuard();
		const deps = actions();
		await guard.choose("save", deps);
		expect(deps.save).not.toHaveBeenCalled();
		expect(deps.goto).not.toHaveBeenCalled();
	});
});

import { describe, expect, it, vi } from "vitest";

vi.mock("./project", () => ({ openProject: vi.fn() }));

import type { OpenProjectOutcome } from "./project";
import { ProjectOpenRequest } from "./projectOpenRequest.svelte";

const BYTES = new Uint8Array([1, 2, 3]);
const OPENED: OpenProjectOutcome = { ok: true, headline: "39. Wellenwettkampf", warnings: [] };

describe("ProjectOpenRequest", () => {
	it("merkt eine Datei zur Rückfrage vor", () => {
		const request = new ProjectOpenRequest(vi.fn());
		expect(request.pending).toBeNull();
		request.request(BYTES);
		expect(request.pending).toBe(BYTES);
	});

	it("verwirft die Rückfrage bei Abbruch", () => {
		const request = new ProjectOpenRequest(vi.fn());
		request.request(BYTES);
		request.cancel();
		expect(request.pending).toBeNull();
	});

	it("öffnet nach Bestätigung und räumt danach auf", async () => {
		const open = vi.fn().mockResolvedValue(OPENED);
		const request = new ProjectOpenRequest(open);
		request.request(BYTES);
		const running = request.confirm();
		expect(request.busy).toBe(true);
		await expect(running).resolves.toEqual(OPENED);
		expect(open).toHaveBeenCalledWith(BYTES);
		expect(request.busy).toBe(false);
		expect(request.pending).toBeNull();
	});

	it("räumt auch bei einem Fehler auf", async () => {
		const request = new ProjectOpenRequest(vi.fn().mockRejectedValue(new Error("kaputt")));
		request.request(BYTES);
		await expect(request.confirm()).rejects.toThrow("kaputt");
		expect(request.busy).toBe(false);
		expect(request.pending).toBeNull();
	});

	it("bestätigt ohne vorgemerkte Datei nichts", async () => {
		const open = vi.fn();
		await expect(new ProjectOpenRequest(open).confirm()).resolves.toBeNull();
		expect(open).not.toHaveBeenCalled();
	});

	it("ändert während des Öffnens nichts an der vorgemerkten Datei", async () => {
		let finish: (outcome: OpenProjectOutcome) => void = () => {};
		const request = new ProjectOpenRequest(() => new Promise((resolve) => (finish = resolve)));
		request.request(BYTES);
		const running = request.confirm();
		const other = new Uint8Array([9]);
		request.request(other);
		request.cancel();
		expect(request.pending).toBe(BYTES);
		await expect(request.confirm()).resolves.toBeNull();
		finish(OPENED);
		await running;
	});
});

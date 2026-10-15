import { describe, expect, it, vi } from "vitest";

const workflowMock = vi.hoisted(() => ({ loadLocationData: vi.fn() }));
vi.mock("$lib/workflows/certificateMap", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/workflows/certificateMap")>()),
	loadLocationData: workflowMock.loadLocationData
}));

import { MapLocations } from "./mapLocations.svelte";

const organisations = [{ name: "Musterstadt", lat: 53.55, lon: 9.99, id: "1" }];

describe("MapLocations", () => {
	it("stellt nach dem Laden die Punkte der Teilnehmer bereit", async () => {
		workflowMock.loadLocationData.mockResolvedValue({ organisations, choices: {} });
		const locations = new MapLocations();
		expect(locations.mapData(["Musterstadt"])).toBeUndefined();
		await locations.load();
		expect(locations.loaded).toBe(true);
		expect(locations.available).toBe(true);
		expect(locations.mapData(["Musterstadt"])?.markers).toHaveLength(1);
	});

	it("bleibt ohne Standortdaten oder bei Lesefehlern ohne Punkte", async () => {
		workflowMock.loadLocationData.mockRejectedValue(new Error("kaputt"));
		const locations = new MapLocations();
		await locations.load();
		expect(locations.loaded).toBe(true);
		expect(locations.available).toBe(false);
		expect(locations.mapData(["Musterstadt"])).toBeUndefined();
	});
});

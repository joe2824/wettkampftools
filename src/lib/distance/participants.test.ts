import { describe, expect, it } from "vitest";
import type { Organisation } from "./dlrgPoi";
import { participantPoints } from "./participants";

const organisations: Organisation[] = [
	{ name: "Ortsgruppe Musterstadt e.V.", lat: 53.55, lon: 9.99, id: "1" },
	{ name: "Beispielhausen", lat: 48.14, lon: 11.58, id: "2" },
	{ name: "Beispielhausen", lat: 50.11, lon: 8.68, id: "3" }
];

describe("participantPoints", () => {
	it("setzt jede gefundene Gliederung einmal auf die Karte", () => {
		expect(participantPoints(["Musterstadt", "Musterstadt", "Unbekanntdorf"], organisations, {})).toEqual([
			{ name: "Musterstadt", position: { lat: 53.55, lon: 9.99 } }
		]);
	});

	it("nimmt bei gleichnamigen Gliederungen die gemerkte Wahl", () => {
		expect(participantPoints(["Beispielhausen"], organisations, { beispielhausen: "3" })).toEqual([
			{ name: "Beispielhausen", position: { lat: 50.11, lon: 8.68 } }
		]);
	});

	it("lässt ungeklärte gleichnamige Gliederungen weg", () => {
		expect(participantPoints(["Beispielhausen"], organisations, {})).toEqual([]);
	});

	it("bleibt ohne Standortdaten leer", () => {
		expect(participantPoints(["Musterstadt"], [], {})).toEqual([]);
	});
});

// @vitest-environment happy-dom
import { strToU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { createFakeStore } from "$lib/testing/fakeFs";
import { rulebookFile } from "$lib/testing/rulebookFixture";
import { collectProjectData, isValidProjectData, projectDataLabel, writeProjectData } from "./projectData";

const json = (value: unknown): Uint8Array => strToU8(JSON.stringify(value));
const RULEBOOK = rulebookFile([{ name: "AK 12", female: [{ name: "50m Schwimmen", rec: 0 }], male: [] }]);
const BEST_TIMES = {
	year: 2025,
	entries: [
		{
			ageGroup: "AkW 12",
			gender: "female",
			discipline: "4*50m Retten in der Welle",
			time: 20550,
			slowest: 22000,
			average: 21000,
			teams: 2
		}
	]
};

/** Gültige Dateien aller Arten, wie sie im Datenordner liegen. */
function validFiles(): Record<string, Uint8Array> {
	return {
		"distances/choices.json": json({ beispielhausen: "3" }),
		"records/mapping.json": json({ ageGroups: { "AK 12": "AK 12" }, disciplineAliases: {} }),
		"records/club.rwm": RULEBOOK,
		"records/club.json": json({ name: "Verein.rwm" }),
		"records/best-times-2025.json": json(BEST_TIMES)
	};
}

describe("isValidProjectData", () => {
	it.each(Object.entries(validFiles()))("nimmt %s an", (path, bytes) => {
		expect(isValidProjectData(path, bytes)).toBe(true);
	});

	it.each([
		["distances/choices.json", strToU8("kaputt")],
		["records/options.json", json({ enabled: false, seconds: 5 })],
		["records/mapping.json", json({ ageGroups: 1 })],
		["records/club.rwm", strToU8("kein Regelwerk")],
		["records/club.json", json({ name: 3 })],
		["records/best-times-2024.json", json(BEST_TIMES)],
		["records/best-times-2025.json", json({ year: 2025, entries: [{}] })],
		["records/andere.json", json({})],
		["gld-cache.json", json({})],
		["competition/state.json", json({})]
	])("lehnt %s mit falschem Inhalt oder unbekanntem Pfad ab", (path, bytes) => {
		expect(isValidProjectData(path, bytes)).toBe(false);
	});
});

describe("projectDataLabel", () => {
	it("nennt die Teile verständlich", () => {
		expect(projectDataLabel("records/best-times-2025.json")).toBe("Bestzeiten 2025");
		expect(projectDataLabel("records/club.rwm")).toBe("Vereins-Regelwerk");
		expect(projectDataLabel("distances/choices.json")).toBe("Gliederungswahl der Entfernungen");
	});
});

describe("collectProjectData", () => {
	it("nimmt alle gültigen Dateien mit, aber keine unbekannten oder kaputten", async () => {
		const store = createFakeStore();
		for (const [path, bytes] of Object.entries(validFiles())) store.files.set(path, bytes);
		store.files.set("records/best-times-2024.json", strToU8("kaputt"));
		store.files.set("records/notizen.json", json({}));
		store.files.set("gld-cache.json", json({}));
		expect(await collectProjectData(store)).toEqual(validFiles());
	});

	it("liefert ohne Dateien nichts", async () => {
		expect(await collectProjectData(createFakeStore())).toEqual({});
	});
});

describe("writeProjectData", () => {
	it("schreibt die Dateien in den Datenordner und lässt andere stehen", async () => {
		const store = createFakeStore();
		store.files.set("records/best-times-2024.json", json({ year: 2024, entries: [] }));
		await writeProjectData(store, validFiles());
		for (const [path, bytes] of Object.entries(validFiles())) expect(store.files.get(path)).toEqual(bytes);
		expect(store.files.has("records/best-times-2024.json")).toBe(true);
	});
});

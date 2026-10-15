// @vitest-environment happy-dom
import { strToU8, zipSync } from "fflate";
import { beforeEach, describe, expect, it, vi } from "vitest";

const filesMock = vi.hoisted(() => ({
	saveFile: vi.fn(),
	datedFileName: (name: string) => `20261014_${name}`
}));
vi.mock("$lib/platform/files", () => filesMock);

import { defaultSettings, MAX_COPIES, MAX_PRINT_OFFSET_MM, MIN_COPIES } from "$lib/settings/settings";
import {
	exportSettings,
	importSettings,
	readRulebook,
	saveSettings,
	storeSignature,
	toCopies,
	toOffsetMm
} from "./settings";

const bytes = new Uint8Array([1, 2, 3]);

beforeEach(() => filesMock.saveFile.mockReset());

describe("exportSettings", () => {
	it("speichert die Einstellungen als datierte JSON-Datei", async () => {
		filesMock.saveFile.mockResolvedValue("/tmp/einstellungen.json");
		const path = await exportSettings({ exportJson: () => bytes });
		expect(path).toBe("/tmp/einstellungen.json");
		expect(filesMock.saveFile).toHaveBeenCalledWith({
			defaultName: "20261014_Wettkampftools_Einstellungen.json",
			filters: [{ name: "Einstellungen", extensions: ["json"] }],
			bytes
		});
	});

	it("liefert null nach Abbruch", async () => {
		filesMock.saveFile.mockResolvedValue(null);
		expect(await exportSettings({ exportJson: () => bytes })).toBeNull();
	});
});

describe("importSettings", () => {
	it("übernimmt die Datei und übersetzt die Hinweise", () => {
		const store = { importJson: vi.fn(() => ["ageGroups.invalid"]) };
		expect(importSettings(store, bytes)).toEqual({
			applied: true,
			messages: ["Altersklassen waren ungültig und wurden zurückgesetzt."]
		});
		expect(store.importJson).toHaveBeenCalledWith(bytes);
	});

	it("meldet unlesbare Dateien als nicht übernommen", () => {
		const outcome = importSettings({ importJson: () => ["root.invalid"] }, bytes);
		expect(outcome.applied).toBe(false);
		expect(outcome.messages).toEqual(["Die Datei ist keine gültige Einstellungsdatei. Es wurde nichts geändert."]);
	});
});

describe("saveSettings", () => {
	it("setzt eine ungültige Wellen-Starterlaubnis auf die erste Altersklasse und speichert", async () => {
		const settings = { ...defaultSettings(), ageGroups: ["AK 15/16", "AK Offen"], waveStartAgeGroup: "AK 12" };
		const store = { settings, save: vi.fn(async () => {}) };
		await saveSettings(store);
		expect(store.settings.waveStartAgeGroup).toBe("AK 15/16");
		expect(store.save).toHaveBeenCalledOnce();
	});

	it("lässt eine gültige Wellen-Starterlaubnis unverändert", async () => {
		const store = { settings: defaultSettings(), save: vi.fn(async () => {}) };
		await saveSettings(store);
		expect(store.settings.waveStartAgeGroup).toBe("AK 13/14");
	});
});

describe("readRulebook", () => {
	it("liest Name und Altersklassen", () => {
		const xml = `<Altersklassen><aks><Altersklasse><name>AK 12</name><minMembers>4</minMembers><maxMembers>5</maxMembers></Altersklasse></aks><beschreibung>Beispiel</beschreibung></Altersklassen>`;
		const outcome = readRulebook(zipSync({ "data.xml": strToU8(xml) }));
		expect(outcome).toEqual({
			ok: true,
			rulebook: { name: "Beispiel", ageGroups: [{ name: "AK 12", minMembers: 4, maxMembers: 5 }] }
		});
	});

	it("meldet eine unpassende Datei verständlich", () => {
		expect(readRulebook(zipSync({ "andere.xml": strToU8("<x/>") }))).toEqual({
			ok: false,
			message: "Die Datei ist kein JAuswertung-Regelwerk."
		});
	});
});

describe("storeSignature", () => {
	it("speichert das Bild und meldet keinen Fehler", async () => {
		const images = { setImage: vi.fn(async () => {}) };
		expect(await storeSignature(images, "signature1", bytes)).toBeNull();
		expect(images.setImage).toHaveBeenCalledWith("signature1", bytes);
	});

	it("gibt die Meldung bei falschem Bildformat weiter", async () => {
		const images = {
			setImage: vi.fn(async () => Promise.reject(new Error("Bitte ein Bild im Format PNG oder JPEG wählen.")))
		};
		expect(await storeSignature(images, "signature2", bytes)).toBe("Bitte ein Bild im Format PNG oder JPEG wählen.");
	});

	it("meldet Schreibfehler allgemein", async () => {
		const images = { setImage: vi.fn(async () => Promise.reject(new Error("os error 28"))) };
		expect(await storeSignature(images, "signature2", bytes)).toBe(
			"Die Unterschrift konnte nicht gespeichert werden. Bitte erneut versuchen."
		);
	});
});

describe("toCopies", () => {
	it("rundet und begrenzt auf den erlaubten Bereich", () => {
		expect(toCopies(3.6, 5)).toBe(4);
		expect(toCopies(0, 5)).toBe(MIN_COPIES);
		expect(toCopies(99, 5)).toBe(MAX_COPIES);
	});

	it("behält den alten Wert bei leerer Eingabe", () => {
		expect(toCopies(Number.NaN, 5)).toBe(5);
	});
});

describe("toOffsetMm", () => {
	it("begrenzt den Druckversatz", () => {
		expect(toOffsetMm(1.5, 0)).toBe(1.5);
		expect(toOffsetMm(-100, 0)).toBe(-MAX_PRINT_OFFSET_MM);
		expect(toOffsetMm(Number.NaN, 2)).toBe(2);
	});
});

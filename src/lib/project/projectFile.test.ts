import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from "fflate";
import { describe, expect, it } from "vitest";
import { defaultLayouts } from "$lib/certificates/layoutDefaults";
import { encodeBase64, type CompetitionState } from "$lib/competition/persistence";
import { defaultSettings, type Settings } from "$lib/settings/settings";
import { storedResults } from "$lib/testing/competitionFixtures";
import { jpegBytes, pngBytes } from "$lib/testing/images";
import {
	buildProjectFile,
	MAX_PROJECT_BYTES,
	PROJECT_FORMAT,
	readProjectFile,
	type ProjectSnapshot
} from "./projectFile";

const NOW = new Date("2026-10-15T08:00:00.000Z");
const csv = strToU8("Gliederung;Name\nMusterstadt;Anna Meier\n");

function sampleSettings(): Settings {
	const settings = defaultSettings();
	settings.event = { ...settings.event, number: "39", title: "Wellenwettkampf", venue: "Musterstadt" };
	settings.teamNameOverrides = { musterstadt: "Musterstadt / Süd" };
	settings.rulebook = { name: "Regelwerk 2026", ageGroups: [{ name: "AK 12", minMembers: 4, maxMembers: 5 }] };
	settings.legacyMigrated = true;
	return settings;
}

function sampleState(): CompetitionState {
	return {
		savedAt: "2026-10-14T09:30:00.000Z",
		registration: { fileName: "meldungen.csv", csvBase64: encodeBase64(csv), waveSelection: ["r1"] },
		certificateSelection: { hidden: { ageGroups: ["AK 12"], genders: [], kinds: ["wave"] }, excluded: ["e1"] }
	};
}

function sampleSnapshot(): ProjectSnapshot {
	return {
		settings: sampleSettings(),
		layouts: defaultLayouts(),
		signatures: { signature1: pngBytes(), signature2: jpegBytes() },
		competition: sampleState(),
		results: storedResults(),
		data: sampleData()
	};
}

function sampleData(): Record<string, Uint8Array> {
	return {
		"distances/choices.json": strToU8(JSON.stringify({ beispielhausen: "3" })),
		"records/mapping.json": strToU8(JSON.stringify({ ageGroups: {}, disciplineAliases: {} }))
	};
}

const build = (snapshot = sampleSnapshot(), includeSignatures = true) =>
	buildProjectFile(snapshot, { includeSignatures, now: NOW, appVersion: "2.0.0" });

/** Projektdatei auspacken, einen Teil ändern und neu packen. */
function rebuild(bytes: Uint8Array, change: (entries: Zippable) => void): Uint8Array {
	const entries: Zippable = { ...unzipSync(bytes) };
	change(entries);
	return zipSync(entries);
}

const LOCAL_HEADER = 0x04034b50;
const CENTRAL_HEADER = 0x02014b50;
/** Lage der Größe „entpackt“ im lokalen bzw. zentralen Eintrag. */
const SIZE_OFFSETS = { [LOCAL_HEADER]: 22, [CENTRAL_HEADER]: 24 } as const;

/** Trägt in alle Einträge eine falsche entpackte Größe ein. */
function setUncompressedSize(bytes: Uint8Array, size: number): Uint8Array {
	const copy = bytes.slice();
	const view = new DataView(copy.buffer);
	for (let offset = 0; offset + 4 <= copy.length; offset++) {
		const signature = view.getUint32(offset, true) as keyof typeof SIZE_OFFSETS;
		if (signature in SIZE_OFFSETS) view.setUint32(offset + SIZE_OFFSETS[signature], size, true);
	}
	return copy;
}

/** Benennt einen Eintrag gleicher Länge um, z. B. zu einem schon vorhandenen Namen. */
function renameEntry(bytes: Uint8Array, from: string, to: string): Uint8Array {
	const text = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
	return Uint8Array.from(text.replaceAll(from, to), (char) => char.charCodeAt(0));
}

function expectError(bytes: Uint8Array, message: string) {
	const result = readProjectFile(bytes);
	expect(result).toEqual({ ok: false, message });
}

describe("buildProjectFile", () => {
	it("legt Manifest, Einstellungen, Layout, Bilder und Wettkampfstand an", () => {
		const entries = unzipSync(build());
		expect(Object.keys(entries).sort()).toEqual([
			"appdata/distances/choices.json",
			"appdata/records/mapping.json",
			"competition/results.json",
			"competition/state.json",
			"images/signature1.png",
			"images/signature2.jpg",
			"layout.json",
			"manifest.json",
			"settings.json"
		]);
		expect(JSON.parse(strFromU8(entries["manifest.json"]))).toEqual({
			format: PROJECT_FORMAT,
			version: 1,
			createdAt: NOW.toISOString(),
			appVersion: "2.0.0",
			eventHeadline: "39. Wellenwettkampf",
			signatures: true
		});
		const settings = JSON.parse(strFromU8(entries["settings.json"]));
		expect(settings.teamNameOverrides).toEqual({ musterstadt: "Musterstadt / Süd" });
		expect(settings.rulebook.name).toBe("Regelwerk 2026");
		expect(settings).not.toHaveProperty("legacyMigrated");
		expect(JSON.parse(strFromU8(entries["competition/state.json"])).schemaVersion).toBe(2);
		expect(JSON.parse(strFromU8(entries["competition/results.json"])).schemaVersion).toBe(1);
	});

	it("lässt Unterschriften auf Wunsch weg", () => {
		const entries = unzipSync(build(sampleSnapshot(), false));
		expect(Object.keys(entries).some((name) => name.startsWith("images/"))).toBe(false);
		expect(JSON.parse(strFromU8(entries["manifest.json"])).signatures).toBe(false);
	});

	it("lässt fehlenden Wettkampfstand weg", () => {
		const entries = unzipSync(build({ ...sampleSnapshot(), competition: null, results: null }));
		expect(entries["competition/state.json"]).toBeUndefined();
		expect(entries["competition/results.json"]).toBeUndefined();
	});
});

describe("readProjectFile", () => {
	it("liest eine gespeicherte Projektdatei vollständig zurück", () => {
		const result = readProjectFile(build());
		if (!result.ok) throw new Error(result.message);
		const { project } = result;
		expect(project.manifest.eventHeadline).toBe("39. Wellenwettkampf");
		expect(project.settings).toEqual({ ...sampleSettings(), legacyMigrated: false });
		expect(project.layouts).toEqual(defaultLayouts());
		expect(project.signatures).toEqual({ signature1: pngBytes(), signature2: jpegBytes() });
		expect(project.competition).toEqual(sampleState());
		expect(project.results).toEqual(storedResults());
		expect(project.data).toEqual(sampleData());
		expect(project.warnings).toEqual([]);
	});

	it("liest ältere Projekte ohne weitere Daten", () => {
		const result = readProjectFile(build({ ...sampleSnapshot(), data: {} }));
		if (!result.ok) throw new Error(result.message);
		expect(result.project.data).toEqual({});
	});

	it("ignoriert unbekannte Dateien unter appdata", () => {
		const bytes = rebuild(build(), (entries) => (entries["appdata/competition/state.json"] = strToU8("{}")));
		const result = readProjectFile(bytes);
		if (!result.ok) throw new Error(result.message);
		expect(Object.keys(result.project.data).sort()).toEqual(["distances/choices.json", "records/mapping.json"]);
	});

	it("kennzeichnet Projekte ohne Unterschriften", () => {
		const result = readProjectFile(build(sampleSnapshot(), false));
		if (!result.ok) throw new Error(result.message);
		expect(result.project.signatures).toBeNull();
	});

	it("liest ein Projekt ohne Wettkampfstand", () => {
		const result = readProjectFile(build({ ...sampleSnapshot(), competition: null, results: null }));
		if (!result.ok) throw new Error(result.message);
		expect(result.project.competition).toBeNull();
		expect(result.project.results).toBeNull();
	});

	it("ignoriert unbekannte Einträge", () => {
		const bytes = rebuild(build(), (entries) => (entries["notizen/extra.txt"] = strToU8("hallo")));
		expect(readProjectFile(bytes).ok).toBe(true);
	});

	it("lehnt Dateien ab, die kein Projekt sind", () => {
		const notProject = "Die Datei ist keine Projektdatei von DLRG Dorheim Wettkampftools.";
		expectError(strToU8("kein zip"), notProject);
		expectError(zipSync({ "a.txt": strToU8("x") }), notProject);
		const foreign = rebuild(build(), (entries) => {
			entries["manifest.json"] = strToU8(JSON.stringify({ format: "anderes", version: 1 }));
		});
		expectError(foreign, notProject);
	});

	it("lehnt Projekte aus einer neueren Version ab", () => {
		const newer = rebuild(build(), (entries) => {
			const manifest = JSON.parse(strFromU8(entries["manifest.json"] as Uint8Array));
			entries["manifest.json"] = strToU8(JSON.stringify({ ...manifest, version: 2 }));
		});
		expectError(
			newer,
			"Die Projektdatei stammt aus einer neueren Version von DLRG Dorheim Wettkampftools. Bitte zuerst das Programm aktualisieren."
		);
	});

	it("lehnt zu große Dateien ab", () => {
		expectError(new Uint8Array(MAX_PROJECT_BYTES + 1), "Die Projektdatei ist zu groß.");
	});

	it("zählt beim Entpacken die gepackte Größe, wenn die angegebene zu klein ist", () => {
		const content = strToU8("x".repeat(1000));
		const bytes = setUncompressedSize(zipSync({ "settings.json": [content, { level: 0 }] }), 1);
		expect(readProjectFile(bytes, { maxUnpackedBytes: 500 })).toEqual({
			ok: false,
			message: "Die Projektdatei ist zu groß."
		});
	});

	it("lehnt doppelte Einträge ab", () => {
		const withCopy = rebuild(build(), (entries) => (entries["settingsXjson"] = entries["settings.json"]));
		expect(readProjectFile(withCopy).ok).toBe(true);
		const bytes = renameEntry(withCopy, "settingsXjson", "settings.json");
		expectError(bytes, "Die Datei ist keine Projektdatei von DLRG Dorheim Wettkampftools.");
	});

	it.each([
		["settings.json", "Einstellungen"],
		["layout.json", "Urkunden-Layout"],
		["competition/state.json", "Wettkampfstand"],
		["competition/results.json", "Ergebnisse"],
		["images/signature1.png", "Unterschrift 1"],
		["appdata/records/mapping.json", "Zuordnung der Rec-Werte"]
	])("nennt den beschädigten Teil %s", (entry, part) => {
		const broken = rebuild(build(), (entries) => (entries[entry] = strToU8("{kaputt")));
		expectError(broken, `Die Projektdatei ist beschädigt: ${part} konnte nicht gelesen werden.`);
	});

	it("verlangt Einstellungen und Layout", () => {
		const withoutLayout = rebuild(build(), (entries) => delete entries["layout.json"]);
		expectError(withoutLayout, "Die Projektdatei ist beschädigt: Urkunden-Layout konnte nicht gelesen werden.");
	});

	it("meldet Hinweise aus Einstellungen und Layout", () => {
		const bytes = rebuild(build(), (entries) => {
			const settings = JSON.parse(strFromU8(entries["settings.json"] as Uint8Array));
			entries["settings.json"] = strToU8(JSON.stringify({ ...settings, ageGroups: 5 }));
		});
		const result = readProjectFile(bytes);
		if (!result.ok) throw new Error(result.message);
		expect(result.project.warnings).toHaveLength(1);
		expect(result.project.settings.ageGroups).toEqual(defaultSettings().ageGroups);
	});
});

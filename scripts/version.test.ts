import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	applyVersion,
	bump,
	isNewer,
	nextBetaNumber,
	notesHeadlineMatches,
	parsePlanArgs,
	planVersion,
	readVersions,
	releaseBranch,
	VERSION_FILES
} from "./version.mjs";

const TAGS = ["v1.0.0.4", "v2.0.0", "v2.0.1-beta.1", "v2.0.1-beta.2", "v1.9.0"];

describe("isNewer", () => {
	it.each([
		["2.0.1", "2.0.0", true],
		["2.1.0", "2.0.9", true],
		["10.0.0", "9.9.9", true],
		["2.0.0", "2.0.0", false],
		["2.0.0-beta.1", "2.0.0", false],
		["2.0.0", "2.0.0-beta.3", true],
		["2.0.0-beta.10", "2.0.0-beta.9", true]
	])("%s ist neuer als %s: %s", (a, b, expected) => {
		expect(isNewer(a, b)).toBe(expected);
	});
});

describe("bump", () => {
	it.each([
		["patch", "2.3.4", "2.3.5"],
		["minor", "2.3.4", "2.4.0"],
		["major", "2.3.4", "3.0.0"]
	])("%s von %s ergibt %s", (kind, base, expected) => {
		expect(bump(base, kind)).toBe(expected);
	});
});

describe("nextBetaNumber", () => {
	it("zählt nach der höchsten vorhandenen Beta weiter", () => {
		expect(nextBetaNumber("2.0.1", TAGS)).toBe(3);
		expect(nextBetaNumber("2.1.0", TAGS)).toBe(1);
	});
});

describe("parsePlanArgs", () => {
	it.each([
		[[], { beta: false, out: null, request: "", fallback: null }],
		[["2.0.0"], { beta: false, out: null, request: "2.0.0", fallback: null }],
		[["--beta", "minor"], { beta: true, out: null, request: "minor", fallback: null }],
		[["--out", "v.txt", "--beta", "patch"], { beta: true, out: "v.txt", request: "patch", fallback: null }],
		[["major", "--out", "v.txt"], { beta: false, out: "v.txt", request: "major", fallback: null }],
		[["--beta", "--otherwise", "patch"], { beta: true, out: null, request: "", fallback: "patch" }]
	])("liest %j", (args, expected) => {
		expect(parsePlanArgs(args)).toEqual(expected);
	});
});

describe("releaseBranch", () => {
	it("stabile Releases kommen aus main, Betas aus dev", () => {
		expect(releaseBranch("2.0.1")).toBe("main");
		expect(releaseBranch("2.0.1-beta.1")).toBe("dev");
	});
});

describe("planVersion", () => {
	const plan = (beta: boolean, request: string, tags = TAGS) =>
		planVersion({ beta, request, tags, currentVersion: "2.0.0" });

	it("erhöht ab dem letzten stabilen Tag und ignoriert vierteilige Alt-Tags", () => {
		expect(plan(false, "patch")).toEqual({ ok: true, version: "2.0.1" });
		expect(plan(false, "minor")).toEqual({ ok: true, version: "2.1.0" });
		expect(plan(false, "major")).toEqual({ ok: true, version: "3.0.0" });
	});

	it("nimmt ohne stabilen Tag die Version aus package.json als Basis", () => {
		expect(plan(false, "patch", ["v1.0.0.4"])).toEqual({ ok: true, version: "2.0.1" });
		expect(plan(false, "2.0.0", ["v1.0.0.4"])).toEqual({ ok: true, version: "2.0.0" });
	});

	it("beginnt vor dem ersten stabilen Release die Betas bei der Version aus package.json", () => {
		expect(plan(true, "", ["v1.0.0.4"])).toEqual({ ok: true, version: "2.0.0-beta.1" });
		expect(plan(true, "", [])).toEqual({ ok: true, version: "2.0.0-beta.1" });
		expect(planVersion({ beta: true, request: "", tags: [], currentVersion: "2.0.0-beta.4" })).toEqual({
			ok: true,
			version: "2.0.0-beta.1"
		});
		expect(plan(true, "", ["v2.0.0-beta.1", "v2.0.0-beta.2"])).toEqual({ ok: true, version: "2.0.0-beta.3" });
	});

	it("übernimmt eine ausdrückliche Version", () => {
		expect(plan(false, "2.2.0")).toEqual({ ok: true, version: "2.2.0" });
		expect(plan(false, "2.2.0-beta.4")).toEqual({ ok: true, version: "2.2.0-beta.4" });
	});

	it("setzt eine laufende Beta-Serie fort", () => {
		expect(plan(true, "")).toEqual({ ok: true, version: "2.0.1-beta.3" });
	});

	it("beginnt mit einem Schlüsselwort oder einer Basis eine neue Beta-Serie", () => {
		expect(plan(true, "minor")).toEqual({ ok: true, version: "2.1.0-beta.1" });
		expect(plan(true, "patch")).toEqual({ ok: true, version: "2.0.1-beta.3" });
		expect(plan(true, "3.0.0")).toEqual({ ok: true, version: "3.0.0-beta.1" });
	});

	it("fragt nach, wenn ohne Angabe keine Serie offen ist", () => {
		expect(plan(false, "")).toEqual({
			ok: false,
			ask: true,
			base: "2.0.0",
			choices: { patch: "2.0.1", minor: "2.1.0", major: "3.0.0" }
		});
		expect(plan(true, "", ["v2.0.0", "v2.0.0-beta.1"])).toEqual({
			ok: false,
			ask: true,
			base: "2.0.0",
			choices: { patch: "2.0.1-beta.1", minor: "2.1.0-beta.1", major: "3.0.0-beta.1" }
		});
	});

	it("lehnt ungültige, alte und schon vergebene Versionen ab", () => {
		expect(plan(false, "2.1")).toMatchObject({ ok: false, error: expect.stringContaining("Ungültige Version") });
		expect(plan(false, "1.9.9")).toMatchObject({ ok: false, error: expect.stringContaining("nicht neuer") });
		expect(plan(false, "2.0.0")).toMatchObject({ ok: false, error: expect.stringContaining("gibt es schon") });
		expect(plan(false, "2.0.0-beta.9")).toMatchObject({ ok: false, error: expect.stringContaining("nicht neuer") });
		expect(plan(false, "2.0.1-beta.2")).toMatchObject({ ok: false, error: expect.stringContaining("gibt es schon") });
	});
});

describe("notesHeadlineMatches", () => {
	it.each([
		["# Wettkampftools v2.0.0", "v2.0.0", true],
		["# Wettkampftools v2.0.0 ", "v2.0.0", true],
		["v2.0.0", "v2.0.0", true],
		["# Wettkampftools v2.0.0", "v2.0.0-beta.3", true],
		["# Wettkampftools v2.0.0-beta.3", "v2.0.0-beta.3", true],
		["# Wettkampftools v2.1.0-beta.3", "v2.1.0", false],
		["# Wettkampftools v2.0.10", "v2.0.1", false],
		["# Wettkampftools v2.0.1", "v2.0.10", false],
		["# Wettkampftools v2.0.0-beta.2", "v2.0.0-beta.3", false],
		["# Wettkampftools v2.0.0", "v2.0.1-beta.1", false],
		["# Wettkampftools xv2.0.0", "v2.0.0", false],
		["# Wettkampftools v2.0.0.1", "v2.0.0", false]
	])("„%s“ passt zu %s: %s", (headline, tag, expected) => {
		expect(notesHeadlineMatches(headline, tag)).toBe(expected);
	});
});

describe("applyVersion", () => {
	let root: string;

	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), "version-"));
		mkdirSync(join(root, "src-tauri"));
		writeFileSync(join(root, "package.json"), '{\n\t"name": "wettkampftools",\n\t"version": "2.0.0"\n}\n');
		writeFileSync(
			join(root, "src-tauri/tauri.conf.json"),
			'{\n\t"productName": "W",\n\t"version": "2.0.0-beta.2"\n}\n'
		);
		writeFileSync(
			join(root, "src-tauri/Cargo.toml"),
			'[package]\nname = "wettkampftools"\nversion = "2.0.0"\n\n[dependencies]\nserde = { version = "1" }\n'
		);
		writeFileSync(
			join(root, "src-tauri/Cargo.lock"),
			'[[package]]\nname = "serde"\nversion = "1.0.0"\n\n[[package]]\nname = "wettkampftools"\nversion = "2.0.0"\n'
		);
	});

	afterEach(() => rmSync(root, { recursive: true, force: true }));

	it("nennt die vier Versionsdateien", () => {
		expect(VERSION_FILES).toEqual([
			"package.json",
			"src-tauri/tauri.conf.json",
			"src-tauri/Cargo.toml",
			"src-tauri/Cargo.lock"
		]);
	});

	it("liest die Version jeder Datei", () => {
		expect(readVersions(root)).toEqual({
			"package.json": "2.0.0",
			"src-tauri/tauri.conf.json": "2.0.0-beta.2",
			"src-tauri/Cargo.toml": "2.0.0",
			"src-tauri/Cargo.lock": "2.0.0"
		});
	});

	it("schreibt die Version in alle Dateien, ohne Abhängigkeiten anzufassen", () => {
		applyVersion(root, "2.1.0-beta.1");
		expect(Object.values(readVersions(root))).toEqual(Array(4).fill("2.1.0-beta.1"));
		expect(readFileSync(join(root, "src-tauri/Cargo.lock"), "utf8")).toContain('name = "serde"\nversion = "1.0.0"');
		expect(readFileSync(join(root, "src-tauri/Cargo.toml"), "utf8")).toContain('serde = { version = "1" }');
	});

	it("bricht ab, wenn eine Datei keine Version enthält", () => {
		writeFileSync(join(root, "src-tauri/Cargo.toml"), "[package]\n");
		expect(() => applyVersion(root, "2.1.0")).toThrow("src-tauri/Cargo.toml");
	});
});

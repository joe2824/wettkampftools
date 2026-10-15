import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	buildNotices,
	isLicenseFileName,
	licenseFromText,
	normalizeLicenseText,
	npmAuthors,
	packageDirFromModuleId,
	readNpmPackage,
	rustDependencyIds
} from "./generate-licenses.mjs";

describe("packageDirFromModuleId", () => {
	it.each([
		["/app/node_modules/svelte/src/index.js", "/app/node_modules/svelte"],
		["/app/node_modules/@tauri-apps/api/core.js", "/app/node_modules/@tauri-apps/api"],
		["/app/node_modules/a/node_modules/b/x.js", "/app/node_modules/a/node_modules/b"],
		["\0/app/node_modules/fflate/esm/browser.js?commonjs-proxy", "/app/node_modules/fflate"],
		["C:\\app\\node_modules\\clsx\\dist\\clsx.mjs", "C:/app/node_modules/clsx"]
	])("%s → %s", (id, expected) => {
		expect(packageDirFromModuleId(id)).toBe(expected);
	});

	it.each(["/app/src/lib/x.ts", "\0vite/preload-helper.js", "/app/node_modules/"])(
		"%s gehört zu keinem Paket",
		(id) => {
			expect(packageDirFromModuleId(id)).toBeNull();
		}
	);
});

describe("isLicenseFileName", () => {
	it.each([
		["LICENSE", true],
		["LICENSE.md", true],
		["license.txt", true],
		["LICENCE", true],
		["LICENSE-MIT", true],
		["LICENSE-APACHE", true],
		["COPYING", true],
		["license.js", false],
		["license.d.ts", false],
		["licenses.json", false],
		["README.md", false]
	])("%s: %s", (name, expected) => {
		expect(isLicenseFileName(name)).toBe(expected);
	});
});

describe("normalizeLicenseText", () => {
	it("vereinheitlicht Zeilenenden und entfernt Leerraum am Rand", () => {
		expect(normalizeLicenseText("\uFEFF\r\n MIT  \r\nText \t\r\n\r\n")).toBe(" MIT\nText");
	});
});

describe("licenseFromText", () => {
	it.each([
		["MIT License\n\nCopyright (c) Anna Meier", "MIT"],
		["Copyright Anna Meier\n\nPermission is hereby granted, free of charge, to any person", "MIT"],
		["Eigene Bedingungen", ""],
		[null, ""]
	])("%s → %s", (text, expected) => {
		expect(licenseFromText(text)).toBe(expected);
	});
});

/** Kleiner Ausschnitt aus `cargo metadata`. */
function metadata() {
	const node = (id: string, deps: [string, string | null][]) => ({
		id,
		deps: deps.map(([pkg, kind]) => ({ pkg, dep_kinds: [{ kind, target: null }] }))
	});
	return {
		resolve: {
			root: "root",
			nodes: [
				node("root", [
					["serde", null],
					["tauri-build", "build"],
					["tempfile", "dev"]
				]),
				node("serde", [["serde_derive", null]]),
				node("serde_derive", [["serde", null]]),
				node("tauri-build", [["toml", null]]),
				node("tempfile", []),
				node("toml", [])
			]
		}
	};
}

describe("rustDependencyIds", () => {
	it("folgt nur normalen Abhängigkeiten und lässt das eigene Paket weg", () => {
		expect([...rustDependencyIds(metadata())].sort()).toEqual(["serde", "serde_derive"]);
	});

	it("ohne Wurzel bleibt die Liste leer", () => {
		expect(rustDependencyIds({ resolve: { root: null, nodes: [] } }).size).toBe(0);
	});
});

describe("buildNotices", () => {
	const mit = "MIT License\n\nCopyright (c) Max Mustermann";

	it("fasst gleiche Lizenztexte zusammen und sortiert nach Name", () => {
		const notices = buildNotices({
			npm: [
				{ name: "zeta", version: "1.0.0", license: "MIT", text: mit },
				{ name: "alpha", version: "2.0.0", license: "MIT", text: `${mit}\r\n` }
			],
			cargo: [{ name: "serde", version: "1.0.0", license: "MIT OR Apache-2.0", text: null }]
		});
		expect(notices.rust).toBe("ok");
		expect(notices.texts).toEqual([mit]);
		expect(notices.packages).toEqual([
			{ name: "alpha", version: "2.0.0", license: "MIT", source: "npm", texts: [0] },
			{ name: "serde", version: "1.0.0", license: "MIT OR Apache-2.0", source: "cargo", texts: [] },
			{ name: "zeta", version: "1.0.0", license: "MIT", source: "npm", texts: [0] }
		]);
	});

	it("legt die Apache-Bedingungen nur einmal ab, auch bei abweichendem Leerraum", () => {
		const terms = (gap: string) =>
			`Apache License\n${gap}Version 2.0, January 2004\n\n1. Definitions.\n\nEND OF TERMS AND CONDITIONS`;
		const notices = buildNotices({
			npm: [],
			cargo: [
				{ name: "a", version: "1.0.0", license: "Apache-2.0", text: `${terms("")}\n\nCopyright 2020 Anna Meier` },
				{ name: "b", version: "1.0.0", license: "Apache-2.0", text: terms("        ") }
			]
		});
		expect(notices.texts).toEqual([terms(""), "Copyright 2020 Anna Meier"]);
		expect(notices.packages.map((pkg) => pkg.texts)).toEqual([[0, 1], [0]]);
	});

	it("vermerkt fehlende Rust-Angaben", () => {
		const notices = buildNotices({ npm: [], cargo: null });
		expect(notices.rust).toBe("unavailable");
		expect(notices.packages).toEqual([]);
	});

	it("ohne Lizenzangabe steht „unbekannt“", () => {
		const notices = buildNotices({ npm: [{ name: "x", version: "1.0.0", license: "", text: null }], cargo: [] });
		expect(notices.packages[0].license).toBe("unbekannt");
	});
});

describe("npmAuthors", () => {
	it.each([
		[{ author: "Anna Meier <anna@example.org>" }, ["Anna Meier <anna@example.org>"]],
		[{ author: { name: "Max Mustermann", email: "max@example.org" } }, ["Max Mustermann"]],
		[{}, []]
	])("%j → %j", (pkg, expected) => {
		expect(npmAuthors(pkg)).toEqual(expected);
	});
});

describe("readNpmPackage", () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "licenses-"));
	});

	afterEach(() => rmSync(dir, { recursive: true, force: true }));

	it("nimmt ohne Lizenzdatei den SPDX-Standardtext samt Urheber", () => {
		const pkg = { name: "beispiel", version: "1.0.0", license: "MIT", author: "Anna Meier" };
		writeFileSync(join(dir, "package.json"), JSON.stringify(pkg));
		const result = readNpmPackage(dir);
		expect(result.text).toMatch(/^Copyright \(c\) Anna Meier\n\nMIT License\n\nPermission is hereby granted/);
	});

	it("bevorzugt die mitgelieferte Lizenzdatei", () => {
		writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "b", version: "1.0.0", license: "MIT" }));
		writeFileSync(join(dir, "LICENSE"), "Eigener Text");
		expect(readNpmPackage(dir).text).toBe("Eigener Text");
	});
});

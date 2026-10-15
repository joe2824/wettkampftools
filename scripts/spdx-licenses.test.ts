import { describe, expect, it } from "vitest";
import { fallbackLicenseText, missingLicenseTexts, readSpdxText, spdxLicenseIds } from "./spdx-licenses.mjs";

describe("spdxLicenseIds", () => {
	it.each([
		["MIT", ["MIT"]],
		["MIT OR Apache-2.0", ["MIT", "Apache-2.0"]],
		["MIT/Apache-2.0", ["MIT", "Apache-2.0"]],
		["Apache-2.0 / MIT", ["Apache-2.0", "MIT"]],
		["(MIT OR Apache-2.0) AND Unicode-3.0", ["MIT", "Apache-2.0", "Unicode-3.0"]],
		["0BSD OR MIT OR Apache-2.0", ["0BSD", "MIT", "Apache-2.0"]],
		["Apache-2.0 WITH LLVM-exception", ["Apache-2.0", "LLVM-exception"]],
		["MIT OR MIT", ["MIT"]],
		["", []]
	])("%s → %j", (expression, expected) => {
		expect(spdxLicenseIds(expression)).toEqual(expected);
	});
});

describe("readSpdxText", () => {
	it("liest den mitgelieferten Text ohne Quellenkopf und ohne Platzhalter-Copyright", () => {
		const text = readSpdxText("MIT");
		expect(text).toMatch(/^MIT License\n\nPermission is hereby granted/);
		expect(text).not.toContain("<year>");
		expect(text).not.toContain("# Quelle");
	});

	it("entfernt auch die Platzhalterzeile von 0BSD", () => {
		expect(readSpdxText("0BSD")).toMatch(/^Permission to use/);
	});

	it.each(["MIT", "Apache-2.0", "BSD-3-Clause", "MPL-2.0", "ISC", "Zlib", "0BSD", "Unlicense", "Unicode-3.0"])(
		"liefert %s mit",
		(id) => {
			expect(readSpdxText(id)?.length).toBeGreaterThan(100);
		}
	);

	it("unbekannte oder unzulässige Kennungen ergeben null", () => {
		expect(readSpdxText("Proprietär-1.0")).toBeNull();
		expect(readSpdxText("../package")).toBeNull();
	});
});

describe("fallbackLicenseText", () => {
	const texts: Record<string, string> = { MIT: "MIT-Text", "Apache-2.0": "Apache-Text" };
	const read = (id: string) => texts[id] ?? null;

	it("stellt die Urheber aus den Paketangaben vor alle Lizenztexte", () => {
		expect(fallbackLicenseText("MIT OR Apache-2.0", ["Anna Meier", "Max Mustermann"], read)).toBe(
			"Copyright (c) Anna Meier, Max Mustermann\n\nMIT-Text\n\nApache-Text"
		);
	});

	it("ohne Urheber nur die Lizenztexte", () => {
		expect(fallbackLicenseText("MIT", [], read)).toBe("MIT-Text");
	});

	it("fehlt ein Text, bleibt es bei null", () => {
		expect(fallbackLicenseText("MIT AND Zlib", ["Anna Meier"], read)).toBeNull();
		expect(fallbackLicenseText("", ["Anna Meier"], read)).toBeNull();
	});
});

describe("missingLicenseTexts", () => {
	it("nennt jedes Paket ohne Lizenztext", () => {
		const packages = [
			{ name: "a", version: "1.0.0", texts: [0] },
			{ name: "b", version: "2.0.0", texts: [] }
		];
		expect(missingLicenseTexts({ packages })).toEqual(["b@2.0.0"]);
	});
});

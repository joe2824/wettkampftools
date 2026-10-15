import { describe, expect, it, vi } from "vitest";
import {
	filterPackages,
	licenseCounts,
	loadThirdPartyLicenses,
	type ThirdPartyNotices,
	type ThirdPartyPackage
} from "./thirdPartyLicenses";

const pkg = (name: string, license: string, source: "npm" | "cargo" = "npm"): ThirdPartyPackage => ({
	name,
	version: "1.0.0",
	license,
	source,
	texts: []
});

const notices: ThirdPartyNotices = {
	rust: "ok",
	texts: ["MIT License"],
	packages: [pkg("svelte", "MIT"), pkg("serde", "MIT OR Apache-2.0", "cargo"), pkg("tslib", "0BSD")]
};

describe("loadThirdPartyLicenses", () => {
	it("lädt die Datei neben der Anwendung", async () => {
		const fetchFn = vi.fn(async () => new Response(JSON.stringify(notices)));
		await expect(loadThirdPartyLicenses(fetchFn)).resolves.toEqual({ status: "ok", notices });
		expect(fetchFn).toHaveBeenCalledWith("/third-party-licenses.json");
	});

	it("meldet eine fehlende Datei (etwa in der Entwicklung)", async () => {
		const fetchFn = vi.fn(async () => new Response("", { status: 404 }));
		await expect(loadThirdPartyLicenses(fetchFn)).resolves.toEqual({ status: "missing" });
	});

	it("meldet unlesbaren Inhalt als fehlend", async () => {
		const fetchFn = vi.fn(async () => new Response("<html>"));
		await expect(loadThirdPartyLicenses(fetchFn)).resolves.toEqual({ status: "missing" });
	});

	it("meldet Netzwerkfehler als fehlend", async () => {
		const fetchFn = vi.fn(async () => {
			throw new TypeError("offline");
		});
		await expect(loadThirdPartyLicenses(fetchFn)).resolves.toEqual({ status: "missing" });
	});
});

describe("filterPackages", () => {
	it("findet nach Name und Lizenz, ohne Groß-/Kleinschreibung", () => {
		expect(filterPackages(notices.packages, "SER").map((p) => p.name)).toEqual(["serde"]);
		expect(filterPackages(notices.packages, "apache").map((p) => p.name)).toEqual(["serde"]);
	});

	it("leere Suche liefert alle", () => {
		expect(filterPackages(notices.packages, "  ")).toHaveLength(3);
	});
});

describe("licenseCounts", () => {
	it("zählt je Lizenzangabe, häufigste zuerst", () => {
		const counts = licenseCounts([...notices.packages, pkg("clsx", "MIT")]);
		expect(counts).toEqual([
			{ license: "MIT", count: 2 },
			{ license: "0BSD", count: 1 },
			{ license: "MIT OR Apache-2.0", count: 1 }
		]);
	});
});

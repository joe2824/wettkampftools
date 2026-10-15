import { describe, expect, it } from "vitest";
import { FOOTER_ITEMS, NAVIGATION_GROUPS, isActiveRoute } from "./navigation";

const allItems = [...NAVIGATION_GROUPS.flatMap((group) => group.items), ...FOOTER_ITEMS];

describe("Navigation", () => {
	it("hat eindeutige Ziele, die mit / beginnen", () => {
		const hrefs = allItems.map((item) => item.href);
		expect(new Set(hrefs).size).toBe(hrefs.length);
		for (const href of hrefs) expect(href.startsWith("/")).toBe(true);
	});

	it("enthält alle Seiten in der erwarteten Reihenfolge", () => {
		expect(NAVIGATION_GROUPS.map((group) => group.label)).toEqual(["Wellenwettkampf", "Werkzeuge"]);
		expect(allItems.map((item) => item.label)).toEqual([
			"Vorbereitung",
			"Auswertung",
			"Urkunden",
			"Entfernungen",
			"Urkunden-Layout",
			"Regelwerk fürs neue Jahr",
			"Einstellungen"
		]);
	});
});

describe("isActiveRoute", () => {
	it("markiert die exakt passende Seite", () => {
		expect(isActiveRoute("/certificates", "/certificates")).toBe(true);
		expect(isActiveRoute("/certificates/", "/certificates")).toBe(true);
	});

	it("markiert keine Elternseite bei Unterseiten", () => {
		expect(isActiveRoute("/certificates/layout", "/certificates")).toBe(false);
		expect(isActiveRoute("/certificates/layout", "/certificates/layout")).toBe(true);
	});

	it("markiert keine fremde Seite", () => {
		expect(isActiveRoute("/", "/settings")).toBe(false);
	});
});

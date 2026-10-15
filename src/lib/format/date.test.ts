import { describe, expect, it } from "vitest";
import { formatGermanDate, formatGermanDateTime } from "./date";

describe("formatGermanDate", () => {
	it("schreibt ISO-Datum lang auf Deutsch", () => {
		expect(formatGermanDate("2026-11-14")).toBe("14. November 2026");
		expect(formatGermanDate("2026-03-01")).toBe("1. März 2026");
	});

	it("liefert leer bei leerem oder ungültigem Datum", () => {
		expect(formatGermanDate("")).toBe("");
		expect(formatGermanDate("14.11.2026")).toBe("");
		expect(formatGermanDate("2026-13-01")).toBe("");
	});
});

describe("formatGermanDateTime", () => {
	it("schreibt Datum und Uhrzeit in Ortszeit", () => {
		expect(formatGermanDateTime("2026-10-14T09:05:00.000Z")).toBe("14.10.2026, 11:05 Uhr");
		expect(formatGermanDateTime("2026-01-02T23:30:00.000Z")).toBe("03.01.2026, 00:30 Uhr");
	});

	it("liefert leer bei ungültigem Zeitpunkt", () => {
		expect(formatGermanDateTime("gestern")).toBe("");
	});
});

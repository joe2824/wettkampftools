import { describe, expect, it } from "vitest";
import { shouldShowRecUpdateHint } from "./updateHint";

const TODAY = new Date(2026, 9, 15);

describe("shouldShowRecUpdateHint", () => {
	it("zeigt den Hinweis, solange ein neuer Wettkampf vorbereitet wird", () => {
		expect(shouldShowRecUpdateHint({ hasResults: false, eventDate: "", today: TODAY })).toBe(true);
		expect(shouldShowRecUpdateHint({ hasResults: false, eventDate: "2026-11-21", today: TODAY })).toBe(true);
		expect(shouldShowRecUpdateHint({ hasResults: false, eventDate: "2026-10-15", today: TODAY })).toBe(true);
	});

	it("blendet ihn aus, sobald Ergebnisse geladen sind", () => {
		expect(shouldShowRecUpdateHint({ hasResults: true, eventDate: "", today: TODAY })).toBe(false);
	});

	it("blendet ihn nach dem Wettkampftag aus", () => {
		expect(shouldShowRecUpdateHint({ hasResults: false, eventDate: "2026-10-14", today: TODAY })).toBe(false);
	});

	it("zeigt ihn bei unlesbarem Datum", () => {
		expect(shouldShowRecUpdateHint({ hasResults: false, eventDate: "irgendwann", today: TODAY })).toBe(true);
	});
});

import { describe, expect, it } from "vitest";
import type { CertificatePage } from "$lib/certificates/model";
import {
	clampPage,
	hasMultiplePagesPerEntry,
	nextEntryPage,
	pageCaption,
	pageForKey,
	parsePageNumber,
	previousEntryPage
} from "./certificatePreview";

function page(entryId: string, copyIndex: number, mitglied = ""): CertificatePage {
	return {
		entryId,
		copyIndex,
		values: { name: "Musterstadt 2", platz: "3", altersklasse: "AK 13/14", geschlecht: "weiblich", mitglied }
	};
}

const PAGES: CertificatePage[] = [
	page("row1", 0, "Anna Meier"),
	page("row1", 1, "Max Mustermann"),
	page("row1", 2),
	page("row2", 0)
];

describe("clampPage", () => {
	it("hält die Seite im gültigen Bereich", () => {
		expect(clampPage(-1, 4)).toBe(0);
		expect(clampPage(9, 4)).toBe(3);
		expect(clampPage(2, 4)).toBe(2);
		expect(clampPage(5, 0)).toBe(0);
	});
});

describe("parsePageNumber", () => {
	it("wandelt die eingegebene Seitenzahl in eine Position", () => {
		expect(parsePageNumber("3", 4)).toBe(2);
		expect(parsePageNumber(" 1 ", 4)).toBe(0);
	});

	it("begrenzt zu große oder zu kleine Zahlen", () => {
		expect(parsePageNumber("99", 4)).toBe(3);
		expect(parsePageNumber("0", 4)).toBe(0);
	});

	it("liefert null bei leerer oder ungültiger Eingabe", () => {
		expect(parsePageNumber("", 4)).toBeNull();
		expect(parsePageNumber("abc", 4)).toBeNull();
		expect(parsePageNumber("2,5", 4)).toBeNull();
	});
});

describe("pageForKey", () => {
	it("blättert mit den Pfeiltasten, Pos1 und Ende", () => {
		expect(pageForKey("ArrowRight", 1, PAGES)).toBe(2);
		expect(pageForKey("ArrowLeft", 1, PAGES)).toBe(0);
		expect(pageForKey("Home", 2, PAGES)).toBe(0);
		expect(pageForKey("End", 0, PAGES)).toBe(3);
	});

	it("springt mit Bild auf und ab von Platz zu Platz", () => {
		expect(pageForKey("PageDown", 1, PAGES)).toBe(3);
		expect(pageForKey("PageUp", 3, PAGES)).toBe(0);
	});

	it("bleibt am Rand stehen und ignoriert andere Tasten", () => {
		expect(pageForKey("ArrowRight", 3, PAGES)).toBe(3);
		expect(pageForKey("ArrowLeft", 0, PAGES)).toBe(0);
		expect(pageForKey("Enter", 1, PAGES)).toBeNull();
	});
});

describe("nextEntryPage / previousEntryPage", () => {
	const many = [...PAGES, page("row3", 0), page("row3", 1)];

	it("springt zur ersten Seite des nächsten Eintrags", () => {
		expect(nextEntryPage(many, 0)).toBe(3);
		expect(nextEntryPage(many, 2)).toBe(3);
		expect(nextEntryPage(many, 3)).toBe(4);
	});

	it("bleibt beim letzten Eintrag stehen", () => {
		expect(nextEntryPage(many, 4)).toBe(4);
		expect(nextEntryPage(many, 5)).toBe(5);
		expect(nextEntryPage([], 0)).toBe(0);
	});

	it("springt zur ersten Seite des vorherigen Eintrags, auch mitten aus einem Eintrag", () => {
		expect(previousEntryPage(many, 5)).toBe(3);
		expect(previousEntryPage(many, 4)).toBe(3);
		expect(previousEntryPage(many, 3)).toBe(0);
		expect(previousEntryPage(many, 2)).toBe(0);
		expect(previousEntryPage(many, 0)).toBe(0);
	});
});

describe("hasMultiplePagesPerEntry", () => {
	it("erkennt mehrere Urkunden je Eintrag", () => {
		expect(hasMultiplePagesPerEntry(PAGES)).toBe(true);
		expect(hasMultiplePagesPerEntry([page("row1", 0), page("row2", 0)])).toBe(false);
	});
});

describe("pageCaption", () => {
	it("nennt Seite, Mannschaft, Platz, Altersklasse, Urkunde und Mitglied", () => {
		expect(pageCaption(PAGES, 1)).toBe(
			"Seite 2 von 4 · Musterstadt 2 · 3. Platz · AK 13/14 weiblich · Urkunde 2/3 · Max Mustermann"
		);
	});

	it("lässt das Mitglied weg, wenn keines gedruckt wird", () => {
		expect(pageCaption(PAGES, 2)).toBe("Seite 3 von 4 · Musterstadt 2 · 3. Platz · AK 13/14 weiblich · Urkunde 3/3");
	});

	it("lässt die Urkundennummer bei nur einer Urkunde je Eintrag weg", () => {
		expect(pageCaption(PAGES, 3)).toBe("Seite 4 von 4 · Musterstadt 2 · 3. Platz · AK 13/14 weiblich");
	});

	it("liefert leer ohne Seiten", () => {
		expect(pageCaption([], 0)).toBe("");
	});
});

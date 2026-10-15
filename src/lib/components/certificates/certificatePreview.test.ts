import { describe, expect, it } from "vitest";
import type { CertificatePage } from "$lib/certificates/model";
import { clampPage, pageCaption, pageForKey, parsePageNumber } from "./certificatePreview";

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
		expect(pageForKey("ArrowRight", 1, 4)).toBe(2);
		expect(pageForKey("ArrowLeft", 1, 4)).toBe(0);
		expect(pageForKey("Home", 2, 4)).toBe(0);
		expect(pageForKey("End", 0, 4)).toBe(3);
	});

	it("bleibt am Rand stehen und ignoriert andere Tasten", () => {
		expect(pageForKey("ArrowRight", 3, 4)).toBe(3);
		expect(pageForKey("ArrowLeft", 0, 4)).toBe(0);
		expect(pageForKey("Enter", 1, 4)).toBeNull();
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

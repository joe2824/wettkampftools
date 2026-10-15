import { describe, expect, it } from "vitest";
import { PLACEHOLDERS, fillTemplate, parseTemplate, placeholderKeysIn } from "./layoutTemplate";

describe("PLACEHOLDERS", () => {
	it("enthält alle deutschen Platzhalter mit Beschreibung", () => {
		const tokens = PLACEHOLDERS.map((p) => p.token);
		expect(tokens).toEqual([
			"{name}",
			"{mitglied}",
			"{gliederung}",
			"{wertung}",
			"{altersklasse}",
			"{geschlecht}",
			"{wettkampfpunkte}",
			"{platz}",
			"{nr}",
			"{titel}",
			"{ausrichter}",
			"{datum}",
			"{ort}",
			"{unterzeichner1}",
			"{funktion1}",
			"{unterzeichner2}",
			"{funktion2}"
		]);
		for (const p of PLACEHOLDERS) {
			expect(p.token).toBe(`{${p.key}}`);
			expect(p.description.length).toBeGreaterThan(0);
		}
	});
});

describe("parseTemplate", () => {
	it("liefert normalen Text als einen Abschnitt", () => {
		expect(parseTemplate("erreichte beim")).toEqual([{ text: "erreichte beim", bold: false }]);
	});

	it("trennt Fettdruck-Abschnitte und lässt Platzhalter stehen", () => {
		expect(parseTemplate("mit **{wettkampfpunkte}** Punkten")).toEqual([
			{ text: "mit ", bold: false },
			{ text: "{wettkampfpunkte}", bold: true },
			{ text: " Punkten", bold: false }
		]);
	});

	it("lässt leere Abschnitte weg", () => {
		expect(parseTemplate("**{platz}. Platz**")).toEqual([{ text: "{platz}. Platz", bold: true }]);
		expect(parseTemplate("")).toEqual([]);
	});

	it("behandelt ein unpaariges ** als normalen Text", () => {
		expect(parseTemplate("a **b** c **d")).toEqual([
			{ text: "a ", bold: false },
			{ text: "b", bold: true },
			{ text: " c **d", bold: false }
		]);
	});
});

describe("fillTemplate", () => {
	it("ersetzt Platzhalter und behält Fettdruck", () => {
		expect(fillTemplate("in der **{wertung}**", { wertung: "Rettungswertung" })).toEqual([
			{ text: "in der ", bold: false },
			{ text: "Rettungswertung", bold: true }
		]);
	});

	it("lässt unbekannte und fehlende Platzhalter wörtlich stehen", () => {
		expect(fillTemplate("{foo} und {ort}", {})).toEqual([{ text: "{foo} und {ort}", bold: false }]);
	});

	it("wertet Sternchen in eingesetzten Werten nicht als Fettdruck", () => {
		expect(fillTemplate("{name}", { name: "**Anna Meier**" })).toEqual([
			{ text: "**Anna Meier**", bold: false }
		]);
	});

	it("ersetzt mehrere Platzhalter in einem Abschnitt", () => {
		expect(
			fillTemplate("**{altersklasse} {geschlecht}**", { altersklasse: "AK 12", geschlecht: "weiblich" })
		).toEqual([{ text: "AK 12 weiblich", bold: true }]);
	});
});

describe("placeholderKeysIn", () => {
	it("liefert die bekannten Platzhalter in Reihenfolge, unbekannte nicht", () => {
		expect(placeholderKeysIn("({gliederung}) {foo} {name}")).toEqual(["gliederung", "name"]);
		expect(placeholderKeysIn("ohne Platzhalter")).toEqual([]);
	});
});

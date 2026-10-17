import { describe, expect, it } from "vitest";
import { TROPHY_RULES_TEXT, trophyRulesText } from "./rulesText";

const COUNT_WITH_PLACE = "Gezählt werden die Mannschaften mit Platz in der jeweiligen Altersklasse und Geschlecht.";

describe("trophyRulesText", () => {
	it("zeigt das Punktesystem mit Rechenbeispiel, ohne den Regeltext zur Pokalvergabe", () => {
		const text = TROPHY_RULES_TEXT.join("\n");
		expect(text).not.toContain("Pokalwertung:");
		expect(text).not.toContain("Treppchen");
		expect(text).toContain("Punktesystem: Gewertet wird nach Altersklassen sowie männlich und weiblich getrennt.");
		expect(text).toContain(
			"5 Mannschaften: 1. Platz = 6 Punkte, 2. Platz = 4, 3. Platz = 3, 4. Platz = 2, 5. Platz = 1 Punkt."
		);
		expect(text).toContain("Maßgeblich ist der Platz aus JAuswertung, auch bei Platzgleichheit.");
		expect(text).toContain("über den Pokal entscheidet bei Gleichstand die Wettkampfleitung.");
	});

	it("ist standardmäßig der Text mit Ausschluss von Teams ohne Platz", () => {
		expect(TROPHY_RULES_TEXT).toEqual(trophyRulesText({ excludeUnplaced: true }));
		expect(TROPHY_RULES_TEXT).toContain(COUNT_WITH_PLACE);
	});

	it("passt die Zählregel an, wenn Teams ohne Platz mitgezählt werden", () => {
		const paragraphs = trophyRulesText({ excludeUnplaced: false });
		expect(paragraphs).not.toContain(COUNT_WITH_PLACE);
		expect(paragraphs.join("\n")).toContain("ohne Platz");
		expect(paragraphs.join("\n")).toContain("0 Punkte");
	});
});

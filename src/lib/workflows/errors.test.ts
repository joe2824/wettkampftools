import { describe, expect, it } from "vitest";
import { userMessage } from "./errors";

const FALLBACK = "Das hat nicht geklappt.";

describe("userMessage", () => {
	it("übernimmt Texte der Desktop-Hülle", () => {
		expect(userMessage("Die Datei ist gesperrt.", FALLBACK)).toBe("Die Datei ist gesperrt.");
	});

	it("übernimmt Meldungen eigener Fehler", () => {
		expect(userMessage(new Error("Es sind keine Urkunden ausgewählt."), FALLBACK)).toBe(
			"Es sind keine Urkunden ausgewählt."
		);
	});

	it("ersetzt Programmfehler und Leeres durch den Ersatztext", () => {
		expect(userMessage(new TypeError("x is undefined"), FALLBACK)).toBe(FALLBACK);
		expect(userMessage(new RangeError("bad"), FALLBACK)).toBe(FALLBACK);
		expect(userMessage("", FALLBACK)).toBe(FALLBACK);
		expect(userMessage(new Error(""), FALLBACK)).toBe(FALLBACK);
		expect(userMessage({ code: 1 }, FALLBACK)).toBe(FALLBACK);
	});
});

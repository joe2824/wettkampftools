import { describe, expect, it } from "vitest";
import { formatRecTime, parseRecTime } from "./time";

describe("formatRecTime", () => {
	it("zeigt Zeiten unter einer Minute in Sekunden", () => {
		expect(formatRecTime(5817)).toBe("58,17 s");
		expect(formatRecTime(705)).toBe("7,05 s");
	});

	it("zeigt längere Zeiten mit Minuten", () => {
		expect(formatRecTime(8345)).toBe("1:23,45");
		expect(formatRecTime(20945)).toBe("3:29,45");
		expect(formatRecTime(6000)).toBe("1:00,00");
	});
});

describe("parseRecTime", () => {
	it("liest Sekunden mit Komma, Punkt und Einheit", () => {
		expect(parseRecTime("58,17")).toBe(5817);
		expect(parseRecTime(" 58.17 s ")).toBe(5817);
		expect(parseRecTime("58")).toBe(5800);
		expect(parseRecTime("58,1")).toBe(5810);
	});

	it("liest Minuten und Sekunden", () => {
		expect(parseRecTime("1:23,45")).toBe(8345);
		expect(parseRecTime("3:29.45")).toBe(20945);
	});

	it("liest, was formatRecTime ausgibt", () => {
		for (const value of [5817, 8345, 20945]) expect(parseRecTime(formatRecTime(value))).toBe(value);
	});

	it("lehnt Unlesbares, Null und zu große Sekunden ab", () => {
		for (const text of ["", "abc", "0", "1:60,00", "1:2,00", "58,123", "-5"]) {
			expect(parseRecTime(text)).toBeNull();
		}
	});
});

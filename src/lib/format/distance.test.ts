import { describe, expect, it } from "vitest";
import { formatKm } from "./distance";

describe("formatKm", () => {
	it("schreibt Kilometer mit zwei Nachkommastellen und Komma", () => {
		expect(formatKm(28.8)).toBe("28,80");
		expect(formatKm(1234.567)).toBe("1.234,57");
	});
});

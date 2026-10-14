import { describe, expect, it } from "vitest";
import {
	checkBoolean,
	checkIntegerInRange,
	checkNumberInRange,
	checkString,
	checkStringList,
	IssueCollector,
	isRecord,
	parseSection,
} from "./validate";

describe("isRecord", () => {
	it("erkennt nur einfache Objekte", () => {
		expect(isRecord({})).toBe(true);
		expect(isRecord(null)).toBe(false);
		expect(isRecord([])).toBe(false);
		expect(isRecord("x")).toBe(false);
	});
});

describe("checkStringList", () => {
	const fallback = ["AK 10"];

	it("kürzt, entfernt Leere und Doppelte (ohne Groß-/Kleinschreibung)", () => {
		const result = checkStringList(["  AK 12 ", "", "AK 12", "ak 12", "AK 10"], fallback, "list");
		expect(result).toEqual({ value: ["AK 12", "AK 10"] });
	});

	it("verwirft Nicht-Texte mit Hinweis", () => {
		expect(checkStringList(["AK 12", 5], fallback, "list")).toEqual({
			value: ["AK 12"],
			issue: "list.invalidEntries",
		});
	});

	it("fällt bei leerer Liste auf den Standard zurück", () => {
		expect(checkStringList(["  "], fallback, "list")).toEqual({ value: fallback, issue: "list.empty" });
	});

	it("fällt bei falschem Typ auf den Standard zurück", () => {
		expect(checkStringList("AK 10", fallback, "list")).toEqual({ value: fallback, issue: "list.invalid" });
	});

	it("liefert eine Kopie des Standards", () => {
		const result = checkStringList(42, fallback, "list");
		expect(result.value).not.toBe(fallback);
	});
});

describe("checkString / checkBoolean", () => {
	it("übernimmt gültige Werte", () => {
		expect(checkString("Titel", "x", "title")).toEqual({ value: "Titel" });
		expect(checkBoolean(false, true, "flag")).toEqual({ value: false });
	});

	it("ersetzt ungültige Werte", () => {
		expect(checkString(3, "x", "title")).toEqual({ value: "x", issue: "title.invalid" });
		expect(checkBoolean("true", true, "flag")).toEqual({ value: true, issue: "flag.invalid" });
	});
});

describe("checkIntegerInRange", () => {
	it("übernimmt gültige Ganzzahlen", () => {
		expect(checkIntegerInRange(3, 5, 1, 10, "n")).toEqual({ value: 3 });
	});

	it("begrenzt auf den Bereich", () => {
		expect(checkIntegerInRange(99, 5, 1, 10, "n")).toEqual({ value: 10, issue: "n.clamped" });
		expect(checkIntegerInRange(0, 5, 1, 10, "n")).toEqual({ value: 1, issue: "n.clamped" });
	});

	it("rundet Kommazahlen", () => {
		expect(checkIntegerInRange(2.6, 5, 1, 10, "n")).toEqual({ value: 3, issue: "n.rounded" });
	});

	it("ersetzt Nicht-Zahlen", () => {
		expect(checkIntegerInRange("3", 5, 1, 10, "n")).toEqual({ value: 5, issue: "n.invalid" });
		expect(checkIntegerInRange(Number.NaN, 5, 1, 10, "n")).toEqual({ value: 5, issue: "n.invalid" });
	});
});

describe("checkNumberInRange", () => {
	it("übernimmt Kommazahlen und begrenzt", () => {
		expect(checkNumberInRange(-2.5, 0, -20, 20, "x")).toEqual({ value: -2.5 });
		expect(checkNumberInRange(25, 0, -20, 20, "x")).toEqual({ value: 20, issue: "x.clamped" });
		expect(checkNumberInRange(Infinity, 0, -20, 20, "x")).toEqual({ value: 0, issue: "x.invalid" });
	});
});

describe("IssueCollector", () => {
	it("übernimmt fehlende Felder still und sammelt Hinweise", () => {
		const collector = new IssueCollector();
		const source = { present: 3 };
		expect(collector.take(source, "missing", "x", () => checkString(source, "x", "missing"))).toBe("x");
		expect(collector.take(source, "present", "x", () => checkString(source.present, "x", "present"))).toBe("x");
		collector.report("other.invalid");
		expect(collector.issues).toEqual(["present.invalid", "other.invalid"]);
	});
});

describe("parseSection", () => {
	const parse = (input: Record<string, unknown>) => ({ size: Number(input.size) });

	it("liefert den Standard, wenn der Abschnitt fehlt oder ungültig ist", () => {
		const collector = new IssueCollector();
		expect(parseSection({}, "box", { size: 1 }, collector, parse)).toEqual({ size: 1 });
		expect(parseSection({ box: 5 }, "box", { size: 1 }, collector, parse)).toEqual({ size: 1 });
		expect(collector.issues).toEqual(["box.invalid"]);
	});

	it("wertet einen gültigen Abschnitt aus", () => {
		const collector = new IssueCollector();
		expect(parseSection({ box: { size: 2 } }, "box", { size: 1 }, collector, parse)).toEqual({ size: 2 });
	});
});

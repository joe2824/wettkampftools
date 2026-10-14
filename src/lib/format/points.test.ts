import { describe, expect, it } from "vitest";
import { formatCompetitionPoints, formatTrophyPoints } from "./points";

describe("formatCompetitionPoints", () => {
  it("setzt zwei Nachkommastellen mit Komma und ohne Tausendertrennung", () => {
    expect(formatCompetitionPoints(1234.5)).toBe("1234,50");
    expect(formatCompetitionPoints(1234567.891)).toBe("1234567,89");
  });

  it("formatiert 0 als 0,00", () => {
    expect(formatCompetitionPoints(0)).toBe("0,00");
  });

  it("behält das Vorzeichen bei negativen Werten", () => {
    expect(formatCompetitionPoints(-12.3)).toBe("-12,30");
  });

  it("liefert bei fehlenden Punkten einen leeren Text", () => {
    expect(formatCompetitionPoints(null)).toBe("");
  });
});

describe("formatTrophyPoints", () => {
  it("gibt ganze Zahlen als Text aus", () => {
    expect(formatTrophyPoints(0)).toBe("0");
    expect(formatTrophyPoints(17)).toBe("17");
  });
});

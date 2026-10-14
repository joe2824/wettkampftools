import { describe, expect, it } from "vitest";
import { formatGermanDate } from "./date";

describe("formatGermanDate", () => {
  it("schreibt ISO-Datum lang auf Deutsch", () => {
    expect(formatGermanDate("2026-11-14")).toBe("14. November 2026");
    expect(formatGermanDate("2026-03-01")).toBe("1. März 2026");
  });

  it("liefert leer bei leerem oder ungültigem Datum", () => {
    expect(formatGermanDate("")).toBe("");
    expect(formatGermanDate("14.11.2026")).toBe("");
    expect(formatGermanDate("2026-13-01")).toBe("");
  });
});

import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createMetrics, loadFontBytes } from "$lib/certificates/fonts";
import { ptToMm } from "$lib/certificates/layout";
import { paragraphOps, wrapText } from "./text";

const metrics = createMetrics(
  await loadFontBytes(
    async (path) => new Uint8Array(await readFile(`static${path}`)),
  ),
);
const SIZE_PT = 10;
const width = (text: string) => metrics.widthMm(text, "regular", SIZE_PT);

describe("wrapText", () => {
  it("lässt kurzen Text in einer Zeile", () => {
    expect(wrapText("Anna Meier", 100, "regular", SIZE_PT, metrics)).toEqual([
      "Anna Meier",
    ]);
  });

  it("bricht an Wortgrenzen um und hält die Breite ein", () => {
    const text =
      "Die Ortsgruppe Musterstadt gewinnt den Pokal vor der Ortsgruppe Beispielhausen";
    const lines = wrapText(text, 40, "regular", SIZE_PT, metrics);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(" ")).toBe(text);
    for (const line of lines) expect(width(line)).toBeLessThanOrEqual(40);
  });

  it("teilt überlange Wörter zeichenweise", () => {
    const word = "Rettungsschwimmwettkampfmannschaftsaufstellung";
    const lines = wrapText(word, 15, "regular", SIZE_PT, metrics);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join("")).toBe(word);
    for (const line of lines) expect(width(line)).toBeLessThanOrEqual(15);
  });

  it("fasst Leerraum zusammen und liefert für leeren Text keine Zeile", () => {
    expect(
      wrapText("  Anna   Meier  ", 100, "regular", SIZE_PT, metrics),
    ).toEqual(["Anna Meier"]);
    expect(wrapText("   ", 100, "regular", SIZE_PT, metrics)).toEqual([]);
  });
});

describe("paragraphOps", () => {
  it("setzt Zeilen untereinander mit Zeilenabstand", () => {
    const text =
      "Die Ortsgruppe Musterstadt gewinnt den Pokal vor der Ortsgruppe Beispielhausen";
    const lineFactor = 1.5;
    const { ops, endMm } = paragraphOps({
      text,
      xMm: 20,
      topMm: 30,
      widthMm: 40,
      weight: "bold",
      sizePt: SIZE_PT,
      metrics,
      lineFactor,
    });
    const lineHeight = ptToMm(SIZE_PT) * lineFactor;
    expect(ops.length).toBeGreaterThan(1);
    ops.forEach((op, index) => {
      expect(op.font).toBe("bold");
      expect(op.xMm).toBe(20);
      expect(op.baselineMm).toBeCloseTo(
        30 + index * lineHeight + metrics.ascentMm("bold", SIZE_PT),
        6,
      );
    });
    expect(endMm).toBeCloseTo(30 + ops.length * lineHeight, 6);
  });

  it("nutzt ohne Angabe einen Standard-Zeilenabstand", () => {
    const { ops, endMm } = paragraphOps({
      text: "Anna Meier",
      xMm: 0,
      topMm: 0,
      widthMm: 100,
      weight: "regular",
      sizePt: SIZE_PT,
      metrics,
    });
    expect(ops).toHaveLength(1);
    expect(endMm).toBeGreaterThan(ptToMm(SIZE_PT));
  });
});

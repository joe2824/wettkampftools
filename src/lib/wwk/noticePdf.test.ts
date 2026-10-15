import { readFile } from "node:fs/promises";
import { PDFDocument } from "@cantoo/pdf-lib";
import { describe, expect, it } from "vitest";
import { createMetrics, loadFontBytes } from "$lib/certificates/fonts";
import { PAGE_HEIGHT_MM, PAGE_WIDTH_MM } from "$lib/certificates/layout";
import type { DrawOp, TextOp } from "$lib/certificates/render";
import type { EventInfo } from "$lib/settings/settings";
import {
  buildNoticePages,
  buildNoticePdf,
  type NoticeInput,
} from "./noticePdf";
import type { ResultRow } from "./results";
import { TROPHY_RULES_TEXT } from "./rulesText";
import type { NotScored, ScoredTeam, Standing } from "./scoring";

const fonts = await loadFontBytes(
  async (path) => new Uint8Array(await readFile(`static${path}`)),
);
const metrics = createMetrics(fonts);
const MEMBERS = ["Max Mustermann", "Anna Meier"];
const MARGIN_MM = 20;
const TIE_LINE =
  "Gleichstand um Platz 1 – Entscheidung durch die Wettkampfleitung.";

const EVENT: EventInfo = {
  number: "7",
  title: "Wellenwettkampf",
  host: "DLRG Musterstadt",
  date: "2026-11-14",
  venue: "Beispielhausen",
  signers: [
    { name: "", role: "" },
    { name: "", role: "" },
  ],
};

function row(
  name: string,
  organisation: string,
  ageGroupRaw: string,
  place: number | null,
): ResultRow {
  return {
    sourceRow: 1,
    place,
    name,
    organisation,
    ageGroupRaw,
    gender: "weiblich",
    competitionPoints: 1234.5,
    members: MEMBERS,
  };
}

function team(
  organisation: string,
  ageGroup: string,
  kind: ScoredTeam["kind"],
  place: number,
): ScoredTeam {
  return {
    row: row(`${organisation} 1`, organisation, ageGroup, place),
    ageGroup,
    kind,
    gender: "weiblich",
    place,
    n: 3,
    trophyPoints: 4 - place,
    formula: `3 + 1 − ${place} = ${4 - place}`,
  };
}

function standings(
  count: number,
  ageGroup: string,
  kind: ScoredTeam["kind"],
): Standing[] {
  return Array.from({ length: count }, (_, index) => {
    const organisation = `Musterstadt ${index + 1}`;
    return {
      rank: index + 1,
      organisation,
      trophyPoints: 100 - index,
      teams: [team(organisation, ageGroup, kind, 1)],
    };
  });
}

function input(overrides: Partial<NoticeInput> = {}): NoticeInput {
  return {
    event: EVENT,
    rulesParagraphs: [...TROPHY_RULES_TEXT],
    rescue: { standings: standings(3, "AK 12", "rescue"), tieForFirst: false },
    wave: { standings: standings(2, "AkW 12", "wave"), tieForFirst: false },
    notScored: [],
    ...overrides,
  };
}

const texts = (ops: DrawOp[]) =>
  ops.filter((op): op is TextOp => op.kind === "text");
const allTexts = (pages: DrawOp[][]) =>
  pages.flatMap((page) => texts(page).map((op) => op.text));
const allWords = (pages: DrawOp[][]) => allTexts(pages).join(" ");

describe("buildNoticePages – Aufbau", () => {
  it("enthält Titel, Veranstaltung und alle Abschnitte in Reihenfolge", () => {
    const unscored: NotScored = {
      row: row("Beispielhausen 2", "Beispielhausen", "AK 99", 1),
      reason: "unknownAgeGroup",
      message: "Altersklasse unbekannt",
    };
    const lines = allTexts(
      buildNoticePages(input({ notScored: [unscored] }), metrics),
    );
    const order = [
      "Gesamtwertung",
      "7. Wellenwettkampf · DLRG Musterstadt · 14. November 2026 · Beispielhausen",
      "Rettungswertung – Pokal",
      "Wellenwertung – Pokal",
      "Nicht gewertet",
      "Regeln",
    ].map((heading) => lines.indexOf(heading));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(lines).toContain("Altersklasse unbekannt");
    expect(lines).toContain("Beispielhausen 2");
    expect(lines).not.toContain("Rechnung");
  });

  it("erzeugt die Aufschlüsselung als eigenes Dokument ohne Ranglisten", () => {
    const lines = allTexts(buildNoticePages(input(), metrics, "breakdown"));
    expect(lines[0]).toBe("Aufschlüsselung der Gesamtwertung");
    expect(lines).toContain("Rechnung");
    expect(lines).not.toContain("Rettungswertung – Pokal");
    expect(lines).toContain("Regeln");
  });

  it("lässt leere Teile der Veranstaltungszeile weg", () => {
    const event = { ...EVENT, number: "", host: "", date: "" };
    const lines = allTexts(buildNoticePages(input({ event }), metrics));
    expect(lines).toContain("Wellenwettkampf · Beispielhausen");
  });

  it("zeigt in der Aufschlüsselung Rechnung und Wellen-AK in Anzeigeform", () => {
    const lines = allTexts(buildNoticePages(input(), metrics, "breakdown"));
    for (const header of [
      "Platz",
      "Ortsgruppe",
      "Pokalpunkte",
      "Mannschaft",
      "AK",
      "Geschl.",
      "Teams",
      "Rechnung",
    ]) {
      expect(lines).toContain(header);
    }
    expect(lines).toContain("Musterstadt 3");
    expect(lines).toContain("3 + 1 − 1 = 3");
    expect(lines).toContain("AK 12");
    expect(lines.some((text) => text.includes("AkW"))).toBe(false);
  });

  it("zeigt den Gleichstandshinweis nur bei Gleichstand um Platz 1", () => {
    const plain = allTexts(buildNoticePages(input(), metrics));
    expect(plain).not.toContain(TIE_LINE);
    const tied = buildNoticePages(
      input({
        rescue: {
          standings: standings(3, "AK 12", "rescue"),
          tieForFirst: true,
        },
      }),
      metrics,
    );
    const tieOps = tied.flatMap(texts).filter((op) => op.text === TIE_LINE);
    expect(tieOps).toHaveLength(1);
    expect(tieOps[0].font).toBe("bold");
  });

  it("kürzt keine Spaltenköpfe der Aufschlüsselung", () => {
    const lines = allTexts(
      buildNoticePages(
        input({ rescue: { standings: [], tieForFirst: false } }),
        metrics,
        "breakdown",
      ),
    );
    expect(lines.filter((text) => text.endsWith("…"))).toEqual([]);
    expect(lines.filter((text) => text === "Pokalpunkte").length).toBe(1);
  });

  it("meldet eine leere Wertung und zeigt fehlenden Platz als Strich", () => {
    const unplaced = {
      ...team("Beispielhausen", "AkW 12", "wave", 1),
      place: null,
      trophyPoints: 0,
      formula: "ohne Platz = 0",
    };
    const wave = [
      {
        rank: 1,
        organisation: "Beispielhausen",
        trophyPoints: 0,
        teams: [unplaced],
      },
    ];
    const data = input({
      rescue: { standings: [], tieForFirst: false },
      wave: { standings: wave, tieForFirst: false },
    });
    expect(allTexts(buildNoticePages(data, metrics))).toContain("Keine gewerteten Mannschaften.");
    const breakdown = allTexts(buildNoticePages(data, metrics, "breakdown"));
    expect(breakdown).toContain("–");
    expect(breakdown).toContain("ohne Platz = 0");
  });

  it("lässt „Nicht gewertet“ ohne Einträge weg", () => {
    expect(allTexts(buildNoticePages(input(), metrics))).not.toContain(
      "Nicht gewertet",
    );
  });

  it("enthält die Regeltexte", () => {
    const words = allWords(buildNoticePages(input(), metrics));
    for (const paragraph of TROPHY_RULES_TEXT) {
      expect(words).toContain(paragraph.split(" ").slice(0, 4).join(" "));
    }
  });

  it("setzt eine Fußzeile mit Seitenzahl auf jede Seite", () => {
    const pages = buildNoticePages(input(), metrics);
    pages.forEach((page, index) => {
      const lines = texts(page).map((op) => op.text);
      expect(lines).toContain(`Seite ${index + 1} von ${pages.length}`);
      expect(lines).toContain("Erstellt mit Wettkampftools");
    });
  });
});

describe("buildNoticePages – Seitenfluss", () => {
  const big = input({
    rescue: { standings: standings(40, "AK 12", "rescue"), tieForFirst: true },
    wave: { standings: standings(40, "AkW 12", "wave"), tieForFirst: false },
  });
  const pages = buildNoticePages(big, metrics);

  it("verteilt 40 Ortsgruppen auf mehrere Seiten innerhalb der Ränder", () => {
    expect(pages.length).toBeGreaterThan(2);
    for (const op of pages.flatMap(texts)) {
      expect(op.baselineMm).toBeLessThanOrEqual(PAGE_HEIGHT_MM - MARGIN_MM);
      expect(op.baselineMm).toBeGreaterThanOrEqual(MARGIN_MM);
      expect(op.xMm).toBeGreaterThanOrEqual(MARGIN_MM - 0.001);
      expect(
        op.xMm + metrics.widthMm(op.text, op.font, op.sizePt),
      ).toBeLessThanOrEqual(PAGE_WIDTH_MM - MARGIN_MM + 0.001);
    }
    expect(pages.every((page) => texts(page).length > 2)).toBe(true);
  });

  it("führt jede Ortsgruppe im Aushang und in der Aufschlüsselung je Wertung", () => {
    const notice = allTexts(pages);
    const breakdown = allTexts(buildNoticePages(big, metrics, "breakdown"));
    for (let index = 1; index <= 40; index += 1) {
      const name = `Musterstadt ${index}`;
      expect(notice.filter((text) => text === name).length).toBe(2);
      expect(breakdown.filter((text) => text === name).length).toBe(2);
    }
  });

  it("überlappt keine Zeilen auf einer Seite", () => {
    for (const page of pages) {
      const baselines = [
        ...new Set(texts(page).map((op) => op.baselineMm.toFixed(3))),
      ]
        .map(Number)
        .sort((a, b) => a - b);
      for (let index = 1; index < baselines.length; index += 1) {
        expect(baselines[index] - baselines[index - 1]).toBeGreaterThan(2);
      }
    }
  });
});

describe("buildNoticePages – Datenschutz", () => {
  it("enthält keine Mitgliedernamen", () => {
    const unscored: NotScored = {
      row: row("Beispielhausen 2", "Beispielhausen", "AK 99", null),
      reason: "unplaced",
      message: "ohne Platz",
    };
    const words = allWords(
      buildNoticePages(input({ notScored: [unscored] }), metrics),
    );
    for (const member of MEMBERS) {
      expect(words).not.toContain(member);
      expect(words).not.toContain(member.split(" ")[1]);
    }
  });
});

describe("buildNoticePdf", () => {
  it("erzeugt ein PDF mit passender Seitenzahl", async () => {
    const notice = input({
      rescue: {
        standings: standings(40, "AK 12", "rescue"),
        tieForFirst: false,
      },
    });
    const bytes = await buildNoticePdf(notice, fonts);
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("%PDF");
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(buildNoticePages(notice, metrics).length);
    expect(pdf.getTitle()).toBe("Gesamtwertung");
  });
});
